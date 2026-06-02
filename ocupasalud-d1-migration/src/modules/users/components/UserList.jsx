// src/modules/users/components/UserList.jsx
// Lista de usuarios con stats, activar/desactivar, controles por rol
import React, { useState } from 'react';
import { Users, Search, Plus, Edit2, Trash2, Shield, Key, Crown,
  Lock, AlertTriangle, PowerOff, Power, FileText, UserCheck } from 'lucide-react';
import { PLAN_CONFIG } from '../../../shared/data/planConfig';

const ROLE_EMOJI  = { super_admin:'👑', administrador:'👨‍💼', medico:'👨‍⚕️', secretaria:'👩‍💻', admin_empresa:'🏢' };
const ROLE_LABEL  = { super_admin:'Super Admin', administrador:'Administrador', medico:'Médico', secretaria:'Secretaria', admin_empresa:'Admin Empresa' };
const PLAN_BADGE  = { clinica:'bg-purple-100 text-purple-800', pro:'bg-blue-100 text-blue-800', starter:'bg-teal-100 text-teal-800', libre:'bg-gray-100 text-gray-600' };
const ROLE_BADGE  = { super_admin:'bg-red-100 text-red-800', administrador:'bg-purple-100 text-purple-800', medico:'bg-blue-100 text-blue-800', secretaria:'bg-amber-100 text-amber-800', admin_empresa:'bg-indigo-100 text-indigo-800' };

