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
      const msg = err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password'
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
          {/* Header with logo */}
          <div className="p-8 bg-emerald-600 text-white text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden border-4 border-white/30">
                <img
                  src="/logo.png"
                  alt="Sanle Transporte"
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Sanle Transporte</h1>
                <p className="text-emerald-100 mt-1 text-sm">Acesse o painel administrativo</p>
                <p className="text-emerald-200/70 text-xs mt-1">CNPJ: 46.265.852/0001-01</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? <Loader2 className="animate-spin" /> : 'Entrar no Sistema'}
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
