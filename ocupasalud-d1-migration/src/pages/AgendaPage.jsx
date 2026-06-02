// src/pages/AgendaPage.jsx — Agenda with backend data + Sala de espera
import React from 'react';
import { AgendaView } from '../modules/agenda/components/AgendaView';
import { QueueManager } from '../modules/agenda/components/QueueManager';
import { useAuthStore } from '../stores/authStore';
import { useBackendData } from '../hooks/useBackendData';
import { Calendar, Loader2, Cloud, HardDrive, Users } from 'lucide-react';

export default function AgendaPage() {
  const { currentUser } = useAuthStore();
  const { data: appointments, loading, source } = useBackendData(
    '/data/agenda', 'siso_agendados', 'appointments'
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-800">Agenda</h1>
          {!loading && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {appointments.length} citas
            </span>
          )}
        </div>
        {!loading && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {source === 'backend' || source === 'supabase-direct' ? <Cloud className="w-3 h-3 text-emerald-500" /> : <HardDrive className="w-3 h-3" />}
            <span>{source === 'local' ? 'Local' : 'Supabase'}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* ── SALA DE ESPERA (como monolito) ── */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="font-bold">Sala de Espera</span>
            </div>
          </div>
          <QueueManager />

          {/* ── CALENDARIO ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Calendario de Citas
            </h2>
            <AgendaView currentUser={currentUser} />
          </div>
        </>
      )}
    </div>
  );
}
