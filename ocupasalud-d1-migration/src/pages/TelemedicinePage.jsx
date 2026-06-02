// src/pages/TelemedicinePage.jsx
// Secretary gate + PlanGate + VideoConsult
// B-07 — Fiel al monolito líneas 30966-31001 (gate)
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoConsult } from '../modules/telemedicine/components/VideoConsult';
import { useAuthStore } from '../stores/authStore';

export default function TelemedicinePage() {
  const navigate = useNavigate();
  const { currentUser, canAccessModule } = useAuthStore();

  // ── SECRETARIA GATE: "Telemedicina" requiere autorización del admin ──
  if (
    currentUser?.role === 'secretaria' &&
    !canAccessModule('telemedicina')
  ) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 space-y-3">
          <div className="text-5xl">🔐</div>
          <p className="font-black text-amber-800 text-xl">Módulo restringido</p>
          <p className="text-amber-700 text-sm font-bold">Telemedicina</p>
          <p className="text-amber-600 text-xs leading-relaxed">
            Este módulo requiere autorización explícita del administrador.
            <br />
            Solicita que habilite el permiso <strong>"Telemedicina"</strong> en tu perfil.
            <br />
            (Usuarios → tu nombre → 🔐 Permisos de secretaria)
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-3 bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 transition"
          >
            ← Volver al panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <VideoConsult currentUser={currentUser} />
    </div>
  );
}
