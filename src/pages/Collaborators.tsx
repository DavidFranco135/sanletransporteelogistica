import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Plus, Shield, X, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCollaborators, createCollaborator } from '../services/firebaseService';

const AVAILABLE_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'trips', label: 'Corridas' },
  { id: 'services', label: 'Serviços' },
  { id: 'companies', label: 'Empresas' },
  { id: 'drivers', label: 'Motoristas' },
  { id: 'vehicles', label: 'Carros' },
  { id: 'contracts', label: 'Contratos' },
  { id: 'finance', label: 'Financeiro' },
];

export default function Collaborators() {
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { user: currentUser } = useAuthStore();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', permissions: [] as string[] });

  const fetchData = async () => setCollaborators(await getCollaborators());
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCollaborator(formData);
    setShowModal(false);
    setFormData({ name: '', email: '', password: '', permissions: [] });
    fetchData();
  };

  const togglePermission = (perm: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield size={64} className="mx-auto text-slate-700 mb-4" />
          <h2 className="text-xl font-bold text-white">Acesso Restrito</h2>
          <p className="text-slate-500">Apenas administradores podem gerenciar colaboradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Colaboradores</h1>
          <p className="text-slate-400">Gerencie acessos e permissões da equipe.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
          <Plus size={20} /> Novo Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collaborators.map((colab) => (
          <div key={colab.id} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#0f172a] text-emerald-400 rounded-xl flex items-center justify-center font-bold border border-slate-800">
                {colab.name?.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-white">{colab.name}</h3>
                <p className="text-xs text-slate-500">{colab.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Acessos Permitidos</span>
              <div className="flex flex-wrap gap-1">
                {colab.permissions?.length > 0 ? colab.permissions.map((p: string) => (
                  <span key={p} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold uppercase border border-emerald-500/20">
                    {AVAILABLE_PAGES.find(ap => ap.id === p)?.label || p}
                  </span>
                )) : <span className="text-xs text-slate-500 italic">Nenhum acesso especial</span>}
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
                <h2 className="text-xl font-bold">Cadastrar Colaborador</h2>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {[['name', 'Nome Completo', 'text'], ['email', 'Email de Login', 'email'], ['password', 'Senha Inicial', 'password']].map(([field, label, type]) => (
                  <div key={field} className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">{label}</label>
                    <input required type={type} value={(formData as any)[field]} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                  </div>
                ))}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400">Janelas de Acesso</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_PAGES.map(page => (
                      <button key={page.id} type="button" onClick={() => togglePermission(page.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium ${formData.permissions.includes(page.id) ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-[#0f172a] border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                        {formData.permissions.includes(page.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                        {page.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4">Criar Colaborador</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
