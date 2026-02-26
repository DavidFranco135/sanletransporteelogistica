import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'motion/react';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { auth, db as fdb } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Login() {
  const [email, setEmail] = useState('sanleadm@gmail.com');
  const [password, setPassword] = useState('654326');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();

      // 2. Fetch user profile from Firestore or fallback to API
      // For now, we'll still call the backend to get the user object if needed,
      // but we can also just use the Firebase user.
      // Let's try to get the user role from Firestore if it exists.
      const userDoc = await getDoc(doc(fdb, 'users', user.uid));
      let userData = {
        id: user.uid,
        email: user.email || '',
        name: user.displayName || user.email?.split('@')[0] || 'Usuário',
        role: 'collaborator',
        permissions: [] as string[]
      };

      if (userDoc.exists()) {
        const data = userDoc.data();
        userData = { ...userData, ...data } as any;
      } else {
        // Fallback: Check if we should sync from SQLite? 
        // For now, just use defaults or call the legacy login if Firebase fails
      }

      setAuth(userData as any, token);
      navigate('/');
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      // Fallback to legacy login if Firebase user doesn't exist yet
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          setAuth(data.user, data.token);
          navigate('/');
        } else {
          setError(err.message || 'Erro ao fazer login');
        }
      } catch (fallbackErr) {
        setError('Erro de conexão com o servidor');
      }
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
          <div className="p-8 bg-emerald-600 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-bold">Sanle Transporte</h1>
            <p className="text-emerald-100 mt-1">Acesse o painel administrativo</p>
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
        <p className="text-center text-slate-500 text-sm mt-8">
          &copy; 2024 Sanle Transporte e Logística. Todos os direitos reservados.
        </p>
      </motion.div>
    </div>
  );
}