export const UserList = ({ users = [], currentUser, onEdit, onDelete, onAdd, onToggleActive, onResetPassword, stats }) => {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('todos');

  const isSuperAdmin  = currentUser?.role === 'super_admin';
  const isAdmin       = currentUser?.role === 'administrador';
  const canManage     = isSuperAdmin || isAdmin;

  // Super admin no se puede desactivar/borrar
  const isProtected = (u) => u.user === 'drcucalon' || u.usuario === 'drcucalon' || u.role === 'super_admin';
  // Administrador no puede tocar super_admin ni otros administradores
  const canEdit  = (u) => canManage && (isSuperAdmin || (!isProtected(u) && u.role !== 'administrador'));
  const canDelete = (u) => canManage && !isProtected(u) && (isSuperAdmin || u.role !== 'administrador');

  const getDaysLeft = (u) => {
    const exp = new Date(u.licenseExpiry || u.licenciaFin || '');
    if (isNaN(exp.getTime())) return null;
    return Math.ceil((exp - new Date()) / 86400000);
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchText = (u.nombre || u.usuario || u.user || '').toLowerCase().includes(q) || (u.role||'').toLowerCase().includes(q);
    const matchRole = filterRole === 'todos' || u.role === filterRole;
    return matchText && matchRole;
  });

  const activeCount   = users.filter(u => u.activo !== false).length;
  const inactiveCount = users.filter(u => u.activo === false).length;

  return (
    <div className="space-y-5">
      {/* ── Stats cards (super_admin) ── */}
      {isSuperAdmin && stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Usuarios activos',  value: activeCount,           color: 'emerald', icon: '👥' },
            { label: 'Inactivos',         value: inactiveCount,         color: 'gray',    icon: '🔒' },
            { label: 'Historias clínicas',value: stats.totalPatients,   color: 'blue',    icon: '📋' },
            { label: 'Certificados',      value: stats.totalCerts,      color: 'purple',  icon: '📜' },
            { label: 'Almacenamiento',    value: `${stats.storageKB} KB`, color: 'amber', icon: '💾' },
          ].map(s => (
            <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-100 rounded-xl p-3 text-center`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`text-xl font-black text-${s.color}-700`}>{s.value}</div>
              <div className={`text-[10px] font-bold text-${s.color}-600 mt-0.5`}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Header + botón nuevo ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          Usuarios
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{users.length} total</span>
        </h2>
        {canManage && (
          <button onClick={onAdd} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-black hover:bg-purple-700 flex items-center gap-1.5 transition shadow-sm">
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        )}
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, usuario o rol..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white min-w-[160px]">
          <option value="todos">Todos los roles</option>
          <option value="super_admin">👑 Super Admin</option>
          <option value="administrador">👨‍💼 Administrador</option>
          <option value="medico">👨‍⚕️ Médico</option>
          <option value="secretaria">👩‍💻 Secretaria</option>
          <option value="admin_empresa">🏢 Admin Empresa</option>
        </select>
      </div>

      {/* ── Lista ── */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No se encontraron usuarios</p>
          </div>
        )}

        {filtered.map(user => {
          const daysLeft   = getDaysLeft(user);
          const plan       = user.license || user.plan || 'libre';
          const protected_ = isProtected(user);
          const inactive   = user.activo === false;

          return (
            <div key={user.id}
              className={`bg-white border rounded-xl p-3 flex items-center justify-between transition ${
                inactive ? 'border-gray-100 opacity-60' : 'border-gray-200 hover:border-purple-200'
              }`}>
              {/* Avatar + info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative ${inactive ? 'bg-gray-100' : 'bg-purple-50'}`}>
                  <span className="text-lg">{ROLE_EMOJI[user.role] || '👤'}</span>
                  {protected_ && (
                    <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-0.5 border border-white">
                      <Crown className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {inactive && (
                    <div className="absolute -top-1 -right-1 bg-gray-400 rounded-full p-0.5 border border-white">
                      <PowerOff className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-black text-gray-800 truncate">{user.nombre || user.usuario || user.user}</p>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase flex-shrink-0 ${PLAN_BADGE[plan]}`}>
                      {PLAN_CONFIG[plan]?.label || plan}
                    </span>
                    {inactive && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-600 uppercase">Inactivo</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <p className="text-[10px] text-gray-500">@{user.usuario || user.user}</p>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${ROLE_BADGE[user.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABEL[user.role] || user.role}
                    </span>
                    {user.email && <p className="text-[9px] text-gray-400 truncate hidden sm:block">{user.email}</p>}
                    {daysLeft !== null && (
                      <span className={`text-[9px] flex items-center gap-0.5 ${daysLeft < 0 ? 'text-red-500 font-bold' : daysLeft < 30 ? 'text-orange-500 font-bold' : 'text-gray-400'}`}>
                        {daysLeft < 0 ? <><AlertTriangle className="w-2.5 h-2.5" />Vencida</> : `Lic. ${daysLeft}d`}
                      </span>
                    )}
                  </div>
                  {/* Stats individuales (super_admin) */}
                  {isSuperAdmin && stats?.perUser?.[user.usuario || user.user] && (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-blue-500 flex items-center gap-0.5">
                        <FileText className="w-2.5 h-2.5" />{stats.perUser[user.usuario || user.user].hc} HCs
                      </span>
                      <span className="text-[9px] text-purple-500 flex items-center gap-0.5">
                        <UserCheck className="w-2.5 h-2.5" />{stats.perUser[user.usuario || user.user].certs} Certs
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                {user.twoFAEnabled && <Shield className="w-3.5 h-3.5 text-indigo-500" title="2FA activo" />}

                {protected_ ? (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                    <Lock className="w-3 h-3" />
                    <span className="text-[9px] font-bold hidden sm:block">Protegido</span>
                  </div>
                ) : canManage ? (
                  <>
                    {/* Activar / Desactivar */}
                    <button onClick={() => onToggleActive?.(user)}
                      title={inactive ? 'Activar usuario' : 'Desactivar usuario'}
                      className={`p-1.5 rounded-lg transition ${inactive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                      {inactive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                    </button>
                    {/* Reset contraseña */}
                    <button onClick={() => onResetPassword?.(user)} title="Resetear contraseña"
                      className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition">
                      <Key className="w-3.5 h-3.5" />
                    </button>
                    {/* Editar */}
                    {canEdit(user) && (
                      <button onClick={() => onEdit?.(user)} title="Editar"
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Borrar */}
                    {canDelete(user) && (
                      <button onClick={() => onDelete?.(user.id)} title="Eliminar"
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-[9px] text-gray-400 px-2">Solo lectura</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
