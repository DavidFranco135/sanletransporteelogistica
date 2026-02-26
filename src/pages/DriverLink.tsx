import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, CheckCircle2, Loader2, AlertCircle, Calendar, User, Clock, Gauge, PenTool, Save, Check, Maximize2, Trash2 } from 'lucide-react';
import { getServiceByToken, acceptService, completeService } from '../services/firebaseService';
import { generateTripPDF } from '../services/reportService';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebase';

// ── Calcula coordenada real do canvas (corrige diferença CSS vs resolução real) ──
function getCanvasXY(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height),
  };
}

// ── Canvas de assinatura com coordenada correta ─────────────────────────────
function SignatureCanvas({
  canvasRef,
  onDraw,
  width = 2400,
  height = 1200,
  className = '',
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onDraw: () => void;
  width?: number;
  height?: number;
  className?: string;
}) {
  const drawing = useRef(false);

  const ctx = () => {
    const c = canvasRef.current;
    if (!c) return null;
    const context = c.getContext('2d')!;
    context.strokeStyle = '#111827';
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    return { c, context };
  };

  const begin = (clientX: number, clientY: number) => {
    const r = ctx();
    if (!r) return;
    const { x, y } = getCanvasXY(r.c, clientX, clientY);
    r.context.beginPath();
    r.context.moveTo(x, y);
    drawing.current = true;
  };

  const move = (clientX: number, clientY: number) => {
    if (!drawing.current) return;
    const r = ctx();
    if (!r) return;
    const { x, y } = getCanvasXY(r.c, clientX, clientY);
    r.context.lineTo(x, y);
    r.context.stroke();
    onDraw();
  };

  const end = () => { drawing.current = false; };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ touchAction: 'none', cursor: 'crosshair', userSelect: 'none' }}
      onMouseDown={(e) => begin(e.clientX, e.clientY)}
      onMouseMove={(e) => move(e.clientX, e.clientY)}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={(e) => { e.preventDefault(); begin(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchMove={(e) => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchEnd={end}
    />
  );
}

// ── Componente principal ────────────────────────────────────────────────────
export default function DriverLink() {
  const { token } = useParams();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [completedTrip, setCompletedTrip] = useState<any>(null);
  const [error, setError] = useState('');
  const [isAccepted, setIsAccepted] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);   // preview pequeno
  const fullCanvasRef = useRef<HTMLCanvasElement>(null);       // fullscreen

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
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      const data = await getServiceByToken(token);
      if (!data) { setError('Serviço não encontrado ou link inválido.'); return; }
      setService(data);
      setIsAccepted(data.status === 'accepted' || data.status === 'completed');
      if (data.status === 'completed') setSuccess(true);
      setFormData(prev => ({ ...prev, description: data.description || '', origin: data.origin || '', destination: data.destination || '' }));
    } catch {
      setError('Erro ao carregar serviço. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchService(); }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      await acceptService(token);
      setIsAccepted(true);
      setService((s: any) => ({ ...s, status: 'accepted' }));
    } catch (err: any) {
      setError(err.message || 'Erro ao aceitar serviço');
    } finally {
      setSubmitting(false);
    }
  };

  const clearSignature = () => {
    [previewCanvasRef, fullCanvasRef].forEach(ref => {
      const c = ref.current;
      if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    });
    setHasSignature(false);
  };

  // Ao confirmar fullscreen: copia conteúdo pro preview
  const confirmSignature = () => {
    const full = fullCanvasRef.current;
    const preview = previewCanvasRef.current;
    if (full && preview) {
      const ctx = preview.getContext('2d')!;
      ctx.clearRect(0, 0, preview.width, preview.height);
      ctx.drawImage(full, 0, 0, preview.width, preview.height);
    }
    setShowSignaturePad(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSignature) { alert('O passageiro deve assinar antes de finalizar.'); return; }
    if (!token) return;
    setSubmitting(true);
    // Pegar assinatura do canvas fullscreen (maior resolução)
    const sigCanvas = fullCanvasRef.current || previewCanvasRef.current;
    const signature_url = sigCanvas?.toDataURL('image/png') || '';
    try {
      await completeService(token, { ...formData, signature_url });
      setCompletedTrip({ ...service, ...formData, signature_url, km_start: Number(formData.km_start), km_end: Number(formData.km_end) });
      setSuccess(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao finalizar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const osNumber = service?.os_number
    ? String(service.os_number).padStart(4, '0')
    : String(service?.id || '').replace(/\D/g, '').slice(-4).padStart(4, '0');

  const totalKm = (parseFloat(formData.km_end) || 0) - (parseFloat(formData.km_start) || 0);

  // ── LOADING ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-4">
      <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center shadow-xl">
        <img src="/logo.png" alt="Sanle" className="w-24 h-24 object-contain p-2" />
      </div>
      <Loader2 className="animate-spin text-emerald-500 mt-4" size={40} />
      <p className="text-slate-400 text-sm">Carregando serviço...</p>
    </div>
  );

  // ── ERROR ────────────────────────────────────────────────────────────────
  if (error || !service) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-slate-800">
        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-6">
          <img src="/logo.png" alt="Sanle" className="w-20 h-20 object-contain p-1" />
        </div>
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold text-white mb-2">Ops!</h1>
        <p className="text-slate-400 mb-6">{error || 'Serviço não encontrado.'}</p>
        <button onClick={() => window.location.reload()} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold w-full">
          Tentar Novamente
        </button>
      </div>
    </div>
  );

  // ── SUCCESS ──────────────────────────────────────────────────────────────
  if (success) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1e293b] p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-emerald-500/20">
        <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-6">
          <img src="/logo.png" alt="Sanle" className="w-28 h-28 object-contain p-2" />
        </div>
        <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={56} />
        <h1 className="text-2xl font-bold text-white mb-2">Serviço Finalizado!</h1>
        <p className="text-slate-400 mb-6">
          Obrigado, <span className="text-white font-bold">{service.driver_name}</span>. Dados enviados com sucesso para a central.
        </p>
        {completedTrip && (
          <button onClick={() => generateTripPDF(completedTrip)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 mb-4 transition-all">
            <Save size={18} /> Baixar Relatório PDF
          </button>
        )}
        <div className="text-xs text-slate-500 mt-2">Sanle Transportes Logística LTDA - ME</div>
        <div className="text-xs text-slate-600">CNPJ: 46.265.852/0001-01</div>
      </motion.div>
    </div>
  );

  // ── MAIN ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f172a] pb-12">

      {/* CAPA */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white px-6 pt-10 pb-20 text-center shadow-2xl">
        {/* Logo grande em card branco */}
        <div className="w-44 h-44 bg-white rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-5 border-4 border-white/20">
          <img src="/logo.png" alt="Sanle Transporte" className="w-40 h-40 object-contain p-2" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Ordem de Serviço</h1>
        <div className="inline-block bg-white/20 rounded-xl px-4 py-1 mt-2">
          <p className="text-white font-mono font-bold tracking-widest text-lg">OS #{osNumber}</p>
        </div>
        <p className="text-emerald-200/80 text-xs mt-2">Sanle Transportes Logística LTDA - ME</p>
      </div>

      <div className="max-w-2xl mx-auto -mt-10 px-4">
        <div className="bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">

          {/* Detalhes */}
          <div className="p-6 bg-[#0f172a] border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
              <AlertCircle size={16} /> Detalhes da Corrida
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User size={18} className="text-emerald-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Cliente / Empresa</span>
                    <p className="text-white font-bold">{service.customer_name || 'N/A'} <span className="text-slate-400 font-normal text-sm">({service.company_name})</span></p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-emerald-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Agendado</span>
                    <p className="text-white font-bold">{service.scheduled_at ? new Date(service.scheduled_at).toLocaleString('pt-BR') : 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-red-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Origem</span>
                    <p className="text-white font-bold">{service.origin || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Navigation size={18} className="text-blue-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Destino</span>
                    <p className="text-white font-bold">{service.destination || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {!isAccepted && (
              <button onClick={handleAccept} disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 mt-6 text-lg">
                {submitting ? <Loader2 className="animate-spin" /> : <><Check size={22} /> Aceitar Corrida</>}
              </button>
            )}
          </div>

          {/* Formulário */}
          <AnimatePresence>
            {isAccepted && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
                <form onSubmit={handleSubmit} className="space-y-8">

                  {/* ASSINATURA */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                      <PenTool size={16} /> Assinatura do Passageiro
                    </h3>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-400">Nome do Passageiro</label>
                      <input required type="text" placeholder="Nome completo"
                        value={formData.user_name}
                        onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                    </div>

                    {/* Preview da assinatura (só leitura) */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-400">Assinatura</label>
                      <div
                        className="relative bg-white rounded-xl border-2 border-dashed border-emerald-400 overflow-hidden cursor-pointer"
                        style={{ height: 110 }}
                        onClick={() => setShowSignaturePad(true)}
                      >
                        <canvas
                          ref={previewCanvasRef}
                          width={1200}
                          height={400}
                          className="w-full h-full"
                          style={{ pointerEvents: 'none' }}
                        />
                        {!hasSignature && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400 bg-white">
                            <Maximize2 size={32} className="text-emerald-500" />
                            <span className="font-bold text-slate-600">Toque para assinar em tela cheia</span>
                            <span className="text-xs text-slate-400">Maior precisão para assinatura</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <button type="button" onClick={clearSignature}
                          className="text-xs text-red-400 font-bold hover:underline flex items-center gap-1">
                          <Trash2 size={12} /> Limpar assinatura
                        </button>
                        <button type="button" onClick={() => setShowSignaturePad(true)}
                          className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1">
                          <Maximize2 size={12} /> {hasSignature ? 'Refazer em tela cheia' : 'Abrir tela de assinatura'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* KM */}
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

                  {/* PARADAS */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Clock size={16} /> Horas Parado
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-400">Horas</label>
                        <input type="number" step="0.5" min="0" value={formData.stopped_hours}
                          onChange={(e) => setFormData({ ...formData, stopped_hours: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-sm font-bold text-slate-400">Motivo</label>
                        <input type="text" placeholder="Ex: Aguardando cliente em reunião"
                          value={formData.stopped_reason}
                          onChange={(e) => setFormData({ ...formData, stopped_reason: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-lg">
                    {submitting ? <><Loader2 className="animate-spin" /> Salvando...</> : <><Save size={22} /> Finalizar Serviço</>}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── MODAL FULLSCREEN DE ASSINATURA ── */}
      <AnimatePresence>
        {showSignaturePad && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-white"
            style={{ touchAction: 'none' }}
          >
            {/* Barra topo */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1e293b] shrink-0 shadow-lg">
              <div>
                <p className="text-white font-bold">Assinatura do Passageiro</p>
                <p className="text-emerald-400 text-xs">Assine com o dedo na área abaixo</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={clearSignature}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center gap-1 transition-all">
                  <Trash2 size={16} /> Limpar
                </button>
                <button type="button" onClick={confirmSignature}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center gap-1 transition-all">
                  <Check size={16} /> Confirmar
                </button>
              </div>
            </div>

            {/* Canvas ocupa tudo */}
            <div className="flex-1 relative overflow-hidden bg-white">
              <SignatureCanvas
                canvasRef={fullCanvasRef}
                onDraw={() => setHasSignature(true)}
                width={3000}
                height={2000}
                className="absolute inset-0 w-full h-full"
              />

              {/* Instrução quando vazio */}
              {!hasSignature && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <PenTool size={52} className="text-emerald-300 mb-3" />
                  <p className="text-2xl font-bold text-slate-300">Assine aqui</p>
                  <p className="text-slate-400 text-sm mt-1">Use o dedo ou a caneta</p>
                </div>
              )}

              {/* Linha de referência para assinar */}
              <div className="absolute left-8 right-8 pointer-events-none" style={{ bottom: '15%' }}>
                <div className="border-b-2 border-dashed border-slate-300" />
                <p className="text-xs text-slate-400 mt-1 text-center">Linha de assinatura</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
