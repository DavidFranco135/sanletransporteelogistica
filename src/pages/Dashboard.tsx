import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Truck, DollarSign, ArrowUpRight, ArrowDownRight, Users, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getDashboardStats } from '../services/firebaseService';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color, onClick, subtitle }: any) => (
  <div
    onClick={onClick}
    className={`bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl transition-all ${onClick ? 'cursor-pointer hover:border-slate-600 hover:shadow-2xl hover:-translate-y-0.5' : ''}`}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} text-white shadow-lg`}><Icon size={24} /></div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {trendValue}
        </div>
      )}
    </div>
    <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-white">{value}</p>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    {onClick && <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">Ver detalhes →</p>}
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardStats().then(setStats).catch(console.error);
  }, []);

  if (!stats) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">Carregando dashboard...</p>
      </div>
    </div>
  );

  const profit = stats.revenue - stats.expenses;

  // Gráfico mensal com dados reais
  const chartData = stats.monthlyData || [
    { name: 'Seg', faturamento: 0, despesas: 0 },
    { name: 'Ter', faturamento: 0, despesas: 0 },
    { name: 'Qua', faturamento: 0, despesas: 0 },
    { name: 'Qui', faturamento: 0, despesas: 0 },
    { name: 'Sex', faturamento: 0, despesas: 0 },
    { name: 'Sáb', faturamento: 0, despesas: 0 },
    { name: 'Dom', faturamento: 0, despesas: 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Bem-vindo ao painel de controle da Sanle.</p>
      </div>

      {/* Cards clicáveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Corridas"
          value={stats.trips}
          icon={Truck}
          color="bg-blue-600"
          subtitle="Corridas finalizadas"
          onClick={() => navigate('/corridas')}
        />
        <StatCard
          title="Faturamento Total"
          value={`R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="bg-emerald-600"
          subtitle="Entradas registradas"
          onClick={() => navigate('/financeiro')}
        />
        <StatCard
          title="Total de Despesas"
          value={`R$ ${stats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
          color="bg-red-600"
          subtitle="Saídas registradas"
          onClick={() => navigate('/financeiro')}
        />
        <StatCard
          title="Lucro Líquido"
          value={`R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          color={profit >= 0 ? 'bg-indigo-600' : 'bg-orange-600'}
          subtitle={profit >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
        />
      </div>

      {/* Cards secundários */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => navigate('/motoristas')}
          className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-xl cursor-pointer hover:border-slate-600 transition-all flex items-center gap-4"
        >
          <div className="p-3 bg-purple-600 rounded-xl text-white shadow-lg"><Users size={22} /></div>
          <div>
            <p className="text-slate-400 text-sm">Motoristas</p>
            <p className="text-xl font-bold text-white">{stats.drivers ?? '—'}</p>
          </div>
          <span className="ml-auto text-slate-600 text-xs">Ver →</span>
        </div>
        <div
          onClick={() => navigate('/empresas')}
          className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-xl cursor-pointer hover:border-slate-600 transition-all flex items-center gap-4"
        >
          <div className="p-3 bg-amber-600 rounded-xl text-white shadow-lg"><Building2 size={22} /></div>
          <div>
            <p className="text-slate-400 text-sm">Empresas</p>
            <p className="text-xl font-bold text-white">{stats.companies ?? '—'}</p>
          </div>
          <span className="ml-auto text-slate-600 text-xs">Ver →</span>
        </div>
        <div
          onClick={() => navigate('/servicos')}
          className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-xl cursor-pointer hover:border-slate-600 transition-all flex items-center gap-4"
        >
          <div className="p-3 bg-teal-600 rounded-xl text-white shadow-lg"><Truck size={22} /></div>
          <div>
            <p className="text-slate-400 text-sm">Serviços Ativos</p>
            <p className="text-xl font-bold text-white">{stats.activeServices ?? '—'}</p>
          </div>
          <span className="ml-auto text-slate-600 text-xs">Ver →</span>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-2">Faturamento vs Despesas</h3>
          <p className="text-xs text-slate-500 mb-5">Últimos 7 dias da semana</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }} itemStyle={{ color: '#f8fafc' }} />
                <Bar dataKey="faturamento" name="Faturamento" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-2">Desempenho Operacional</h3>
          <p className="text-xs text-slate-500 mb-5">Evolução de faturamento</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }} itemStyle={{ color: '#f8fafc' }} />
                <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#6366f1" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
