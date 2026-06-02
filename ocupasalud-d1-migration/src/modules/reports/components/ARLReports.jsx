import React, { useState } from 'react';
import { Shield, Save, Printer, AlertTriangle } from 'lucide-react';
import { InputGroup } from '../../../shared/components/ui/InputGroup';
import { SelectGroup } from '../../../shared/components/ui/SelectGroup';
import { TextAreaGroup } from '../../../shared/components/ui/TextAreaGroup';

/**
 * ARLReports - Reportes ARL (FURAT/FUREP)
 * Resolución 0156/2005 · Decreto 1295/1994
 */
export const ARLReports = ({ patients = [], companies = [], onSave, onPrint }) => {
  const [reportType, setReportType] = useState('FURAT');
  const [form, setForm] = useState({
    pacienteId: '', fechaEvento: '', horaEvento: '', lugarEvento: '',
    descripcion: '', parteAfectada: '', tipoLesion: '', agenteCausal: '',
    mecanismoCausal: '', diasIncapacidad: '', tipoAT: 'En el trabajo',
    testigos: '', arl: '', eps: '', afp: '',
  });

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handlePatientSelect = (patId) => {
    const pat = patients.find((p) => p.id === patId);
    if (pat) {
      setForm((p) => ({
        ...p,
        pacienteId: pat.id,
        arl: pat.arl || '',
        eps: pat.eps || '',
        afp: pat.afp || '',
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-orange-600" />
        <div>
          <h1 className="font-black text-gray-800 text-lg">Módulo ARL</h1>
          <p className="text-xs text-gray-500">Res. 0156/2005 · FURAT y FUREP</p>
        </div>
      </div>

      {/* Report type toggle */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        {['FURAT', 'FUREP'].map((type) => (
          <button key={type} onClick={() => setReportType(type)}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition ${
              reportType === type ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500'
            }`}>
            {type === 'FURAT' ? '⚠️ FURAT (Accidente)' : '🏥 FUREP (Enfermedad)'}
          </button>
        ))}
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-black text-orange-700 uppercase">
          {reportType === 'FURAT' ? 'Formato Único de Reporte de Accidente de Trabajo' : 'Formato Único de Reporte de Enfermedad Profesional'}
        </p>

        {/* Patient selection */}
        <div>
          <label className="block text-[10px] font-black text-gray-600 mb-0.5 uppercase">Trabajador</label>
          <select value={form.pacienteId} onChange={(e) => handlePatientSelect(e.target.value)}
            className="w-full p-1.5 border border-gray-200 rounded text-xs font-bold bg-white">
            <option value="">Seleccionar trabajador...</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.nombres} - CC {p.docNumero}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap -mx-1.5">
          <InputGroup label="Fecha del evento" type="date" value={form.fechaEvento}
            onChange={(e) => handleChange('fechaEvento', e.target.value)} width="w-1/4" />
          <InputGroup label="Hora" type="time" value={form.horaEvento}
            onChange={(e) => handleChange('horaEvento', e.target.value)} width="w-1/6 min-w-[80px]" />
          <InputGroup label="Lugar del evento" value={form.lugarEvento}
            onChange={(e) => handleChange('lugarEvento', e.target.value)} width="w-1/3" />
          {reportType === 'FURAT' && (
            <SelectGroup label="Tipo AT" value={form.tipoAT}
              onChange={(e) => handleChange('tipoAT', e.target.value)}
              options={['En el trabajo', 'In itinere', 'Deportivo', 'Recreativo']} width="w-1/4" />
          )}
        </div>

        <TextAreaGroup label="Descripción del evento" value={form.descripcion}
          onChange={(e) => handleChange('descripcion', e.target.value)}
          placeholder={reportType === 'FURAT'
            ? 'Descripción detallada del accidente de trabajo...'
            : 'Descripción de la enfermedad y relación con la exposición laboral...'}
          rows={3} />

        <div className="flex flex-wrap -mx-1.5">
          <InputGroup label="Parte del cuerpo afectada" value={form.parteAfectada}
            onChange={(e) => handleChange('parteAfectada', e.target.value)} width="w-1/3" />
          <SelectGroup label="Tipo de lesión" value={form.tipoLesion}
            onChange={(e) => handleChange('tipoLesion', e.target.value)}
            options={['Contusión', 'Herida', 'Fractura', 'Luxación', 'Esguince', 'Quemadura', 'Amputación', 'Envenenamiento', 'Asfixia', 'Otro']}
            width="w-1/4" />
          <InputGroup label="Agente causal" value={form.agenteCausal}
            onChange={(e) => handleChange('agenteCausal', e.target.value)} width="w-1/3" />
          <InputGroup label="Días incapacidad" type="number" value={form.diasIncapacidad}
            onChange={(e) => handleChange('diasIncapacidad', e.target.value)} width="w-1/6 min-w-[80px]" />
        </div>

        <div className="flex flex-wrap -mx-1.5">
          <InputGroup label="ARL" value={form.arl} onChange={(e) => handleChange('arl', e.target.value)} width="w-1/3" />
          <InputGroup label="EPS" value={form.eps} onChange={(e) => handleChange('eps', e.target.value)} width="w-1/3" />
          <InputGroup label="Testigos" value={form.testigos} onChange={(e) => handleChange('testigos', e.target.value)} width="w-1/3" />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onSave?.({ ...form, tipo: reportType, id: Date.now(), fecha: new Date().toISOString() })}
          className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-black hover:bg-orange-700 flex items-center justify-center gap-1.5">
          <Save className="w-4 h-4" /> Guardar {reportType}
        </button>
        <button onClick={() => onPrint?.({ ...form, tipo: reportType })}
          className="py-2.5 px-6 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 flex items-center gap-1">
          <Printer className="w-4 h-4" /> Imprimir
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800">
        <p className="font-black flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Plazo de reporte</p>
        <p className="mt-0.5">
          FURAT: dentro de 2 días hábiles siguientes al AT (Decreto 1295/1994 Art. 62).
          FUREP: dentro de 2 días hábiles desde el diagnóstico.
        </p>
      </div>
    </div>
  );
};
