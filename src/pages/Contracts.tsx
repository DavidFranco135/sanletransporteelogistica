import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Plus, Search, FileText, Download, X, Calendar, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Contracts() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const { token } = useAuthStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    const res = await fetch('/api/contracts', { headers: { 'Authorization': `Bearer ${token}` } });
    setContracts(await res.json());
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('date', formData.date);
    if (file) data.append('file', file);

    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: data,
    });
    if (res.ok) {
      setShowModal(false);
      setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0] });
      setFile(null);
      fetchData();
    }
  };

  const filtered = contracts.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));

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
          <div key={contract.id} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl flex items-start gap-4 hover:shadow-2xl transition-all">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <FileText size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white truncate">{contract.title}</h3>
              <p className="text-sm text-slate-400 mb-2">{contract.description}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar size={12} /> {new Date(contract.date).toLocaleDateString('pt-BR')}
                </div>
                {contract.file_url && (
                  <a
                    href={contract.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:underline"
                  >
                    <Download size={12} /> Baixar Arquivo
                  </a>
                )}
              </div>
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
                <h2 className="text-xl font-bold">Cadastrar Contrato</h2>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Título do Contrato</label>
                  <input required type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Data do Contrato</label>
                  <input required type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Descrição / Notas</label>
                  <textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Arquivo do Contrato (PDF/Imagem)</label>
                  <div className="relative h-24 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-emerald-500 hover:text-emerald-500 transition-all cursor-pointer bg-[#0f172a]">
                    <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {file ? (
                      <span className="text-emerald-400 font-bold">{file.name}</span>
                    ) : (
                      <>
                        <Paperclip size={24} />
                        <span className="text-xs mt-1">Anexar arquivo</span>
                      </>
                    )}
                  </div>
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4">Salvar Contrato</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
