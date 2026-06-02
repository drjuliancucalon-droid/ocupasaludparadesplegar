// src/modules/clinical/components/EvolucionModal.jsx
// Sprint 4.5: Clinical evolution/follow-up modal
// Records follow-up visits, treatments, and clinical progress notes
import React, { useState, useCallback } from 'react';
import { X, Plus, Clock, FileText, Save, Trash2 } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'siso_evoluciones_';

export const EvolucionModal = ({ patientId, patientName, onClose, doctorData }) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${patientId || 'temp'}`;

  const [evoluciones, setEvoluciones] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toTimeString().substring(0, 5),
    subjectivo: '',
    objetivo: '',
    analisis: '',
    plan: '',
  });

  const saveAll = useCallback((updated) => {
    setEvoluciones(updated);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch { /* quota */ }
  }, [storageKey]);

  const handleAdd = useCallback(() => {
    if (!form.subjectivo && !form.objetivo) {
      alert('Registre al menos el subjetivo u objetivo de la evolución.');
      return;
    }
    const newEvol = {
      ...form,
      id: `evol_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      medico: doctorData?.nombre || 'Médico',
      createdAt: new Date().toISOString(),
    };
    saveAll([newEvol, ...evoluciones]);
    setForm({
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().substring(0, 5),
      subjectivo: '',
      objetivo: '',
      analisis: '',
      plan: '',
    });
  }, [form, evoluciones, saveAll, doctorData]);

  const handleDelete = useCallback((id) => {
    if (!confirm('¿Eliminar esta evolución?')) return;
    saveAll(evoluciones.filter((e) => e.id !== id));
  }, [evoluciones, saveAll]);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4" onClick={handleBackdrop}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-4 rounded-t-2xl text-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              <div>
                <h2 className="text-base font-black">Evolución Clínica</h2>
                <p className="text-xs text-emerald-100">{patientName || 'Paciente'} — Seguimiento SOAP</p>
              </div>
            </div>
            <button onClick={onClose}><X className="w-5 h-5 text-white/70 hover:text-white" /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* New evolution form (SOAP format) */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-black text-emerald-800 uppercase flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Nueva Evolución (SOAP)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
                  className="w-full p-1.5 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-emerald-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Hora</label>
                <input
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm((p) => ({ ...p, hora: e.target.value }))}
                  className="w-full p-1.5 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-emerald-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">S — Subjetivo (Motivo de consulta / síntomas)</label>
              <textarea
                value={form.subjectivo}
                onChange={(e) => setForm((p) => ({ ...p, subjectivo: e.target.value }))}
                rows={2}
                className="w-full p-1.5 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-emerald-400 outline-none resize-none"
                placeholder="Lo que refiere el paciente..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">O — Objetivo (Examen físico / hallazgos)</label>
              <textarea
                value={form.objetivo}
                onChange={(e) => setForm((p) => ({ ...p, objetivo: e.target.value }))}
                rows={2}
                className="w-full p-1.5 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-emerald-400 outline-none resize-none"
                placeholder="Hallazgos al examen..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">A — Análisis / Diagnóstico</label>
              <textarea
                value={form.analisis}
                onChange={(e) => setForm((p) => ({ ...p, analisis: e.target.value }))}
                rows={2}
                className="w-full p-1.5 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-emerald-400 outline-none resize-none"
                placeholder="Análisis e impresión diagnóstica..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">P — Plan de manejo</label>
              <textarea
                value={form.plan}
                onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
                rows={2}
                className="w-full p-1.5 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-emerald-400 outline-none resize-none"
                placeholder="Tratamiento, seguimiento, remisiones..."
              />
            </div>

            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" /> Registrar Evolución
            </button>
          </div>

          {/* History */}
          <h3 className="text-xs font-black text-gray-700 uppercase flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Historial de Evoluciones ({evoluciones.length})
          </h3>

          {evoluciones.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No hay evoluciones registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {evoluciones.map((evol) => (
                <div key={evol.id} className="bg-white border rounded-xl p-4 relative">
                  <button
                    onClick={() => handleDelete(evol.id)}
                    className="absolute top-3 right-3 p-1 text-red-400 hover:bg-red-50 rounded"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      {new Date(evol.fecha).toLocaleDateString('es-CO')} {evol.hora}
                    </span>
                    <span className="text-[10px] text-gray-400">Dr. {evol.medico}</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {evol.subjectivo && <div><span className="font-bold text-blue-700">S:</span> <span className="text-gray-600">{evol.subjectivo}</span></div>}
                    {evol.objetivo && <div><span className="font-bold text-green-700">O:</span> <span className="text-gray-600">{evol.objetivo}</span></div>}
                    {evol.analisis && <div><span className="font-bold text-amber-700">A:</span> <span className="text-gray-600">{evol.analisis}</span></div>}
                    {evol.plan && <div><span className="font-bold text-purple-700">P:</span> <span className="text-gray-600">{evol.plan}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
