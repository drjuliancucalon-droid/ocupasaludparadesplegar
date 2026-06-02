// src/components/ui/FortalezaPass.jsx
import React from 'react';

const _validarContrasena = (pw) => {
  const errores = [];
  if (!pw || pw.length < 10) errores.push("Mínimo 10 caracteres");
  if (!/[A-Z]/.test(pw)) errores.push("Al menos 1 letra mayúscula");
  if (!/[a-z]/.test(pw)) errores.push("Al menos 1 letra minúscula");
  if (!/[0-9]/.test(pw)) errores.push("Al menos 1 número");
  if (!/[^A-Za-z0-9]/.test(pw))
    errores.push("Al menos 1 carácter especial (!@#$%...)");
  const comunes = [
    "password",
    "contraseña",
    "123456",
    "qwerty",
    "admin",
    "siso",
    "medico",
    "doctor",
    "cucalon",
  ];
  if (comunes.some((c) => pw.toLowerCase().includes(c)))
    errores.push("No usar palabras comunes o el nombre del sistema");
  return {
    valida: errores.length === 0,
    errores,
    fortaleza: Math.max(0, 5 - errores.length),
  };
};
const _FortalezaPass = ({ pw }) => {
  if (!pw) return null;
  const { valida, errores, fortaleza } = _validarContrasena(pw);
  const colores = [
    "bg-red-500",
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-400",
    "bg-emerald-500",
  ];
  const labels = [
    "",
    "Muy débil",
    "Débil",
    "Aceptable",
    "Fuerte",
    "Muy fuerte",
  ];
  return (
    <div className="mt-1">
      <div className="flex gap-0.5 mb-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full ${
              n <= fortaleza ? colores[fortaleza] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-[10px] font-bold ${
          valida ? "text-emerald-700" : "text-red-600"
        }`}
      >
        {valida ? `✅ ${labels[fortaleza]}` : `⚠️ ${errores[0]}`}
      </p>
    </div>
  );
};

export { _validarContrasena };
export default _FortalezaPass;
