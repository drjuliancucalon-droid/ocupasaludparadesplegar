import React, { useState } from 'react';
import { Key, Edit2, Save, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';

/**
 * LicenseManager - Gestión de licencias de usuarios (LicenciasTab)
 * Control de fechas de vencimiento, planes, estados
 */
export const LicenseManager = ({ users = [], onUpdateUser, currentUser }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const openEdit = (u) => {
    setEditingId(u.id);
    setEditForm({
      plan: u.plan || 'free',
      licenciaInicio: u.licenciaInicio || '',
      licenciaFin: u.licenciaFin || '',
      maxPacientes: u.maxPacientes || 100,
      estado: u.estadoLicencia || 'activa',
    });
  };

  const saveLic = (u) => {
    onUpdateUser?.(u.id, {
      plan: editForm.plan,
      licenciaInicio: editForm.licenciaInicio,
      licenciaFin: editForm.licenciaFin,
      maxPacientes: parseInt(editForm.maxPacientes) || 100,
      estadoLicencia: editForm.estado,
    });
    setEditingId(null);
  };

  const getDaysLeft = (u) => {
    if (!u.licenciaFin) return Infinity;
    return Math.ceil((new Date(u.licenciaFin) - new Date()) / 86400000);
  };

  const getStatusBadge = (u) => {
    const days = getDaysLeft(u);
    if (days < 0) return { label: 'Vencida', color: 'bg-red-100 text-red-800' };
    if (days < 15) return { label: `${days}d restantes`, color: 'bg-amber-100 text-amber-800' };
    if (days < 60) return { label: `${days}d restantes`, color: 'bg-yellow-100 text-yellow-800' };
    return { label: u.estadoLicencia || 'Activa', color: 'bg-emerald-100 text-emerald-800' };
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
        <Key className="w-5 h-5 text-amber-600" /> Gestión de Licencias
      </h2>

      <div className="space-y-2">
        {users.filter((u) => u.role === 'medico' || u.role === 'administrador').map((u) => {
          const status = getStatusBadge(u);
          const isEditing = editingId === u.id;

          return (
            <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👨‍⚕️</span>
                  <div>
                    <p className="text-xs font-black text-gray-800">{u.nombre || u.usuario}</p>
                    <p className="text-[10px] text-gray-500">@{u.usuario} · {u.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
                  <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    Plan: {u.plan || 'Free'}
                  </span>
                  {!isEditing && (
                    <button onClick={() => openEdit(u)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="bg-gray-50 rounded-xl p-3 mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-black text-gray-500 uppercase mb-0.5">Plan</label>
                      <select value={editForm.plan} onChange={(e) => setEditForm((p) => ({ ...p, plan: e.target.value }))}
                        className="w-full p-1.5 border border-gray-200 rounded text-xs">
                        <option value="free">Free</option>
                        <option value="basic">Básico</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-500 uppercase mb-0.5">Estado</label>
                      <select value={editForm.estado} onChange={(e) => setEditForm((p) => ({ ...p, estado: e.target.value }))}
                        className="w-full p-1.5 border border-gray-200 rounded text-xs">
                        <option value="activa">Activa</option>
                        <option value="suspendida">Suspendida</option>
                        <option value="vencida">Vencida</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-500 uppercase mb-0.5">Inicio</label>
                      <input type="date" value={editForm.licenciaInicio}
                        onChange={(e) => setEditForm((p) => ({ ...p, licenciaInicio: e.target.value }))}
                        className="w-full p-1.5 border border-gray-200 rounded text-xs" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-500 uppercase mb-0.5">Vencimiento</label>
                      <input type="date" value={editForm.licenciaFin}
                        onChange={(e) => setEditForm((p) => ({ ...p, licenciaFin: e.target.value }))}
                        className="w-full p-1.5 border border-gray-200 rounded text-xs" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveLic(u)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700 flex items-center gap-1">
                      <Save className="w-3 h-3" /> Guardar
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
