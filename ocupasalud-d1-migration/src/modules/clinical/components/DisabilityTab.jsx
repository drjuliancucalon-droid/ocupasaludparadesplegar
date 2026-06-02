// src/modules/clinical/components/DisabilityTab.jsx
// Sprint 2.7: Disability certificate (incapacidad) tab
// Fields: días, tipo, origen, diagnóstico, prórroga, date range
import React, { useState, useCallback, useMemo } from 'react';
import { Printer, Plus, Trash2, HeartPulse, Calendar } from 'lucide-react';
import { InputGroup } from '../../../shared/components/ui/InputGroup';
import { SelectGroup } from '../../../shared/components/ui/SelectGroup';
import { TextAreaGroup } from '../../../shared/components/ui/TextAreaGroup';
import { openPrintWindow } from '../../../lib/printService';
import { _sanitize } from '../../../shared/lib/security';

const TIPO_OPTIONS = ['Ambulatoria', 'Hospitalaria'];
const ORIGEN_OPTIONS = [
  'Enfermedad General',
  'Accidente de Trabajo',
  'Enfermedad Laboral',
  'Accidente de Tránsito',
  'Otro',
];

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + parseInt(days, 10));
  return d.toISOString().split('T')[0];
};

const INITIAL_DISABILITY = {
  dias: '',
  tipo: 'Ambulatoria',
  origen: 'Enfermedad General',
  diagnosticoCIE10: '',
  diagnosticoDescripcion: '',
  fechaInicio: new Date().toISOString().split('T')[0],
  fechaFin: '',
  esProrroga: false,
  prorrogaNumero: '',
  observaciones: '',
};

