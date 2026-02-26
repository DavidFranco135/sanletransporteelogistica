import React, { useEffect, useState } from 'react';
import { FileDown, Search, Building2, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTrips, getCompanies, deleteTrip } from '../services/firebaseService';
import { generateTripPDF, generateTripsReportPDF } from '../services/reportService';

export default function Trips() {
  const [trips, setTrips]                 = useState<any[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<any[]>([]);
  const [companies, setCompanies]         = useState<any[]>([]);
  const [searchTerm, setSearchTerm]       = useState('');
  const [filterDay, setFilterDay]         = useState('');
  const [filterMonth, setFilterMonth]     = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchData = async () => {
    const [t, c] = await Promise.all([getTrips(), getCompanies()]);
    setTrips(t);
    setFilteredTrips(t);
    setCompanies(c);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let result = trips;
    if (searchTerm)    result = result.filter(t =>
      (t.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.driver_name  || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.origin       || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.destination  || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filterCompany) result = result.filter(t => t.company_name === filterCompany);
    if (filterDay)     result = result.filter(t => t.date === filterDay);
    if (filterMonth)   result = result.filter(t => (t.date || '').startsWith(filterMonth));
    setFilteredTrips(result);
  }, [searchTerm, filterDay, filterMonth, filterCompany, trips]);

  const clearFilters = () => {
    setSearchTerm(''); setFilterDay(''); setFilterMonth(''); setFilterCompany('');
  };

  const hasActiveFilter = !!(searchTerm || filterDay || filterMonth || filterCompany);

  const handleDelete = async (id: string) => {
    try {
      await deleteTrip(id);
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao apagar corrida:', err);
    }
  };

  const exportReport = () => {
    let period = '';
    if (filterMonth) {
      const [y, m] = filterMonth.split('-');
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      period = `01/${m}/${y} – ${lastDay}/${m}/${y}`;
    } else if (filterDay) {
      period = filterDay.split('-').reverse().join('/');
    }
    generateTripsReportPDF(filteredTrips, {
      title: filterCompany ? `Corridas — ${filterCompany}` : 'Relatório Geral de Corridas',
      period,
    });
  };

  const totalKm = filteredTrips.reduce(
    (sum, t) => sum + ((Number(t.km_end) || 0) - (Number(t.km_start) || 0)), 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Corridas Realizadas</h1>
        <p className="text-slate-400">Histórico completo de viagens finalizadas.</p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3">
        <div className="relative lg:col-span-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
          <input type="text" placeholder="Buscar motorista, rota..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white text-sm" />
        </div>
        <div className="relative lg:col-span-3">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
          <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white text-sm appearance-none">
            <option value="">Todas as empresas</option>
            {companies.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <input type="date" value={filterDay}
          onChange={(e) => { setFilterDay(e.target.value); setFilterMonth(''); }}
          className="lg:col-span-2 w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white text-sm" />
        <input type="month" value={filterMonth}
          onChange={(e) => { setFilterMonth(e.target.value); setFilterDay(''); }}
          className="lg:col-span-2 w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white text-sm" />
        <button onClick={clearFilters}
          className="lg:col-span-1 bg-slate-700 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-600 transition-all border border-slate-600 text-sm">
          Limpar
        </button>
        <button onClick={exportReport}
          className="lg:col-span-1 bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-1 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 text-sm">
          <FileDown size={18} /> PDF
        </button>
      </div>

      {/* Badges filtros ativos */}
      {hasActiveFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Filtros ativos:</span>
          {filterCompany && (
            <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full">
              <Building2 size={12} /> {filterCompany}
              <button onClick={() => setFilterCompany('')} className="ml-1 hover:text-white"><X size={11} /></button>
            </span>
          )}
          {filterDay && (
            <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold px-3 py-1 rounded-full">
              📅 {filterDay.split('-').reverse().join('/')}
              <button onClick={() => setFilterDay('')} className="ml-1 hover:text-white"><X size={11} /></button>
            </span>
          )}
          {filterMonth && (
            <span className="flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs font-bold px-3 py-1 rounded-full">
              📅 {filterMonth.split('-').reverse().join('/')}
              <button onClick={() => setFilterMonth('')} className="ml-1 hover:text-white"><X size={11} /></button>
            </span>
          )}
          {searchTerm && (
            <span className="flex items-center gap-1 bg-slate-700 text-slate-300 border border-slate-600 text-xs font-bold px-3 py-1 rounded-full">
              🔍 "{searchTerm}"
              <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-white"><X size={11} /></button>
            </span>
          )}
          <span className="text-xs text-slate-500 ml-auto">
            {filteredTrips.length} corrida{filteredTrips.length !== 1 ? 's' : ''}
            {totalKm > 0 && <> · <span className="text-emerald-400 font-bold">{totalKm} km total</span></>}
          </span>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-[#1e293b] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a] border-b border-slate-800">
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Empresa / Motorista</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Rota</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">KM</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-500">
                    <Search size={36} className="mx-auto mb-3 opacity-30" />
                    <p>Nenhuma corrida encontrada.</p>
                  </td>
                </tr>
              ) : filteredTrips.map((trip) => (
                <tr key={trip.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-white">{trip.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{trip.company_name}</div>
                    <div className="text-sm text-slate-400">{trip.driver_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-300 flex items-center gap-1">
                      <span className="font-semibold">{trip.origin}</span>
                      <span className="text-slate-600">→</span>
                      <span className="font-semibold">{trip.destination}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-emerald-400">
                      {(Number(trip.km_end) || 0) - (Number(trip.km_start) || 0)} KM
                    </div>
                    <div className="text-xs text-slate-500">{trip.km_start} - {trip.km_end}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => generateTripPDF(trip)}
                        className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-400 transition-colors inline-flex items-center gap-1 text-xs font-bold"
                        title="Baixar PDF">
                        <FileDown size={18} /> PDF
                      </button>
                      <button onClick={() => setConfirmDelete(trip.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                        title="Apagar corrida">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Confirmar Exclusão */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDelete(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#1e293b] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-red-500/30 p-6 text-center">
              <Trash2 size={40} className="mx-auto text-red-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Apagar Corrida?</h3>
              <p className="text-slate-400 text-sm mb-6">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600 transition-colors">Cancelar</button>
                <button onClick={() => handleDelete(confirmDelete)} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">Apagar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
