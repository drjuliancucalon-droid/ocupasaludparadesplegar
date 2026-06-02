// src/modules/users/components/UserForm.jsx
// Formulario crear/editar usuario con PBKDF2, roles, permisos secretaria
import React, { useState } from 'react';
import { Save, X, Eye, EyeOff, Lock } from 'lucide-react';
import { SECRETARIA_PERMISOS_DEFAULT } from '../../../shared/data/planConfig';

// ── PBKDF2 helpers ────────────────────────────────────────────────
const _pbkdf2Hash = async (password) => {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash: hex(derived), salt: hex(saltBytes) };
};

const PERM_LABELS = {
  agenda: '🗓️ Agenda', bill: '🧾 Cuentas de Cobro', propuestas: '📄 Propuestas',
  telemedicina: '🩺 Telemedicina', empresas: '🏢 Empresas',
  pacientes_lista: '👥 Ver Pacientes', pacientes_crear: '➕ Crear Pacientes',
  reporte: '📊 Reportes', sve: '🔬 SVE', caja: '💰 Caja',
  adjuntos: '📎 Adjuntos HC', cuentas_cobro: '💳 Cuentas por Cobrar',
};

const ROLE_OPTIONS_SUPER = [
  { v: 'super_admin', l: '👑 Super Administrador' },
  { v: 'administrador', l: '👨‍💼 Administrador IPS' },
  { v: 'medico', l: '👨‍⚕️ Médico' },
  { v: 'secretaria', l: '👩‍💻 Secretaria' },
  { v: 'admin_empresa', l: '🏢 Admin Empresa' },
];
const ROLE_OPTIONS_ADMIN = [
  { v: 'medico', l: '👨‍⚕️ Médico' },
  { v: 'secretaria', l: '👩‍💻 Secretaria' },
  { v: 'admin_empresa', l: '🏢 Admin Empresa' },
];

