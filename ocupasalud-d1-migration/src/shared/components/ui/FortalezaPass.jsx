import React from 'react';
import { _validarContrasena } from '../../lib/security.js';

export const FortalezaPass = ({ pw }) => {
  if (!pw) return null;
  const { valida, errores, fortaleza } = _validarContrasena(pw);
  const colores = ["bg-red-500", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-emerald-500"];
  const labels = ["", "Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"];
  return (
    <div className="mt-1">
      <div className="flex gap-0.5 mb-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= fortaleza ? colores[fortaleza] : "bg-gray-200"}`} />
        ))}
      </div>
      <p className={`text-[10px] font-bold ${valida ? "text-emerald-700" : "text-red-600"}`}>
        {valida ? `✅ ${labels[fortaleza]}` : `⚠️ ${errores[0]}`}
      </p>
    </div>
  );
};
