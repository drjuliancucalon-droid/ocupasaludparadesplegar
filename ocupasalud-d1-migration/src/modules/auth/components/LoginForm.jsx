import React, { useState } from 'react';

/**
 * LoginForm - Formulario de inicio de sesión
 * Seguridad: bloqueo anti-fuerza bruta, límite de longitud inputs
 */
export const LoginForm = ({ onLogin, blockedUntil, attempts }) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [remaining, setRemaining] = useState(0);

  React.useEffect(() => {
    if (!blockedUntil) { setRemaining(0); return; }
    const tick = () => {
      const secs = Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
      setRemaining(secs);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [blockedUntil]);

  const isBlocked = blockedUntil && Date.now() < blockedUntil;
  const MAX_USER_LEN = 64;
  const MAX_PASS_LEN = 128;

  const submit = () => {
    if (isBlocked) return;
    const user = u.trim().slice(0, MAX_USER_LEN);
    const pass = p.trim().slice(0, MAX_PASS_LEN);
    if (user && pass) onLogin(user, pass);
  };

  return (
    <div className="space-y-4 mb-6">
      {isBlocked && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-center">
          <p className="text-red-700 font-black text-sm">🔒 Acceso bloqueado</p>
          <p className="text-red-500 text-xs mt-1">
            Espere <span className="font-black">{remaining}s</span> antes de intentar de nuevo
          </p>
        </div>
      )}
      {!isBlocked && attempts > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-2 text-center">
          <p className="text-yellow-700 text-xs font-bold">
            ⚠️ {attempts} intento{attempts > 1 ? 's' : ''} fallido{attempts > 1 ? 's' : ''}. Máx. 5 antes del bloqueo.
          </p>
        </div>
      )}
      <input
        value={u}
        onChange={(e) => setU(e.target.value.slice(0, MAX_USER_LEN))}
        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
        placeholder="Usuario"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoComplete="username"
        maxLength={MAX_USER_LEN}
        disabled={isBlocked}
      />
      <input
        type="password"
        value={p}
        onChange={(e) => setP(e.target.value.slice(0, MAX_PASS_LEN))}
        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
        placeholder="Contraseña"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoComplete="current-password"
        maxLength={MAX_PASS_LEN}
        disabled={isBlocked}
      />
      <button
        onClick={submit}
        disabled={isBlocked}
        className={`w-full py-3 rounded-xl font-black text-sm transition shadow-lg ${
          isBlocked
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:opacity-90'
        }`}
      >
        {isBlocked ? `Bloqueado (${remaining}s)` : 'Iniciar Sesión'}
      </button>
    </div>
  );
};
