import React, { useEffect, useState } from 'react';
import { Plus, Search, Car, Calendar, X, Camera, Palette, Loader2, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../services/firebaseService';

const emptyForm = { model: '', plate: '', year: '', color: '', notes: '' };

export default function Vehicles() {
  const [vehicles, setVehicles]         = useState<any[]>([]);
  const [showModal, setShowModal]       = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [photo, setPhoto]               = useState<File | null>(null);
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData]         = useState(emptyForm);

  const fetchData = async () => setVehicles(await getVehicles());
  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditingVehicle(null);
    setFormData(emptyForm);
    setPhoto(null);
    setSaveError('');
    setShowModal(true);
  };

  const openEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setFormData({
      model: vehicle.model || '', plate: vehicle.plate || '',
      year: vehicle.year || '', color: vehicle.color || '', notes: vehicle.notes || '',
    });
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
        await updateVehicle(editingVehicle.id, formData);
      } else {
        await createVehicle(formData, photo);
      }
      setShowModal(false);
      setEditingVehicle(null);
      setFormData(emptyForm);
      setPhoto(null);
      fetchData();
    } catch (err: any) {
      setSaveError('Erro ao salvar: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVehicle(id);
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao apagar veículo:', err);
    }
  };

  const filtered = vehicles.filter(v =>
    (v.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.plate || '').toLowerCase().includes(searchTerm.toLowerCase())
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
              </div>
              {vehicle.notes && <p className="text-xs text-slate-400 bg-[#0f172a] p-3 rounded-lg italic border border-slate-800 mb-4">{vehicle.notes}</p>}
              {/* Ações */}
              <div className="flex gap-2 pt-2 border-t border-slate-700">
                <button onClick={() => openEdit(vehicle)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-slate-400 hover:text-white py-2 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600 transition-colors">
                  <Edit2 size={14} /> Editar
                </button>
                <button onClick={() => setConfirmDelete(vehicle.id)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                  <Trash2 size={14} /> Apagar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Criar/Editar */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-emerald-600 text-white">
                <h2 className="text-xl font-bold">{editingVehicle ? 'Editar Veículo' : 'Cadastrar Veículo'}</h2>
                <button onClick={() => !saving && setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {saveError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{saveError}</div>}
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Modelo do Veículo</label>
                  <input required type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" placeholder="Ex: Mercedes-Benz Sprinter" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Placa</label>
                    <input required type="text" value={formData.plate} onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" placeholder="ABC-1234" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Ano</label>
                    <input required type="text" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" placeholder="2024" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Cor</label>
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" placeholder="Ex: Branco, Prata, Preto" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Observações</label>
                  <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                {!editingVehicle && (
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Foto <span className="text-slate-500 font-normal">(opcional)</span></label>
                    <div className="relative h-32 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-emerald-500 hover:text-emerald-500 transition-all cursor-pointer bg-[#0f172a]">
                      <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {photo ? <span className="text-emerald-400 font-bold text-sm px-4 text-center">{photo.name}</span> : (
                        <><Camera size={32} /><span className="text-xs mt-2">Clique para selecionar</span></>
                      )}
                    </div>
                  </div>
                )}
                <button type="submit" disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={20} className="animate-spin" /> {photo ? 'Fazendo upload...' : 'Salvando...'}</> : (editingVehicle ? 'Atualizar Veículo' : 'Salvar Veículo')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmar Exclusão */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDelete(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#1e293b] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-red-500/30 p-6 text-center">
              <Trash2 size={40} className="mx-auto text-red-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Apagar Veículo?</h3>
              <p className="text-slate-400 text-sm mb-6">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600 transition-colors">Cancelar</button>
                <button onClick={() => handleDelete(confirmDelete)} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">Apagar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