export const DisabilityTab = ({ patientData = {}, doctorData = {} }) => {
  const [disabilities, setDisabilities] = useState([]);
  const [current, setCurrent] = useState({ ...INITIAL_DISABILITY });
  const [editIndex, setEditIndex] = useState(-1);

  // Auto-calculate end date
  const fechaFin = useMemo(() => {
    if (current.fechaInicio && current.dias && parseInt(current.dias) > 0) {
      return addDays(current.fechaInicio, parseInt(current.dias) - 1);
    }
    return '';
  }, [current.fechaInicio, current.dias]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setCurrent((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleAdd = useCallback(() => {
    if (!current.dias || !current.diagnosticoCIE10) {
      alert('Complete al menos los días y el diagnóstico CIE-10');
      return;
    }
    const entry = { ...current, fechaFin, id: `dis_${Date.now()}` };
    if (editIndex >= 0) {
      setDisabilities((prev) => prev.map((d, i) => i === editIndex ? entry : d));
      setEditIndex(-1);
    } else {
      setDisabilities((prev) => [...prev, entry]);
    }
    setCurrent({ ...INITIAL_DISABILITY });
  }, [current, fechaFin, editIndex]);

  const handleEdit = useCallback((index) => {
    setCurrent(disabilities[index]);
    setEditIndex(index);
  }, [disabilities]);

  const handleDelete = useCallback((index) => {
    if (!confirm('¿Eliminar esta incapacidad?')) return;
    setDisabilities((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePrint = useCallback((entry) => {
    const s = (v) => _sanitize(v || '—');
    const html = `
      <div style="text-align:center;margin-bottom:20px;">
        <h1 style="margin:0;font-size:16pt;">CERTIFICADO DE INCAPACIDAD MÉDICA</h1>
        <p style="font-size:9pt;color:#6b7280;margin-top:4px;">Documento generado el ${new Date().toLocaleDateString('es-CO')}</p>
      </div>

      <div class="section">
        <h2>📋 Datos del Paciente</h2>
        <table>
          <tr><td class="label" width="25%">Nombre completo</td><td>${s(patientData.nombres)}</td></tr>
          <tr><td class="label">Documento</td><td>${s(patientData.docTipo)} ${s(patientData.docNumero)}</td></tr>
          <tr><td class="label">Empresa</td><td>${s(patientData.empresaNombre)}</td></tr>
          <tr><td class="label">Cargo</td><td>${s(patientData.cargo)}</td></tr>
          <tr><td class="label">EPS</td><td>${s(patientData.eps)}</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>🏥 Datos de la Incapacidad</h2>
        <table>
          <tr><td class="label" width="25%">Días de incapacidad</td><td style="font-size:14pt;font-weight:900;color:#059669;">${s(entry.dias)} día(s)</td></tr>
          <tr><td class="label">Tipo</td><td>${s(entry.tipo)}</td></tr>
          <tr><td class="label">Origen</td><td>${s(entry.origen)}</td></tr>
          <tr><td class="label">Fecha inicio</td><td>${s(entry.fechaInicio)}</td></tr>
          <tr><td class="label">Fecha fin</td><td>${s(entry.fechaFin)}</td></tr>
          <tr><td class="label">Diagnóstico CIE-10</td><td><strong>${s(entry.diagnosticoCIE10)}</strong> — ${s(entry.diagnosticoDescripcion)}</td></tr>
          ${entry.esProrroga ? `<tr><td class="label">Prórroga</td><td>Sí — N° ${s(entry.prorrogaNumero)}</td></tr>` : ''}
        </table>
      </div>

      ${entry.observaciones ? `
      <div class="section">
        <h2>📝 Observaciones</h2>
        <p>${s(entry.observaciones)}</p>
      </div>` : ''}

      <div class="signature-area">
        <div style="display:flex;justify-content:space-between;">
          <div style="width:45%;">
            <div style="border-top:2px solid #059669;margin-top:50px;padding-top:6px;">
              <p style="font-size:9pt;font-weight:700;">${s(doctorData.nombre)}</p>
              <p style="font-size:7.5pt;color:#6b7280;">Médico · RM: ${s(doctorData.licencia)}</p>
            </div>
          </div>
          <div style="width:45%;">
            <div style="border-top:2px solid #333;margin-top:50px;padding-top:6px;">
              <p style="font-size:9pt;font-weight:700;">${s(patientData.nombres)}</p>
              <p style="font-size:7.5pt;color:#6b7280;">${s(patientData.docTipo)} ${s(patientData.docNumero)}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    openPrintWindow(`Incapacidad — ${patientData.nombres || 'Paciente'} — ${entry.dias} días`, html);
  }, [patientData, doctorData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <HeartPulse className="w-5 h-5 text-emerald-600" />
        <h3 className="text-sm font-black text-gray-800 uppercase">Incapacidades</h3>
      </div>

      {/* Form */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
        <div className="flex flex-wrap -mx-1.5">
          <InputGroup label="Días de incapacidad" name="dias" value={current.dias} onChange={handleChange} type="number" width="w-1/4" required />
          <SelectGroup label="Tipo" name="tipo" value={current.tipo} onChange={handleChange} options={TIPO_OPTIONS} width="w-1/4" />
          <SelectGroup label="Origen" name="origen" value={current.origen} onChange={handleChange} options={ORIGEN_OPTIONS} width="w-1/2" />
        </div>
        <div className="flex flex-wrap -mx-1.5">
          <InputGroup label="Diagnóstico CIE-10" name="diagnosticoCIE10" value={current.diagnosticoCIE10} onChange={handleChange} width="w-1/3" required placeholder="Ej: J06.9" />
          <InputGroup label="Descripción diagnóstico" name="diagnosticoDescripcion" value={current.diagnosticoDescripcion} onChange={handleChange} width="w-2/3" placeholder="Descripción del diagnóstico" />
        </div>
        <div className="flex flex-wrap -mx-1.5">
          <InputGroup label="Fecha inicio" name="fechaInicio" value={current.fechaInicio} onChange={handleChange} type="date" width="w-1/3" />
          <div className="w-1/3 px-1.5 mb-2">
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Fecha fin (auto)</label>
            <div className="w-full p-1.5 bg-emerald-50 border border-emerald-200 rounded text-xs font-bold text-emerald-700 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {fechaFin || '—'}
            </div>
          </div>
          <div className="w-1/3 px-1.5 mb-2 flex items-end gap-2">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer mb-1.5">
              <input type="checkbox" name="esProrroga" checked={current.esProrroga} onChange={handleChange} className="accent-emerald-600" />
              <span className="font-bold text-gray-600">Prórroga</span>
            </label>
            {current.esProrroga && (
              <input
                type="number"
                name="prorrogaNumero"
                value={current.prorrogaNumero}
                onChange={handleChange}
                placeholder="N°"
                className="w-16 p-1.5 border border-gray-200 rounded text-xs"
              />
            )}
          </div>
        </div>
        <TextAreaGroup label="Observaciones" name="observaciones" value={current.observaciones} onChange={handleChange} rows={2} />
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700"
        >
          <Plus className="w-3.5 h-3.5" />
          {editIndex >= 0 ? 'Actualizar' : 'Agregar'} Incapacidad
        </button>
      </div>

      {/* List */}
      {disabilities.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-emerald-50 text-emerald-800">
                <th className="text-left px-3 py-2 font-bold">Días</th>
                <th className="text-left px-3 py-2 font-bold">Tipo</th>
                <th className="text-left px-3 py-2 font-bold">Diagnóstico</th>
                <th className="text-left px-3 py-2 font-bold hidden sm:table-cell">Período</th>
                <th className="text-right px-3 py-2 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {disabilities.map((d, idx) => (
                <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-bold text-emerald-700">{d.dias}</td>
                  <td className="px-3 py-2">{d.tipo}{d.esProrroga ? ` (Prórroga ${d.prorrogaNumero})` : ''}</td>
                  <td className="px-3 py-2 font-mono">{d.diagnosticoCIE10}</td>
                  <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{d.fechaInicio} → {d.fechaFin}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handlePrint(d)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Imprimir">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleEdit(idx)} className="p-1 text-blue-600 hover:bg-blue-50 rounded text-[10px] font-bold">✎</button>
                      <button onClick={() => handleDelete(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
