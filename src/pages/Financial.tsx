import React, { useEffect, useState } from 'react';
import { Plus, DollarSign, TrendingUp, TrendingDown, FileDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { getExpenses, createExpense, getTrips } from '../services/firebaseService';
import { generateGeneralReportPDF } from '../services/reportService';

export default function Financial() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Manutenção'
  });

  const fetchData = async () => {
    const [e, t] = await Promise.all([getExpenses(), getTrips()]);
    setExpenses(e);
    setTrips(t);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createExpense({ ...formData, type: modalType });
    setShowModal(false);
    setFormData({ description: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Manutenção' });
    fetchData();
  };

  const tripRevenue = trips.length * 450;
  const manualIncome = expenses.filter(e => e.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalRevenue = tripRevenue + manualIncome;
  const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const profit = totalRevenue - totalExpenses;

  const pieData = [
    { name: 'Faturamento', value: totalRevenue, color: '#10b981' },
    { name: 'Despesas', value: totalExpenses, color: '#ef4444' },
  ];

  const exportReport = () => {
    const data = expenses.map(e => [
      e.date,
      e.description,
      e.category,
      e.type === 'income' ? 'Receita' : 'Despesa',
      `R$ ${e.amount.toLocaleString('pt-BR')}`
    ]);
    generateGeneralReportPDF('Relatório Financeiro', data, ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']);
  };

  const openModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setFormData(prev => ({ ...prev, category: type === 'income' ? 'Serviço Extra' : 'Manutenção' }));
    setShowModal(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Financeiro</h1>
          <p className="text-slate-400">Controle de entradas, saídas e lucratividade.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => openModal('income')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
            <Plus size={20} /> Nova Receita
          </button>
          <button onClick={() => openModal('expense')} className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-red-900/20 transition-all flex items-center gap-2">
            <Plus size={20} /> Nova Despesa
          </button>
          <button onClick={exportReport} className="bg-slate-800 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all border border-slate-700">
            <FileDown size={20} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><TrendingUp size={20} /></div>
            <span className="text-slate-400 font-bold text-sm uppercase">Entradas Totais</span>
          </div>
          <p className="text-3xl font-bold text-white">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
          <div className="mt-2 text-xs text-slate-500 flex justify-between">
            <span>Corridas: R$ {tripRevenue.toLocaleString('pt-BR')}</span>
            <span>Manual: R$ {manualIncome.toLocaleString('pt-BR')}</span>
          </div>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg"><TrendingDown size={20} /></div>
            <span className="text-slate-400 font-bold text-sm uppercase">Saídas Totais</span>
          </div>
          <p className="text-3xl font-bold text-white">R$ {totalExpenses.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><DollarSign size={20} /></div>
            <span className="text-slate-400 font-bold text-sm uppercase">Lucro Líquido</span>
          </div>
          <p className={`text-3xl font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>R$ {profit.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 bg-[#0f172a]">
            <h3 className="font-bold text-white">Últimas Transações</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#0f172a] border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Descrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Categoria</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-400">{exp.date}</td>
                    <td className="px-6 py-4 text-sm font-bold text-white">
                      <div className="flex items-center gap-2">
                        {exp.type === 'income' ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-red-400" />}
                        {exp.description}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-[10px] font-bold uppercase border border-slate-700">{exp.category}</span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${exp.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {exp.type === 'income' ? '+' : '-'} R$ {exp.amount.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col items-center justify-center">
          <h3 className="font-bold text-white mb-6 w-full">Resumo Financeiro</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
              <div className={`p-6 border-b border-slate-700 flex justify-between items-center text-white ${modalType === 'income' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                <h2 className="text-xl font-bold">{modalType === 'income' ? 'Lançar Receita' : 'Lançar Despesa'}</h2>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Descrição</label>
                  <input required type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 bg-[#0f172a] text-white ${modalType === 'income' ? 'focus:ring-emerald-500' : 'focus:ring-red-500'}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Valor (R$)</label>
                    <input required type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 bg-[#0f172a] text-white ${modalType === 'income' ? 'focus:ring-emerald-500' : 'focus:ring-red-500'}`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Data</label>
                    <input required type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 bg-[#0f172a] text-white ${modalType === 'income' ? 'focus:ring-emerald-500' : 'focus:ring-red-500'}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Categoria</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 bg-[#0f172a] text-white ${modalType === 'income' ? 'focus:ring-emerald-500' : 'focus:ring-red-500'}`}>
                    {modalType === 'income' ? <>
                      <option>Serviço Extra</option><option>Reembolso</option><option>Venda de Ativo</option><option>Outros</option>
                    </> : <>
                      <option>Manutenção</option><option>Combustível</option><option>Salários</option><option>Impostos</option><option>Outros</option>
                    </>}
                  </select>
                </div>
                <button type="submit" className={`w-full text-white font-bold py-3 rounded-xl shadow-lg transition-all mt-4 ${modalType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' : 'bg-red-600 hover:bg-red-700 shadow-red-900/20'}`}>
                  Salvar {modalType === 'income' ? 'Receita' : 'Despesa'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
