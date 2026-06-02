// src/pages/CajaPage.jsx — Cash box wrapper
// Secretary gate + data loading + liquidación
// B-09 — Fiel al monolito líneas 41988-42012 (gate) + 42013-end (caja)
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useBackendData } from '../hooks/useBackendData';
import Caja from './Caja';

export default function CajaPage() {
  const navigate = useNavigate();
  const { currentUser, canAccessModule } = useAuthStore();

  // ── SECRETARIA GATE: 'caja' requiere permiso del admin ──
  if (currentUser?.role === 'secretaria' && !canAccessModule('caja')) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow text-center max-w-sm">
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-black text-gray-800 mb-1">Acceso restringido</p>
          <p className="text-xs text-gray-500">
            El módulo financiero no está habilitado para su perfil. Solicite
            acceso al administrador.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-bold"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  return <CajaWithData />;
}

// ── Inner: rendered only after gate passes ──
function CajaWithData() {
  const { currentUser } = useAuthStore();

  // ── Caja movements — scope to user/empresa ──
  const storageKey = useMemo(() => {
    if (currentUser?.empresaId) return `siso_caja_${currentUser.empresaId}`;
    return `siso_caja_${currentUser?.user || 'shared'}`;
  }, [currentUser]);

  const [cajaMovimientos, setCajaMovimientos] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey) || localStorage.getItem('siso_caja_movimientos') || '[]';
      return JSON.parse(raw);
    } catch { return []; }
  });

  // ── Saved bills / cuentas de cobro ──
  const billsKey = useMemo(() => {
    if (currentUser?.empresaId) return `siso_saved_bills_empresa_${currentUser.empresaId}`;
    return `siso_saved_bills_${currentUser?.user || 'shared'}`;
  }, [currentUser]);

  const [savedBillsList, setSavedBillsList] = useState(() => {
    try {
      const raw = localStorage.getItem(billsKey) || localStorage.getItem('siso_saved_bills') || '[]';
      return JSON.parse(raw);
    } catch { return []; }
  });

  // ── Patients list (for pacientes de hoy en caja) ──
  const { data: patientsList } = useBackendData('/data/patients', 'siso_db_patients', 'patients');

  // ── Caja form ──
  const [cajaForm, setCajaForm] = useState({
    tipo: 'ingreso',
    concepto: '',
    monto: '',
    formaPago: 'Efectivo',
    fecha: new Date().toISOString().split('T')[0],
    categoria: '',
  });

  // ── Filter state ──
  const [cajaTab, setCajaTab] = useState('movimientos');
  const [cajaFiltroPeriodo, setCajaFiltroPeriodo] = useState('hoy');
  const [cajaFiltroDesde, setCajaFiltroDesde] = useState('');
  const [cajaFiltroHasta, setCajaFiltroHasta] = useState('');
  const [cajaMedicoPeriodo, setCajaMedicoPeriodo] = useState('mes');
  const [porcentajeMedico, setPorcentajeMedico] = useState(40);

  // ── Save helpers ──
  const saveCajaDebounced = useCallback((movements) => {
    setCajaMovimientos(movements);
    try { localStorage.setItem(storageKey, JSON.stringify(movements)); } catch {}
  }, [storageKey]);

  const showAlert = useCallback((msg) => alert(msg), []);
  const showConfirm = useCallback((msg) => window.confirm(msg), []);

  return (
    <Caja
      cajaMovimientos={cajaMovimientos}
      setCajaMovimientos={saveCajaDebounced}
      cajaForm={cajaForm}
      setCajaForm={setCajaForm}
      currentUser={currentUser}
      saveCajaDebounced={saveCajaDebounced}
      cajaTab={cajaTab}
      setCajaTab={setCajaTab}
      cajaFiltroPeriodo={cajaFiltroPeriodo}
      setCajaFiltroPeriodo={setCajaFiltroPeriodo}
      cajaFiltroDesde={cajaFiltroDesde}
      setCajaFiltroDesde={setCajaFiltroDesde}
      cajaFiltroHasta={cajaFiltroHasta}
      setCajaFiltroHasta={setCajaFiltroHasta}
      cajaMedicoPeriodo={cajaMedicoPeriodo}
      setCajaMedicoPeriodo={setCajaMedicoPeriodo}
      porcentajeMedico={porcentajeMedico}
      setPorcentajeMedico={setPorcentajeMedico}
      patientsList={patientsList || []}
      savedBillsList={savedBillsList}
      setSavedBillsList={(updated) => {
        setSavedBillsList(updated);
        try { localStorage.setItem(billsKey, JSON.stringify(updated)); } catch {}
      }}
      showAlert={showAlert}
      showConfirm={showConfirm}
    />
  );
}
