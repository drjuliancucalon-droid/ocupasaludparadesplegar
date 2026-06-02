import React, { useState, useEffect, useRef } from 'react';
import { Users, Clock, PhoneCall, CheckCircle, RefreshCw } from 'lucide-react';
import { sp, _ls } from '../../../shared/lib/storage';

const STORAGE_KEY = 'siso_agendados';

export const QueueManager = () => {
  const [cola, setCola] = useState([]);
  const [ahora, setAhora] = useState(Date.now());
  const intervaloRef = useRef(null);

  const hoy = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    cargarCola();
    intervaloRef.current = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(intervaloRef.current);
  }, []);

  const cargarCola = () => {
    const todas = sp(STORAGE_KEY, []);
    const hoyEspera = todas
      .filter((c) => c.fecha === hoy && (c.estado === 'espera' || c.estado === 'atendiendo'))
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    setCola(hoyEspera);
  };

  const llamarSiguiente = () => {
    const todas = sp(STORAGE_KEY, []);
    const siguiente = todas.find((c) => c.fecha === hoy && c.estado === 'espera');
    if (!siguiente) return;
    const actualizadas = todas.map((c) =>
      c.id === siguiente.id
        ? { ...c, estado: 'atendiendo', horaLlamado: new Date().toISOString(), updatedAt: new Date().toISOString() }
        : c
    );
    _ls.setItem(STORAGE_KEY, JSON.stringify(actualizadas));
    cargarCola();
  };

  const finalizarPaciente = (id) => {
    const todas = sp(STORAGE_KEY, []);
    const actualizadas = todas.map((c) =>
      c.id === id
        ? { ...c, estado: 'atendido', horaFin: new Date().toISOString(), updatedAt: new Date().toISOString() }
        : c
    );
    _ls.setItem(STORAGE_KEY, JSON.stringify(actualizadas));
    cargarCola();
  };

  const calcularEspera = (cita) => {
    if (!cita.hora) return '—';
    const [h, m] = cita.hora.split(':').map(Number);
    const citaMs = new Date(cita.fecha + 'T' + cita.hora).getTime();
    const diff = Math.max(0, ahora - citaMs);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Recién llegó';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  const enEspera = cola.filter((c) => c.estado === 'espera');
  const atendiendo = cola.filter((c) => c.estado === 'atendiendo');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-600" /> Sala de Espera
        </h2>
        <button
          onClick={cargarCola}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-700">{enEspera.length}</div>
          <div className="text-xs text-yellow-600">En espera</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{atendiendo.length}</div>
          <div className="text-xs text-blue-600">Atendiendo</div>
        </div>
      </div>

      {/* Botón llamar siguiente */}
      <button
        onClick={llamarSiguiente}
        disabled={enEspera.length === 0}
        className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <PhoneCall className="w-5 h-5" /> Llamar siguiente paciente
      </button>

      {/* Pacientes atendiendo */}
      {atendiendo.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-blue-700 mb-2">🔵 Atendiendo ahora</h3>
          {atendiendo.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
              <div>
                <p className="font-semibold text-gray-800">{c.paciente}</p>
                <p className="text-xs text-gray-500">Hora cita: {c.hora} · {c.tipo}</p>
              </div>
              <button
                onClick={() => finalizarPaciente(c.id)}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
              >
                <CheckCircle className="w-3 h-3" /> Finalizar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Cola de espera */}
      {enEspera.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-yellow-700 mb-2">🟡 En espera ({enEspera.length})</h3>
          <div className="space-y-2">
            {enEspera.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between bg-white border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{c.paciente}</p>
                    <p className="text-xs text-gray-500">Hora: {c.hora} · {c.tipo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <Clock className="w-3 h-3" /> {calcularEspera(c)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cola.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No hay pacientes en sala de espera hoy</p>
        </div>
      )}
    </div>
  );
};
