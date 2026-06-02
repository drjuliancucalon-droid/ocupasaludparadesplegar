import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { FortalezaPass } from '../../../shared/components/ui/FortalezaPass';

/**
 * ChangePasswordForm - Formulario para establecer/cambiar contraseña
 * Incluye validación de fortaleza y confirmación
 * Normativa: Res. 3100/2019 - Seguridad en sistemas de información
 */
export const ChangePasswordForm = ({
  currentUser,
  usersList,
  setUsersList,
  setCurrentUser,
  hashPassword,
  syncStorage,
  goTo,
  showAlert,
  validatePassword,
}) => {
  const [np, setNp] = useState('');
  const [np2, setNp2] = useState('');

  // Use the shared password validation utility
  const validation = validatePassword ? validatePassword(np) : {
    valida: np.length >= 10,
    errores: np.length < 10 ? ['Mínimo 10 caracteres'] : [],
    fortaleza: Math.min(5, Math.floor(np.length / 3)),
  };
  const { valida, errores, fortaleza } = validation;

  const colores = ['bg-red-500', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-emerald-500'];

  const handleSubmit = async () => {
    if (!valida || np !== np2) return;
    try {
      const { hash, salt } = await hashPassword(np);
      const upd = usersList.map((u) =>
        u.id === currentUser?.id
          ? { ...u, passHash: hash, passSalt: salt, mustChangePassword: false, pass: undefined }
          : u
      );
      setUsersList(upd);
      setCurrentUser((prev) => ({ ...prev, mustChangePassword: false }));
      if (syncStorage) syncStorage('siso_users', JSON.stringify(upd));
      if (showAlert) showAlert('✅ Contraseña establecida correctamente');
      if (goTo) goTo('dashboard');
    } catch (err) {
      if (showAlert) showAlert('Error al guardar la contraseña: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-7 h-7 text-violet-600" />
          </div>
          <h2 className="text-xl font-black text-violet-900">Establecer Contraseña</h2>
          <p className="text-xs text-gray-500 mt-1">
            Debe configurar una contraseña segura antes de continuar
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-gray-700 mb-1 uppercase">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={np}
              onChange={(e) => setNp(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm focus:border-violet-500 outline-none"
              placeholder="Mínimo 10 caracteres"
            />
            {np && (
              <div className="mt-1.5">
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={`h-1.5 flex-1 rounded-full ${
                        n <= fortaleza ? colores[fortaleza] : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                {errores.length > 0 && (
                  <p className="text-[10px] text-red-600 font-semibold">⚠️ {errores[0]}</p>
                )}
                {valida && (
                  <p className="text-[10px] text-emerald-700 font-bold">✅ Contraseña segura</p>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-black text-gray-700 mb-1 uppercase">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={np2}
              onChange={(e) => setNp2(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm focus:border-violet-500 outline-none"
              placeholder="Repita la contraseña"
            />
            {np2 && np !== np2 && (
              <p className="text-[10px] text-red-600 font-semibold mt-0.5">⚠️ Las contraseñas no coinciden</p>
            )}
            {np2 && np === np2 && valida && (
              <p className="text-[10px] text-emerald-700 font-bold mt-0.5">✅ Coinciden</p>
            )}
          </div>
          <button
            disabled={!valida || np !== np2}
            onClick={handleSubmit}
            className={`w-full py-3 rounded-xl font-black text-sm transition shadow-lg ${
              valida && np === np2
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:opacity-90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            ✅ Establecer Contraseña y Continuar
          </button>
        </div>
        <div className="mt-4 bg-violet-50 rounded-xl p-3">
          <p className="text-[10px] text-violet-700 font-bold">🔒 Política de contraseñas (Res. 3100/2019)</p>
          <ul className="text-[10px] text-violet-600 mt-1 space-y-0.5 list-disc pl-4">
            <li>Mínimo 10 caracteres</li>
            <li>Al menos 1 mayúscula y 1 minúscula</li>
            <li>Al menos 1 número</li>
            <li>Al menos 1 carácter especial</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
