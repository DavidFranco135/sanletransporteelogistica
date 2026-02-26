import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const toData = (snap: any) => ({ id: snap.id, ...snap.data() });

async function safeDocs(col: string, field?: string, dir: 'asc' | 'desc' = 'asc') {
  try {
    const q = field
      ? query(collection(db, col), orderBy(field, dir))
      : collection(db, col);
    const snap = await getDocs(q);
    return snap.docs.map(toData);
  } catch {
    const snap = await getDocs(collection(db, col));
    return snap.docs.map(toData);
  }
}

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

async function uploadFileToImgBB(file: File): Promise<string> {
  if (file.type.startsWith('image/')) return uploadToImgBB(file);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const formData = new FormData();
        formData.append('image', base64);
        const res = await fetch('https://api.imgbb.com/1/upload?key=24fdf2dc907cc3b17492621921d8af42', {
          method: 'POST', body: formData,
        });
        const data = await res.json();
        resolve(data.success ? data.data.url : '');
      } catch { resolve(''); }
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// ─── COMPANIES ────────────────────────────────────────────────────────────────

export async function getCompanies() {
  return safeDocs('companies', 'name');
}

export async function createCompany(data: any) {
  return addDoc(collection(db, 'companies'), { ...data, created_at: serverTimestamp() });
}

export async function updateCompany(id: string, data: any) {
  return updateDoc(doc(db, 'companies', id), data);
}

export async function deleteCompany(id: string) {
  return deleteDoc(doc(db, 'companies', id));
}

// ─── DRIVERS ─────────────────────────────────────────────────────────────────

export async function getDrivers() {
  return safeDocs('drivers', 'name');
}

export async function createDriver(data: any) {
  return addDoc(collection(db, 'drivers'), { ...data, created_at: serverTimestamp() });
}

export async function updateDriver(id: string, data: any) {
  return updateDoc(doc(db, 'drivers', id), data);
}

export async function deleteDriver(id: string) {
  return deleteDoc(doc(db, 'drivers', id));
}

// ─── VEHICLES ────────────────────────────────────────────────────────────────

export async function getVehicles() {
  return safeDocs('vehicles', 'model');
}

export async function createVehicle(data: any, photoFile?: File | null) {
  let photo_url = '';
  if (photoFile) photo_url = await uploadToImgBB(photoFile);
  return addDoc(collection(db, 'vehicles'), { ...data, photo_url, created_at: serverTimestamp() });
}

export async function updateVehicle(id: string, data: any) {
  return updateDoc(doc(db, 'vehicles', id), data);
}

export async function deleteVehicle(id: string) {
  return deleteDoc(doc(db, 'vehicles', id));
}

// ─── CONTRACTS ───────────────────────────────────────────────────────────────

export async function getContracts() {
  return safeDocs('contracts', 'date', 'desc');
}

export async function createContract(data: any, file?: File | null) {
  let file_url = '';
  if (file) file_url = await uploadFileToImgBB(file);
  return addDoc(collection(db, 'contracts'), { ...data, file_url, created_at: serverTimestamp() });
}

export async function updateContract(id: string, data: any) {
  return updateDoc(doc(db, 'contracts', id), data);
}

export async function deleteContract(id: string) {
  return deleteDoc(doc(db, 'contracts', id));
}

// ─── COLLABORATORS ────────────────────────────────────────────────────────────

export async function getCollaborators() {
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'collaborator')));
    return snap.docs.map(toData);
  } catch {
    return [];
  }
}

export async function createCollaborator(data: any) {
  return addDoc(collection(db, 'users'), { ...data, role: 'collaborator', created_at: serverTimestamp() });
}

export async function deleteCollaborator(id: string) {
  return deleteDoc(doc(db, 'users', id));
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export async function getExpenses() {
  const rows = await safeDocs('expenses', 'date', 'desc');
  return rows.map(r => ({ ...r, amount: Number(r.amount) || 0 }));
}

export async function createExpense(data: any) {
  return addDoc(collection(db, 'expenses'), {
    ...data,
    amount: Number(data.amount),
    created_at: serverTimestamp(),
  });
}

export async function deleteExpense(id: string) {
  return deleteDoc(doc(db, 'expenses', id));
}

// ─── TRIPS ───────────────────────────────────────────────────────────────────

export async function getTrips() {
  return safeDocs('trips', 'date', 'desc');
}

// ─── SERVICES ────────────────────────────────────────────────────────────────

export async function getServices() {
  return safeDocs('services', 'created_at', 'desc');
}

async function getNextOsNumber(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, 'services'));
    let max = 0;
    snap.docs.forEach(d => {
      const n = d.data().os_number;
      if (typeof n === 'number' && n > max) max = n;
    });
    return max + 1;
  } catch {
    return 1;
  }
}

export async function createService(data: any) {
  const token = uuidv4();
  const os_number = await getNextOsNumber();
  return addDoc(collection(db, 'services'), {
    ...data,
    token,
    os_number,
    status: 'pending',
    created_at: serverTimestamp(),
  });
}

export async function updateService(id: string, data: any) {
  return updateDoc(doc(db, 'services', id), data);
}

export async function deleteService(id: string) {
  return deleteDoc(doc(db, 'services', id));
}

export async function getServiceByToken(token: string) {
  try {
    const q = query(collection(db, 'services'), where('token', '==', token));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return toData(snap.docs[0]);
  } catch {
    return null;
  }
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
    service_id:    service.id,
    os_number:     service.os_number,
    company_id:    service.company_id,
    company_name:  service.company_name,
    driver_id:     service.driver_id,
    driver_name:   service.driver_name,
    vehicle_id:    service.vehicle_id,
    vehicle_model: service.vehicle_model,
    plate:         service.plate,
    km_start:      Number(tripData.km_start),
    km_end:        Number(tripData.km_end),
    stopped_hours: Number(tripData.stopped_hours || 0),
    created_at:    serverTimestamp(),
  });

  await updateDoc(doc(db, 'services', service.id), {
    status: 'completed',
    trip_id: tripDoc.id,
  });

  return tripDoc;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  try {
    const [tripsSnap, expensesSnap, driversSnap, companiesSnap, servicesSnap] = await Promise.all([
      getDocs(collection(db, 'trips')).catch(() => ({ docs: [] as any[] })),
      getDocs(collection(db, 'expenses')).catch(() => ({ docs: [] as any[] })),
      getDocs(collection(db, 'drivers')).catch(() => ({ docs: [] as any[] })),
      getDocs(collection(db, 'companies')).catch(() => ({ docs: [] as any[] })),
      getDocs(collection(db, 'services')).catch(() => ({ docs: [] as any[] })),
    ]);

    const expensesDocs = expensesSnap.docs.map((d: any) => d.data());
    const revenue      = expensesDocs.filter(e => e.type === 'income').reduce((a, c) => a + Number(c.amount), 0);
    const totalExpenses = expensesDocs.filter(e => e.type === 'expense').reduce((a, c) => a + Number(c.amount), 0);
    const activeServices = servicesSnap.docs.filter((d: any) => ['pending', 'accepted'].includes(d.data().status)).length;

    return {
      trips:          tripsSnap.docs.length,
      revenue,
      expenses:       totalExpenses,
      drivers:        driversSnap.docs.length,
      companies:      companiesSnap.docs.length,
      activeServices,
    };
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return { trips: 0, revenue: 0, expenses: 0, drivers: 0, companies: 0, activeServices: 0 };
  }
}
