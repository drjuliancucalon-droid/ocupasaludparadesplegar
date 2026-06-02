// src/app/Layout.jsx — Layout replicating ocupasalud original distribution
// Top header with brand + sync + user, horizontal tab navigation below
// Full-width content area (no sidebar stealing space)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import {
  LayoutDashboard, Users, Building2, Calendar, FileText,
  Receipt, DollarSign, BarChart3, Shield, Video,
  CreditCard, LogOut, Menu, X, Stethoscope, Activity,
  Cloud, CloudOff, Settings, ChevronLeft, ChevronRight,
  Bell, RefreshCw, ShieldCheck, Briefcase, Calculator,
  MessageCircle, Crown, BrainCircuit, Loader2
} from 'lucide-react';
import { useBackendObject } from '../hooks/useBackendData';
import { MensajesDrawer } from '../shared/components/MensajesDrawer';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/hc/new', icon: Stethoscope, label: 'HC Ocup.', roles: ['medico', 'administrador', 'super_admin'] },
  { path: '/hc/general', icon: FileText, label: 'HC General', roles: ['medico', 'administrador', 'super_admin'] },
  { path: '/patients', icon: Users, label: 'Pacientes' },
  { path: '/companies', icon: Building2, label: 'Empresas' },
  { path: '/agenda', icon: Calendar, label: 'Agenda' },
  { path: '/billing', icon: Receipt, label: 'Facturación', roles: ['administrador', 'super_admin', 'medico'] },
  { path: '/caja', icon: DollarSign, label: 'Caja' },
  { path: '/reports', icon: BarChart3, label: 'Reportes' },
  { path: '/sgsst', icon: Shield, label: 'SG-SST' },
  { path: '/telemedicine', icon: Video, label: 'Telemedicina' },
  { path: '/users', icon: Settings, label: 'Usuarios', roles: ['administrador', 'super_admin'] },
  { path: '/planes', icon: CreditCard, label: 'Planes', roles: ['administrador', 'super_admin'] },
  { path: '/cotizaciones', icon: DollarSign, label: 'Cotizaciones', roles: ['medico', 'administrador', 'super_admin'] },
  { path: '/portafolio', icon: Briefcase, label: 'Portafolio', roles: ['administrador', 'super_admin'] },
  { path: '/contabilidad', icon: Calculator, label: 'Contabilidad', roles: ['medico', 'administrador', 'super_admin'] },
  { path: '/mensajes', icon: MessageCircle, label: 'Mensajes' },
  { path: '/arl', icon: Shield, label: 'ARL', roles: ['medico', 'administrador', 'super_admin'] },
  { path: '/custodia', icon: FileText, label: 'Custodia', roles: ['medico', 'administrador', 'super_admin'] },
  { path: '/habeas-data', icon: ShieldCheck, label: 'Habeas Data' },
  { path: '/config/ips', icon: Building2, label: 'Perfil IPS', roles: ['administrador', 'super_admin'] },
  { path: '/admin', icon: Crown, label: 'Super Admin', roles: ['super_admin'] },
  { path: '/settings', icon: Settings, label: 'Config', roles: ['administrador', 'super_admin'] },
  { path: '/perfil', icon: Users, label: 'Mi Perfil' }, // visible para todos los roles
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuthStore();
  const { syncStatus, setSyncStatus, aiGenerating, aiGeneratingLabel } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showMensajesDrawer, setShowMensajesDrawer] = useState(false);
  const { data: doctor } = useBackendObject('/data/doctor', 'siso_doctor_data', 'doctor');
  const tabsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Sync handler
  const handleManualSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      // Force re-fetch by clearing cached data timestamps
      // This triggers useBackendData hooks to refetch
      const keysToRefresh = ['siso_db_patients', 'siso_companies', 'siso_doctor_data', 'siso_agenda', 'siso_bills'];
      for (const key of keysToRefresh) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed._lastSync) {
              parsed._lastSync = null; // Force refetch
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          } catch { /* skip non-JSON */ }
        }
      }
      // Reload the page to trigger all hooks
      window.location.reload();
    } catch {
      setSyncStatus('error');
      setIsSyncing(false);
    }
  }, [isSyncing, setSyncStatus]);

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(currentUser?.role);
  });

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Initials for avatar (matches BrandLogo.jsx from monolith)
  const doctorName = doctor?.nombre || currentUser?.nombre || currentUser?.user || '';
  const getInitials = () => {
    const parts = doctorName.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length > 2 ? 2 : 1][0]}`.toUpperCase();
    return doctorName.substring(0, 2).toUpperCase() || 'DR';
  };

  // Tab scroll management
  const checkScroll = () => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scrollTabs = (dir) => {
    const el = tabsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 200, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  // Scroll active tab into view
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const activeBtn = el.querySelector('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      setTimeout(checkScroll, 300);
    }
  }, [location.pathname]);

  const syncIcon = syncStatus === 'ok' || syncStatus === 'idle'
    ? <Cloud className="w-3.5 h-3.5" />
    : <CloudOff className="w-3.5 h-3.5" />;
  const syncColor = syncStatus === 'ok' || syncStatus === 'idle'
    ? 'text-emerald-400'
    : syncStatus === 'syncing' ? 'text-yellow-400' : 'text-red-400';
  const syncText = syncStatus === 'ok' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'error' ? 'Error sync' : 'Local';

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* ═══ TOP HEADER — Brand + Sync + User ═══ */}
      <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Left: Brand logo (matches BrandLogo.jsx) */}
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-emerald-300 hover:text-white mr-1"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 bg-gradient-to-tr from-emerald-700 to-teal-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <div className="flex flex-col items-center leading-none">
                  <Stethoscope className="w-3 h-3 mb-0.5" strokeWidth={2.5} />
                  <span className="text-[7px] font-black tracking-tighter">{getInitials()}</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-black text-white uppercase leading-tight tracking-wide">
                  {doctorName || 'MÉDICO'}
                </p>
                <div className="h-[2px] w-7 bg-gradient-to-r from-emerald-400 to-teal-300 my-0.5 rounded-full" />
                <p className="text-[8px] font-bold text-emerald-300 uppercase">
                  {doctor?.titulo || 'Salud Ocupacional'}
                </p>
                {doctor?.licencia && (
                  <p className="text-[7px] text-emerald-400">RM: {doctor.licencia}</p>
                )}
              </div>
            </div>
          </div>

          {/* Center: Sync indicator + sync button */}
          <div className={`hidden md:flex items-center gap-2 text-xs`}>
            <div className={`flex items-center gap-1.5 ${syncColor}`}>
              {syncIcon}
              <span className="font-medium">{isSyncing ? 'Sincronizando...' : syncText}</span>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="text-emerald-400 hover:text-white transition-colors p-1 hover:bg-emerald-700/50 rounded-lg disabled:opacity-50"
              title="Sincronizar ahora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Right: User info + logout */}
          <div className="flex items-center gap-3">
            {/* Sync mobile */}
            <div className={`md:hidden flex items-center ${syncColor}`}>
              {syncIcon}
            </div>

            {/* B-17: AI status badge during generation */}
            {aiGenerating && (
              <div className="flex items-center gap-1 px-2 py-1 bg-violet-700/60 text-violet-200 rounded-lg text-[10px] font-bold animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> {aiGeneratingLabel || 'IA...'}
              </div>
            )}

            {/* T-04: Badge de mensajes no leídos - abre drawer */}
            <button
              onClick={() => setShowMensajesDrawer(true)}
              className="relative p-1.5 text-emerald-300 hover:text-white hover:bg-emerald-700/50 rounded-lg transition-colors"
              title="Mensajes"
            >
              <MessageCircle className="w-4.5 h-4.5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">3</span>
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs font-bold text-white leading-tight">{currentUser?.user || 'usuario'}</p>
                <p className="text-[10px] text-emerald-300 capitalize">{currentUser?.role || 'Sin rol'}</p>
              </div>
              <div className="w-8 h-8 bg-emerald-600/60 rounded-lg flex items-center justify-center">
                <span className="text-[10px] font-black">{getInitials()}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-emerald-400 hover:text-white transition-colors p-1.5 hover:bg-emerald-700/50 rounded-lg"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══ HORIZONTAL TAB NAVIGATION ═══ */}
      <nav className="bg-gradient-to-r from-emerald-800 to-teal-800 flex-shrink-0 relative border-t border-emerald-700/30">
        {/* Scroll left button */}
        {canScrollLeft && (
          <button
            onClick={() => scrollTabs(-1)}
            className="absolute left-0 top-0 bottom-0 z-10 px-1.5 bg-gradient-to-r from-emerald-800 via-emerald-800/95 to-transparent text-emerald-300 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Tabs container */}
        <div
          ref={tabsRef}
          onScroll={checkScroll}
          className="flex overflow-x-auto scrollbar-hide px-2 gap-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filteredNav.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                data-active={active}
                onClick={() => navigate(item.path)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap
                  transition-all duration-200 rounded-t-lg mt-1 flex-shrink-0
                  ${active
                    ? 'bg-gray-50 text-emerald-800 shadow-sm'
                    : 'text-emerald-200/80 hover:text-white hover:bg-emerald-700/40'
                  }
                `}
              >
                <item.icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-600' : ''}`} />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scroll right button */}
        {canScrollRight && (
          <button
            onClick={() => scrollTabs(1)}
            className="absolute right-0 top-0 bottom-0 z-10 px-1.5 bg-gradient-to-l from-teal-800 via-teal-800/95 to-transparent text-emerald-300 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </nav>

      {/* ═══ MOBILE MENU OVERLAY ═══ */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-emerald-900 to-teal-900 text-white z-50 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-emerald-700/50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gradient-to-tr from-emerald-700 to-teal-500 rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase">{currentUser?.nombre || 'OCUPASALUD'}</p>
                  <p className="text-[9px] text-emerald-300">{currentUser?.role || 'Pro'}</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-emerald-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="py-3">
              {filteredNav.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors
                    ${isActive(item.path)
                      ? 'bg-emerald-600/40 text-white font-bold border-l-3 border-teal-400'
                      : 'text-emerald-200/80 hover:bg-emerald-700/40 hover:text-white'
                    }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-teal-300' : ''}`} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-emerald-700/50 mt-auto">
              <button onClick={handleLogout} className="flex items-center gap-2 text-emerald-300 hover:text-white text-sm w-full py-2">
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MAIN CONTENT — Full width ═══ */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* T-04: Mensajes Drawer Overlay */}
      <MensajesDrawer isOpen={showMensajesDrawer} onClose={() => setShowMensajesDrawer(false)} />
    </div>
  );
}
