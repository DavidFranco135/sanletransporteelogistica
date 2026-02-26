import React, { useEffect, useState, useRef } from 'react';
import { Plus, DollarSign, TrendingUp, TrendingDown, FileDown, X, Truck, Building2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { getExpenses, createExpense } from '../services/firebaseService';
import { generateGeneralReportPDF } from '../services/reportService';

// ── Categorias ────────────────────────────────────────────────────────────────
const INCOME_CATEGORIES = ['Corrida', 'Empresa', 'Serviço Extra', 'Reembolso', 'Outros'];
const EXPENSE_CATEGORIES = ['Motorista', 'Manutenção', 'Combustível', 'Impostos', 'Outros'];

// Aba → filtro de categoria (null = todos)
type TabKey = 'all' | 'corrida' | 'empresa' | 'motorista';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; color: string; type?: 'income' | 'expense' }[] = [
  { key: 'all',       label: 'Todos',     icon: <DollarSign size={16} />,  color: 'border-slate-500 text-slate-300' },
  { key: 'corrida',   label: 'Corridas',  icon: <Truck size={16} />,       color: 'border-blue-500 text-blue-400',    type: 'income' },
  { key: 'empresa',   label: 'Empresas',  icon: <Building2 size={16} />,   color: 'border-emerald-500 text-emerald-400', type: 'income' },
  { key: 'motorista', label: 'Motoristas',icon: <User size={16} />,        color: 'border-orange-500 text-orange-400',  type: 'expense' },
];

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function getMonthOptions() {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    });
  }
  return months;
}

