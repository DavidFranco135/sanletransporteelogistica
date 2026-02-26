import React, { useEffect, useState } from 'react';
import { Plus, Search, Car, Calendar, Hash, X, Camera, Palette, Loader2, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../services/firebaseService';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ model: '', plate: '', year: '', color: '', notes: '' });

  const fetchData = async () => setVehicles(await getVehicles());
  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditingVehicle(null);
    setFormData({ model: '', plate: '', year: '', color: '', notes: '' });
    setPhoto(null);
    setSaveError('');
    setShowModal(true);
  };

  const openEdit = (v: any) => {
    setEditingVehicle(v);
    setFormData({ model: v.model || '', plate: v.plate || '', year: v.year || '', color: v.color || '', notes: v.notes || '' });
    setPhoto(null);
    setSaveError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, formData, photo);
      } else {
        await createVehicle(formData, photo);
      }
      setShowModal(false);
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar veículo:', err);
      setSaveError('Erro ao salvar veículo: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteVehicle(id);
      setVehicles(prev => prev.filter(v => v.id !== id));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const filtered = vehicles.filter(v =>
    v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Frota de Veículos</h1>
          <p className="text-slate-400">Cadastro e acompanhamento de carros.</p>
        </div>
        <button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
          <Plus size={20} /> Novo Veículo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input type="text" placeholder="Buscar veículo por modelo ou placa..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((vehicle) => (
          <div key={vehicle.id} className="bg-[#1e293b] rounded-2xl border border-slate-800 shadow-xl overflow-hidden hover:shadow-2xl transition-all group">
            <div className="h-48 bg-[#0f172a] relative overflow-hidden">
              {vehicle.photo_url ? (
                <img src={vehicle.photo_url} alt={vehicle.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-700"><Car size={64} /></div>
              )}
              <div className="absolute top-4 right-4 bg-emerald-600 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg">{vehicle.plate}</div>
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
                <div className="flex items-center gap-1"><Calendar size={14} /> {vehicle.year}</div>
                <div className="flex items-center gap-1"><Hash size={14} /> {vehicle.plate}</div>
              </div>
              {vehicle.notes && <p className="text-xs text-slate-400 bg-[#0f172a] p-3 rounded-lg italic border border-slate-800 mb-4">{vehicle.notes}</p>}

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button onClick={() => openEdit(vehicle)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-all">
                  <Edit2 size={14} /> Editar
                </button>
                {confirmDeleteId === vehicle.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(vehicle.id)} disabled={deletingId === vehicle.id}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-70">
                      {deletingId === vehicle.id && <Loader2 size={12} className="animate-spin" />} Confirmar
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold">Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(vehicle.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all">
                    <Trash2 size={14} /> Apagar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !saving && setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-emerald-600 text-white">
                <h2 className="text-xl font-bold">{editingVehicle ? 'Editar Veículo' : 'Cadastrar Veículo'}</h2>
                <button onClick={() => !saving && setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {saveError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">{saveError}</div>
                )}
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Modelo do Veículo</label>
                  <input required type="text" value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white"
                    placeholder="Ex: Mercedes-Benz Sprinter" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Placa</label>
                    <input required type="text" value={formData.plate}
                      onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white"
                      placeholder="ABC-1234" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Ano</label>
                    <input required type="text" value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white"
                      placeholder="2024" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Cor</label>
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white"
                      placeholder="Ex: Branco, Prata, Preto" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Observações</label>
                  <textarea rows={2} value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">
                    Foto do Veículo <span className="text-slate-600 font-normal">(opcional{editingVehicle ? ' — vazio mantém a atual' : ''})</span>
                  </label>
                  <div className="relative h-32 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-emerald-500 hover:text-emerald-500 transition-all cursor-pointer bg-[#0f172a]">
                    <input type="file" accept="image/*"
                      onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer" />
                    {photo ? (
                      <div className="text-center">
                        <Camera size={24} className="mx-auto text-emerald-400 mb-1" />
                        <span className="text-emerald-400 font-bold text-sm">{photo.name}</span>
                      </div>
                    ) : editingVehicle?.photo_url ? (
                      <><Camera size={28} /><span className="text-xs mt-2">Clique para trocar a foto</span></>
                    ) : (
                      <><Camera size={32} /><span className="text-xs mt-2">Clique para selecionar</span></>
                    )}
                  </div>
                </div>
                <button type="submit" disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4 flex items-center justify-center gap-2">
                  {saving
                    ? <><Loader2 size={20} className="animate-spin" /> {photo ? 'Fazendo upload da foto...' : 'Salvando...'}</>
                    : editingVehicle ? 'Salvar Alterações' : 'Salvar Veículo'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
