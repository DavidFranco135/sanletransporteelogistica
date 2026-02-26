import React, { useEffect, useState } from 'react';
import { FileDown, Search } from 'lucide-react';
import { getTrips } from '../services/firebaseService';
import { generateTripPDF, generateGeneralReportPDF } from '../services/reportService';

export default function Trips() {
  const [trips, setTrips] = useState<any[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  useEffect(() => {
    getTrips().then(data => { setTrips(data); setFilteredTrips(data); });
  }, []);

  useEffect(() => {
    let result = trips;
    if (searchTerm) {
      result = result.filter(t =>
        (t.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.driver_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.origin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.destination || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterDay) result = result.filter(t => t.date === filterDay);
    if (filterMonth) result = result.filter(t => (t.date || '').startsWith(filterMonth));
    setFilteredTrips(result);
  }, [searchTerm, filterDay, filterMonth, trips]);

  const exportReport = () => {
    const data = filteredTrips.map(t => [
      t.date || '',
      t.company_name || '',
      t.driver_name || '',
      `${t.origin || ''} → ${t.destination || ''}`,
      `${(t.km_end || 0) - (t.km_start || 0)} KM`
    ]);
    generateGeneralReportPDF('Relatório de Corridas', data, ['Data', 'Empresa', 'Motorista', 'Rota', 'KM']);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Corridas Realizadas</h1>
        <p className="text-slate-400">Histórico completo de viagens finalizadas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white" />
        </div>
        <input type="date" value={filterDay} onChange={(e) => { setFilterDay(e.target.value); setFilterMonth(''); }}
          className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white text-sm" />
        <input type="month" value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setFilterDay(''); }}
          className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#1e293b] text-white text-sm" />
        <button onClick={() => { setSearchTerm(''); setFilterDay(''); setFilterMonth(''); }}
          className="bg-slate-700 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-600 transition-all border border-slate-600">
          Todas
        </button>
        <button onClick={exportReport}
          className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20">
          <FileDown size={20} /> PDF
        </button>
      </div>

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
              {filteredTrips.map((trip) => (
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
                    <div className="text-sm font-bold text-emerald-400">{(trip.km_end || 0) - (trip.km_start || 0)} KM</div>
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
