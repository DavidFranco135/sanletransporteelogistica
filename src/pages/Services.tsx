import React, { useEffect, useState } from 'react';
import { Plus, Copy, Check, MessageCircle, X, Edit2, Calendar, MapPin, User, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getServices, createService, updateService, deleteService, getCompanies, getDrivers, getVehicles } from '../services/firebaseService';

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company_id: '', description: '', driver_id: '', vehicle_id: '',
    customer_name: '', origin: '', destination: '', scheduled_at: ''
  });

  const fetchData = async () => {
    const [s, c, d, v] = await Promise.all([getServices(), getCompanies(), getDrivers(), getVehicles()]);
    setServices(s); setCompanies(c); setDrivers(d); setVehicles(v);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditingService(null);
    setFormData({ company_id: '', description: '', driver_id: '', vehicle_id: '', customer_name: '', origin: '', destination: '', scheduled_at: '' });
    setShowModal(true);
  };

  const openEditModal = (service: any) => {
    setEditingService(service);
    setFormData({
      company_id: service.company_id || '',
      description: service.description || '',
      driver_id: service.driver_id || '',
      vehicle_id: service.vehicle_id || '',
      customer_name: service.customer_name || '',
      origin: service.origin || '',
      destination: service.destination || '',
      scheduled_at: service.scheduled_at || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const company = companies.find(c => c.id === formData.company_id);
    const driver = drivers.find(d => d.id === formData.driver_id);
    const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
    const enriched = {
      ...formData,
      company_name: company?.name || '',
      driver_name: driver?.name || '',
      vehicle_model: vehicle?.model || '',
      plate: vehicle?.plate || '',
    };
    if (editingService) {
      await updateService(editingService.id, enriched);
    } else {
      await createService(enriched);
    }
    setShowModal(false);
    setEditingService(null);
    setFormData({ company_id: '', description: '', driver_id: '', vehicle_id: '', customer_name: '', origin: '', destination: '', scheduled_at: '' });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteService(id);
      setServices(prev => prev.filter(s => s.id !== id));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const copyLink = (serviceToken: string, id: string) => {
    const link = `${window.location.origin}/servico/${serviceToken}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareWhatsApp = (service: any) => {
    const driver = drivers.find(d => d.id === service.driver_id);
    const phone = driver?.phone?.replace(/\D/g, '');
    const link = `${window.location.origin}/servico/${service.token}`;
    const text = encodeURIComponent(`Olá ${service.driver_name}! Aqui está o link para preencher os dados da sua corrida na Sanle: ${link}`);
    window.open(`https://wa.me/${phone || ''}?text=${text}`, '_blank');
  };

  if (loading) return <div className="text-slate-400 animate-pulse p-8">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Serviços</h1>
          <p className="text-slate-400">Gerencie e crie novos serviços para motoristas.</p>
        </div>
        <button onClick={openNew}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
          <Plus size={20} /> Novo Serviço
        </button>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a] border-b border-slate-800">
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">OS / Empresa</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Detalhes da Viagem</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Motorista</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-emerald-400 mb-1">
                      OS #{service.os_number ? String(service.os_number).padStart(4, '0') : String(service.id || '').replace(/\D/g,'').slice(-4).padStart(4,'0')}
                    </div>
                    <div className="font-semibold text-white">{service.company_name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]">{service.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-300"><User size={12} className="text-slate-500" /> {service.customer_name || 'N/A'}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-300"><MapPin size={12} className="text-slate-500" /> {service.origin || 'N/A'} → {service.destination || 'N/A'}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500"><Calendar size={12} /> {service.scheduled_at ? new Date(service.scheduled_at).toLocaleString('pt-BR') : 'Não agendado'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-300 font-medium">{service.driver_name}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{service.vehicle_model}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      service.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : service.status === 'accepted' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {service.status === 'completed' ? 'Finalizado' : service.status === 'accepted' ? 'Aceito' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(service)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors" title="Editar">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => copyLink(service.token, service.id)}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors flex items-center gap-1 text-xs font-bold">
                        {copiedId === service.id ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        {copiedId === service.id ? 'Copiado' : 'Link'}
                      </button>
                      <button onClick={() => shareWhatsApp(service)} className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-400 transition-colors" title="WhatsApp">
                        <MessageCircle size={18} />
                      </button>
                      {confirmDeleteId === service.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(service.id)} disabled={deletingId === service.id}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-70">
                            {deletingId === service.id && <Loader2 size={11} className="animate-spin" />} Sim
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold">Não</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(service.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors" title="Apagar">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-emerald-600 text-white">
                <h2 className="text-xl font-bold">{editingService ? 'Editar Serviço' : 'Criar Novo Serviço'}</h2>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Empresa Contratante</label>
                    <select required value={formData.company_id} onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white">
                      <option value="">Selecione uma empresa</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Cliente a ser buscado</label>
                    <input required type="text" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" placeholder="Nome do passageiro" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Origem</label>
                    <input required type="text" value={formData.origin} onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Destino</label>
                    <input required type="text" value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Data e Hora</label>
                    <input required type="datetime-local" value={formData.scheduled_at} onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Descrição do Serviço</label>
                    <input required type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Motorista</label>
                    <select required value={formData.driver_id} onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white">
                      <option value="">Selecione</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-400">Veículo</label>
                    <select required value={formData.vehicle_id} onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0f172a] text-white">
                      <option value="">Selecione</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4">
                  {editingService ? 'Atualizar Serviço' : 'Salvar e Gerar Link'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
