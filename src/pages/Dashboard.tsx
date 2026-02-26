import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Truck, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getDashboardStats } from '../services/firebaseService';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => (
  <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl">
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
  </div>
);

const chartData = [
  { name: 'Seg', faturamento: 4000, despesas: 2400 },
  { name: 'Ter', faturamento: 3000, despesas: 1398 },
  { name: 'Qua', faturamento: 2000, despesas: 9800 },
  { name: 'Qui', faturamento: 2780, despesas: 3908 },
  { name: 'Sex', faturamento: 1890, despesas: 4800 },
  { name: 'Sáb', faturamento: 2390, despesas: 3800 },
  { name: 'Dom', faturamento: 3490, despesas: 4300 },
];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    getDashboardStats().then(setStats);
  }, []);

  if (!stats) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-slate-400 text-lg animate-pulse">Carregando...</div>
    </div>
  );

  const profit = stats.revenue - stats.expenses;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Bem-vindo ao painel de controle da Sanle.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de Corridas" value={stats.trips} icon={Truck} trend="up" trendValue="12%" color="bg-blue-600" />
        <StatCard title="Faturamento Total" value={`R$ ${stats.revenue.toLocaleString('pt-BR')}`} icon={DollarSign} trend="up" trendValue="8%" color="bg-emerald-600" />
        <StatCard title="Total de Despesas" value={`R$ ${stats.expenses.toLocaleString('pt-BR')}`} icon={TrendingDown} trend="down" trendValue="5%" color="bg-red-600" />
        <StatCard title="Lucro Líquido" value={`R$ ${profit.toLocaleString('pt-BR')}`} icon={TrendingUp} trend="up" trendValue="15%" color="bg-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6">Faturamento vs Despesas</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }} itemStyle={{ color: '#f8fafc' }} />
                <Bar dataKey="faturamento" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6">Desempenho Operacional</h3>
          <div className="h-80">
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
                <Area type="monotone" dataKey="faturamento" stroke="#6366f1" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
