// src/pages/Dashboard.jsx
// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL — Panel con estadísticas, acciones rápidas,
// registros recientes y alertas de cumplimiento
// ═══════════════════════════════════════════════════════════════════════
import React, { useMemo, useCallback } from 'react';
import {
  FileText, Building2, Lock, Unlock, Users, Receipt,
  Clock, Eye, FileCheck, Trash2, Stethoscope, Heart,
  BarChart3, Shield, UserCheck, FileSearch, AlertTriangle
} from 'lucide-react';
import { PLAN_CONFIG, _isAdmin, _isAdminOrEmpresa, _canUse, _contarHC, _secretariaPuede } from '../shared/data/planConfig.js';
import { getSpanishDate } from '../shared/lib/formatters.js';

export default function Dashboard({
  currentUser,
  goTo,
  patientsList = [],
  companies = [],
  atencionesCerradas = [],
  canUseSGSST = false,
}) {
  const showAlert = useCallback((msg) => window.alert(msg), []);

  // Plan banner data
  const plan = PLAN_CONFIG[currentUser?.license || 'libre'];
  const hcUsadas = useMemo(() => {
    return patientsList.filter(p => p.fechaExamen && !p._archivado).length;
  }, [patientsList]);
  const pct = plan.maxHC < 9999 ? Math.round((hcUsadas / plan.maxHC) * 100) : -1;
  const colorMap = { libre: 'gray', starter: 'teal', pro: 'blue', clinica: 'purple' };
  const col = colorMap[currentUser?.license || 'libre'];

  // Stat cards
  const statCards = useMemo(() => {
    const cards = [
      { label: 'Historias Registradas', value: patientsList.filter(p => p.fechaExamen).length, color: 'emerald', icon: FileText },
      { label: 'Empresas', value: companies.length, color: 'purple', icon: Building2 },
      { label: 'HC Cerradas', value: patientsList.filter(p => p.estadoHistoria === 'Cerrada').length, color: 'red', icon: Lock },
      { label: 'HC Abiertas', value: patientsList.filter(p => p.estadoHistoria !== 'Cerrada' && p.fechaExamen).length, color: 'blue', icon: Unlock },
    ];
    return cards;
  }, [patientsList, companies]);

  // Recent records
  const recentRecords = useMemo(() => {
    return patientsList
      .filter(p => p.fechaExamen && !p._archivado)
      .slice(-20)
      .reverse();
  }, [patientsList]);

  // Alerts
  const alertas = useMemo(() => {
    const hoy = new Date();
    const en30 = new Date(hoy);
    en30.setDate(en30.getDate() + 30);

    const alerts = [];
    // Convenios próximos a vencer
    const conveniosAlerta = companies.filter(c =>
      c.convenioVencimiento &&
      new Date(c.convenioVencimiento) <= en30 &&
      new Date(c.convenioVencimiento) >= hoy
    );
    conveniosAlerta.forEach(c => {
      alerts.push({ tipo: 'amber', msg: `⚠️ Convenio próximo a vencer: ${c.nombre} (${c.convenioVencimiento})`, accion: () => goTo('empresas') });
    });

    // HC abiertas
    const hcAbiertas = patientsList.filter(p => p.estadoHistoria !== 'Cerrada' && p.fechaExamen && !p._archivado);
    if (hcAbiertas.length > 3) {
      alerts.push({ tipo: 'blue', msg: `📋 ${hcAbiertas.length} HCs sin cerrar`, accion: () => {} });
    }

    return alerts;
  }, [companies, patientsList, goTo]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title + Plan Banner */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <h2 className="text-2xl font-black text-gray-800">Panel Principal</h2>
        </div>
        <p className="text-gray-500 text-sm">
          {getSpanishDate(null)} — {currentUser?.name}
        </p>

        {/* Plan status banner */}
        <div className={`mt-3 flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl bg-${col}-50 border border-${col}-200`}>
          <span className={`font-black text-${col}-700 text-sm`}>{plan.label}</span>
          <span className="text-gray-400 text-xs">·</span>
          {plan.maxHC < 9999 ? (
            <span className={`text-xs font-bold ${pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-gray-600'}`}>
              📋 {hcUsadas}/{plan.maxHC} HC {pct >= 80 && '⚠️'}
            </span>
          ) : (
            <span className="text-xs text-gray-500">📋 HC ilimitadas</span>
          )}
          {plan.price === 0 && (
            <button onClick={() => goTo('planes')} className={`ml-auto text-xs font-black bg-${col}-600 text-white px-3 py-1 rounded-lg hover:opacity-90 transition`}>
              ⬆️ Ver planes
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`bg-white rounded-xl p-4 shadow-sm border border-${card.color}-100`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">{card.label}</p>
                <p className={`text-3xl font-black text-${card.color}-600 mt-1`}>{card.value}</p>
              </div>
              <div className={`bg-${card.color}-50 p-2 rounded-lg`}>
                <card.icon className={`w-5 h-5 text-${card.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => goTo('hc_ocupacional')}
          className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all text-left"
        >
          <div className="absolute -top-5 -right-5 w-20 h-20 bg-white/10 rounded-full" />
          <div className="absolute -bottom-3 -left-3 w-14 h-14 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="bg-white/20 w-9 h-9 rounded-xl flex items-center justify-center mb-3">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-black text-white text-sm leading-tight">Nueva HC Ocupacional</h3>
            <p className="text-emerald-100 text-[11px] mt-0.5">Evaluación médica del trabajo</p>
          </div>
        </button>
        <button
          onClick={() => goTo('hc_general')}
          className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all text-left"
        >
          <div className="absolute -top-5 -right-5 w-20 h-20 bg-white/10 rounded-full" />
          <div className="absolute -bottom-3 -left-3 w-14 h-14 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="bg-white/20 w-9 h-9 rounded-xl flex items-center justify-center mb-3">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-black text-white text-sm leading-tight">Nueva HC General</h3>
            <p className="text-blue-100 text-[11px] mt-0.5">Consulta medicina general</p>
          </div>
        </button>
      </div>

      {/* Module Grid */}
      <div className="space-y-4">
        {/* Gestión Clínica */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">🩺 Gestión Clínica</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => goTo('hc_ocupacional')} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-teal-200 hover:bg-teal-50/40 transition group shadow-sm">
              <div className="bg-teal-50 p-2 rounded-lg group-hover:bg-teal-100 transition flex-shrink-0">
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-black text-gray-800 text-xs leading-tight">Pacientes</p>
                <p className="text-[10px] text-gray-400 truncate">Expedientes</p>
              </div>
            </button>
            <button onClick={() => goTo('agenda')} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-blue-200 hover:bg-blue-50/40 transition group shadow-sm">
              <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-100 transition flex-shrink-0 text-base leading-none flex items-center justify-center w-8 h-8">🗓️</div>
              <div className="text-left min-w-0">
                <p className="font-black text-gray-800 text-xs leading-tight">Agenda</p>
                <p className="text-[10px] text-gray-400 truncate">Sala de espera</p>
              </div>
            </button>
            <button onClick={() => goTo('portal')} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-cyan-200 hover:bg-cyan-50/40 transition group shadow-sm">
              <div className="bg-cyan-50 p-2 rounded-lg group-hover:bg-cyan-100 transition flex-shrink-0">
                <FileSearch className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-black text-gray-800 text-xs leading-tight">Verificar</p>
                <p className="text-[10px] text-gray-400 truncate">Certificados</p>
              </div>
            </button>
          </div>
        </div>

        {/* Administración */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">💼 Administración</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => goTo('empresas')} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-purple-200 hover:bg-purple-50/40 transition group shadow-sm">
              <div className="bg-purple-50 p-2 rounded-lg group-hover:bg-purple-100 transition flex-shrink-0">
                <Building2 className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-black text-gray-800 text-xs leading-tight">Empresas</p>
                <p className="text-[10px] text-gray-400 truncate">Clientes</p>
              </div>
            </button>
            <button onClick={() => goTo('usuarios')} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-violet-200 hover:bg-violet-50/40 transition group shadow-sm">
              <div className="bg-violet-50 p-2 rounded-lg group-hover:bg-violet-100 transition flex-shrink-0">
                <UserCheck className="w-4 h-4 text-violet-600" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-black text-gray-800 text-xs leading-tight">Usuarios</p>
                <p className="text-[10px] text-gray-400 truncate">Accesos</p>
              </div>
            </button>
            <button onClick={() => goTo('planes')} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-indigo-200 hover:bg-indigo-50/40 transition group shadow-sm">
              <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-100 transition flex-shrink-0 text-base leading-none flex items-center justify-center w-8 h-8">💼</div>
              <div className="text-left min-w-0">
                <p className="font-black text-gray-800 text-xs leading-tight">Planes</p>
                <p className="text-[10px] text-gray-400 truncate">Suscripción</p>
              </div>
            </button>
          </div>
        </div>

        {/* Financiero y Reportes */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">💰 Financiero & Reportes</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button onClick={() => goTo('facturacion')} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-orange-200 hover:bg-orange-50/40 transition group shadow-sm">
              <div className="bg-orange-50 p-2 rounded-lg group-hover:bg-orange-100 transition flex-shrink-0">
                <Receipt className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-black text-gray-800 text-xs leading-tight">Cuentas de Cobro</p>
                <p className="text-[10px] text-gray-400 truncate">Facturación</p>
              </div>
            </button>
            <button onClick={() => goTo('caja')} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-green-200 hover:bg-green-50/40 transition group shadow-sm">
              <div className="bg-green-50 p-2 rounded-lg group-hover:bg-green-100 transition flex-shrink-0 text-base leading-none flex items-center justify-center w-8 h-8">💰</div>
              <div className="text-left min-w-0">
                <p className="font-black text-gray-800 text-xs leading-tight">Módulo Financiero</p>
                <p className="text-[10px] text-gray-400 truncate">Caja · Cuentas</p>
              </div>
            </button>
            <button onClick={() => goTo('reportes')} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-indigo-200 hover:bg-indigo-50/40 transition group shadow-sm">
              <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-100 transition flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-black text-gray-800 text-xs leading-tight">Reportes</p>
                <p className="text-[10px] text-gray-400 truncate">Diagnóstico</p>
              </div>
            </button>
            <button onClick={() => goTo('telemedicina')} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-blue-200 hover:bg-blue-50/40 transition group shadow-sm">
              <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-100 transition flex-shrink-0 text-base leading-none flex items-center justify-center w-8 h-8">🎥</div>
              <div className="text-left min-w-0">
                <p className="font-black text-gray-800 text-xs leading-tight">Telemedicina</p>
                <p className="text-[10px] text-gray-400 truncate">Videoconsulta</p>
              </div>
            </button>
          </div>
        </div>

        {/* Portales */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">🌐 Portales & Acceso Externo</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => goTo('portal')} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-teal-200 hover:bg-teal-50/40 transition group shadow-sm">
              <div className="bg-teal-50 p-2 rounded-lg group-hover:bg-teal-100 transition flex-shrink-0">
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-black text-gray-800 text-xs leading-tight">Portal Trabajador</p>
                <p className="text-[10px] text-gray-400 truncate">Consulta código</p>
              </div>
            </button>
            {canUseSGSST && (
              <button onClick={() => goTo('sgsst')} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-red-200 hover:bg-red-50/40 transition group shadow-sm">
                <div className="bg-red-50 p-2 rounded-lg group-hover:bg-red-100 transition flex-shrink-0">
                  <Shield className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-black text-gray-800 text-xs leading-tight">SG-SST</p>
                  <p className="text-[10px] text-gray-400 truncate">Seguridad y Salud</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin Alerts */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.slice(0, 5).map((a, i) => (
            <div
              key={i}
              onClick={a.accion}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:opacity-80 transition bg-${a.tipo}-50 border-${a.tipo}-200`}
            >
              <p className={`text-xs font-bold text-${a.tipo}-800 flex-1`}>{a.msg}</p>
              <span className={`text-[10px] text-${a.tipo}-600 font-black`}>Ver →</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Records */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-black text-gray-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" /> Registros Recientes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
              <tr>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Paciente</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Concepto</th>
                <th className="p-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.map((p, i) => (
                <tr key={`${p.id}-${i}`} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{p.fechaExamen}</td>
                  <td className="p-3">
                    <div className="font-bold text-gray-800 text-xs">{p.nombres}</div>
                    <div className="text-[10px] text-gray-400">{p.docNumero} · {p.cargo || 'Sin cargo'}</div>
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.type === 'general' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {p.type === 'general' ? 'General' : 'Ocupacional'}
                    </span>
                  </td>
                  <td className="p-3 text-[10px] text-gray-600 max-w-[200px] truncate">{p.conceptoAptitud || '--'}</td>
                  <td className="p-3 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.estadoHistoria === 'Cerrada' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {p.estadoHistoria || 'Abierta'}
                    </span>
                  </td>
                </tr>
              ))}
              {recentRecords.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400 text-sm">
                    No hay registros aún. Cree una nueva historia clínica.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