export const UserForm = ({ user, onSave, onCancel, existingUsers = [], usersList = [], currentUser }) => {
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const roleOptions = isSuperAdmin ? ROLE_OPTIONS_SUPER : ROLE_OPTIONS_ADMIN;
  const isNew = !user?.id;

  const [form, setForm] = useState({
    usuario: '', nombre: '', role: 'medico', email: '', celular: '',
    cedula: '', titulo: '', licencia: '', ciudad: '', especialidad: '',
    license: 'libre', licenseExpiry: '', activo: true,
    secretariaPermisos: { ...SECRETARIA_PERMISOS_DEFAULT },
    medicosAsignados: [],
    ...user,
  });
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [changingPass, setChangingPass] = useState(isNew);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (name, value) => setForm(p => ({ ...p, [name]: value }));

  const handleSave = async () => {
    setError('');
    if (!form.usuario?.trim()) { setError('El usuario es requerido'); return; }
    if (!form.nombre?.trim()) { setError('El nombre es requerido'); return; }
    if (isNew && existingUsers.some(u => (u.usuario || u.user) === form.usuario.trim())) {
      setError('Ese nombre de usuario ya existe'); return;
    }
    if (changingPass || isNew) {
      if (!password) { setError('Ingresa una contraseña'); return; }
      if (password.length < 6) { setError('Mínimo 6 caracteres'); return; }
      if (password !== password2) { setError('Las contraseñas no coinciden'); return; }
    }
    setSaving(true);
    try {
      let passFields = {};
      if (changingPass || isNew) {
        const { hash, salt } = await _pbkdf2Hash(password);
        passFields = { passHash: hash, passSalt: salt };
      }
      const finalData = {
        ...form,
        usuario: form.usuario.trim(),
        nombre: form.nombre.trim(),
        plan: form.license || form.plan || 'libre',
        id: form.id || `usr_${Date.now()}`,
        ...passFields,
      };
      delete finalData.password;
      onSave(finalData);
    } catch (e) {
      setError('Error al guardar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none';
  const inpSm = 'w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 outline-none';

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-black text-gray-800">
          {isNew ? '➕ Nuevo Usuario' : `✏️ Editar — ${user?.nombre || user?.usuario}`}
        </h2>
        <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Usuario + Rol */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Usuario *</label>
            <input value={form.usuario || form.user || ''} onChange={e => set('usuario', e.target.value)}
              disabled={!isNew} placeholder="ej: dr.garcia"
              className={inp + (isNew ? '' : ' bg-gray-50 text-gray-400')} />
            {!isNew && <p className="text-[10px] text-gray-400 mt-0.5">No se puede cambiar</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Rol *</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className={inp}>
              {roleOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Nombre completo *</label>
          <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
            placeholder="Nombre y apellidos" className={inp} />
        </div>

        {/* Email + Celular */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
            <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)}
              placeholder="correo@ejemplo.com" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Celular</label>
            <input value={form.celular || ''} onChange={e => set('celular', e.target.value)}
              placeholder="300 000 0000" className={inp} />
          </div>
        </div>

        {/* Plan + Vencimiento */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Plan / Licencia</label>
            <select value={form.license || form.plan || 'libre'} onChange={e => set('license', e.target.value)} className={inp}>
              <option value="libre">🆓 Libre (gratis)</option>
              <option value="starter">🌱 Starter ($45.000/mes)</option>
              <option value="pro">⭐ Pro ($79.000/mes)</option>
              <option value="clinica">🏢 Clínica ($159.000/mes)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Vencimiento licencia</label>
            <input type="date" value={form.licenseExpiry || ''} onChange={e => set('licenseExpiry', e.target.value)} className={inp} />
          </div>
        </div>

        {/* Datos profesionales */}
        {['medico', 'administrador', 'super_admin'].includes(form.role) && (
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-[11px] font-black text-blue-700 uppercase mb-3">📋 Datos profesionales</p>
            <div className="grid grid-cols-3 gap-2">
              {[['cedula','Cédula'],['titulo','Título'],['licencia','No. Licencia']].map(([f,l]) => (
                <div key={f}>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">{l}</label>
                  <input value={form[f] || ''} onChange={e => set(f, e.target.value)} className={inpSm} />
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">Ciudad</label>
                <input value={form.ciudad || ''} onChange={e => set('ciudad', e.target.value)} className={inpSm} />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-600 mb-1">Especialidad</label>
                <input value={form.especialidad || ''} onChange={e => set('especialidad', e.target.value)}
                  placeholder="Salud Ocupacional" className={inpSm} />
              </div>
            </div>
          </div>
        )}

        {/* Permisos secretaria */}
        {form.role === 'secretaria' && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-[11px] font-black text-amber-800 uppercase mb-1">🔐 Permisos de Secretaria</p>
            <p className="text-[10px] text-amber-600 mb-3">Activa los módulos a los que tendrá acceso.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {Object.entries(PERM_LABELS).map(([key, label]) => {
                const isOn = (form.secretariaPermisos || SECRETARIA_PERMISOS_DEFAULT)[key] === true;
                return (
                  <button key={key} type="button"
                    onClick={() => setForm(p => ({ ...p, secretariaPermisos: { ...(p.secretariaPermisos || SECRETARIA_PERMISOS_DEFAULT), [key]: !isOn } }))}
                    className={`p-2 rounded-xl border-2 text-left text-[10px] font-bold transition ${isOn ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white text-gray-500 hover:border-amber-300'}`}>
                    {label} {isOn ? '✅' : ''}
                  </button>
                );
              })}
            </div>
            {usersList.filter(u => ['medico','administrador','super_admin'].includes(u.role) && u.activo !== false).length > 0 && (
              <>
                <p className="text-[10px] text-amber-700 font-black mb-2">👨‍⚕️ Médicos asignados (vacío = todos):</p>
                <div className="flex flex-wrap gap-2">
                  {usersList.filter(u => ['medico','administrador','super_admin'].includes(u.role) && u.activo !== false).map(med => {
                    const sel = (form.medicosAsignados || []).includes(med.usuario || med.user);
                    return (
                      <button key={med.usuario || med.user} type="button"
                        onClick={() => setForm(p => ({ ...p, medicosAsignados: sel ? (p.medicosAsignados||[]).filter(id=>id!==(med.usuario||med.user)) : [...(p.medicosAsignados||[]), med.usuario||med.user] }))}
                        className={`px-2 py-1 rounded-xl border text-xs font-bold ${sel ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-500'}`}>
                        {sel ? '✅ ' : ''}{med.nombre || med.usuario || med.user}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Contraseña */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button type="button" onClick={() => !isNew && setChangingPass(p => !p)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition text-left">
            <span className="flex items-center gap-2 text-xs font-black text-gray-700">
              <Lock className="w-4 h-4 text-gray-500" />
              {isNew ? '🔑 Contraseña (requerida)' : '🔑 Cambiar contraseña'}
            </span>
            {!isNew && <span className={`text-[10px] font-bold ${changingPass ? 'text-red-500' : 'text-emerald-600'}`}>{changingPass ? 'Cancelar' : 'Cambiar'}</span>}
          </button>
          {changingPass && (
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nueva contraseña</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres" className={inp + ' pr-10'} />
                  <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Confirmar contraseña</label>
                <input type={showPass ? 'text' : 'password'} value={password2} onChange={e => setPassword2(e.target.value)}
                  placeholder="Repetir contraseña"
                  className={inp + (password2 && password !== password2 ? ' border-red-300' : '')} />
                {password2 && password !== password2 && <p className="text-[10px] text-red-500 mt-0.5">Las contraseñas no coinciden</p>}
              </div>
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl px-3 py-2">⚠️ {error}</div>}

        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-black hover:bg-purple-700 disabled:opacity-60 flex items-center justify-center gap-1.5 transition">
            <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar Usuario'}
          </button>
          <button onClick={onCancel} className="py-2.5 px-6 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition">Cancelar</button>
        </div>
      </div>
    </div>
  );
};
