// src/pages/Users.jsx
// ═══════════════════════════════════════════════════════════════════════
// GESTIÓN DE USUARIOS — Lista, crear, editar, roles, perfil médico,
// permisos secretaria, firma digital
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import { UserCheck, Pencil, Trash2, X, Lock, Plus } from 'lucide-react';
import { InputGroup } from '../shared/ui/InputGroup.jsx';
import { DEFAULT_DOCTOR_DATA, SPECIALTIES_LIST } from '../shared/data/catalogs.js';
import { _isAdmin } from '../shared/data/planConfig.js';
import { validatePasswordStrength } from '../shared/lib/security.js';

export default function UsersPage({
  currentUser,
  goTo,
  usersList = [],
  onAddUser,
  onEditUser,
  onDeleteUser,
}) {
  const showAlert = useCallback((msg) => window.alert(msg), []);
  const showConfirm = useCallback((msg, cb) => { if (window.confirm(msg)) cb(); }, []);

  const [activeTab, setActiveTab] = useState('list');
  const [userEditId, setUserEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newUserForm, setNewUserForm] = useState({
    user: '', name: '', pass: '', role: 'medico', activo: true,
    doctorData: { ...DEFAULT_DOCTOR_DATA },
  });

  const isAdmin = _isAdmin(currentUser?.role);

  const startEdit = (u) => {
    setUserEditId(u.id || u.user);
    setEditForm({ ...u, doctorData: { ...DEFAULT_DOCTOR_DATA, ...(u.doctorData || {}) } });
  };

  const saveEdit = () => {
    if (editForm.pass && editForm.pass.length > 0) {
      const { valid, errors } = validatePasswordStrength(editForm.pass);
      if (!valid) { showAlert('⚠️ Contraseña no cumple la política:\n• ' + errors.join('\n• ')); return; }
    }
    const userData = { ...editForm };
    if (!userData.pass || userData.pass.length === 0) delete userData.pass;
    onEditUser?.(userData);
    setUserEditId(null);
    showAlert('✅ Perfil guardado.');
  };

  const handleCreateUser = () => {
    if (!newUserForm.user.trim()) { showAlert('Ingrese un nombre de usuario.'); return; }
    if (!newUserForm.name.trim()) { showAlert('Ingrese el nombre completo.'); return; }
    if (!newUserForm.pass || newUserForm.pass.length < 6) { showAlert('La contraseña debe tener mínimo 6 caracteres.'); return; }
    if (usersList.some(u => u.user === newUserForm.user.trim())) { showAlert('⚠️ Ese nombre de usuario ya existe.'); return; }
    onAddUser?.({ ...newUserForm, id: 'user_' + Date.now(), user: newUserForm.user.trim() });
    setNewUserForm({ user: '', name: '', pass: '', role: 'medico', activo: true, doctorData: { ...DEFAULT_DOCTOR_DATA } });
    setActiveTab('list');
    showAlert('✅ Usuario creado exitosamente.');
  };

  const dd = editForm.doctorData || {};
  const setDD = (field, val) => setEditForm(p => ({ ...p, doctorData: { ...(p.doctorData || {}), [field]: val } }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-violet-900 flex items-center gap-2">
          <UserCheck className="w-5 h-5" /> {isAdmin ? 'Gestión de Usuarios y Perfiles Médicos' : 'Mi Perfil Profesional'}
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 flex-wrap">
        {[
          { k: 'list', l: '👥 Usuarios', showFor: 'all' },
          { k: 'new', l: '➕ Crear Usuario', showFor: 'admin' },
        ].filter(({ showFor }) => showFor === 'all' || isAdmin).map(({ k, l }) => (
          <button key={k} onClick={() => { setActiveTab(k); setUserEditId(null); }} className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition ${activeTab === k ? 'border-violet-600 text-violet-700 bg-violet-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* LIST TAB */}
      {activeTab === 'list' && !userEditId && (
        <div className="space-y-3">
          {usersList.map((u) => (
            <div key={u.id || u.user} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-black text-lg">
                    {u.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-black text-base text-gray-900">{u.name}</p>
                    <p className="text-sm text-gray-500 font-mono">@{u.user}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                      u.role === 'admin_empresa' ? 'bg-teal-100 text-teal-800' :
                      u.role === 'administrador' ? 'bg-red-100 text-red-700' :
                      u.role === 'secretaria' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role === 'super_admin' ? '⭐ Super Admin' : u.role === 'admin_empresa' ? '🏥 Admin IPS' : u.role === 'administrador' ? 'Administrador' : u.role === 'secretaria' ? 'Secretaria' : 'Médico'}
                    </span>
                    {u.activo === false && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-200 text-gray-500 ml-1">⏸ Inactivo</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {(u.user === currentUser?.user || isAdmin) && (
                    <button onClick={() => startEdit(u)} className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition ${u.user === currentUser?.user ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100'}`}>
                      <Pencil className="w-3 h-3" /> {u.user === currentUser?.user ? '✏️ Mi Perfil' : '✏️ Editar'}
                    </button>
                  )}
                  {isAdmin && u.user !== currentUser?.user && (
                    <button onClick={() => { const upd = { ...u, activo: u.activo === false ? true : false }; onEditUser?.(upd); showAlert(u.activo === false ? `✅ @${u.user} activado.` : `⏸️ @${u.user} desactivado.`); }} className={`p-1.5 rounded-lg text-xs font-bold ${u.activo === false ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                      {u.activo === false ? '▶ Activar' : '⏸ Desactivar'}
                    </button>
                  )}
                  {isAdmin && u.user !== currentUser?.user && usersList.length > 1 && (
                    <button onClick={() => showConfirm('¿Eliminar usuario?', () => onDeleteUser?.(u))} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {u.doctorData && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div><span className="font-bold text-gray-700">CC:</span> {u.doctorData.cedula}</div>
                  <div><span className="font-bold text-gray-700">Licencia:</span> {u.doctorData.licencia}</div>
                  <div><span className="font-bold text-gray-700">Cel:</span> {u.doctorData.celular}</div>
                  <div><span className="font-bold text-gray-700">Banco:</span> {u.doctorData.banco}</div>
                  <div><span className="font-bold text-gray-700">Cuenta:</span> {u.doctorData.numeroCuenta}</div>
                  <div><span className="font-bold text-gray-700">Tarifa:</span> ${parseInt(u.doctorData.tarifaExamenOcup || 0).toLocaleString('es-CO')}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* EDIT PROFILE */}
      {activeTab === 'list' && userEditId && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {isAdmin && editForm.user !== currentUser?.user && (
            <div className="mb-4 flex items-center gap-3 bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3">
              <span className="text-amber-600 text-xl">⚙️</span>
              <div>
                <p className="text-xs font-black text-amber-800 uppercase">Editando perfil de otro usuario</p>
                <p className="text-sm font-bold text-amber-900">@{editForm.user} - {editForm.name}</p>
              </div>
              <button onClick={() => setUserEditId(null)} className="ml-auto text-amber-500 hover:text-amber-700 text-xs font-bold underline">← Volver a la lista</button>
            </div>
          )}
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-black text-lg text-violet-900 flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Editar Perfil: {editForm.name}
            </h3>
            <button onClick={() => setUserEditId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          {/* Access Data */}
          <div className="bg-violet-50 rounded-xl p-4 mb-4 border border-violet-100">
            <p className="text-xs font-black text-violet-800 uppercase mb-3 flex items-center gap-1"><Lock className="w-3 h-3" /> Datos de Acceso</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nombre Completo</label>
                <input value={editForm.name || ''} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Usuario</label>
                <input value={editForm.user || ''} disabled={!isAdmin} className="w-full p-2 border rounded-lg text-sm font-mono disabled:bg-gray-100 disabled:text-gray-400" onChange={(e) => setEditForm(p => ({ ...p, user: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nueva Contraseña</label>
                <input type="password" value={editForm.pass || ''} onChange={(e) => setEditForm(p => ({ ...p, pass: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" placeholder="Dejar igual si no cambia" />
                {editForm.pass && editForm.pass.length > 0 && (
                  <p className={`text-[10px] mt-0.5 font-semibold ${editForm.pass.length >= 8 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {editForm.pass.length < 8 ? '⚠ Mín. 8 caracteres' : '✅ Contraseña válida'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Rol</label>
                <select value={editForm.role || 'medico'} onChange={(e) => setEditForm(p => ({ ...p, role: e.target.value }))} disabled={!isAdmin} className="w-full p-2 border rounded-lg text-sm disabled:bg-gray-100">
                  <option value="medico">Médico</option>
                  <option value="secretaria">Secretaria</option>
                  <option value="administrador">Administrador</option>
                  <option value="admin_empresa">Admin Empresa</option>
                </select>
              </div>
            </div>
          </div>

          {/* Doctor Data */}
          <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
            <p className="text-xs font-black text-blue-800 uppercase mb-3">👨‍⚕️ Datos Profesionales del Médico</p>
            <div className="flex flex-wrap -mx-1.5">
              <InputGroup label="Nombre completo" value={dd.nombre || ''} onChange={(e) => setDD('nombre', e.target.value)} width="w-1/2" />
              <InputGroup label="CC" value={dd.cedula || ''} onChange={(e) => setDD('cedula', e.target.value)} width="w-1/4" />
              <InputGroup label="Licencia médica" value={dd.licencia || ''} onChange={(e) => setDD('licencia', e.target.value)} width="w-1/4" />
              <InputGroup label="Título profesional" value={dd.titulo || ''} onChange={(e) => setDD('titulo', e.target.value)} width="w-1/2" />
              <div className="px-1.5 mb-3 w-1/2">
                <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">Especialidad</label>
                <select value={dd.especialidad || ''} onChange={(e) => setDD('especialidad', e.target.value)} className="w-full p-1.5 border rounded-lg text-xs">
                  <option value="">-- Seleccionar --</option>
                  {SPECIALTIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <InputGroup label="Celular" value={dd.celular || ''} onChange={(e) => setDD('celular', e.target.value)} width="w-1/4" />
              <InputGroup label="Email" value={dd.email || ''} onChange={(e) => setDD('email', e.target.value)} width="w-1/4" />
              <InputGroup label="Ciudad" value={dd.ciudad || ''} onChange={(e) => setDD('ciudad', e.target.value)} width="w-1/4" />
              <InputGroup label="Dirección consultorio" value={dd.direccion || ''} onChange={(e) => setDD('direccion', e.target.value)} width="w-1/2" />
            </div>
          </div>

          {/* Billing Data */}
          <div className="bg-emerald-50 rounded-xl p-4 mb-4 border border-emerald-100">
            <p className="text-xs font-black text-emerald-800 uppercase mb-3">💰 Datos Bancarios y Tarifas</p>
            <div className="flex flex-wrap -mx-1.5">
              <InputGroup label="Banco" value={dd.banco || ''} onChange={(e) => setDD('banco', e.target.value)} width="w-1/3" />
              <div className="px-1.5 mb-3 w-1/6">
                <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">Tipo cuenta</label>
                <select value={dd.tipoCuenta || 'Ahorros'} onChange={(e) => setDD('tipoCuenta', e.target.value)} className="w-full p-1.5 border rounded-lg text-xs">
                  <option>Ahorros</option><option>Corriente</option>
                </select>
              </div>
              <InputGroup label="No. Cuenta" value={dd.numeroCuenta || ''} onChange={(e) => setDD('numeroCuenta', e.target.value)} width="w-1/4" />
              <InputGroup label="RUT" value={dd.rut || ''} onChange={(e) => setDD('rut', e.target.value)} width="w-1/4" />
              <InputGroup label="Tarifa examen ocup COP" value={dd.tarifaExamenOcup || ''} onChange={(e) => setDD('tarifaExamenOcup', e.target.value)} type="number" width="w-1/4" />
              <InputGroup label="Tarifa consulta general COP" value={dd.tarifaConsultaGeneral || ''} onChange={(e) => setDD('tarifaConsultaGeneral', e.target.value)} type="number" width="w-1/4" />
              <InputGroup label="Tarifa informe empresa COP" value={dd.tarifaInforme || ''} onChange={(e) => setDD('tarifaInforme', e.target.value)} type="number" width="w-1/4" />
            </div>
          </div>

          {/* Firma digital */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
            <p className="text-xs font-black text-gray-700 uppercase mb-3">✍️ Firma Digital</p>
            <p className="text-[10px] text-gray-500 mb-2">Cargue una imagen de su firma (PNG transparente recomendado). Aparecerá en certificados, cuentas de cobro y documentos generados.</p>
            <div className="flex items-center gap-4">
              {dd.firma ? (
                <div className="border border-gray-300 rounded-lg p-2 bg-white">
                  <img src={dd.firma} alt="Firma" className="max-h-16 max-w-[200px] object-contain" />
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-400 text-xs w-48">Sin firma cargada</div>
              )}
              <div>
                <label className="cursor-pointer bg-violet-600 text-white px-4 py-2 rounded-lg text-xs font-black hover:bg-violet-700 inline-block">
                  📤 Cargar firma
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setDD('firma', ev.target.result);
                    reader.readAsDataURL(file);
                  }} />
                </label>
                {dd.firma && (
                  <button onClick={() => setDD('firma', '')} className="ml-2 text-red-500 text-xs font-bold hover:text-red-700">🗑️ Eliminar</button>
                )}
              </div>
            </div>
          </div>

          {/* Secretaria permissions */}
          {editForm.role === 'secretaria' && isAdmin && (
            <div className="bg-orange-50 rounded-xl p-4 mb-4 border border-orange-200">
              <p className="text-xs font-black text-orange-800 uppercase mb-3">🔐 Permisos de Secretaria</p>
              <p className="text-[10px] text-orange-600 mb-3">Seleccione los módulos a los que esta secretaria tendrá acceso:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { k: 'empresas', l: '🏢 Empresas' },
                  { k: 'agenda', l: '📅 Agenda' },
                  { k: 'bill', l: '💳 Cuentas de Cobro' },
                  { k: 'caja', l: '💰 Caja' },
                  { k: 'reporte', l: '📊 Reportes' },
                  { k: 'propuestas', l: '📋 Propuestas' },
                  { k: 'telemedicina', l: '🎥 Telemedicina' },
                ].map(p => (
                  <label key={p.k} className="flex items-center gap-2 cursor-pointer bg-white border border-orange-100 rounded-lg px-3 py-2 hover:bg-orange-50">
                    <input
                      type="checkbox"
                      checked={!!(editForm.secretariaPermisos || {})[p.k]}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        secretariaPermisos: { ...(prev.secretariaPermisos || {}), [p.k]: e.target.checked },
                      }))}
                      className="accent-orange-600"
                    />
                    <span className="text-xs font-bold text-gray-700">{p.l}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Save */}
          <button onClick={saveEdit} className="w-full py-3 bg-violet-700 hover:bg-violet-800 text-white font-black rounded-xl text-sm">
            💾 Guardar Perfil
          </button>
        </div>
      )}

      {/* CREATE USER TAB */}
      {activeTab === 'new' && isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-black text-lg text-violet-900 mb-5 flex items-center gap-2"><Plus className="w-4 h-4" /> Crear Nuevo Usuario</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Nombre completo *</label>
              <input value={newUserForm.name} onChange={(e) => setNewUserForm(p => ({ ...p, name: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" placeholder="Dr. Juan Pérez" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Usuario (login) *</label>
              <input value={newUserForm.user} onChange={(e) => setNewUserForm(p => ({ ...p, user: e.target.value }))} className="w-full p-2 border rounded-lg text-sm font-mono" placeholder="jperez" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Contraseña *</label>
              <input type="password" value={newUserForm.pass} onChange={(e) => setNewUserForm(p => ({ ...p, pass: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" placeholder="Mín. 6 caracteres" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Rol *</label>
              <select value={newUserForm.role} onChange={(e) => setNewUserForm(p => ({ ...p, role: e.target.value }))} className="w-full p-2 border rounded-lg text-sm">
                <option value="medico">Médico</option>
                <option value="secretaria">Secretaria</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-xs text-blue-700">
            <p className="font-black mb-1">ℹ️ Roles del sistema</p>
            <p>• <strong>Médico:</strong> Crea y gestiona historias clínicas, firma, certificados</p>
            <p>• <strong>Secretaria:</strong> Agenda, facturación, empresas (según permisos)</p>
            <p>• <strong>Administrador:</strong> Acceso completo a todos los módulos</p>
          </div>
          <button onClick={handleCreateUser} className="w-full py-3 bg-violet-700 hover:bg-violet-800 text-white font-black rounded-xl text-sm">
            ➕ Crear Usuario
          </button>
        </div>
      )}
    </div>
  );
}
