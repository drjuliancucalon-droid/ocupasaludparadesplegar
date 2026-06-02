// src/components/ui/PlanGate.jsx
import React from 'react';
import { _canUse, PLAN_CONFIG } from '../../data/planConfig.js';

const PlanGate = ({
  feature,
  requiredPlan,
  currentUser,
  children,
  fallback,
  inline,
}) => {
  if (_canUse(feature, currentUser)) return children;
  const plan = PLAN_CONFIG[currentUser?.license || "libre"];
  const req  = PLAN_CONFIG[requiredPlan] || PLAN_CONFIG.starter;
  const isExpired = plan && plan.price > 0 && currentUser?.licenseExpiry
    && new Date(currentUser.licenseExpiry) < new Date();
  if (fallback) return fallback;
  if (inline)
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-black text-amber-700 cursor-default"
        title={isExpired ? "Plan vencido — comunícate con tu administrador" : `Disponible en plan ${req.label}`}
      >
        {isExpired ? "⏰ Plan vencido" : `🔒 ${req.label}`}
      </span>
    );
  if (isExpired) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-6 text-center space-y-4 shadow-sm">
        <div className="text-5xl">⏰</div>
        <div>
          <p className="font-black text-amber-900 text-lg">¡Tu plan ha vencido!</p>
          <p className="text-amber-700 text-sm mt-1">
            Tu suscripción <strong>{plan.label}</strong> expiró el{" "}
            <strong>{new Date(currentUser.licenseExpiry).toLocaleDateString("es-CO", { day:"numeric", month:"long", year:"numeric" })}</strong>.
            <br/>Tu información está segura. Solo necesitas renovar para continuar.
          </p>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-4 text-left space-y-2 max-w-sm mx-auto">
          <p className="text-xs font-black text-amber-800 uppercase tracking-wide mb-2">💬 Renueva tu plan fácilmente</p>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-base">👨‍⚕️</span>
            <span><strong>Dr. Julián Cucalón</strong> — OcupaSalud</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-base">📱</span>
            <a href="tel:+573182213979" className="font-bold text-amber-700 hover:underline">318 221 3979</a>
            <span className="text-gray-400 text-xs">(llamada o WhatsApp)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-base">📧</span>
            <a href="mailto:dr.juliancucalon@gmail.com" className="font-bold text-amber-700 hover:underline text-xs">dr.juliancucalon@gmail.com</a>
          </div>
          <a href="https://wa.me/573182213979?text=Hola%20Dr.%20Cucal%C3%B3n%2C%20quiero%20renovar%20mi%20plan%20OcupaSalud" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full mt-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-black transition">
            💬 Escribir por WhatsApp ahora
          </a>
        </div>
        <p className="text-[10px] text-amber-600">Una vez renovado, tu acceso se restablece en segundos ✅</p>
      </div>
    );
  }
  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-5 text-center space-y-3">
      <div className="text-3xl">🔒</div>
      <div>
        <p className="font-black text-gray-800 text-sm">Disponible en plan {req.label}</p>
        <p className="text-gray-500 text-xs mt-1">{req.priceLabel} · Desbloquea esta y muchas funciones más</p>
      </div>
      <div className="flex flex-col gap-2">
        <button onClick={() => { if (window._sisoGoTo) window._sisoGoTo("planes"); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition">
          ⬆️ Ver planes y precios
        </button>
        <a href="https://wa.me/573182213979?text=Hola%20Dr.%20Cucal%C3%B3n%2C%20me%20interesa%20el%20plan%20OcupaSalud" target="_blank" rel="noreferrer" className="text-xs text-green-700 font-bold hover:underline">
          💬 Consultar por WhatsApp · 318 221 3979
        </a>
      </div>
    </div>
  );
};

export default PlanGate;
