import React from 'react';
import { Activity } from 'lucide-react';
import { InputGroup } from '../../../shared/components/ui/InputGroup';
import { SelectGroup } from '../../../shared/components/ui/SelectGroup';
import { SectionTitle } from '../../../shared/components/ui/SectionTitle';
import { analyzeBP, analyzeHR, analyzeBMI } from '../../../shared/lib/formatters';

/**
 * VitalSigns — Signos Vitales y Antropometría
 * TA, FC, FR, Temp, Peso, Talla con IMC auto-calculado y alertas clínicas
 * Agudeza visual y lateralidad
 *
 * Props:
 *   data      — el objeto completo del paciente (data)
 *   setData   — setter del estado (setData)
 *   disabled  — si la HC está cerrada
 */
export const VitalSigns = ({ data, setData, disabled = false }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((p) => ({ ...p, [name]: value }));
  };

  /** Auto-cálculo de IMC cuando cambian peso o talla */
  const handleWeightHeight = (e) => {
    const { name, value } = e.target;
    const peso = parseFloat(name === 'peso' ? value : data.peso);
    const talla = parseFloat(name === 'talla' ? value : data.talla);
    if (peso > 0 && talla > 0) {
      const tallaMt = talla > 3 ? talla / 100 : talla;
      const imc = (peso / (tallaMt * tallaMt)).toFixed(1);
      setData((p) => ({ ...p, [name]: value, imc }));
    } else {
      setData((p) => ({ ...p, [name]: value }));
    }
  };

  return (
    <>
      <SectionTitle title="Signos Vitales y Antropometría" icon={Activity} color="blue" />
      <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 mb-2 print:bg-transparent">
        <div className="grid grid-cols-4 gap-1 mb-2">
          <InputGroup
            label="FC (lpm)"
            name="fc"
            value={data.fc}
            onChange={handleChange}
            alertInfo={analyzeHR(data.fc)}
            disabled={disabled}
          />
          <InputGroup
            label="FR (rpm)"
            name="fr"
            value={data.fr}
            onChange={handleChange}
            disabled={disabled}
          />
          <InputGroup
            label="T/A"
            name="ta"
            value={data.ta}
            onChange={handleChange}
            alertInfo={analyzeBP(data.ta)}
            disabled={disabled}
          />
          <InputGroup
            label="Temp. (°C)"
            name="temp"
            value={data.temp}
            onChange={handleChange}
            disabled={disabled}
          />
          <InputGroup
            label="Peso (kg)"
            name="peso"
            value={data.peso}
            onChange={handleWeightHeight}
            type="number"
            disabled={disabled}
          />
          <InputGroup
            label="Talla (cm)"
            name="talla"
            value={data.talla}
            onChange={handleWeightHeight}
            type="number"
            disabled={disabled}
          />
          {/* IMC calculado — campo de solo lectura */}
          <div className="mb-2 px-1.5 print:mb-1">
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">
              IMC
            </label>
            <div
              className={`w-full p-1.5 border rounded text-xs font-bold ${
                analyzeBMI(data.imc)?.color || 'text-gray-600 bg-gray-100'
              } print:bg-transparent print:border-none`}
            >
              {data.imc || '--'}
              {data.imc && analyzeBMI(data.imc) && (
                <span className="ml-1 text-[9px]">({analyzeBMI(data.imc).text})</span>
              )}
            </div>
          </div>
          <SelectGroup
            label="Lateralidad"
            name="lateralidad"
            value={data.lateralidad}
            onChange={handleChange}
            options={['Diestro', 'Zurdo', 'Ambidextro']}
            disabled={disabled}
          />
        </div>
        {/* Agudeza visual */}
        <div className="flex gap-2 flex-wrap border-t border-blue-200 pt-2">
          <InputGroup
            label="Visión OD"
            name="av_od"
            value={data.agudezaVisual?.lejanaOD}
            onChange={(e) =>
              setData((p) => ({
                ...p,
                agudezaVisual: { ...p.agudezaVisual, lejanaOD: e.target.value },
              }))
            }
            width="w-1/5 min-w-[90px]"
            disabled={disabled}
          />
          <InputGroup
            label="Visión OI"
            name="av_oi"
            value={data.agudezaVisual?.lejanaOI}
            onChange={(e) =>
              setData((p) => ({
                ...p,
                agudezaVisual: { ...p.agudezaVisual, lejanaOI: e.target.value },
              }))
            }
            width="w-1/5 min-w-[90px]"
            disabled={disabled}
          />
          <div className="mb-2 flex items-end px-1.5 pb-1.5">
            <label className="flex items-center gap-1 text-[10px] cursor-pointer">
              <input
                type="checkbox"
                checked={data.agudezaVisual?.correccion || false}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    agudezaVisual: { ...p.agudezaVisual, correccion: e.target.checked },
                  }))
                }
                className="w-3 h-3"
                disabled={disabled}
              />{' '}
              Usa Corrección
            </label>
          </div>
        </div>
      </div>
    </>
  );
};
