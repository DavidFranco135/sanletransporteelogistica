import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'motion/react';
import { Lock, Mail, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('sanleadm@gmail.com');
  const [password, setPassword] = useState('654326');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginWithEmail } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginWithEmail(email, password);
      navigate('/');
    } catch (err: any) {
      const msg =
        err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password'
          ? 'Email ou senha incorretos.'
          : err?.code === 'auth/user-not-found'
          ? 'Usuário não encontrado.'
          : 'Erro ao fazer login. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#1e293b] rounded-2xl shadow-2xl overflow-hidden border border-slate-800">

          {/* ── Área verde com logo preenchendo tudo ── */}
          <div className="bg-emerald-600 relative overflow-hidden" style={{ minHeight: 220 }}>
            {/* Logo ocupa toda a área verde */}
            <img
              src="/logo.png"
              alt="Sanle Transporte"
              className="w-full h-full object-contain absolute inset-0"
              style={{ padding: '12px 24px' }}
            />
            {/* Overlay sutil embaixo com nome */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-800/70 to-transparent px-6 py-4 text-center">
              <p className="text-emerald-100 text-sm font-medium">Sistema de Gestão</p>
              <p className="text-emerald-200/70 text-xs">CNPJ: 46.265.852/0001-01</p>
            </div>
          </div>

          {/* ── Formulário ── */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="text-center mb-2">
              <h1 className="text-xl font-bold text-white">Acesse o painel</h1>
              <p className="text-slate-400 text-sm">Entre com suas credenciais</p>
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-400 p-4 rounded-lg text-sm font-medium border border-red-500/20">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                <Mail size={16} /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-[#0f172a] text-white"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                <Lock size={16} /> Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-[#0f172a] text-white"
                placeholder="••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar no Sistema'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          &copy; {new Date().getFullYear()} Sanle Transportes Logística LTDA - ME — Todos os direitos reservados.
        </p>
      </motion.div>
    </div>
  );
}
