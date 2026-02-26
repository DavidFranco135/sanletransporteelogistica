import React, { useEffect, useState } from 'react';
import { Plus, Search, Building2, Phone, MapPin, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCompanies, createCompany, deleteCompany } from '../services/firebaseService';

export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', cnpj: '', address: '', contact: '', notes: '' });

  const fetchData = async () => setCompanies(await getCompanies());
  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Apagar empresa "${name}"? Esta ação não pode ser desfeita.`)) return;
    await deleteCompany(id);
    fetchData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCompany(formData);
    setShowModal(false);
    setFormData({ name: '', cnpj: '', address: '', contact: '', notes: '' });
    fetchData();
  };

  const filtered = companies.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Empresas</h1>
          <p className="text-slate-400">Cadastro de empresas contratantes.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
          <Plus size={20} /> Nova Empresa
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input type="text" placeholder="Buscar empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((company) => (
          <div key={company.id} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl hover:shadow-2xl transition-all border-t-4 border-t-emerald-600">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#0f172a] text-emerald-400 rounded-xl flex items-center justify-center border border-slate-800">
                <Building2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white">{company.name}</h3>
                <p className="text-xs text-slate-500 uppercase font-bold">{company.cnpj}</p>
              </div>
              <button
                onClick={() => handleDelete(company.id, company.name)}
                className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                title="Apagar empresa"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-400 mb-4">
              <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-600" /><span className="truncate">{company.address}</span></div>
              <div className="flex items-center gap-2"><Phone size={16} className="text-slate-600" /><span>{company.contact}</span></div>
            </div>
            {company.notes && <div className="bg-[#0f172a] p-3 rounded-lg text-xs text-slate-500 italic border border-slate-800">{company.notes}</div>}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-emerald-600 text-white">
                <h2 className="text-xl font-bold">Cadastrar Empresa</h2>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {['name', 'cnpj', 'address', 'contact'].map((field) => (
                  <div key={field} className="space-y-1">
                    <label className="text-sm font-bold text-slate-400 capitalize">{field === 'name' ? 'Nome da Empresa' : field === 'cnpj' ? 'CNPJ' : field === 'address' ? 'Endereço' : 'Contato / Telefone'}</label>
                    <input required type="text" value={(formData as any)[field]} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Observações</label>
                  <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4">Salvar Empresa</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
