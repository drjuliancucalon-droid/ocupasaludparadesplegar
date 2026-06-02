// src/pages/SuperAdminPage.jsx — Super Admin multi-org management
// T-05: Completar SuperAdmin - Métricas globales + Logs auditoría
import React, { useState } from 'react';
import { Shield, Plus, Building2, Users, Edit2, Trash2, CheckCircle, XCircle, BarChart3, Clock, Activity, Database } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useBackendData } from '../hooks/useBackendData';

const STORAGE_KEY = 'siso_orgs';
const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const persist = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

// T-05: Cargar logs de auditoría
const AUDIT_LOG_KEY = 'siso_audit_log';
const loadAuditLog = () => { try { return JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]'); } catch { return []; } };

const PLANS = [
  { id: 'libre', label: '🆓 Libre', color: 'bg-gray-100 text-gray-700' },
  { id: 'starter', label: '🌱 Starter', color: 'bg-teal-100 text-teal-700' },
  { id: 'pro', label: '⭐ Pro', color: 'bg-blue-100 text-blue-700' },
  { id: 'clinica', label: '🏢 Clínica', color: 'bg-purple-100 text-purple-700' },
];

export default function SuperAdminPage() {
  const { currentUser } = useAuthStore();
  const { data: users } = useBackendData('/data/users', 'siso_users', 'users');
  const [orgs, setOrgs] = useState(() => {
    const stored = load();
    return stored.length > 0 ? stored : [{
      id: 'org_cucalon_2026', nombre: 'OcupaSalud Popayán', nit: '', plan: 'clinica',
      adminUser: 'drcucalon', activa: true, createdAt: '2026-01-01',
    }];
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', nit: '', plan: 'starter', adminUser: '' });

  const handleCreate = () => {
    if (!form.nombre) { alert('Nombre de organización requerido'); return; }
    const org = { ...form, id: `org_${Date.now().toString(36)}`, activa: true, createdAt: new Date().toISOString() };
    const updated = [...orgs, org]; setOrgs(updated); persist(updated);
    setForm({ nombre: '', nit: '', plan: 'starter', adminUser: '' }); setShowForm(false);
  };

  const toggleOrg = (id) => {
    const updated = orgs.map((o) => o.id === id ? { ...o, activa: !o.activa } : o);
    setOrgs(updated); persist(updated);
  };

  const deleteOrg = (id) => {
    if (!confirm('¿Eliminar esta organización?')) return;
    const updated = orgs.filter((o) => o.id !== id); setOrgs(updated); persist(updated);
  };

  if (currentUser?.role !== 'super_admin' && currentUser?.role !== 'administrador') {
    return <div className="p-6 text-center text-gray-400"><Shield className="w-12 h-12 mx-auto mb-2" /><p>Acceso restringido a Super Admin</p></div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Shield className="w-6 h-6 text-emerald-600" /><h1 className="text-2xl font-bold text-gray-800">Panel Super Admin</h1></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold"><Plus className="w-4 h-4" /> Nueva Org</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-5"><p className="text-2xl font-black text-gray-800">{orgs.length}</p><p className="text-xs text-gray-500">Organizaciones</p></div>
        <div className="bg-white border rounded-xl p-5"><p className="text-2xl font-black text-gray-800">{users.length}</p><p className="text-xs text-gray-500">Usuarios totales</p></div>
        <div className="bg-white border rounded-xl p-5"><p className="text-2xl font-black text-gray-800">{orgs.filter((o) => o.activa).length}</p><p className="text-xs text-gray-500">Orgs activas</p></div>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-6 space-y-3">
          <h3 className="font-bold text-gray-800">Nueva Organización</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre *" className="border rounded-lg px-3 py-2 text-sm" />
            <input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} placeholder="NIT" className="border rounded-lg px-3 py-2 text-sm" />
            <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              {PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <select value={form.adminUser} onChange={(e) => setForm({ ...form, adminUser: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Admin (opcional)</option>
              {users.map((u) => <option key={u.user} value={u.user}>{u.name || u.user}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">Crear</button>
          </div>
        </div>
      )}

      {/* Org list */}
      <div className="space-y-3">
        {orgs.map((org) => {
          const plan = PLANS.find((p) => p.id === org.plan) || PLANS[0];
          return (
            <div key={org.id} className={`bg-white border rounded-xl p-5 ${!org.activa ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="font-bold text-gray-800">{org.nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {org.nit && <span className="text-xs text-gray-500">NIT: {org.nit}</span>}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${plan.color}`}>{plan.label}</span>
                      {org.activa ? <span className="text-[10px] text-green-600 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" />Activa</span>
                        : <span className="text-[10px] text-red-500 flex items-center gap-0.5"><XCircle className="w-3 h-3" />Inactiva</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleOrg(org.id)} className={`p-2 rounded-lg text-xs font-bold ${org.activa ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                    {org.activa ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => deleteOrg(org.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
      {org.adminUser && <p className="text-xs text-gray-400 mt-2">Admin: {org.adminUser} | Creada: {new Date(org.createdAt).toLocaleDateString('es-CO')}</p>}
            </div>
          );
        })}
      </div>

      {/* T-05: Métricas globales */}
      <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <h3 className="font-black text-indigo-800">Métricas Globales</h3>
        </div>
        <p className="text-xs text-indigo-600 mb-4">Estadísticas consolidadas de todas las organizaciones</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 text-center">
            <Activity className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-xl font-black text-gray-800">{users.length}</p>
            <p className="text-[10px] text-gray-500">Usuarios activos</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-xl font-black text-gray-800">—</p>
            <p className="text-[10px] text-gray-500">Pacientes total</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <Database className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-xl font-black text-gray-800">—</p>
            <p className="text-[10px] text-gray-500">HC generadas</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <Building2 className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-xl font-black text-gray-800">{orgs.filter(o => o.activa).length}</p>
            <p className="text-[10px] text-gray-500">Empresas activas</p>
          </div>
        </div>
      </div>

      {/* T-05: Logs de auditoría (Res. 1888/2025) */}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-amber-600" />
          <h3 className="font-black text-amber-800">Logs de Auditoría (Res. 1888/2025)</h3>
        </div>
        <p className="text-xs text-amber-600 mb-4">Registro de acciones críticas del sistema</p>
        
        <div className="bg-white rounded-xl p-4">
          <div className="text-xs text-gray-500 italic text-center py-4">
            Los logs de auditoría se almacenan automáticamente cuando se realizan acciones críticas (crear HC, modificar datos de pacientes, cambios de configuración, etc.)
          </div>
          <div className="flex gap-2 mt-3">
            <button 
              onClick={() => {
                const logs = loadAuditLog();
                alert(`Total de logs: ${logs.length}\n\n(Los logs se muestran en la consola)`);
                console.log('Audit logs:', logs);
              }}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
            >
              Ver logs en consola
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
