import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Plus, Search, Car, Calendar, Hash, X, Camera, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const { token } = useAuthStore();

  const [formData, setFormData] = useState({
    model: '',
    plate: '',
    year: '',
    color: '',
    notes: ''
  });

  const fetchData = async () => {
    const res = await fetch('/api/vehicles', { headers: { 'Authorization': `Bearer ${token}` } });
    setVehicles(await res.json());
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append('model', formData.model);
    data.append('plate', formData.plate);
    data.append('year', formData.year);
    data.append('color', formData.color);
    data.append('notes', formData.notes);
    if (photo) data.append('photo', photo);

    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: data,
    });
    if (res.ok) {
      setShowModal(false);
      setFormData({ model: '', plate: '', year: '', color: '', notes: '' });
      setPhoto(null);
      fetchData();
    }
  };

  const filtered = vehicles.filter(v => v.model.toLowerCase().includes(searchTerm.toLowerCase()) || v.plate.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Frota de Veículos</h1>
          <p className="text-slate-400">Cadastro e acompanhamento de carros.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Novo Veículo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input
          type="text"
          placeholder="Buscar veículo por modelo ou placa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((vehicle) => (
          <div key={vehicle.id} className="bg-[#1e293b] rounded-2xl border border-slate-800 shadow-xl overflow-hidden hover:shadow-2xl transition-all group">
            <div className="h-48 bg-[#0f172a] relative overflow-hidden">
              {vehicle.photo_url ? (
                <img src={vehicle.photo_url} alt={vehicle.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-700">
                  <Car size={64} />
                </div>
              )}
              <div className="absolute top-4 right-4 bg-emerald-600 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg">
                {vehicle.plate}
              </div>
              {vehicle.color && (
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: vehicle.color.toLowerCase() }} />
                  {vehicle.color}
                </div>
              )}
            </div>
            <div className="p-6">
              <h3 className="font-bold text-white text-lg mb-1">{vehicle.model}</h3>
              <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                <div className="flex items-center gap-1">
                  <Calendar size={14} /> {vehicle.year}
                </div>
                <div className="flex items-center gap-1">
                  <Hash size={14} /> ID: {vehicle.id}
                </div>
              </div>
              {vehicle.notes && (
                <p className="text-xs text-slate-400 bg-[#0f172a] p-3 rounded-lg italic border border-slate-800">{vehicle.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-emerald-600 text-white">
                <h2 className="text-xl font-bold">Cadastrar Veículo</h2>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Modelo do Veículo</label>
                  <input required type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" placeholder="Ex: Mercedes-Benz Sprinter" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Placa</label>
                    <input required type="text" value={formData.plate} onChange={(e) => setFormData({ ...formData, plate: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" placeholder="ABC-1234" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Ano</label>
                    <input required type="text" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" placeholder="2024" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Cor</label>
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" placeholder="Ex: Branco, Prata, Preto" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Observações</label>
                  <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Foto do Veículo</label>
                  <div className="relative h-32 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-emerald-500 hover:text-emerald-500 transition-all cursor-pointer bg-[#0f172a]">
                    <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {photo ? (
                      <span className="text-emerald-400 font-bold">{photo.name}</span>
                    ) : (
                      <>
                        <Camera size={32} />
                        <span className="text-xs mt-2">Clique para selecionar</span>
                      </>
                    )}
                  </div>
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4">Salvar Veículo</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
