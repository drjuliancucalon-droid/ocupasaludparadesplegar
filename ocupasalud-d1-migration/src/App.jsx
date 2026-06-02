// src/App.jsx — New App Shell (v2)
// React Router + Lazy Loading + Zustand stores
// Replaces the 48K-line monolith with a clean router
import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import Layout from './app/Layout';

// ── Lazy-loaded pages (code-splitting por ruta) ──────────────────
const Login = React.lazy(() => import('./pages/LoginPage'));
const Dashboard = React.lazy(() => import('./pages/DashboardPage'));
const Patients = React.lazy(() => import('./pages/PatientsPage'));
const HistoriaClinica = React.lazy(() => import('./pages/HistoriaPage'));
const Companies = React.lazy(() => import('./pages/CompaniesPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const AgendaPage = React.lazy(() => import('./pages/AgendaPage'));
const BillingPage = React.lazy(() => import('./pages/BillingPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const SGSSTPage = React.lazy(() => import('./pages/SGSSTPage'));
const TelemedicinePage = React.lazy(() => import('./pages/TelemedicinePage'));
const WorkerPortalPage = React.lazy(() => import('./pages/WorkerPortalPage'));
const PlanesPage = React.lazy(() => import('./pages/PlanesPage'));
const CajaPage = React.lazy(() => import('./pages/CajaPage'));
// Sprint 1: HC General + Certificado + Verificación + Portal Empresa
const HistoriaGeneralPage = React.lazy(() => import('./pages/HistoriaGeneralPage'));
const CertificadoPage = React.lazy(() => import('./pages/CertificadoPage'));
const VerificacionPage = React.lazy(() => import('./pages/VerificacionPage'));
const PortalEmpresaPage = React.lazy(() => import('./pages/PortalEmpresaPage'));
// Sprint 3: Habeas Data + Settings (Backup)
const HabeasDataPage = React.lazy(() => import('./pages/HabeasDataPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
// Sprint 4: Secondary modules
const CotizacionesPage = React.lazy(() => import('./pages/CotizacionesPage'));
const ConfigIPSPage = React.lazy(() => import('./pages/ConfigIPSPage'));
const PortafolioPage = React.lazy(() => import('./pages/PortafolioPage'));
const ContabilidadPage = React.lazy(() => import('./pages/ContabilidadPage'));
// Sprint 5: Admin + Messages + ARL
const SuperAdminPage = React.lazy(() => import('./pages/SuperAdminPage'));
const MensajesPage = React.lazy(() => import('./pages/MensajesPage'));
const ARLPage = React.lazy(() => import('./pages/ARLPage'));
// Carta de Custodia
const CartaCustodiaPage = React.lazy(() => import('./pages/CartaCustodiaPage'));
// Portal de Certificados por Empresa (Nuevo)
const PortalCertificadosEmpresa = React.lazy(() => import('./pages/PortalCertificadosEmpresa'));
// Perfil propio (todos los roles)
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));

// ── React Query client ───────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min cache
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Loading fallback ─────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-full bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
      <p className="text-gray-500 text-sm">Cargando...</p>
    </div>
  </div>
);

// ── Protected Route wrapper ──────────────────────────────────────
function ProtectedRoute({ children, roles }) {
  const { currentUser, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ── Session timeout watcher ──────────────────────────────────────
function SessionWatcher() {
  const { isAuthenticated, logout, resetActivity } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handler = () => resetActivity();
    events.forEach((e) => document.addEventListener(e, handler, { passive: true }));

    // Check every minute if session expired
    const interval = setInterval(() => {
      const { lastActivity } = useAuthStore.getState();
      const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min
      if (lastActivity && Date.now() - lastActivity > SESSION_TIMEOUT) {
        logout();
        navigate('/login', { replace: true });
      }
    }, 60000);

    return () => {
      events.forEach((e) => document.removeEventListener(e, handler));
      clearInterval(interval);
    };
  }, [isAuthenticated, logout, resetActivity, navigate]);

  return null;
}

// ── Main App ─────────────────────────────────────────────────────
export default function App() {
  // Estados para Companies (incluye encuestas)
  const [companiesTab, setCompaniesTab] = useState("lista");
  const [editingCompany, setEditingCompany] = useState(null);
  const [encuestas, setEncuestas] = useState(() => {
    try { return JSON.parse(localStorage.getItem("siso_encuestas") || "[]"); } catch { return []; }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionWatcher />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/portal/:code" element={<WorkerPortalPage />} />
            <Route path="/verificar" element={<VerificacionPage />} />
            <Route path="/verificar/:codigo" element={<VerificacionPage />} />

            {/* Protected routes inside Layout */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="patients" element={<Patients />} />
              <Route path="patients/:id/hc" element={<HistoriaClinica />} />
              <Route path="hc/new" element={<HistoriaClinica />} />
              <Route path="hc/general" element={<HistoriaGeneralPage />} />
              <Route path="patients/:id/certificado" element={<CertificadoPage />} />
              <Route path="companies" element={
                <Companies 
                  companiesTab={companiesTab} setCompaniesTab={setCompaniesTab}
                  editingCompany={editingCompany} setEditingCompany={setEditingCompany}
                  encuestas={encuestas} setEncuestas={setEncuestas}
                />
              } />
              <Route path="users" element={
                <ProtectedRoute roles={['super_admin', 'administrador']}>
                  <UsersPage />
                </ProtectedRoute>
              } />
              <Route path="agenda" element={<AgendaPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="caja" element={<CajaPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="sgsst" element={<SGSSTPage />} />
              <Route path="telemedicine" element={<TelemedicinePage />} />
              <Route path="portal-empresa" element={<PortalEmpresaPage />} />
              <Route path="portal-certificados/:companyId" element={<PortalCertificadosEmpresa />} />
              <Route path="portal-certificados" element={<PortalCertificadosEmpresa />} />
              <Route path="habeas-data" element={<HabeasDataPage />} />
              <Route path="cotizaciones" element={<CotizacionesPage />} />
              <Route path="config/ips" element={<ConfigIPSPage />} />
              <Route path="mensajes" element={<MensajesPage />} />
              <Route path="portafolio" element={<PortafolioPage />} />
              <Route path="contabilidad" element={<ContabilidadPage />} />
              <Route path="settings" element={
                <ProtectedRoute roles={['super_admin', 'administrador']}>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              <Route path="planes" element={<PlanesPage />} />
              <Route path="admin" element={
                <ProtectedRoute roles={['super_admin', 'administrador']}>
                  <SuperAdminPage />
                </ProtectedRoute>
              } />
              <Route path="arl" element={
                <ProtectedRoute roles={['super_admin', 'administrador', 'medico']}>
                  <ARLPage />
                </ProtectedRoute>
              } />
              <Route path="custodia" element={
                <ProtectedRoute roles={['super_admin', 'administrador', 'medico']}>
                  <CartaCustodiaPage />
                </ProtectedRoute>
              } />
              {/* Perfil propio — accesible para cualquier rol autenticado */}
              <Route path="perfil" element={<ProfilePage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