export default function Financial() {
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Manutenção',
  });

  const monthOptions = getMonthOptions();

  const fetchData = async () => {
    setLoading(true);
    try {
      const e = await getExpenses();
      setAllEntries(e);
    } catch (err) {
      console.error('Erro ao carregar financeiro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filtered = allEntries.filter(entry => {
    // Filtro de mês
    if (monthFilter !== 'all' && !(entry.date || '').startsWith(monthFilter)) return false;

    // Filtro de aba
    if (activeTab === 'all') return true;
    if (activeTab === 'corrida')   return entry.type === 'income'  && entry.category === 'Corrida';
    if (activeTab === 'empresa')   return entry.type === 'income'  && entry.category === 'Empresa';
    if (activeTab === 'motorista') return entry.type === 'expense' && entry.category === 'Motorista';
    return true;
  });

  // Totais da visualização atual
  const totalIncome   = filtered.filter(e => e.type === 'income').reduce((a, c) => a + c.amount, 0);
  const totalExpenses = filtered.filter(e => e.type === 'expense').reduce((a, c) => a + c.amount, 0);
  const profit = totalIncome - totalExpenses;

  // Totais globais para o gráfico (sem filtro de aba, só mês)
  const globalFiltered = allEntries.filter(e => monthFilter === 'all' || (e.date || '').startsWith(monthFilter));
  const globalIncome   = globalFiltered.filter(e => e.type === 'income').reduce((a, c) => a + c.amount, 0);
  const globalExpenses = globalFiltered.filter(e => e.type === 'expense').reduce((a, c) => a + c.amount, 0);

  const pieData = [
    { name: 'Entradas', value: globalIncome,   color: '#10b981' },
    { name: 'Saídas',   value: globalExpenses, color: '#ef4444' },
  ];

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createExpense({ ...formData, type: modalType });
    setShowModal(false);
    setFormData({ description: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Manutenção' });
    fetchData();
  };

  const openModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setFormData(prev => ({
      ...prev,
      category: type === 'income' ? 'Corrida' : 'Motorista',
    }));
    setShowModal(true);
  };

  // ── Ao clicar em aba, focar o tipo correto do modal
  const handleTabClick = (tab: TabKey) => {
    setActiveTab(tab);
  };

  // ── Exportar
  const exportReport = () => {
    const data = filtered.map(e => [
      e.date || '',
      e.description || '',
      e.category || '',
      e.type === 'income' ? 'Receita' : 'Despesa',
      `R$ ${fmt(e.amount)}`,
    ]);
    const title = activeTab === 'all' ? 'Relatório Financeiro' :
      activeTab === 'corrida' ? 'Relatório de Corridas' :
      activeTab === 'empresa' ? 'Relatório de Empresas' : 'Relatório de Motoristas';
    generateGeneralReportPDF(title, data, ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']);
  };

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Financeiro</h1>
          <p className="text-slate-400">Controle de entradas, saídas e lucratividade.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => openModal('income')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
            <Plus size={20} /> Nova Receita
          </button>
          <button onClick={() => openModal('expense')}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-red-900/20 transition-all flex items-center gap-2">
            <Plus size={20} /> Nova Despesa
          </button>
          <button onClick={exportReport}
            className="bg-slate-800 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-700 transition-all border border-slate-700">
            <FileDown size={20} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* ── Abas de categoria + Filtro de mês ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Abas */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
                activeTab === tab.key
                  ? `${tab.color} bg-slate-800`
                  : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Filtro de mês */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setMonthFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              monthFilter === 'all'
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            Todos
          </button>
          <select
            value={monthFilter === 'all' ? '' : monthFilter}
            onChange={e => setMonthFilter(e.target.value || 'all')}
            className="px-3 py-2 rounded-xl border border-slate-700 bg-[#1e293b] text-slate-300 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Selecionar mês...</option>
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Cards de totais ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl cursor-pointer hover:border-emerald-500/50 transition-all"
          onClick={() => { setActiveTab('all'); openModal('income'); }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><TrendingUp size={20} /></div>
            <span className="text-slate-400 font-bold text-sm uppercase">Entradas</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">R$ {fmt(totalIncome)}</p>
          {activeTab === 'all' && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>🚗 Corridas: R$ {fmt(globalFiltered.filter(e=>e.type==='income'&&e.category==='Corrida').reduce((a,c)=>a+c.amount,0))}</span>
                <span>🏢 Empresas: R$ {fmt(globalFiltered.filter(e=>e.type==='income'&&e.category==='Empresa').reduce((a,c)=>a+c.amount,0))}</span>
              </div>
            </div>
          )}
        </div>

        <div
          className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl cursor-pointer hover:border-red-500/50 transition-all"
          onClick={() => { setActiveTab('all'); openModal('expense'); }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg"><TrendingDown size={20} /></div>
            <span className="text-slate-400 font-bold text-sm uppercase">Saídas</span>
          </div>
          <p className="text-3xl font-bold text-red-400">R$ {fmt(totalExpenses)}</p>
          {activeTab === 'all' && (
            <p className="mt-2 text-xs text-slate-500">
              🧑‍✈️ Motoristas: R$ {fmt(globalFiltered.filter(e=>e.type==='expense'&&e.category==='Motorista').reduce((a,c)=>a+c.amount,0))}
            </p>
          )}
        </div>

        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><DollarSign size={20} /></div>
            <span className="text-slate-400 font-bold text-sm uppercase">Lucro Líquido</span>
          </div>
          <p className={`text-3xl font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            R$ {fmt(profit)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {activeTab !== 'all' ? `Filtrado: ${TABS.find(t=>t.key===activeTab)?.label}` : 'Total geral'}
            {monthFilter !== 'all' ? ` • ${monthOptions.find(m=>m.value===monthFilter)?.label}` : ''}
          </p>
        </div>
      </div>

      {/* ── Tabela + Gráfico ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela */}
        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              {TABS.find(t => t.key === activeTab)?.icon}
              {activeTab === 'all' ? 'Todas as Transações' :
               activeTab === 'corrida' ? 'Receitas — Corridas' :
               activeTab === 'empresa' ? 'Receitas — Empresas' : 'Despesas — Motoristas'}
            </h3>
            <span className="text-xs text-slate-500 font-bold">{filtered.length} registro(s)</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 animate-pulse">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-500">Nenhum lançamento encontrado.</p>
              <button
                onClick={() => openModal(TABS.find(t=>t.key===activeTab)?.type || 'income')}
                className="mt-3 text-emerald-400 text-sm font-bold hover:underline"
              >
                + Adicionar lançamento
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#0f172a] border-b border-slate-800">
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Descrição</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Categoria</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-4 text-sm text-slate-400 whitespace-nowrap">{exp.date}</td>
                      <td className="px-5 py-4 text-sm font-bold text-white">
                        <div className="flex items-center gap-2">
                          {exp.type === 'income'
                            ? <TrendingUp size={14} className="text-emerald-400 shrink-0" />
                            : <TrendingDown size={14} className="text-red-400 shrink-0" />}
                          {exp.description}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                          exp.category === 'Corrida'   ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          exp.category === 'Empresa'   ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          exp.category === 'Motorista' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className={`px-5 py-4 text-sm font-bold text-right whitespace-nowrap ${
                        exp.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {exp.type === 'income' ? '+' : '-'} R$ {fmt(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Gráfico */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col">
          <h3 className="font-bold text-white mb-4">Resumo Financeiro</h3>
          {(globalIncome + globalExpenses) === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Sem dados no período
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={78} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [`R$ ${fmt(v)}`, '']}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: 8 }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Breakdown por categoria */}
          <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
            {[
              { label: '🚗 Corridas',    val: globalFiltered.filter(e=>e.type==='income'&&e.category==='Corrida').reduce((a,c)=>a+c.amount,0),   color:'text-blue-400' },
              { label: '🏢 Empresas',    val: globalFiltered.filter(e=>e.type==='income'&&e.category==='Empresa').reduce((a,c)=>a+c.amount,0),   color:'text-emerald-400' },
              { label: '🧑‍✈️ Motoristas', val: globalFiltered.filter(e=>e.type==='expense'&&e.category==='Motorista').reduce((a,c)=>a+c.amount,0), color:'text-orange-400' },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-xs">
                <span className="text-slate-400">{item.label}</span>
                <span className={`font-bold ${item.color}`}>R$ {fmt(item.val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
              <div className={`p-6 border-b border-slate-700 flex justify-between items-center text-white ${modalType === 'income' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                <h2 className="text-xl font-bold">{modalType === 'income' ? '+ Lançar Receita' : '- Lançar Despesa'}</h2>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Descrição</label>
                  <input required type="text" value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder={modalType === 'income' ? 'Ex: Corrida para Aeroporto' : 'Ex: Pagamento motorista João'}
                    className={`w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 bg-[#0f172a] text-white ${modalType === 'income' ? 'focus:ring-emerald-500' : 'focus:ring-red-500'}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Valor (R$)</label>
                    <input required type="number" step="0.01" min="0.01" value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 bg-[#0f172a] text-white ${modalType === 'income' ? 'focus:ring-emerald-500' : 'focus:ring-red-500'}`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Data</label>
                    <input required type="date" value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 bg-[#0f172a] text-white ${modalType === 'income' ? 'focus:ring-emerald-500' : 'focus:ring-red-500'}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-400">Categoria</label>
                  <select value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 bg-[#0f172a] text-white ${modalType === 'income' ? 'focus:ring-emerald-500' : 'focus:ring-red-500'}`}>
                    {(modalType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <button type="submit"
                  className={`w-full text-white font-bold py-3 rounded-xl shadow-lg transition-all ${modalType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
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
