import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, CheckCircle2, Loader2, AlertCircle, Calendar, User, Clock, Gauge, PenTool, Save, Check } from 'lucide-react';
import { getServiceByToken, acceptService, completeService } from '../services/firebaseService';
import { generateTripPDF } from '../services/reportService';
import { ensureAuth } from '../lib/firebase';

export default function DriverLink() {
  const { token } = useParams();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [completedTrip, setCompletedTrip] = useState<any>(null);
  const [error, setError] = useState('');
  const [isAccepted, setIsAccepted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    origin: '',
    destination: '',
    km_start: '',
    km_end: '',
    observations: '',
    user_name: '',
    finished_at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    stopped_hours: '0',
    stopped_reason: ''
  });

  const fetchService = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      // Autenticação anônima ANTES de qualquer chamada ao Firestore
      await ensureAuth();

      const data = await getServiceByToken(token);
      if (!data) {
        setError('Serviço não encontrado ou link inválido.');
        return;
      }
      setService(data);
      setIsAccepted(data.status === 'accepted' || data.status === 'completed');
      if (data.status === 'completed') setSuccess(true);
      setFormData(prev => ({
        ...prev,
        description: data.description || '',
        origin: data.origin || '',
        destination: data.destination || '',
      }));
    } catch (err: any) {
      console.error('Erro ao carregar serviço:', err);
      setError('Erro ao carregar serviço: ' + (err?.message || 'Verifique sua conexão e tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchService(); }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setSubmitting(true);
    setError('');
    try {
      await ensureAuth();
      await acceptService(token);
      setIsAccepted(true);
      setService((s: any) => ({ ...s, status: 'accepted' }));
    } catch (err: any) {
      setError('Erro ao aceitar serviço: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSignature) { alert('Por favor, o usuário deve assinar antes de finalizar.'); return; }
    if (!token) return;
    setSubmitting(true);
    setError('');
    const signature_url = canvasRef.current?.toDataURL();
    try {
      await ensureAuth();
      await completeService(token, { ...formData, signature_url });
      const tripForPDF = {
        ...service, ...formData, signature_url,
        km_start: Number(formData.km_start),
        km_end: Number(formData.km_end),
      };
      setCompletedTrip(tripForPDF);
      setSuccess(true);
    } catch (err: any) {
      setError('Erro ao finalizar serviço: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const totalKm = (parseFloat(formData.km_end) || 0) - (parseFloat(formData.km_start) || 0);

// Abre navegação no Google Maps ou Waze
const openMaps = (address: string) => {
  const encoded = encodeURIComponent(address);
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
};

const openWaze = (address: string) => {
  const encoded = encodeURIComponent(address);
  window.open(`https://waze.com/ul?q=${encoded}&navigate=yes`, '_blank');
};



  // ── LOADING ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-4">
      <img src="/logo.png" alt="Sanle" className="w-24 opacity-60 animate-pulse" />
      <Loader2 className="animate-spin text-emerald-500" size={40} />
      <p className="text-slate-500 text-sm">Carregando serviço...</p>
    </div>
  );

  // ── ERROR ──────────────────────────────────────────────────────────────────
  if (error && !service) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-slate-800">
        <img src="/logo.png" alt="Sanle" className="w-24 mx-auto mb-6 opacity-60" />
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold text-white mb-2">Ops!</h1>
        <p className="text-slate-400 mb-6 text-sm">{error}</p>
        <button onClick={fetchService} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold w-full">
          Tentar Novamente
        </button>
      </div>
    </div>
  );

  // ── SUCCESS ────────────────────────────────────────────────────────────────
  if (success) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1e293b] p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-emerald-500/20">
        <img src="/logo.png" alt="Sanle" className="w-28 mx-auto mb-4" />
        <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={56} />
        <h1 className="text-2xl font-bold text-white mb-2">Serviço Finalizado!</h1>
        <p className="text-slate-400 mb-6">
          Obrigado, <span className="text-white font-bold">{service?.driver_name}</span>. Seus dados foram enviados com sucesso para a central.
        </p>
        {completedTrip && (
          <button onClick={() => generateTripPDF(completedTrip)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 mb-4 transition-all">
            <Save size={18} /> Baixar Relatório PDF
          </button>
        )}
        <div className="text-xs text-slate-500">Sanle Transportes Logística LTDA - ME</div>
        <div className="text-xs text-slate-600">CNPJ: 46.265.852/0001-01</div>
      </motion.div>
    </div>
  );

  // ── MAIN ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f172a] pb-12">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white px-6 pt-10 pb-16 text-center shadow-2xl">
        <img src="/logo.png" alt="Sanle Transporte" className="w-32 mx-auto mb-4 drop-shadow-xl"
          style={{ filter: 'brightness(0) invert(1)' }} />
        <h1 className="text-2xl font-bold tracking-tight">Ordem de Serviço</h1>
        <p className="text-emerald-100 text-sm mt-1">OS #{String(service?.os_number || '').toString().padStart(4, '0') || String(service?.id || '').slice(-4).toUpperCase()}</p>
        <p className="text-emerald-200/70 text-xs mt-1">Sanle Transportes Logística LTDA - ME</p>
      </div>

      <div className="max-w-2xl mx-auto -mt-8 px-4">
        <div className="bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">

          {error && (
            <div className="mx-6 mt-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          {/* Info da corrida */}
          <div className="p-6 bg-[#0f172a] border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
              <AlertCircle size={16} /> Detalhes da Corrida
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User size={18} className="text-emerald-400 mt-1" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Cliente / Empresa</span>
                    <p className="text-white font-bold">{service?.customer_name || 'N/A'} ({service?.company_name || 'N/A'})</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-emerald-400 mt-1" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Data e Hora Agendada</span>
                    <p className="text-white font-bold">
                      {service?.scheduled_at ? new Date(service.scheduled_at).toLocaleString('pt-BR') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-red-400 mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Origem</span>
                    <p className="text-white font-bold">{service?.origin || 'N/A'}</p>
                    {service?.origin && (
                      <div className="flex gap-2 mt-2">
                        <button type="button" onClick={() => openMaps(service.origin)}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold transition-all">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                          Maps
                        </button>
                        <button type="button" onClick={() => openWaze(service.origin)}
                          className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg text-[10px] font-bold transition-all">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 6.63C19.08 4.45 16.89 3 14.35 3c-1.6 0-3.06.55-4.22 1.45C9.41 4.17 8.6 4 7.75 4 4.58 4 2 6.58 2 9.75c0 1.93.93 3.64 2.36 4.71L6 20h12l1.59-5.49C21.02 13.44 22 11.7 22 9.75c0-1.17-.18-2.12-.46-3.12z"/></svg>
                          Waze
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Navigation size={18} className="text-blue-400 mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Destino</span>
                    <p className="text-white font-bold">{service?.destination || 'N/A'}</p>
                    {service?.destination && (
                      <div className="flex gap-2 mt-2">
                        <button type="button" onClick={() => openMaps(service.destination)}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold transition-all">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                          Maps
                        </button>
                        <button type="button" onClick={() => openWaze(service.destination)}
                          className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg text-[10px] font-bold transition-all">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 6.63C19.08 4.45 16.89 3 14.35 3c-1.6 0-3.06.55-4.22 1.45C9.41 4.17 8.6 4 7.75 4 4.58 4 2 6.58 2 9.75c0 1.93.93 3.64 2.36 4.71L6 20h12l1.59-5.49C21.02 13.44 22 11.7 22 9.75c0-1.17-.18-2.12-.46-3.12z"/></svg>
                          Waze
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!isAccepted && (
              <button onClick={handleAccept} disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70">
                {submitting ? <Loader2 className="animate-spin" /> : <><Check size={20} /> Aceitar Corrida</>}
              </button>
            )}
          </div>

          {/* Formulário */}
          <AnimatePresence>
            {isAccepted && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="p-6 space-y-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                      <PenTool size={16} /> Assinatura do Usuário
                    </h3>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-400">Nome do Usuário Transportado</label>
                      <input required type="text" placeholder="Nome de quem assina"
                        value={formData.user_name}
                        onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-400">Assinatura</label>
                      <div className="bg-white rounded-xl overflow-hidden border-2 border-slate-700">
                        <canvas ref={canvasRef} width={600} height={200}
                          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
                          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                          className="w-full h-40 cursor-crosshair touch-none" />
                      </div>
                      <div className="flex justify-between">
                        <button type="button" onClick={clearSignature} className="text-xs text-red-400 font-bold hover:underline">Limpar Assinatura</button>
                        <span className="text-[10px] text-slate-500 italic">Assine dentro do quadro branco</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Gauge size={16} /> Dados da Viagem
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-400">KM Inicial</label>
                        <input required type="number" value={formData.km_start}
                          onChange={(e) => setFormData({ ...formData, km_start: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-400">KM Final</label>
                        <input required type="number" value={formData.km_end}
                          onChange={(e) => setFormData({ ...formData, km_end: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-400">Hora Finalizada</label>
                        <input required type="time" value={formData.finished_at}
                          onChange={(e) => setFormData({ ...formData, finished_at: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-400">KM Total</label>
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-[#0f172a] text-emerald-400 font-bold text-lg">
                          {totalKm > 0 ? totalKm : 0} KM
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Clock size={16} /> Horas Parado
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-400">Quantidade (Horas)</label>
                        <input type="number" step="0.5" value={formData.stopped_hours}
                          onChange={(e) => setFormData({ ...formData, stopped_hours: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-sm font-bold text-slate-400">Motivo da Parada</label>
                        <input type="text" placeholder="Ex: Aguardando cliente em reunião"
                          value={formData.stopped_reason}
                          onChange={(e) => setFormData({ ...formData, stopped_reason: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                    {submitting ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Finalizar Serviço</>}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
