// src/pages/DashboardPage.jsx — Dashboard with real data from backend
// B-14: Plan gate wrappers for SVE/ARL/Telemedicina cards + plan status banner
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useBackendData, useBackendObject } from '../hooks/useBackendData';
import { PLAN_CONFIG } from '../shared/data/planConfig';
import {
  Users, Building2, Calendar, FileText, FileCheck, BarChart3,
  Shield, Stethoscope, Activity, AlertTriangle, TrendingUp,
  Cloud, HardDrive, Video
} from 'lucide-react';

const QUICK_ACTIONS = [
  { path: '/hc/new', icon: Stethoscope, label: 'Nueva HC', color: 'from-emerald-600 to-teal-500', desc: 'Historia Clínica' },
  { path: '/patients', icon: Users, label: 'Pacientes', color: 'from-teal-600 to-teal-500', desc: 'Gestionar pacientes' },
  { path: '/agenda', icon: Calendar, label: 'Agenda', color: 'from-indigo-600 to-violet-500', desc: 'Citas y cola' },
  { path: '/companies', icon: Building2, label: 'Empresas', color: 'from-emerald-700 to-emerald-500', desc: 'Gestionar empresas' },
  { path: '/reports', icon: BarChart3, label: 'Reportes', color: 'from-teal-700 to-teal-500', desc: 'Epidemiología' },
  { path: '/sgsst', icon: Shield, label: 'SG-SST', color: 'from-emerald-800 to-emerald-600', desc: 'Gestión SST' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentUser, canUse } = useAuthStore();
  const { data: patients, source: patSource } = useBackendData('/data/patients', 'siso_db_patients', 'patients');
  const { data: companies } = useBackendData('/data/companies', 'siso_companies', 'companies');
  const { data: agenda } = useBackendData('/data/agenda', 'siso_agendados', 'appointments');
  const { data: doctor } = useBackendObject('/data/doctor', 'siso_doctor_data', 'doctor');

  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7); // YYYY-MM
  const patientsThisMonth = patients.filter(p => (p.fechaExamen || '').startsWith(thisMonth)).length;
  const todayAppointments = agenda.filter(a => (a.fecha || '').startsWith(today)).length;
  const hcCount = patients.filter(p => p.fechaExamen).length;

  const displayName = doctor?.nombre || currentUser?.nombre || currentUser?.user || 'Doctor';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Stethoscope className="w-5 h-5 text-teal-200" />
            <span className="text-emerald-200 text-xs font-bold uppercase tracking-wide">OcupaSalud Pro</span>
            {patSource === 'backend' && (
              <span className="flex items-center gap-1 text-emerald-300 text-[10px] ml-2">
                <Cloud className="w-3 h-3" /> Conectado a Supabase
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black">
            Bienvenido, {displayName}
          </h1>
          <p className="text-emerald-100 mt-1 text-sm">
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
          {doctor?.licencia && (
            <p className="text-emerald-200 text-xs mt-1">RM: {doctor.licencia}</p>
          )}
          {/* Plan activo — real from PLAN_CONFIG */}
          {(() => {
            const plan = PLAN_CONFIG[currentUser?.license || 'libre'] || PLAN_CONFIG.libre;
            return (
              <p className="text-emerald-200 text-xs mt-1 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Plan: <span className="font-bold">{plan.label}</span>
                {plan.maxHC < 9999 && (
                  <span className="ml-1 opacity-75">· máx {plan.maxHC} HC</span>
                )}
              </p>
            );
          })()}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all text-left group"
            >
              <div className={`bg-gradient-to-r ${action.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-bold text-sm text-gray-800">{action.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Módulos Especializados (B-14: plan-gated cards) ── */}
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">⚡ Módulos Especializados</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* SVE — requiere Starter */}
          <button
            onClick={() =>
              canUse('sve_starter')
                ? navigate('/reports')
                : alert('🔒 SVE está disponible en el plan 🌱 Starter ($45.000/mes, 2 programas) o ⭐ Pro ($79.000/mes, 7 programas).\n\nMenú → ⭐ Ver Planes')
            }
            className={`bg-white border rounded-xl p-3 flex items-center gap-2.5 transition group shadow-sm text-left ${
              canUse('sve_starter') ? 'border-gray-100 hover:border-teal-200 hover:bg-teal-50/40' : 'border-gray-100 opacity-70'
            }`}
          >
            <div className={`${canUse('sve_starter') ? 'bg-teal-50' : 'bg-gray-50'} p-2 rounded-lg flex-shrink-0`}>
              <BarChart3 className={`w-4 h-4 ${canUse('sve_starter') ? 'text-teal-600' : 'text-gray-400'}`} />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-800 text-xs leading-tight">
                SVE {!canUse('sve_starter') && <span className="text-[8px] bg-amber-100 text-amber-700 px-0.5 rounded">🔒</span>}
              </p>
              <p className="text-[10px] text-gray-400 truncate">Vigilancia epidemiológica</p>
            </div>
          </button>

          {/* Telemedicina — requiere Starter */}
          <button
            onClick={() =>
              canUse('telemedicina_starter')
                ? navigate('/telemedicine')
                : alert('🔒 Telemedicina está disponible en el plan 🌱 Starter ($45.000/mes) o ⭐ Pro ($79.000/mes).\n\nMenú → ⭐ Ver Planes')
            }
            className={`bg-white border rounded-xl p-3 flex items-center gap-2.5 transition group shadow-sm text-left ${
              canUse('telemedicina_starter') ? 'border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40' : 'border-gray-100 opacity-70'
            }`}
          >
            <div className={`${canUse('telemedicina_starter') ? 'bg-indigo-50' : 'bg-gray-50'} p-2 rounded-lg flex-shrink-0`}>
              <Video className={`w-4 h-4 ${canUse('telemedicina_starter') ? 'text-indigo-600' : 'text-gray-400'}`} />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-800 text-xs leading-tight">
                Telemedicina {!canUse('telemedicina_starter') && <span className="text-[8px] bg-amber-100 text-amber-700 px-0.5 rounded">🔒</span>}
              </p>
              <p className="text-[10px] text-gray-400 truncate">Teleconsultas</p>
            </div>
          </button>

          {/* ARL — requiere Pro */}
          <button
            onClick={() =>
              canUse('arl')
                ? navigate('/arl')
                : alert('🔒 Módulo ARL está disponible en el plan ⭐ Pro ($79.000/mes).\n\nMenú → ⭐ Ver Planes')
            }
            className={`bg-white border rounded-xl p-3 flex items-center gap-2.5 transition group shadow-sm text-left ${
              canUse('arl') ? 'border-gray-100 hover:border-red-200 hover:bg-red-50/40' : 'border-gray-100 opacity-70'
            }`}
          >
            <div className={`${canUse('arl') ? 'bg-red-50' : 'bg-gray-50'} p-2 rounded-lg flex-shrink-0`}>
              <AlertTriangle className={`w-4 h-4 ${canUse('arl') ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-800 text-xs leading-tight">
                Módulo ARL {!canUse('arl') && <span className="text-[8px] bg-amber-100 text-amber-700 px-0.5 rounded">🔒</span>}
              </p>
              <p className="text-[10px] text-gray-400 truncate">Reportes AT/EL</p>
            </div>
          </button>

          {/* Portal Empresa */}
          <button
            onClick={() => navigate('/portal-empresa')}
            className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 hover:border-emerald-200 hover:bg-emerald-50/40 transition group shadow-sm text-left"
          >
            <div className="bg-emerald-50 p-2 rounded-lg flex-shrink-0">
              <Building2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-800 text-xs leading-tight">Portal Empresa</p>
              <p className="text-[10px] text-gray-400 truncate">Acceso por NIT</p>
            </div>
          </button>
        </div>
      </div>

      {/* Stats — now with REAL data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Pacientes atendidos', value: patientsThisMonth || patients.length, sub: patientsThisMonth ? 'Este mes' : 'Total', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { icon: Building2, label: 'Empresas activas', value: companies.length, sub: 'Total', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
          { icon: Calendar, label: 'Citas hoy', value: todayAppointments, sub: 'Pendientes', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
          { icon: Activity, label: 'HC generadas', value: hcCount, sub: 'Total', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white rounded-xl p-5 shadow-sm border ${stat.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`${stat.bg} p-2.5 rounded-xl`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-gray-300" />
            </div>
            <p className="text-2xl font-black text-gray-800">{stat.value}</p>
            <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── KPIs ADICIONALES (como monolito) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(() => {
          const hcCerradas = patients.filter(p => p.estadoHistoria === 'Cerrada' || p.estado === 'cerrada').length;
          const hcAbiertas = patients.filter(p => p.estadoHistoria === 'Abierta' || p.estado === 'abierta' || !p.estadoHistoria).length;
          const medicosActivos = 1; // Por ahora fijo
          const conveniosPorVencer = companies.filter(c => {
            if (!c.convenioVencimiento) return false;
            const vence = new Date(c.convenioVencimiento);
            const thirtyDays = new Date();
            thirtyDays.setDate(thirtyDays.getDate() + 30);
            return vence <= thirtyDays && vence >= new Date();
          }).length;
          return [
            { icon: FileCheck, label: 'HC Cerradas', value: hcCerradas, sub: 'Completadas', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
            { icon: FileText, label: 'HC Abiertas', value: hcAbiertas, sub: 'Pendientes', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { icon: Stethoscope, label: 'Médicos activos', value: medicosActivos, sub: 'En sistema', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { icon: Shield, label: 'Convenios por vencer', value: conveniosPorVencer, sub: 'Próximos 30 días', color: conveniosPorVencer > 0 ? 'text-red-600' : 'text-gray-600', bg: conveniosPorVencer > 0 ? 'bg-red-50' : 'bg-gray-50', border: conveniosPorVencer > 0 ? 'border-red-100' : 'border-gray-100' },
          ].map((stat, i) => (
            <div key={`kpi-${i}`} className={`bg-white rounded-xl p-5 shadow-sm border ${stat.border}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`${stat.bg} p-2.5 rounded-xl`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-800">{stat.value}</p>
              <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
            </div>
          ));
        })()}
      </div>

      {/* ── ALERTAS (como monolito) ── */}
      {(() => {
        const hcAbiertas = patients.filter(p => p.estadoHistoria === 'Abierta' || p.estado === 'abierta' || !p.estadoHistoria).length;
        const hasAlerts = hcAbiertas > 0;
        if (!hasAlerts) return null;
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" /> Alertas del Sistema
            </h3>
            <div className="space-y-1">
              {hcAbiertas > 0 && (
                <p className="text-sm text-amber-700">📋 {hcAbiertas} historia(s) clínica(s) sin cerrar</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* D-04: Últimos Pacientes (como monolito) */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          Últimos Pacientes Atendidos
        </h3>
        {patients && patients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b text-xs">
                  <th className="text-left py-2 px-2">Paciente</th>
                  <th className="text-left py-2 px-2">Empresa</th>
                  <th className="text-left py-2 px-2">Tipo</th>
                  <th className="text-left py-2 px-2">Fecha</th>
                  <th className="text-left py-2 px-2">Concepto</th>
                </tr>
              </thead>
              <tbody>
                {patients.slice(0, 5).map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 font-medium">{p.nombres || 'Sin nombre'}</td>
                    <td className="py-2 px-2 text-gray-600">{p.empresaNombre || p.empresa || '-'}</td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{p.tipoExamen || '-'}</span>
                    </td>
                    <td className="py-2 px-2 text-gray-500 text-xs">{p.fechaExamen || '-'}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        p.conceptoAptitud?.includes('APTO') ? 'bg-green-50 text-green-600' :
                        p.conceptoAptitud?.includes('NO APTO') ? 'bg-red-50 text-red-600' :
                        'bg-yellow-50 text-yellow-600'
                      }`}>
                        {p.conceptoAptitud || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No hay pacientes registrados</p>
        )}
      </div>

      {/* D-05: Próximas Citas (como monolito) */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          Citas de Hoy
        </h3>
        {agenda && agenda.length > 0 ? (
          <ul className="space-y-2">
            {agenda.filter(a => (a.fecha || '').startsWith(today)).slice(0, 5).map((a, i) => (
              <li key={a.id || i} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-indigo-600">{a.hora || '--:--'}</span>
                  <span>{a.paciente || a.nombre || 'Sin nombre'}</span>
                </div>
                <span className="text-gray-500 text-xs">{a.empresa || a.empresaNombre || '-'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">No hay citas para hoy</p>
        )}
      </div>

      {/* ── PRODUCTIVIDAD MÉDICA (como monolito) ── */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-600" />
          Productividad Médica
        </h3>
        {patients && patients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b text-xs bg-gray-50">
                  <th className="text-left py-2 px-3 font-bold">Médico</th>
                  <th className="text-right py-2 px-3 font-bold">Atenciones</th>
                  <th className="text-right py-2 px-3 font-bold">HC Cerradas</th>
                  <th className="text-right py-2 px-3 font-bold">HC Abiertas</th>
                  <th className="text-right py-2 px-3 font-bold">% Participación</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const hcCerradas = patients.filter(p => p.estadoHistoria === 'Cerrada' || p.estado === 'cerrada').length;
                  const hcAbiertas = patients.filter(p => p.estadoHistoria === 'Abierta' || p.estado === 'abierta' || !p.estadoHistoria).length;
                  const atenciones = hcCerradas + hcAbiertas;
                  const participacion = patients.length > 0 ? ((atenciones / patients.length) * 100).toFixed(1) : 0;
                  const doctorName = doctor?.nombre || 'Dr. Julian Cucalon';
                  return (
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3 font-bold text-gray-800">{doctorName}</td>
                      <td className="py-3 px-3 text-right font-bold text-indigo-600">{atenciones}</td>
                      <td className="py-3 px-3 text-right font-bold text-green-600">{hcCerradas}</td>
                      <td className="py-3 px-3 text-right font-bold text-amber-600">{hcAbiertas}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                          {participacion}%
                        </span>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Sin datos de productividad</p>
        )}
      </div>
    </div>
  );
}
