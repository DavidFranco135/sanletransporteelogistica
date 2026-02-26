import React, { useEffect, useState } from 'react';
import { Plus, Search, Phone, X, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDrivers, createDriver } from '../services/firebaseService';

export default function Drivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', cpf: '', cnh: '', phone: '', status: 'active' });

  const fetchData = async () => setDrivers(await getDrivers());
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDriver(formData);
    setShowModal(false);
    setFormData({ name: '', cpf: '', cnh: '', phone: '', status: 'active' });
    fetchData();
  };

  const filtered = drivers.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Motoristas</h1>
          <p className="text-slate-400">Gestão de motoristas parceiros.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
          <Plus size={20} /> Novo Motorista
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input type="text" placeholder="Buscar motorista..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white" />
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a] border-b border-slate-800">
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Documentos</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((driver) => (
                <tr key={driver.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0f172a] rounded-full flex items-center justify-center text-emerald-400 font-bold border border-slate-800">
                        {driver.name.charAt(0)}
                      </div>
                      <div className="font-bold text-white">{driver.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-400">CPF: {driver.cpf}</div>
                    <div className="text-sm text-slate-400">CNH: {driver.cnh}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Phone size={14} className="text-slate-500" />{driver.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 w-fit ${driver.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {driver.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {driver.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-emerald-600 text-white">
                <h2 className="text-xl font-bold">Cadastrar Motorista</h2>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Nome Completo</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">CPF</label>
                    <input required type="text" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">CNH</label>
                    <input required type="text" value={formData.cnh} onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Telefone / WhatsApp</label>
                  <input required type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white">
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4">Salvar Motorista</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
