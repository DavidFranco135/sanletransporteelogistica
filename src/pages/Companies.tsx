import React, { useEffect, useState } from 'react';
import { Plus, Search, Building2, Phone, MapPin, X, Edit2, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../services/firebaseService';

const emptyForm = { name: '', cnpj: '', address: '', contact: '', notes: '' };

export default function Companies() {
  const [companies, setCompanies]       = useState<any[]>([]);
  const [showModal, setShowModal]       = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [saving, setSaving]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData]         = useState(emptyForm);

  const fetchData = async () => setCompanies(await getCompanies());
  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditingCompany(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (company: any) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '', cnpj: company.cnpj || '',
      address: company.address || '', contact: company.contact || '', notes: company.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, formData);
      } else {
        await createCompany(formData);
      }
      setShowModal(false);
      setEditingCompany(null);
      setFormData(emptyForm);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar empresa:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCompany(id);
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao apagar empresa:', err);
    }
  };

  const filtered = companies.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Empresas</h1>
          <p className="text-slate-400">Cadastro de empresas contratantes.</p>
        </div>
        <button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
          <Plus size={20} /> Nova Empresa
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input type="text" placeholder="Buscar empresa..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((company) => (
          <div key={company.id} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl hover:shadow-2xl transition-all border-t-4 border-t-emerald-600">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#0f172a] text-emerald-400 rounded-xl flex items-center justify-center border border-slate-800">
                <Building2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate">{company.name}</h3>
                <p className="text-xs text-slate-500 uppercase font-bold">{company.cnpj}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-400 mb-4">
              <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-600 flex-shrink-0" /><span className="truncate">{company.address}</span></div>
              <div className="flex items-center gap-2"><Phone size={16} className="text-slate-600 flex-shrink-0" /><span>{company.contact}</span></div>
            </div>
            {company.notes && (
              <div className="bg-[#0f172a] p-3 rounded-lg text-xs text-slate-500 italic border border-slate-800 mb-4">{company.notes}</div>
            )}
            {/* Ações */}
            <div className="flex gap-2 pt-2 border-t border-slate-700">
              <button onClick={() => openEdit(company)}
                className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-slate-400 hover:text-white py-2 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600 transition-colors">
                <Edit2 size={14} /> Editar
              </button>
              <button onClick={() => setConfirmDelete(company.id)}
                className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                <Trash2 size={14} /> Apagar
              </button>
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
                <h2 className="text-xl font-bold">{editingCompany ? 'Editar Empresa' : 'Cadastrar Empresa'}</h2>
                <button onClick={() => !saving && setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {([['name','Nome da Empresa'],['cnpj','CNPJ'],['address','Endereço'],['contact','Contato / Telefone']] as const).map(([field, label]) => (
                  <div key={field} className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">{label}</label>
                    <input required type="text" value={(formData as any)[field]} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Observações</label>
                  <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                <button type="submit" disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : (editingCompany ? 'Atualizar Empresa' : 'Salvar Empresa')}
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
              <h3 className="text-lg font-bold text-white mb-2">Apagar Empresa?</h3>
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
