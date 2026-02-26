import React, { useEffect, useState } from 'react';
import { FileDown, Search, Building2, X } from 'lucide-react';
import { getTrips, getCompanies } from '../services/firebaseService';
import { generateTripPDF, generateTripsReportPDF } from '../services/reportService';

export default function Trips() {
  const [trips, setTrips]                 = useState<any[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<any[]>([]);
  const [companies, setCompanies]         = useState<any[]>([]);
  const [searchTerm, setSearchTerm]       = useState('');
  const [filterDay, setFilterDay]         = useState('');
  const [filterMonth, setFilterMonth]     = useState('');
  const [filterCompany, setFilterCompany] = useState('');

  useEffect(() => {
    Promise.all([getTrips(), getCompanies()]).then(([t, c]) => {
      setTrips(t);
      setFilteredTrips(t);
      setCompanies(c);
    });
  }, []);

  useEffect(() => {
    let result = trips;
    if (searchTerm)     result = result.filter(t =>
      (t.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.driver_name  || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.origin       || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.destination  || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filterCompany)  result = result.filter(t => t.company_name === filterCompany);
    if (filterDay)      result = result.filter(t => t.date === filterDay);
    if (filterMonth)    result = result.filter(t => (t.date || '').startsWith(filterMonth));
    setFilteredTrips(result);
  }, [searchTerm, filterDay, filterMonth, filterCompany, trips]);

  const clearFilters = () => {
    setSearchTerm(''); setFilterDay(''); setFilterMonth(''); setFilterCompany('');
  };

  const hasActiveFilter = !!(searchTerm || filterDay || filterMonth || filterCompany);

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
        {/* Busca */}
        <div className="relative lg:col-span-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
          <input type="text" placeholder="Buscar motorista, rota..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white text-sm" />
        </div>

        {/* Empresa */}
        <div className="relative lg:col-span-3">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
          <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white text-sm appearance-none">
            <option value="">Todas as empresas</option>
            {companies.map((c: any) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Data */}
        <input type="date" value={filterDay}
          onChange={(e) => { setFilterDay(e.target.value); setFilterMonth(''); }}
          className="lg:col-span-2 w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white text-sm" />

        {/* Mês */}
        <input type="month" value={filterMonth}
          onChange={(e) => { setFilterMonth(e.target.value); setFilterDay(''); }}
          className="lg:col-span-2 w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white text-sm" />

        {/* Limpar */}
        <button onClick={clearFilters}
          className="lg:col-span-1 bg-slate-700 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-600 transition-all border border-slate-600 text-sm">
          Limpar
        </button>

        {/* PDF */}
        <button onClick={exportReport}
          className="lg:col-span-1 bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-1 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 text-sm">
          <FileDown size={18} /> PDF
        </button>
      </div>

      {/* Badges de filtros ativos */}
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
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-500">
                    <Search size={36} className="mx-auto mb-3 opacity-30" />
                    <p>Nenhuma corrida encontrada com os filtros aplicados.</p>
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
                      {(trip.km_end || 0) - (trip.km_start || 0)} KM
                    </div>
                    <div className="text-xs text-slate-500">{trip.km_start} - {trip.km_end}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => generateTripPDF(trip)}
                      className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-400 transition-colors inline-flex items-center gap-1 text-xs font-bold">
                      <FileDown size={18} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
