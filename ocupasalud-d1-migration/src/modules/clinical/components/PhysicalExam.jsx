import React from 'react';
import { Activity } from 'lucide-react';
import { SectionTitle } from '../../../shared/components/ui/SectionTitle';
import { NORMAL_DESCRIPTIONS_SYSTEMS } from '../../../shared/data/catalogs';

/**
 * PhysicalExam — Examen Físico por Sistemas (15 sistemas)
 * Res. 1843/2025.  Cada sistema: Normal/Anormal toggle + hallazgo.
 * Auto-rellena descripciones normales de NORMAL_DESCRIPTIONS_SYSTEMS.
 *
 * Props:
 *   data     — objeto completo del paciente
 *   setData  — setter del estado
 *   disabled — HC cerrada
 *   fieldKey — 'examenFisicoSistemas' (ocupacional) o 'sistemasPorExamen' (general)
 */
export const PhysicalExam = ({
  data,
  setData,
  disabled = false,
  fieldKey = 'examenFisicoSistemas',
}) => {
  const sistemas = data[fieldKey] || {};

  /** Todos normal de un click */
  const handleAllNormal = () => {
    setData((p) => ({
      ...p,
      [fieldKey]: Object.fromEntries(
        Object.keys(p[fieldKey] || {}).map((sys) => [
          sys,
          { estado: 'Normal', hallazgo: NORMAL_DESCRIPTIONS_SYSTEMS[sys] || '' },
        ])
      ),
    }));
  };

  const handleEstado = (sys, estado) => {
    setData((p) => ({
      ...p,
      [fieldKey]: {
        ...p[fieldKey],
        [sys]: {
          ...p[fieldKey][sys],
          estado,
          hallazgo: estado === 'Normal' ? (NORMAL_DESCRIPTIONS_SYSTEMS[sys] || '') : '',
        },
      },
    }));
  };

  const handleHallazgo = (sys, hallazgo) => {
    setData((p) => ({
      ...p,
      [fieldKey]: {
        ...p[fieldKey],
        [sys]: { ...p[fieldKey][sys], hallazgo },
      },
    }));
  };

  return (
    <>
      <SectionTitle title="Examen Físico por Sistemas" icon={Activity} />
      <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 mb-2 print:bg-transparent">
        {/* Botón Todos Normal */}
        <div className="flex justify-end mb-2 no-print">
          <button
            type="button"
            onClick={handleAllNormal}
            disabled={disabled}
            className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50"
          >
            ✅ Todos Normal
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {Object.keys(sistemas).map((sys) => (
            <div
              key={sys}
              className={`border-b border-gray-200 pb-1.5 print:border-gray-300 ${
                sistemas[sys].estado === 'Anormal' ? 'bg-red-50 rounded p-1' : ''
              }`}
            >
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] font-bold text-gray-700 uppercase">
                  {sys}
                </span>
                {/* Pantalla: radios Normal / Anormal */}
                <div className="flex gap-3 no-print">
                  <label className="text-[10px] cursor-pointer flex items-center gap-1">
                    <input
                      type="radio"
                      checked={sistemas[sys].estado === 'Normal'}
                      onChange={() => handleEstado(sys, 'Normal')}
                      disabled={disabled}
                      className="text-emerald-600"
                    />
                    <span className="text-emerald-700 font-bold">Normal</span>
                  </label>
                  <label className="text-[10px] cursor-pointer flex items-center gap-1">
                    <input
                      type="radio"
                      checked={sistemas[sys].estado === 'Anormal'}
                      onChange={() => handleEstado(sys, 'Anormal')}
                      disabled={disabled}
                      className="text-red-600"
                    />
                    <span className="text-red-600 font-bold">Anormal</span>
                  </label>
                </div>
                {/* Impresión: solo el estado */}
                <span
                  className={`hidden print:inline text-[8.5pt] font-bold ${
                    sistemas[sys].estado === 'Anormal' ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {sistemas[sys].estado === 'Anormal' ? '✗ Anormal' : '✓ Normal'}
                </span>
              </div>

              {/* Descripción normal en gris (oculta si anormal) */}
              <p
                className={`text-[9px] leading-relaxed ${
                  sistemas[sys].estado === 'Anormal' ? 'hidden' : ''
                } text-gray-400 italic`}
              >
                {NORMAL_DESCRIPTIONS_SYSTEMS[sys]}
              </p>

              {/* Textarea de hallazgo patológico */}
              {sistemas[sys].estado === 'Anormal' && (
                <textarea
                  rows={2}
                  className="w-full text-[10px] p-1 border border-red-300 rounded bg-white resize-none"
                  placeholder="Describa el hallazgo patológico..."
                  value={sistemas[sys].hallazgo}
                  onChange={(e) => handleHallazgo(sys, e.target.value)}
                  disabled={disabled}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
