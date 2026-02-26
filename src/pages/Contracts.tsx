import React, { useEffect, useState } from 'react';
import { Plus, Search, FileText, X, Calendar, Paperclip, Trash2, FileDown, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getContracts, createContract, deleteContract } from '../services/firebaseService';
import { generateContractPDF } from '../services/reportService';

export default function Contracts() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => setContracts(await getContracts());
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createContract(formData, file);
      setShowModal(false);
      setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0] });
      setFile(null);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteContract(id);
      setContracts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Erro ao apagar contrato:', err);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const filtered = contracts.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Contratos</h1>
          <p className="text-slate-400">Gestão de documentos e contratos de prestação de serviço.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
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
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shrink-0">
                <FileText size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate text-lg">{contract.title}</h3>
                {contract.description && (
                  <p className="text-sm text-slate-400 mt-1 mb-3">{contract.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                  <Calendar size={12} />
                  <span>{contract.date}</span>
                </div>

                {/* Botões */}
                <div className="flex flex-wrap gap-2 items-center">
                  {/* PDF do relatório */}
                  <button
                    onClick={() => generateContractPDF(contract)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold transition-all"
                  >
                    <FileDown size={14} /> Baixar PDF
                  </button>

                  {/* Arquivo original */}
                  {contract.file_url && (
                    <a
                      href={contract.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all"
                    >
                      <ExternalLink size={14} /> Ver Arquivo
                    </a>
                  )}

                  {/* Apagar com confirmação */}
                  <div className="ml-auto">
                    {confirmDeleteId === contract.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Confirmar?</span>
                        <button
                          onClick={() => handleDelete(contract.id)}
                          disabled={deletingId === contract.id}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-70"
                        >
                          {deletingId === contract.id && <Loader2 size={12} className="animate-spin" />}
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(contract.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all"
                      >
                        <Trash2 size={14} /> Apagar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16 text-slate-600">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum contrato encontrado</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-700"
            >
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-emerald-600 text-white">
                <h2 className="text-xl font-bold">Cadastrar Contrato</h2>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Título do Contrato</label>
                  <input
                    required type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Data do Contrato</label>
                  <input
                    required type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Descrição / Notas</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">
                    Arquivo <span className="text-slate-600 font-normal">(PDF ou Imagem, opcional)</span>
                  </label>
                  <div className="relative h-24 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-emerald-500 hover:text-emerald-500 transition-all cursor-pointer bg-[#0f172a]">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {file ? (
                      <span className="text-emerald-400 font-bold text-sm px-4 text-center">{file.name}</span>
                    ) : (
                      <><Paperclip size={24} /><span className="text-xs mt-1">Clique para anexar</span></>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4 flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : 'Salvar Contrato'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
