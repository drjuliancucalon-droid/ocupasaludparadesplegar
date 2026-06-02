import React, { useState } from 'react';
import { CalendarPlus, Save, X } from 'lucide-react';
import { sp, _ls } from '../../../shared/lib/storage';

const STORAGE_KEY = 'siso_agendados';

const TIPOS_EXAMEN = ['Ingreso', 'Periódico', 'Egreso', 'Consulta'];

export const AppointmentForm = ({ onClose, onSave, medicos = [] }) => {
  const [form, setForm] = useState({
    paciente: '',
    documento: '',
    tipo: 'Ingreso',
    fecha: new Date().toISOString().slice(0, 10),
    hora: '08:00',
    medico: '',
    notas: '',
  });
  const [error, setError] = useState('');

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.paciente.trim()) {
      setError('El nombre del paciente es obligatorio');
      return;
    }
    if (!form.documento.trim()) {
      setError('El documento es obligatorio');
      return;
    }

    const nuevaCita = {
      id: 'cita_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      ...form,
      estado: 'espera',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existentes = sp(STORAGE_KEY, []);
    const actualizadas = [...existentes, nuevaCita];
    _ls.setItem(STORAGE_KEY, JSON.stringify(actualizadas));

    if (onSave) onSave(nuevaCita);
    if (onClose) onClose();
  };

  return (
    <div className="bg-white border rounded-xl p-6 shadow-lg max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <CalendarPlus className="w-5 h-5 text-teal-600" /> Nueva Cita
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
          <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre del paciente *</label>
          <input
            type="text"
            value={form.paciente}
            onChange={(e) => handleChange('paciente', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
            placeholder="Nombre completo"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Documento *</label>
          <input
            type="text"
            value={form.documento}
            onChange={(e) => handleChange('documento', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
            placeholder="Cédula o identificación"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de examen</label>
            <select
              value={form.tipo}
              onChange={(e) => handleChange('tipo', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
            >
              {TIPOS_EXAMEN.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Médico asignado</label>
            <select
              value={form.medico}
              onChange={(e) => handleChange('medico', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Sin asignar</option>
              {medicos.map((m) => (
                <option key={m.user || m.nombre} value={m.nombre || m.user}>
                  {m.nombre || m.user}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => handleChange('fecha', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Hora</label>
            <input
              type="time"
              value={form.hora}
              onChange={(e) => handleChange('hora', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Notas</label>
          <textarea
            value={form.notas}
            onChange={(e) => handleChange('notas', e.target.value)}
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
            placeholder="Observaciones adicionales..."
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-teal-700 transition"
        >
          <Save className="w-4 h-4" /> Agendar Cita
        </button>
      </form>
    </div>
  );
};
