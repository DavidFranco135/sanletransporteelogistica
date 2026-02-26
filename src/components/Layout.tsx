import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Briefcase, 
  Building2, 
  Users, 
  Car, 
  FileText, 
  DollarSign, 
  UserPlus, 
  LogOut, 
  Menu, 
  X,
  ChevronRight
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'motion/react';

const SidebarItem = ({ icon: Icon, label, to, active, onClick }: any) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
    {active && <ChevronRight size={16} className="ml-auto" />}
  </Link>
);

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) setIsOpen(false);
      else setIsOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/', permission: 'all' },
    { icon: Truck, label: 'Corridas', to: '/corridas', permission: 'all' },
    { icon: Briefcase, label: 'Serviços', to: '/servicos', permission: 'all' },
    { icon: Building2, label: 'Empresas', to: '/empresas', permission: 'all' },
    { icon: Users, label: 'Motoristas', to: '/motoristas', permission: 'all' },
    { icon: Car, label: 'Carros', to: '/carros', permission: 'all' },
    { icon: FileText, label: 'Contratos', to: '/contratos', permission: 'all' },
    { icon: DollarSign, label: 'Financeiro', to: '/financeiro', permission: 'finance' },
    { icon: UserPlus, label: 'Colaboradores', to: '/colaboradores', permission: 'admin' },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (user?.role === 'admin') return true;
    if (item.permission === 'all') return true;
    return user?.permissions.includes(item.permission);
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isOpen ? 280 : 0, opacity: isOpen ? 1 : 0 }}
        className={`fixed lg:relative z-40 h-screen bg-[#020617] border-r border-slate-800 overflow-hidden flex flex-col shadow-2xl lg:shadow-none`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-900/20">
            S
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white text-lg leading-tight">SANLE</span>
            <span className="text-xs text-slate-500 font-medium tracking-wider uppercase">Transporte</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <SidebarItem
              key={item.to}
              {...item}
              active={location.pathname === item.to}
              onClick={() => isMobile && setIsOpen(false)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 font-bold text-sm border border-slate-700">
              {user?.name.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-white truncate">{user?.name}</span>
              <span className="text-xs text-slate-500 truncate">{user?.role === 'admin' ? 'Administrador' : 'Colaborador'}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-slate-600 font-medium">©Niklaus</span>
              <span className="text-sm font-medium text-slate-400">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0f172a]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
