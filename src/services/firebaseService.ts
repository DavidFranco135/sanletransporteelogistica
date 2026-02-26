import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const toData = (snap: any) => ({ id: snap.id, ...snap.data() });

// Upload de imagem via ImgBB
async function uploadToImgBB(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch('https://api.imgbb.com/1/upload?key=24fdf2dc907cc3b17492621921d8af42', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error('Falha no upload da imagem');
  return data.data.url;
}

// Upload de arquivo genérico (PDF/imagem) via ImgBB
async function uploadFileToImgBB(file: File): Promise<string> {
  // ImgBB só aceita imagens; para PDFs apenas retorna URL vazia por enquanto
  if (file.type.startsWith('image/')) {
    return uploadToImgBB(file);
  }
  // Para PDFs, converte para base64 e usa ImgBB mesmo assim
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const formData = new FormData();
        formData.append('image', base64);
        const res = await fetch('https://api.imgbb.com/1/upload?key=24fdf2dc907cc3b17492621921d8af42', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) resolve(data.data.url);
        else resolve(''); // PDF não suportado pelo ImgBB, salva sem arquivo
      } catch {
        resolve('');
      }
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// ─── COMPANIES ────────────────────────────────────────────────────────────────

export async function getCompanies() {
  const snap = await getDocs(query(collection(db, 'companies'), orderBy('name')));
  return snap.docs.map(toData);
}

export async function createCompany(data: any) {
  return addDoc(collection(db, 'companies'), { ...data, created_at: serverTimestamp() });
}

// ─── DRIVERS ─────────────────────────────────────────────────────────────────

export async function getDrivers() {
  const snap = await getDocs(query(collection(db, 'drivers'), orderBy('name')));
  return snap.docs.map(toData);
}

export async function createDriver(data: any) {
  return addDoc(collection(db, 'drivers'), { ...data, created_at: serverTimestamp() });
}

// ─── VEHICLES ─────────────────────────────────────────────────────────────────

export async function getVehicles() {
  const snap = await getDocs(query(collection(db, 'vehicles'), orderBy('model')));
  return snap.docs.map(toData);
}

export async function createVehicle(data: any, photoFile?: File | null) {
  let photo_url = '';
  if (photoFile) {
    photo_url = await uploadToImgBB(photoFile);
  }
  return addDoc(collection(db, 'vehicles'), {
    ...data,
    photo_url,
    created_at: serverTimestamp()
  });
}

// ─── CONTRACTS ────────────────────────────────────────────────────────────────

export async function getContracts() {
  const snap = await getDocs(query(collection(db, 'contracts'), orderBy('date', 'desc')));
  return snap.docs.map(toData);
}

export async function createContract(data: any, file?: File | null) {
  let file_url = '';
  if (file) {
    file_url = await uploadFileToImgBB(file);
  }
  return addDoc(collection(db, 'contracts'), { ...data, file_url, created_at: serverTimestamp() });
}

// ─── COLLABORATORS ────────────────────────────────────────────────────────────

export async function getCollaborators() {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'collaborator')));
  return snap.docs.map(toData);
}

export async function createCollaborator(data: any) {
  return addDoc(collection(db, 'users'), {
    ...data,
    role: 'collaborator',
    created_at: serverTimestamp()
  });
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export async function getExpenses() {
  const snap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
  return snap.docs.map(d => ({ ...toData(d), amount: Number(toData(d).amount) }));
}

export async function createExpense(data: any) {
  return addDoc(collection(db, 'expenses'), {
    ...data,
    amount: Number(data.amount),
    created_at: serverTimestamp()
  });
}

// ─── TRIPS ────────────────────────────────────────────────────────────────────

export async function getTrips() {
  const snap = await getDocs(query(collection(db, 'trips'), orderBy('date', 'desc')));
  return snap.docs.map(toData);
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────

export async function getServices() {
  const snap = await getDocs(query(collection(db, 'services'), orderBy('created_at', 'desc')));
  return snap.docs.map(toData);
}

export async function createService(data: any) {
  const token = uuidv4();
  return addDoc(collection(db, 'services'), {
    ...data,
    token,
    status: 'pending',
    created_at: serverTimestamp()
  });
}

export async function updateService(id: string, data: any) {
  return updateDoc(doc(db, 'services', id), data);
}

export async function getServiceByToken(token: string) {
  const q = query(collection(db, 'services'), where('token', '==', token));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toData(snap.docs[0]);
}

export async function acceptService(token: string) {
  const service = await getServiceByToken(token);
  if (!service) throw new Error('Serviço não encontrado');
  await updateDoc(doc(db, 'services', service.id), { status: 'accepted' });
  return service;
}

export async function completeService(token: string, tripData: any) {
  const service = await getServiceByToken(token);
  if (!service) throw new Error('Serviço não encontrado');

  const tripDoc = await addDoc(collection(db, 'trips'), {
    ...tripData,
    service_id: service.id,
    company_id: service.company_id,
    company_name: service.company_name,
    driver_id: service.driver_id,
    driver_name: service.driver_name,
    vehicle_id: service.vehicle_id,
    vehicle_model: service.vehicle_model,
    plate: service.plate,
    km_start: Number(tripData.km_start),
    km_end: Number(tripData.km_end),
    stopped_hours: Number(tripData.stopped_hours || 0),
    created_at: serverTimestamp()
  });

  await updateDoc(doc(db, 'services', service.id), {
    status: 'completed',
    trip_id: tripDoc.id
  });

  return tripDoc;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [tripsSnap, expensesSnap] = await Promise.all([
    getDocs(collection(db, 'trips')),
    getDocs(collection(db, 'expenses'))
  ]);

  const trips = tripsSnap.docs.length;
  const expenses = expensesSnap.docs.map(d => d.data());
  const revenue = expenses
    .filter(e => e.type === 'income')
    .reduce((a, c) => a + Number(c.amount), 0) + trips * 450;
  const totalExpenses = expenses
    .filter(e => e.type === 'expense')
    .reduce((a, c) => a + Number(c.amount), 0);

  return { trips, revenue, expenses: totalExpenses };
}
