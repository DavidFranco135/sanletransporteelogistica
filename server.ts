import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
      : null;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "sanle-41ec2.firebasestorage.app"
      });
      console.log('Firebase Admin initialized with service account');
    } else {
      admin.initializeApp({
        projectId: "sanle-41ec2",
        storageBucket: "sanle-41ec2.firebasestorage.app"
      });
      console.log('Firebase Admin initialized with Project ID (ADC)');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

const fdb = admin.firestore();
const fauth = admin.auth();

// Firestore Helpers
let isFirestoreEnabled = true;

const firestore = {
  async getAll(collection: string) {
    if (!isFirestoreEnabled) return [];
    try {
      const snapshot = await fdb.collection(collection).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e: any) {
      if (e.message?.includes('firestore.googleapis.com')) {
        console.warn(`Firestore API is disabled or not configured. Falling back to local database.`);
        isFirestoreEnabled = false;
        // Re-enable after 5 minutes to retry
        setTimeout(() => { isFirestoreEnabled = true; }, 300000);
      } else {
        console.error(`Firestore error (getAll ${collection}):`, e);
      }
      return [];
    }
  },
  async getOne(collection: string, id: string) {
    if (!isFirestoreEnabled) return null;
    try {
      const doc = await fdb.collection(collection).doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e: any) {
      if (!e.message?.includes('firestore.googleapis.com')) {
        console.error(`Firestore error (getOne ${collection}):`, e);
      }
      return null;
    }
  },
  async add(collection: string, data: any) {
    if (!isFirestoreEnabled) return { id: null };
    try {
      const docRef = await fdb.collection(collection).add({
        ...data,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
      return { id: docRef.id };
    } catch (e: any) {
      if (!e.message?.includes('firestore.googleapis.com')) {
        console.error(`Firestore error (add ${collection}):`, e);
      }
      return { id: null };
    }
  },
  async update(collection: string, id: string, data: any) {
    if (!isFirestoreEnabled) return false;
    try {
      await fdb.collection(collection).doc(id).update(data);
      return true;
    } catch (e: any) {
      if (!e.message?.includes('firestore.googleapis.com')) {
        console.error(`Firestore error (update ${collection}):`, e);
      }
      return false;
    }
  },
  async delete(collection: string, id: string) {
    if (!isFirestoreEnabled) return false;
    try {
      await fdb.collection(collection).doc(id).delete();
      return true;
    } catch (e: any) {
      if (!e.message?.includes('firestore.googleapis.com')) {
        console.error(`Firestore error (delete ${collection}):`, e);
      }
      return false;
    }
  }
};

const db = new Database('sanle.db');
const JWT_SECRET = process.env.JWT_SECRET || 'sanle_secret_key_2024';

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT DEFAULT 'collaborator',
    permissions TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    cnpj TEXT,
    address TEXT,
    contact TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    cpf TEXT,
    cnh TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT,
    plate TEXT,
    year TEXT,
    color TEXT,
    notes TEXT,
    photo_url TEXT
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    description TEXT,
    driver_id INTEGER,
    vehicle_id INTEGER,
    customer_name TEXT,
    origin TEXT,
    destination TEXT,
    scheduled_at TEXT,
    status TEXT DEFAULT 'pending',
    token TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id),
    FOREIGN KEY(driver_id) REFERENCES drivers(id),
    FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER,
    date TEXT,
    description TEXT,
    origin TEXT,
    destination TEXT,
    km_start REAL,
    km_end REAL,
    observations TEXT,
    user_name TEXT,
    signature_url TEXT,
    finished_at TEXT,
    stopped_hours REAL,
    stopped_reason TEXT,
    pdf_url TEXT,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT,
    amount REAL,
    date TEXT,
    category TEXT,
    type TEXT DEFAULT 'expense' -- 'income' or 'expense'
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    file_url TEXT,
    date TEXT
  );
`);

// Migration: Add missing columns if they don't exist
try { db.prepare("ALTER TABLE vehicles ADD COLUMN color TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE expenses ADD COLUMN type TEXT DEFAULT 'expense'").run(); } catch (e) {}
try { db.prepare("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]'").run(); } catch (e) {}
try { db.prepare("ALTER TABLE services ADD COLUMN token TEXT").run(); } catch (e) {}
try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_services_token ON services(token)").run(); } catch (e) {}

// Fill missing tokens
const servicesWithoutToken = db.prepare("SELECT id FROM services WHERE token IS NULL OR token = ''").all();
servicesWithoutToken.forEach((s: any) => {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  db.prepare("UPDATE services SET token = ? WHERE id = ?").run(token, s.id);
});
try { db.prepare("ALTER TABLE services ADD COLUMN customer_name TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE services ADD COLUMN origin TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE services ADD COLUMN destination TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE services ADD COLUMN scheduled_at TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE trips ADD COLUMN pdf_url TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE trips ADD COLUMN user_name TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE trips ADD COLUMN signature_url TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE trips ADD COLUMN finished_at TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE trips ADD COLUMN stopped_hours REAL").run(); } catch (e) {}
try { db.prepare("ALTER TABLE trips ADD COLUMN stopped_reason TEXT").run(); } catch (e) {}

// Seed Admin User if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE email = ?').get('sanleadm@gmail.com');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('654326', 10);
  db.prepare('INSERT INTO users (email, password, name, role, permissions) VALUES (?, ?, ?, ?, ?)')
    .run('sanleadm@gmail.com', hashedPassword, 'Administrador Sanle', 'admin', JSON.stringify(['all']));
}

const app = express();
app.use(express.json());

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
      file?: any;
    }
  }
}

// File Upload Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.use('/uploads', express.static('uploads'));

// Auth Middleware
const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    // Try Firebase Auth first
    try {
      const decodedToken = await fauth.verifyIdToken(token);
      req.user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        role: (decodedToken as any).role || 'collaborator',
        permissions: (decodedToken as any).permissions || []
      };
      return next();
    } catch (firebaseError) {
      // Fallback to legacy JWT
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- AUTH ROUTES ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, permissions: JSON.parse(user.permissions) }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: JSON.parse(user.permissions) } });
});

app.get('/api/me', authenticate, (req: any, res) => {
  const user: any = db.prepare('SELECT id, email, name, role, permissions FROM users WHERE id = ?').get(req.user.id);
  res.json({ ...user, permissions: JSON.parse(user.permissions) });
});

// --- DASHBOARD ---
app.get('/api/dashboard', authenticate, async (req, res) => {
  const trips = await firestore.getAll('trips');
  const services = await firestore.getAll('services');
  const expenses = await firestore.getAll('expenses');
  
  if (trips.length > 0 || services.length > 0 || expenses.length > 0) {
    const totalExpenses = expenses.filter((e: any) => e.type === 'expense').reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
    const totalIncomes = expenses.filter((e: any) => e.type === 'income').reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
    const tripRevenue = trips.length * 450;
    const totalRevenue = totalIncomes + tripRevenue;

    return res.json({
      trips: trips.length,
      services: services.length,
      expenses: totalExpenses,
      revenue: totalRevenue,
    });
  }

  const totalTrips = db.prepare('SELECT COUNT(*) as count FROM trips').get() as any;
  const totalServices = db.prepare('SELECT COUNT(*) as count FROM services').get() as any;
  const totalExpenses = db.prepare("SELECT SUM(amount) as sum FROM expenses WHERE type = 'expense'").get() as any;
  const totalIncomes = db.prepare("SELECT SUM(amount) as sum FROM expenses WHERE type = 'income'").get() as any;
  
  const tripRevenue = totalTrips.count * 450;
  const totalRevenue = (totalIncomes.sum || 0) + tripRevenue;

  res.json({
    trips: totalTrips.count,
    services: totalServices.count,
    expenses: totalExpenses.sum || 0,
    revenue: totalRevenue,
  });
});

// --- COMPANIES ---
app.get('/api/companies', authenticate, async (req, res) => {
  const companies = await firestore.getAll('companies');
  if (companies.length > 0) return res.json(companies);
  res.json(db.prepare('SELECT * FROM companies').all());
});
app.post('/api/companies', authenticate, async (req, res) => {
  const { name, cnpj, address, contact, notes } = req.body;
  const result = await firestore.add('companies', { name, cnpj, address, contact, notes });
  
  // Sync to SQLite for intactness
  db.prepare('INSERT INTO companies (name, cnpj, address, contact, notes) VALUES (?, ?, ?, ?, ?)')
    .run(name, cnpj, address, contact, notes);
  
  // Auto-generate contract
  const date = new Date().toISOString().split('T')[0];
  await firestore.add('contracts', {
    title: `Contrato Automático - ${name}`,
    description: `Contrato gerado automaticamente na criação da empresa ${name}.`,
    date
  });
  db.prepare('INSERT INTO contracts (title, description, date) VALUES (?, ?, ?)')
    .run(`Contrato Automático - ${name}`, `Contrato gerado automaticamente na criação da empresa ${name}.`, date);

  res.json({ id: result.id });
});

// --- DRIVERS ---
app.get('/api/drivers', authenticate, async (req, res) => {
  const drivers = await firestore.getAll('drivers');
  if (drivers.length > 0) return res.json(drivers);
  res.json(db.prepare('SELECT * FROM drivers').all());
});
app.post('/api/drivers', authenticate, async (req, res) => {
  const { name, cpf, cnh, phone, status } = req.body;
  const result = await firestore.add('drivers', { name, cpf, cnh, phone, status: status || 'active' });
  
  db.prepare('INSERT INTO drivers (name, cpf, cnh, phone, status) VALUES (?, ?, ?, ?, ?)')
    .run(name, cpf, cnh, phone, status || 'active');
    
  res.json({ id: result.id });
});

// --- VEHICLES ---
app.get('/api/vehicles', authenticate, async (req, res) => {
  const vehicles = await firestore.getAll('vehicles');
  if (vehicles.length > 0) return res.json(vehicles);
  res.json(db.prepare('SELECT * FROM vehicles').all());
});
app.post('/api/vehicles', authenticate, upload.single('photo'), async (req, res) => {
  const { model, plate, year, color, notes } = req.body;
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
  
  const result = await firestore.add('vehicles', { model, plate, year, color, notes, photo_url });
  
  db.prepare('INSERT INTO vehicles (model, plate, year, color, notes, photo_url) VALUES (?, ?, ?, ?, ?, ?)')
    .run(model, plate, year, color, notes, photo_url);
    
  res.json({ id: result.id });
});

// --- SERVICES & DRIVER LINK ---
app.get('/api/services', authenticate, async (req, res) => {
  const services = await firestore.getAll('services');
  if (services.length > 0) {
    const companies = await firestore.getAll('companies');
    const drivers = await firestore.getAll('drivers');
    const vehicles = await firestore.getAll('vehicles');
    
    const enriched = services.map((s: any) => ({
      ...s,
      company_name: (companies.find((c: any) => c.id === s.company_id) as any)?.name || 'N/A',
      driver_name: (drivers.find((d: any) => d.id === s.driver_id) as any)?.name || 'N/A',
      vehicle_model: (vehicles.find((v: any) => v.id === s.vehicle_id) as any)?.model || 'N/A'
    }));
    return res.json(enriched);
  }
  res.json(db.prepare(`
    SELECT s.*, c.name as company_name, d.name as driver_name, v.model as vehicle_model 
    FROM services s
    JOIN companies c ON s.company_id = c.id
    JOIN drivers d ON s.driver_id = d.id
    JOIN vehicles v ON s.vehicle_id = v.id
    ORDER BY s.created_at DESC
  `).all());
});

app.post('/api/services', authenticate, async (req, res) => {
  const { company_id, description, driver_id, vehicle_id, customer_name, origin, destination, scheduled_at } = req.body;
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const result = await firestore.add('services', { company_id, description, driver_id, vehicle_id, customer_name, origin, destination, scheduled_at, token, status: 'pending' });
  
  db.prepare('INSERT INTO services (company_id, description, driver_id, vehicle_id, customer_name, origin, destination, scheduled_at, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(company_id, description, driver_id, vehicle_id, customer_name, origin, destination, scheduled_at, token);
    
  res.json({ id: result.id, token });
});

app.put('/api/services/:id', authenticate, async (req, res) => {
  const { company_id, description, driver_id, vehicle_id, customer_name, origin, destination, scheduled_at, status } = req.body;
  
  await firestore.update('services', req.params.id, { company_id, description, driver_id, vehicle_id, customer_name, origin, destination, scheduled_at, status: status || 'pending' });
  
  db.prepare('UPDATE services SET company_id = ?, description = ?, driver_id = ?, vehicle_id = ?, customer_name = ?, origin = ?, destination = ?, scheduled_at = ?, status = ? WHERE id = ?')
    .run(company_id, description, driver_id, vehicle_id, customer_name, origin, destination, scheduled_at, status || 'pending', req.params.id);
    
  res.json({ success: true });
});

// Public Driver Link Access
app.get('/api/public/service/:token', async (req, res) => {
  // Try Firestore first
  const services = await fdb.collection('services').where('token', '==', req.params.token).limit(1).get();
  if (!services.empty) {
    const s = { id: services.docs[0].id, ...services.docs[0].data() } as any;
    const c = await firestore.getOne('companies', s.company_id);
    const d = await firestore.getOne('drivers', s.driver_id);
    const v = await firestore.getOne('vehicles', s.vehicle_id);
    return res.json({
      ...s,
      company_name: (c as any)?.name || 'N/A',
      driver_name: (d as any)?.name || 'N/A',
      driver_phone: (d as any)?.phone || 'N/A',
      vehicle_model: (v as any)?.model || 'N/A',
      vehicle_plate: (v as any)?.plate || 'N/A'
    });
  }

  const service: any = db.prepare(`
    SELECT s.*, c.name as company_name, d.name as driver_name, d.phone as driver_phone, v.model as vehicle_model, v.plate as vehicle_plate
    FROM services s
    JOIN companies c ON s.company_id = c.id
    JOIN drivers d ON s.driver_id = d.id
    JOIN vehicles v ON s.vehicle_id = v.id
    WHERE s.token = ?
  `).get(req.params.token);
  if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
  res.json(service);
});

app.post('/api/public/service/:token/accept', async (req, res) => {
  const services = await fdb.collection('services').where('token', '==', req.params.token).limit(1).get();
  if (!services.empty) {
    const doc = services.docs[0];
    if (doc.data().status === 'pending') {
      await doc.ref.update({ status: 'accepted' });
    }
    // Sync to SQLite
    db.prepare('UPDATE services SET status = "accepted" WHERE token = ? AND status = "pending"')
      .run(req.params.token);
    return res.json({ success: true });
  }

  const service: any = db.prepare('SELECT status FROM services WHERE token = ?').get(req.params.token);
  if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
  
  if (service.status !== 'pending') {
    return res.json({ success: true, message: 'Serviço já aceito ou finalizado' });
  }

  db.prepare('UPDATE services SET status = "accepted" WHERE token = ? AND status = "pending"')
    .run(req.params.token);
  
  res.json({ success: true });
});

app.post('/api/public/service/:token/complete', async (req, res) => {
  const { date, description, origin, destination, km_start, km_end, observations, user_name, signature_url, finished_at, stopped_hours, stopped_reason } = req.body;
  
  const services = await fdb.collection('services').where('token', '==', req.params.token).limit(1).get();
  if (!services.empty) {
    const sDoc = services.docs[0];
    await firestore.add('trips', {
      service_id: sDoc.id,
      date, description, origin, destination, km_start, km_end, observations, user_name, signature_url, finished_at, stopped_hours, stopped_reason
    });
    await sDoc.ref.update({ status: 'completed' });
    
    // Sync to SQLite
    db.transaction(() => {
      db.prepare('INSERT INTO trips (service_id, date, description, origin, destination, km_start, km_end, observations, user_name, signature_url, finished_at, stopped_hours, stopped_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(sDoc.id, date, description, origin, destination, km_start, km_end, observations, user_name, signature_url, finished_at, stopped_hours, stopped_reason);
      db.prepare('UPDATE services SET status = "completed" WHERE id = ?').run(sDoc.id);
    })();
    return res.json({ success: true });
  }

  const service: any = db.prepare('SELECT id FROM services WHERE token = ?').get(req.params.token);
  if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });

  db.transaction(() => {
    db.prepare('INSERT INTO trips (service_id, date, description, origin, destination, km_start, km_end, observations, user_name, signature_url, finished_at, stopped_hours, stopped_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(service.id, date, description, origin, destination, km_start, km_end, observations, user_name, signature_url, finished_at, stopped_hours, stopped_reason);
    db.prepare('UPDATE services SET status = "completed" WHERE id = ?').run(service.id);
  })();

  res.json({ success: true });
});

// --- TRIPS ---
app.get('/api/trips', authenticate, async (req, res) => {
  const trips = await firestore.getAll('trips');
  if (trips.length > 0) {
    const services = await firestore.getAll('services');
    const companies = await firestore.getAll('companies');
    const drivers = await firestore.getAll('drivers');
    const vehicles = await firestore.getAll('vehicles');

    const enriched = trips.map((t: any) => {
      const s = services.find((srv: any) => srv.id === t.service_id) as any;
      return {
        ...t,
        service_desc: s?.description || 'N/A',
        company_name: (companies.find((c: any) => c.id === s?.company_id) as any)?.name || 'N/A',
        driver_name: (drivers.find((d: any) => d.id === s?.driver_id) as any)?.name || 'N/A',
        vehicle_model: (vehicles.find((v: any) => v.id === s?.vehicle_id) as any)?.model || 'N/A'
      };
    });
    return res.json(enriched);
  }
  res.json(db.prepare(`
    SELECT t.*, s.description as service_desc, c.name as company_name, d.name as driver_name, v.model as vehicle_model
    FROM trips t
    JOIN services s ON t.service_id = s.id
    JOIN companies c ON s.company_id = c.id
    JOIN drivers d ON s.driver_id = d.id
    JOIN vehicles v ON s.vehicle_id = v.id
    ORDER BY t.completed_at DESC
  `).all());
});

// --- EXPENSES ---
app.get('/api/expenses', authenticate, async (req, res) => {
  const expenses = await firestore.getAll('expenses');
  if (expenses.length > 0) return res.json(expenses);
  res.json(db.prepare('SELECT * FROM expenses ORDER BY date DESC').all());
});
app.post('/api/expenses', authenticate, async (req, res) => {
  const { description, amount, date, category, type } = req.body;
  const result = await firestore.add('expenses', { description, amount, date, category, type: type || 'expense' });
  
  db.prepare('INSERT INTO expenses (description, amount, date, category, type) VALUES (?, ?, ?, ?, ?)')
    .run(description, amount, date, category, type || 'expense');
    
  res.json({ id: result.id });
});

// --- CONTRACTS ---
app.get('/api/contracts', authenticate, async (req, res) => {
  const contracts = await firestore.getAll('contracts');
  if (contracts.length > 0) return res.json(contracts);
  res.json(db.prepare('SELECT * FROM contracts ORDER BY date DESC').all());
});
app.post('/api/contracts', authenticate, upload.single('file'), async (req, res) => {
  const { title, description, date } = req.body;
  const file_url = req.file ? `/uploads/${req.file.filename}` : null;
  
  const result = await firestore.add('contracts', { title, description, file_url, date });
  
  db.prepare('INSERT INTO contracts (title, description, file_url, date) VALUES (?, ?, ?, ?)')
    .run(title, description, file_url, date);
    
  res.json({ id: result.id });
});

// --- COLLABORATORS ---
app.get('/api/collaborators', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const collaborators = await firestore.getAll('users');
  const filtered = collaborators.filter((c: any) => c.role === 'collaborator');
  if (filtered.length > 0) return res.json(filtered);
  
  const sqliteCollabs = db.prepare("SELECT id, email, name, role, permissions FROM users WHERE role = 'collaborator'").all();
  res.json(sqliteCollabs.map((c: any) => ({ ...c, permissions: JSON.parse(c.permissions) })));
});
app.post('/api/collaborators', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { email, password, name, permissions } = req.body;
  
  // Create in Firebase Auth
  try {
    const userRecord = await fauth.createUser({
      email,
      password,
      displayName: name
    });
    
    await fdb.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role: 'collaborator',
      permissions: permissions || []
    });
    
    // Sync to SQLite
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (email, password, name, role, permissions) VALUES (?, ?, ?, ?, ?)')
      .run(email, hashedPassword, name, 'collaborator', JSON.stringify(permissions || []));
      
    res.json({ id: userRecord.uid });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// --- VITE SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
