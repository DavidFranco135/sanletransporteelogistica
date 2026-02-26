import React, { useEffect, useState } from 'react';
import { Plus, Search, FileText, Download, X, Calendar, Paperclip, Trash2, Edit2, FileDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getContracts, createContract, updateContract, deleteContract } from '../services/firebaseService';
import { generateContractPDF } from '../services/reportService';

export default function Contracts() {
  const [contracts, setContracts]   = useState<any[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [file, setFile]             = useState<File | null>(null);
  const [saving, setSaving]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => setContracts(await getContracts());
  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditingContract(null);
    setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0] });
    setFile(null);
    setShowModal(true);
  };

  const openEdit = (contract: any) => {
    setEditingContract(contract);
    setFormData({
      title: contract.title || '',
      description: contract.description || '',
      date: contract.date || new Date().toISOString().split('T')[0],
    });
    setFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingContract) {
        await updateContract(editingContract.id, formData);
      } else {
        await createContract(formData, file);
      }
      setShowModal(false);
      setEditingContract(null);
      setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0] });
      setFile(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar contrato:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContract(id);
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao apagar contrato:', err);
    }
  };

  const filtered = contracts.filter(c =>
    (c.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Contratos</h1>
          <p className="text-slate-400">Gestão de documentos e contratos de prestação de serviço.</p>
        </div>
        <button
          onClick={openNew}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Novo Contrato
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input
          type="text"
          placeholder="Buscar contrato..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((contract) => (
          <div key={contract.id} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl hover:shadow-2xl transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 flex-shrink-0">
                <FileText size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate">{contract.title}</h3>
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{contract.description}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                  <Calendar size={12} />
                  {contract.date ? new Date(contract.date).toLocaleDateString('pt-BR') : '—'}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Baixar PDF do contrato gerado */}
                  <button
                    onClick={() => generateContractPDF(contract)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40"
                  >
                    <FileDown size={14} /> Baixar PDF
                  </button>

                  {/* Baixar arquivo anexo (se houver) */}
                  {contract.file_url && (
                    <a
                      href={contract.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 hover:border-blue-500/40"
                    >
                      <Download size={14} /> Anexo
                    </a>
                  )}

                  {/* Editar */}
                  <button
                    onClick={() => openEdit(contract)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 py-1.5 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-slate-500"
                  >
                    <Edit2 size={14} /> Editar
                  </button>

                  {/* Apagar */}
                  <button
                    onClick={() => setConfirmDelete(contract.id)}
                    className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20 hover:border-red-500/40"
                  >
                    <Trash2 size={14} /> Apagar
                  </button>
                </div>
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
                <h2 className="text-xl font-bold">{editingContract ? 'Editar Contrato' : 'Cadastrar Contrato'}</h2>
                <button onClick={() => !saving && setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Título do Contrato</label>
                  <input required type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Data do Contrato</label>
                  <input required type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Descrição / Notas</label>
                  <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                {!editingContract && (
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Arquivo do Contrato <span className="text-slate-500 font-normal">(opcional)</span></label>
                    <div className="relative h-24 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-emerald-500 hover:text-emerald-500 transition-all cursor-pointer bg-[#0f172a]">
                      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {file ? <span className="text-emerald-400 font-bold text-sm">{file.name}</span> : (
                        <><Paperclip size={24} /><span className="text-xs mt-1">Anexar arquivo</span></>
                      )}
                    </div>
                  </div>
                )}
                <button type="submit" disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : (editingContract ? 'Atualizar Contrato' : 'Salvar Contrato')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Exclusão */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDelete(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#1e293b] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-red-500/30 p-6 text-center">
              <Trash2 size={40} className="mx-auto text-red-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Apagar Contrato?</h3>
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
