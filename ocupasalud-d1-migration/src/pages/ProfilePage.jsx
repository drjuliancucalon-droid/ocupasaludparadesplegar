// src/pages/ProfilePage.jsx — Perfil propio para cualquier rol
import React, { useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { User, Save, Eye, EyeOff, Lock, Shield, CheckCircle } from 'lucide-react';

// PBKDF2 helpers
const _pbkdf2Hash = async (password) => {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  return { hash: hex(derived), salt: hex(saltBytes) };
};

const PERM_LABELS = {
  agenda:'🗓️ Agenda', bill:'🧾 Cuentas', propuestas:'📄 Propuestas',
  telemedicina:'🩺 Telemedicina', empresas:'🏢 Empresas',
  pacientes_lista:'👥 Ver Pacientes', pacientes_crear:'➕ Crear Pacientes',
  reporte:'📊 Reportes', sve:'🔬 SVE', caja:'💰 Caja',
  adjuntos:'📎 Adjuntos', cuentas_cobro:'💳 Cuentas por Cobrar',
};

const ROLE_INFO = {
  super_admin:   { label: 'Super Administrador', color: 'red',    icon: '👑', desc: 'Acceso total al sistema' },
  administrador: { label: 'Administrador IPS',   color: 'purple', icon: '👨‍💼', desc: 'Gestión completa de tu IPS' },
  medico:        { label: 'Médico',              color: 'blue',   icon: '👨‍⚕️', desc: 'HC, Agenda, Pacientes, Certificados' },
  secretaria:    { label: 'Secretaria',          color: 'amber',  icon: '👩‍💻', desc: 'Acceso según permisos asignados' },
  admin_empresa: { label: 'Admin Empresa',       color: 'indigo', icon: '🏢', desc: 'Portal de tu empresa' },
};

export default function ProfilePage() {
  const { currentUser, loginLocal } = useAuthStore();
  const roleInfo = ROLE_INFO[currentUser?.role] || ROLE_INFO.medico;

  const [form, setForm] = useState({
    nombre:     currentUser?.nombre || '',
    email:      currentUser?.email || '',
    celular:    currentUser?.celular || '',
    cedula:     currentUser?.cedula || '',
    titulo:     currentUser?.titulo || '',
    licencia:   currentUser?.licencia || '',
    ciudad:     currentUser?.ciudad || '',
    especialidad: currentUser?.especialidad || '',
  });

  const [password, setPassword]   = useState('');
  const [password2, setPassword2] = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');

  const set = (name, value) => setForm(p => ({ ...p, [name]: value }));
  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none';

  const handleSave = useCallback(async () => {
    setError(''); setSaving(true);
    try {
      // Validar contraseña si la cambia
      let passFields = {};
      if (password) {
        if (password.length < 6) { setError('Contraseña mínimo 6 caracteres'); setSaving(false); return; }
        if (password !== password2) { setError('Las contraseñas no coinciden'); setSaving(false); return; }
        const { hash, salt } = await _pbkdf2Hash(password);
        passFields = { passHash: hash, passSalt: salt };
      }

      // Actualizar en localStorage siso_users
      const allUsers = JSON.parse(localStorage.getItem('siso_users') || '[]');
      const uName = currentUser?.user || currentUser?.usuario;
      const updated = allUsers.map(u =>
        (u.user === uName || u.usuario === uName)
          ? { ...u, ...form, ...passFields }
          : u
      );
      localStorage.setItem('siso_users', JSON.stringify(updated));

      // Actualizar currentUser en memoria
      loginLocal({ ...currentUser, ...form });

      // Intentar guardar en Supabase
      const SB_URL = import.meta.env.VITE_SUPABASE_URL;
      const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (SB_URL && SB_KEY) {
        await fetch(`${SB_URL}/rest/v1/siso_store`, {
          method: 'POST',
          headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({ key: 'siso_users', value: updated }),
        });
      }

      setPassword(''); setPassword2('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError('Error al guardar: ' + e.message);
    } finally {
      setSaving(false);
    }
  }, [form, password, password2, currentUser, loginLocal]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-16 h-16 bg-${roleInfo.color}-100 rounded-2xl flex items-center justify-center text-3xl shadow-sm`}>
          {roleInfo.icon}
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-800">Mi Perfil</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-black px-2 py-0.5 rounded-full bg-${roleInfo.color}-100 text-${roleInfo.color}-800`}>
              {roleInfo.label}
            </span>
            <span className="text-xs text-gray-400">@{currentUser?.user || currentUser?.usuario}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{roleInfo.desc}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Datos personales */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-black text-gray-700 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" /> Datos personales
          </h2>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Nombre completo</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className={inp} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="correo@ejemplo.com" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Celular</label>
              <input value={form.celular} onChange={e => set('celular', e.target.value)}
                placeholder="300 000 0000" className={inp} />
            </div>
          </div>

          {/* Datos profesionales solo para médico/admin */}
          {['medico','administrador','super_admin'].includes(currentUser?.role) && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-black text-blue-700 uppercase">📋 Datos profesionales</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Cédula</label>
                  <input value={form.cedula} onChange={e => set('cedula', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Título</label>
                  <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
                    placeholder="Médico Esp. Salud Ocupacional"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">No. Licencia</label>
                  <input value={form.licencia} onChange={e => set('licencia', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Ciudad</label>
                  <input value={form.ciudad} onChange={e => set('ciudad', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Especialidad</label>
                  <input value={form.especialidad} onChange={e => set('especialidad', e.target.value)}
                    placeholder="Salud Ocupacional"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 outline-none" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Permisos secretaria (solo lectura) */}
        {currentUser?.role === 'secretaria' && currentUser?.secretariaPermisos && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-black text-gray-700 flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-amber-500" /> Mis permisos
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(PERM_LABELS).map(([key, label]) => {
                const on = currentUser.secretariaPermisos[key] === true;
                return (
                  <div key={key} className={`p-2 rounded-xl border text-[10px] font-bold ${on ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                    {label} {on ? '✅' : '—'}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-3">Los permisos los asigna el administrador.</p>
          </div>
        )}

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-black text-gray-700 flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-gray-500" /> Cambiar contraseña
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Nueva contraseña</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inp + ' pr-10'} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Confirmar contraseña</label>
              <input type={showPass ? 'text' : 'password'} value={password2}
                onChange={e => setPassword2(e.target.value)}
                placeholder="Repetir contraseña"
                className={inp + (password2 && password !== password2 ? ' border-red-300' : '')} />
              {password2 && password !== password2 && (
                <p className="text-[10px] text-red-500 mt-0.5">Las contraseñas no coinciden</p>
              )}
            </div>
          </div>
        </div>

        {/* Error / éxito */}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl px-4 py-3">⚠️ {error}</div>}
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl px-4 py-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> ¡Perfil guardado correctamente!
          </div>
        )}

        {/* Botón guardar */}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-black text-sm hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg transition">
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
