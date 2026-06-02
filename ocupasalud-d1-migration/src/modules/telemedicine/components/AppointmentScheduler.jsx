import React, { useState } from 'react';
import { CalendarPlus, Save, X, Video } from 'lucide-react';
import { sp, _ls } from '../../../shared/lib/storage';

const STORAGE_KEY = 'siso_teleconsultas';

const TIPOS_CONSULTA = [
  'Consulta general',
  'Seguimiento',
  'Control periódico',
  'Valoración inicial',
  'Interconsulta',
];

export const AppointmentScheduler = ({ onClose, onSave, pacientes = [] }) => {
  const [form, setForm] = useState({
    paciente: '',
    documento: '',
    fecha: new Date().toISOString().slice(0, 10),
    hora: '09:00',
    tipo: 'Consulta general',
    notas: '',
  });
  const [error, setError] = useState('');

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (campo === 'paciente') {
      const found = pacientes.find(
        (p) => (p.nombre || p.paciente || '') === valor
      );
      if (found) {
        setForm((prev) => ({ ...prev, [campo]: valor, documento: found.documento || '' }));
      }
    }
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.paciente.trim()) {
      setError('Seleccione o ingrese el nombre del paciente');
      return;
    }

    const nueva = {
      id: 'tc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      ...form,
      estado: 'programada',
      createdAt: new Date().toISOString(),
    };

    const existentes = sp(STORAGE_KEY, []);
    const actualizadas = [...existentes, nueva];
    _ls.setItem(STORAGE_KEY, JSON.stringify(actualizadas));

    if (onSave) onSave(nueva);
    if (onClose) onClose();
  };

  return (
    <div className="bg-white border rounded-xl p-6 shadow-lg max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Video className="w-5 h-5 text-indigo-600" /> Programar Teleconsulta
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Paciente *</label>
          <input
            type="text"
            list="pacientes-list"
            value={form.paciente}
            onChange={(e) => handleChange('paciente', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400"
            placeholder="Nombre del paciente"
          />
          <datalist id="pacientes-list">
            {pacientes.map((p, i) => (
              <option key={i} value={p.nombre || p.paciente || ''} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Documento</label>
          <input
            type="text"
            value={form.documento}
            onChange={(e) => handleChange('documento', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400"
            placeholder="Cédula"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => handleChange('fecha', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Hora</label>
            <input
              type="time"
              value={form.hora}
              onChange={(e) => handleChange('hora', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de consulta</label>
          <select
            value={form.tipo}
            onChange={(e) => handleChange('tipo', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400"
          >
            {TIPOS_CONSULTA.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Notas</label>
          <textarea
            value={form.notas}
            onChange={(e) => handleChange('notas', e.target.value)}
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400"
            placeholder="Motivo de consulta, observaciones..."
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
        >
          <CalendarPlus className="w-4 h-4" /> Programar Teleconsulta
        </button>
      </form>
    </div>
  );
};
