import React, { useState } from 'react';
import { AlertTriangle, Save, MapPin, FileText, Camera, Clock } from 'lucide-react';
import { sp, _ls } from '../../../shared/lib/storage';

const REPORTS_KEY = 'siso_condiciones_inseguras';

const SEVERIDADES = [
  { value: 'critico', label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'mayor', label: 'Mayor', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'menor', label: 'Menor', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
];

export const UnsafeConditionReport = ({ onSave }) => {
  const ahora = new Date();
  const [form, setForm] = useState({
    ubicacion: '',
    descripcion: '',
    severidad: 'mayor',
    fotoReferencia: '',
    fecha: ahora.toISOString().slice(0, 10),
    hora: ahora.toTimeString().slice(0, 5),
    reportadoPor: '',
    acciones: '',
  });
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setError('');
    setGuardado(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.ubicacion.trim()) {
      setError('La ubicación es obligatoria');
      return;
    }
    if (!form.descripcion.trim()) {
      setError('La descripción es obligatoria');
      return;
    }

    const reporte = {
      id: 'ci_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      ...form,
      estado: 'abierto',
      createdAt: new Date().toISOString(),
    };

    const existentes = sp(REPORTS_KEY, []);
    _ls.setItem(REPORTS_KEY, JSON.stringify([...existentes, reporte]));

    setGuardado(true);
    if (onSave) onSave(reporte);

    // Reset parcial
    setTimeout(() => {
      setForm((prev) => ({
        ...prev,
        ubicacion: '',
        descripcion: '',
        fotoReferencia: '',
        acciones: '',
        fecha: new Date().toISOString().slice(0, 10),
        hora: new Date().toTimeString().slice(0, 5),
      }));
      setGuardado(false);
    }, 3000);
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-600" /> Reporte de Condición Insegura
      </h2>
      <p className="text-xs text-gray-500">
        Reporte condiciones que puedan representar un riesgo para la seguridad y salud de los trabajadores.
      </p>

      {guardado && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <Save className="w-4 h-4" /> Reporte guardado exitosamente
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 space-y-4">
        {/* Fecha y hora (auto-llenados) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1">
              <Clock className="w-3 h-3" /> Fecha
            </label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => handleChange('fecha', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1">
              <Clock className="w-3 h-3" /> Hora
            </label>
            <input
              type="time"
              value={form.hora}
              onChange={(e) => handleChange('hora', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400"
            />
          </div>
        </div>

        {/* Ubicación */}
        <div>
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1">
            <MapPin className="w-3 h-3" /> Ubicación *
          </label>
          <input
            type="text"
            value={form.ubicacion}
            onChange={(e) => handleChange('ubicacion', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400"
            placeholder="Ej: Planta 2, zona de carga"
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1">
            <FileText className="w-3 h-3" /> Descripción de la condición *
          </label>
          <textarea
            value={form.descripcion}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400"
            placeholder="Describa la condición insegura observada..."
          />
        </div>

        {/* Severidad */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Severidad</label>
          <div className="flex gap-2">
            {SEVERIDADES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => handleChange('severidad', s.value)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition ${
                  form.severidad === s.value
                    ? s.color + ' border-current'
                    : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Foto referencia */}
        <div>
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1">
            <Camera className="w-3 h-3" /> Referencia fotográfica
          </label>
          <input
            type="text"
            value={form.fotoReferencia}
            onChange={(e) => handleChange('fotoReferencia', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400"
            placeholder="URL de la foto o nombre del archivo"
          />
        </div>

        {/* Reportado por */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Reportado por</label>
          <input
            type="text"
            value={form.reportadoPor}
            onChange={(e) => handleChange('reportadoPor', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400"
            placeholder="Nombre del trabajador (opcional)"
          />
        </div>

        {/* Acciones sugeridas */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Acciones correctivas sugeridas</label>
          <textarea
            value={form.acciones}
            onChange={(e) => handleChange('acciones', e.target.value)}
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400"
            placeholder="Describa las acciones recomendadas..."
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition"
        >
          <AlertTriangle className="w-4 h-4" /> Enviar Reporte
        </button>
      </form>
    </div>
  );
};
