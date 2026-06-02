// ═══════════════════════════════════════════════════════════════════════════
// GeneralHC.jsx — Historia Clínica Medicina General COMPLETA
// Resolución 1995 de 1999
// Port FIEL del monolito renderHistoriaGeneral (líneas 21652-22562)
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import {
  User, Activity, History, AlertCircle, FileCheck, Search,
  Sparkles, Loader2, Plus, X
} from 'lucide-react';
import { InputGroup } from '../../../shared/components/ui/InputGroup';
import { SelectGroup } from '../../../shared/components/ui/SelectGroup';
import { TextAreaGroup } from '../../../shared/components/ui/TextAreaGroup';
import { SectionTitle } from '../../../shared/components/ui/SectionTitle';
import { BrandLogo } from '../../../shared/components/ui/BrandLogo';
import { DoctorSignature } from '../../../shared/components/ui/DoctorSignature';
import { CIE10Input } from '../../../shared/components/CIE10Input';
import {
  EPS_LIST,
  NORMAL_DESCRIPTIONS_SYSTEMS
} from '../../../shared/data/catalogs';

// ── Helpers ────────────────────────────────────────────────────────────────
const analyzeBP = (ta) => {
  if (!ta) return null;
  const m = ta.match(/(\d+)\s*[\/]\s*(\d+)/);
  if (!m) return null;
  const s = parseInt(m[1]), d = parseInt(m[2]);
  if (s >= 180 || d >= 120) return { text: 'CRISIS', color: 'bg-red-200 text-red-800' };
  if (s >= 140 || d >= 90) return { text: 'HTA-2', color: 'bg-red-100 text-red-700' };
  if (s >= 130 || d >= 80) return { text: 'HTA-1', color: 'bg-orange-100 text-orange-700' };
  if (s >= 120 && d < 80) return { text: 'Elevada', color: 'bg-yellow-100 text-yellow-700' };
  if (s < 90 || d < 60) return { text: 'Baja', color: 'bg-blue-100 text-blue-700' };
  return { text: 'Normal', color: 'bg-green-100 text-green-700' };
};
const analyzeBMI = (imc) => {
  if (!imc) return null;
  const v = parseFloat(imc);
  if (isNaN(v)) return null;
  if (v < 18.5) return { text: 'Bajo peso', color: 'bg-blue-100 text-blue-700' };
  if (v < 25) return { text: 'Normal', color: 'bg-green-100 text-green-700' };
  if (v < 30) return { text: 'Sobrepeso', color: 'bg-yellow-100 text-yellow-700' };
  if (v < 35) return { text: 'Obesidad I', color: 'bg-orange-100 text-orange-700' };
  return { text: 'Obesidad II+', color: 'bg-red-100 text-red-700' };
};

/**
 * GeneralHC — Historia Clínica de Medicina General (Res. 1995/1999)
 * Port completo del monolith renderHistoriaGeneral.
 */
export const GeneralHC = ({
  data,
  setData,
  activeDoctorData,
  activeSignature,
  patientsList = [],
  currentUser,
  // Callbacks
  onGenerateAI,
  onGenerateRestrictions,
  onGenerateRecommendations,
  // State
  isGenerating = false,
  isGeneratingRestr = false,
  isGeneratingReco = false,
  historyNotification,
}) => {
  const [genPatSearch, setGenPatSearch] = useState('');

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }, [setData]);

  const handleNameChange = useCallback((e) => {
    handleChange(e);
  }, [handleChange]);

  const isClosed = data.estadoHistoria === 'Cerrada';

  // ── Buscar pacientes ────────────────────────────────────────────────────
  const _isAdmin = (role) => role === 'admin' || role === 'super_admin';
  const _ownPatsGen = _isAdmin(currentUser?.role)
    ? patientsList
    : patientsList.filter((p) => !p._medicoId || p._medicoId === currentUser?.user);

  const genPatResults = genPatSearch.length >= 2
    ? _ownPatsGen
        .filter((p) =>
          (p.nombres || '').toLowerCase().includes(genPatSearch.toLowerCase()) ||
          (p.docNumero || '').includes(genPatSearch)
        )
        .slice(0, 8)
    : [];

  const loadGenPatient = (p) => {
    const prevHCs = patientsList
      .filter((h) => h.docNumero === p.docNumero && h.fechaExamen)
      .sort((a, b) => new Date(b.fechaExamen || 0) - new Date(a.fechaExamen || 0));
    const latest = prevHCs[0] || p;
    setData((prev) => ({
      ...prev,
      nombres: p.nombres || '',
      docNumero: p.docNumero || '',
      edad: p.edad || '',
      fechaNacimiento: p.fechaNacimiento || '',
      genero: p.genero || '',
      estadoCivil: p.estadoCivil || '',
      escolaridad: p.escolaridad || '',
      telefono: p.telefono || p.celular || '',
      email: p.email || '',
      residencia: p.residencia || '',
      eps: p.eps || '',
      afp: p.afp || '',
      grupoSanguineo: p.grupoSanguineo || '',
      foto: p.foto || '',
      antecedentes: latest.antecedentes ? { ...latest.antecedentes } : prev.antecedentes,
      habitos: latest.habitos ? { ...latest.habitos } : prev.habitos,
      antecedentesAgrupados: latest.antecedentesAgrupados
        ? JSON.parse(JSON.stringify(latest.antecedentesAgrupados))
        : prev.antecedentesAgrupados,
      vacunacionCompleta: latest.vacunacionCompleta || false,
      vacunas: latest.vacunas || [],
      alergias: p.alergias || latest.antecedentesAgrupados?.alergicos?.det || '',
    }));
    setGenPatSearch('');
  };

  const generateAIGeneral = onGenerateAI || (() => {});

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="bg-white mx-auto shadow-2xl print:shadow-none carta-visual"
      style={{ width: '21.59cm', minHeight: 'auto', padding: '1.2cm', boxSizing: 'border-box' }}
    >
      {/* ── Buscador de paciente ─────────────────────────────────── */}
      <div className="no-print bg-blue-50 border border-blue-200 rounded-xl p-2 mb-3 relative">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <input
            value={genPatSearch}
            onChange={(e) => setGenPatSearch(e.target.value)}
            placeholder="Buscar paciente existente por nombre o documento para prellenar datos..."
            className="flex-1 bg-transparent outline-none text-xs text-blue-900 placeholder-blue-400"
          />
        </div>
        {genPatResults.length > 0 && (
          <div className="absolute left-0 top-full mt-1 bg-white border border-blue-200 rounded-xl shadow-xl z-50 w-full max-h-48 overflow-y-auto">
            {genPatResults.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => loadGenPatient(p)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 border-b border-gray-50 last:border-none"
              >
                <p className="text-xs font-bold text-blue-900">{p.nombres}</p>
                <p className="text-[10px] text-gray-500">{p.docNumero} · {p.eps || 'Sin EPS'} · {p.edad || '?'} años</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex justify-between items-center border-b-2 border-blue-500 pb-3 mb-3 print:border-black">
        <div className="w-1/3">
          <BrandLogo data={activeDoctorData} />
          {activeDoctorData?.licencia && (
            <p className="text-[8px] text-gray-400 mt-0.5 no-print">
              Reg. Médico: <span className="font-bold text-gray-600">{activeDoctorData.licencia}</span>
            </p>
          )}
        </div>
        <div className="w-1/3 text-center">
          <h1 className="text-sm font-black text-gray-800 uppercase">
            Historia Clínica -- Medicina General
          </h1>
          <p className="text-[9px] text-gray-500">Resolución 1995 de 1999</p>
        </div>
        <div className="w-1/3 text-right text-[9px] font-bold text-gray-400">
          <p>FOR-MG-001 v1.0</p>
          <p>{data.fechaConsulta}</p>
        </div>
      </div>

      <fieldset disabled={isClosed} className="disabled:opacity-75">
        {/* ══════════════════════════════════════════════════════════ */}
        {/* DATOS DEL PACIENTE                                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        <SectionTitle title="Datos del Paciente" icon={User} color="blue" />
        <div className="flex flex-wrap -mx-1.5">
          <InputGroup label="Nombres Completos" name="nombres" value={data.nombres}
            onChange={handleNameChange} width="w-1/2" />
          <InputGroup label="Documento ID" name="docNumero" value={data.docNumero}
            onChange={handleChange} width="w-1/4" />
          <InputGroup label="Fecha de Nacimiento" name="fechaNacimiento" value={data.fechaNacimiento}
            onChange={(e) => {
              setData((p) => ({
                ...p,
                fechaNacimiento: e.target.value,
                edad: String(new Date().getFullYear() - new Date(e.target.value).getFullYear()),
              }));
            }}
            type="date" width="w-1/4" />
          <InputGroup label="Edad" name="edad" value={data.edad}
            onChange={handleChange} width="w-1/8 min-w-[80px]" />
          <SelectGroup label="Género" name="genero" value={data.genero}
            onChange={handleChange} options={['M', 'F', 'Otro']} width="w-1/8 min-w-[80px]" />
          <SelectGroup label="Estado Civil" name="estadoCivil" value={data.estadoCivil}
            onChange={handleChange}
            options={['Soltero', 'Casado', 'U. Libre', 'Separado', 'Viudo']} width="w-1/4" />
          <InputGroup label="EPS" name="eps" value={data.eps}
            onChange={handleChange} width="w-1/4" list="eps-list-gen" />
          <InputGroup label="Teléfono" name="telefono" value={data.telefono}
            onChange={handleChange} width="w-1/4" />
          <InputGroup label="Grupo Sanguíneo" name="grupoSanguineo" value={data.grupoSanguineo}
            onChange={handleChange} width="w-1/4" />
          <InputGroup label="Alergias Conocidas" name="alergias" value={data.alergias}
            onChange={handleChange} width="w-1/2" placeholder="Medicamentos, alimentos, otros..." />
          <InputGroup label="Residencia" name="residencia" value={data.residencia}
            onChange={handleChange} width="w-1/2" />
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MOTIVO DE CONSULTA Y ENFERMEDAD ACTUAL                   */}
        {/* ══════════════════════════════════════════════════════════ */}
        <SectionTitle title="Motivo de Consulta y Enfermedad Actual" icon={AlertCircle} color="blue" />
        <TextAreaGroup label="Motivo de Consulta" name="motivoConsulta"
          value={data.motivoConsulta} onChange={handleChange} rows={2} />
        <TextAreaGroup
          label="Enfermedad Actual (Cronología, localización, intensidad, factores modificadores)"
          name="enfermedadActual"
          value={data.enfermedadActual} onChange={handleChange} rows={4} />

        <div className="print-section-break" />

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ANTECEDENTES                                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        <SectionTitle title="Antecedentes" icon={History} color="blue" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
          {[
            { k: 'personales', l: 'Patológicos' },
            { k: 'familiares', l: 'Familiares' },
            { k: 'quirurgicos', l: 'Quirúrgicos' },
            { k: 'traumaticos', l: 'Traumáticos' },
            { k: 'farmacologicos', l: 'Farmacológicos' },
            { k: 'alergicos', l: 'Alérgicos' },
            { k: 'ginecologicos', l: 'Gineco-Obstétricos' },
          ].map((a) => {
            const val = data.antecedentes?.[a.k];
            const hasContent = val && val.trim().length > 0 && val.trim().toLowerCase() !== 'niega';
            return (
              <div
                key={a.k}
                className={`p-1.5 border rounded text-[10px] ${
                  hasContent ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                } print:bg-transparent print:border-gray-300`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-bold uppercase text-gray-700">{a.l}</span>
                  <div className="flex gap-2 no-print">
                    <label className="cursor-pointer flex items-center gap-0.5">
                      <input type="radio" checked={!hasContent}
                        onChange={() => setData((p) => ({
                          ...p, antecedentes: { ...p.antecedentes, [a.k]: 'Niega' },
                        }))}
                        className="w-3 h-3" />
                      <span>No</span>
                    </label>
                    <label className="cursor-pointer flex items-center gap-0.5 text-red-600">
                      <input type="radio" checked={hasContent}
                        onChange={() => setData((p) => ({
                          ...p, antecedentes: { ...p.antecedentes, [a.k]: '' },
                        }))}
                        className="w-3 h-3" />
                      <span>Sí</span>
                    </label>
                  </div>
                  <span className={`hidden print:inline text-[8.5pt] font-bold ${hasContent ? 'text-red-600' : 'text-gray-400'}`}>
                    {hasContent ? '✓ Positivo' : '✗ Niega'}
                  </span>
                </div>
                {hasContent && (
                  <textarea value={val}
                    onChange={(e) => setData((p) => ({
                      ...p, antecedentes: { ...p.antecedentes, [a.k]: e.target.value },
                    }))}
                    rows={2} placeholder="Detalle..."
                    className="w-full p-0.5 border-b border-red-300 bg-transparent outline-none text-[9px] resize-none" />
                )}
                {!hasContent && (
                  <p className="hidden print:block text-[8pt] text-gray-400 italic leading-tight">Niega</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="print-section-break" />

        {/* ══════════════════════════════════════════════════════════ */}
        {/* REVISIÓN POR SISTEMAS                                    */}
        {/* ══════════════════════════════════════════════════════════ */}
        <SectionTitle title="Revisión por Sistemas" icon={Activity} color="blue" />
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 bg-gray-50 p-2 rounded-lg border border-gray-200 mb-2 print:bg-transparent">
          {[
            { k: 'general', l: 'General', normal: 'Sin síntomas constitucionales. Niega pérdida de peso, fiebre ni astenia.' },
            { k: 'cardiovascular', l: 'Cardiovascular', normal: 'Niega palpitaciones, dolor precordial, disnea de esfuerzo ni edemas.' },
            { k: 'respiratorio', l: 'Respiratorio', normal: 'Niega tos, disnea, expectoración ni hemoptisis.' },
            { k: 'digestivo', l: 'Digestivo', normal: 'Niega dolor abdominal, náuseas, vómito, diarrea ni rectorragia.' },
            { k: 'genitourinario', l: 'Genitourinario', normal: 'Niega disuria, hematuria, polaquiuria ni secreciones.' },
            { k: 'musculoesqueletico', l: 'Musculoesquelético', normal: 'Niega artralgias, mialgias, rigidez ni limitación funcional.' },
            { k: 'neurologico', l: 'Neurológico', normal: 'Niega cefalea, mareos, convulsiones, alteraciones visuales ni parestesias.' },
            { k: 'dermatologico', l: 'Dermatológico', normal: 'Niega lesiones cutáneas, prurito, cambios de coloración ni rash.' },
            { k: 'endocrinologico', l: 'Endocrinológico', normal: 'Niega poliuria, polidipsia, intolerancia al calor/frío ni cambios de peso.' },
          ].map((s) => {
            const val = data.revisionSistemas?.[s.k] || '';
            const isAbnormal = val && val.trim() !== '' && val.trim().toLowerCase() !== 'niega'
              && !val.toLowerCase().includes('sin síntomas') && !val.toLowerCase().includes('niega');
            return (
              <div
                key={s.k}
                className={`border-b border-gray-200 pb-1.5 print:border-gray-300 ${
                  isAbnormal ? 'bg-red-50 rounded p-1' : ''
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-700 uppercase">{s.l}</span>
                  <div className="flex gap-3 no-print">
                    <label className="text-[10px] cursor-pointer flex items-center gap-1">
                      <input type="radio" checked={!isAbnormal}
                        onChange={() => setData((p) => ({
                          ...p, revisionSistemas: { ...p.revisionSistemas, [s.k]: s.normal },
                        }))}
                        className="text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Normal</span>
                    </label>
                    <label className="text-[10px] cursor-pointer flex items-center gap-1">
                      <input type="radio" checked={isAbnormal}
                        onChange={() => setData((p) => ({
                          ...p, revisionSistemas: { ...p.revisionSistemas, [s.k]: '' },
                        }))}
                        className="text-red-600" />
                      <span className="text-red-600 font-bold">Anormal</span>
                    </label>
                  </div>
                  <span className={`hidden print:inline text-[8.5pt] font-bold ${isAbnormal ? 'text-red-600' : 'text-emerald-700'}`}>
                    {isAbnormal ? '✗ Anormal' : '✓ Normal'}
                  </span>
                </div>
                {isAbnormal ? (
                  <textarea rows={2} value={val}
                    onChange={(e) => setData((p) => ({
                      ...p, revisionSistemas: { ...p.revisionSistemas, [s.k]: e.target.value },
                    }))}
                    placeholder="Describa síntomas..."
                    className="w-full text-[10px] p-1 border border-red-300 rounded bg-white resize-none" />
                ) : (
                  <p className="text-[9px] text-gray-400 italic leading-relaxed print:hidden">{s.normal}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="print-section-break" />

        {/* ══════════════════════════════════════════════════════════ */}
        {/* EXAMEN FÍSICO                                            */}
        {/* ══════════════════════════════════════════════════════════ */}
        <SectionTitle title="Examen Físico" icon={Activity} color="blue" />
        <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 mb-2 print:bg-transparent">
          <div className="grid grid-cols-4 gap-1 mb-2">
            <InputGroup label="T/A" name="exFTA" value={data.examenFisico?.ta || ''}
              onChange={(e) => setData((p) => ({
                ...p, examenFisico: { ...p.examenFisico, ta: e.target.value },
              }))}
              alertInfo={analyzeBP(data.examenFisico?.ta)} />
            <InputGroup label="FC" name="exFFC" value={data.examenFisico?.fc || ''}
              onChange={(e) => setData((p) => ({
                ...p, examenFisico: { ...p.examenFisico, fc: e.target.value },
              }))} />
            <InputGroup label="FR" name="exFFR" value={data.examenFisico?.fr || ''}
              onChange={(e) => setData((p) => ({
                ...p, examenFisico: { ...p.examenFisico, fr: e.target.value },
              }))} />
            <InputGroup label="Temp (°C)" name="exFTemp" value={data.examenFisico?.temp || ''}
              onChange={(e) => setData((p) => ({
                ...p, examenFisico: { ...p.examenFisico, temp: e.target.value },
              }))} />
            <InputGroup label="Peso (kg)" name="exFPeso" value={data.examenFisico?.peso || ''}
              onChange={(e) => {
                const p2 = e.target.value;
                const t2 = data.examenFisico?.talla;
                if (p2 && t2) {
                  const imc2 = (parseFloat(p2) / Math.pow(parseFloat(t2) / 100, 2)).toFixed(2);
                  setData((p) => ({ ...p, examenFisico: { ...p.examenFisico, peso: p2, imc: imc2 } }));
                } else {
                  setData((p) => ({ ...p, examenFisico: { ...p.examenFisico, peso: p2 } }));
                }
              }} />
            <InputGroup label="Talla (cm)" name="exFTalla" value={data.examenFisico?.talla || ''}
              onChange={(e) => {
                const t2 = e.target.value;
                const p2 = data.examenFisico?.peso;
                if (p2 && t2) {
                  const imc2 = (parseFloat(p2) / Math.pow(parseFloat(t2) / 100, 2)).toFixed(2);
                  setData((p) => ({ ...p, examenFisico: { ...p.examenFisico, talla: t2, imc: imc2 } }));
                } else {
                  setData((p) => ({ ...p, examenFisico: { ...p.examenFisico, talla: t2 } }));
                }
              }} />
            <div className="mb-2 px-1.5">
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">IMC</label>
              <div className={`w-full p-1.5 border rounded text-xs font-bold ${
                analyzeBMI(data.examenFisico?.imc)?.color || 'text-gray-600 bg-gray-100'
              } print:bg-transparent print:border-none`}>
                {data.examenFisico?.imc || '--'}
              </div>
            </div>
            <InputGroup label="SpO2 (%)" name="exFSat" value={data.examenFisico?.saturacion || ''}
              onChange={(e) => setData((p) => ({
                ...p, examenFisico: { ...p.examenFisico, saturacion: e.target.value },
              }))} />
          </div>

          {/* Botón Todos Normal */}
          <div className="flex justify-end mb-2 no-print">
            <button
              type="button"
              onClick={() => setData((p) => ({
                ...p,
                sistemasPorExamen: Object.fromEntries(
                  Object.keys(p.sistemasPorExamen || {}).map((sys) => [
                    sys,
                    { estado: 'Normal', hallazgo: NORMAL_DESCRIPTIONS_SYSTEMS[sys] || '' },
                  ])
                ),
              }))}
              className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-1"
            >
              ✅ Todos Normal
            </button>
          </div>

          {/* Examen por sistemas */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {Object.keys(data.sistemasPorExamen || {}).map((sys) => (
              <div
                key={sys}
                className={`border-b border-gray-200 pb-1.5 print:border-gray-300 ${
                  data.sistemasPorExamen[sys].estado === 'Anormal' ? 'bg-red-50 rounded p-1' : ''
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-700 uppercase">{sys}</span>
                  <div className="flex gap-3 no-print">
                    <label className="text-[10px] cursor-pointer flex items-center gap-1">
                      <input type="radio" checked={data.sistemasPorExamen[sys].estado === 'Normal'}
                        onChange={() => setData((p) => ({
                          ...p,
                          sistemasPorExamen: {
                            ...p.sistemasPorExamen,
                            [sys]: { ...p.sistemasPorExamen[sys], estado: 'Normal', hallazgo: NORMAL_DESCRIPTIONS_SYSTEMS[sys] || '' },
                          },
                        }))}
                        className="text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Normal</span>
                    </label>
                    <label className="text-[10px] cursor-pointer flex items-center gap-1">
                      <input type="radio" checked={data.sistemasPorExamen[sys].estado === 'Anormal'}
                        onChange={() => setData((p) => ({
                          ...p,
                          sistemasPorExamen: {
                            ...p.sistemasPorExamen,
                            [sys]: { ...p.sistemasPorExamen[sys], estado: 'Anormal', hallazgo: '' },
                          },
                        }))}
                        className="text-red-600" />
                      <span className="text-red-600 font-bold">Anormal</span>
                    </label>
                  </div>
                  <span className={`hidden print:inline text-[8.5pt] font-bold ${
                    data.sistemasPorExamen[sys].estado === 'Anormal' ? 'text-red-600' : 'text-emerald-700'
                  }`}>
                    {data.sistemasPorExamen[sys].estado === 'Anormal' ? '✗ Anormal' : '✓ Normal'}
                  </span>
                </div>
                <p className={`text-[9px] leading-relaxed print:hidden ${
                  data.sistemasPorExamen[sys].estado === 'Anormal' ? 'hidden' : ''
                } text-gray-400 italic`}>
                  {NORMAL_DESCRIPTIONS_SYSTEMS[sys]}
                </p>
                {data.sistemasPorExamen[sys].estado === 'Anormal' && (
                  <textarea rows={2}
                    className="w-full text-[10px] p-1 border border-red-300 rounded bg-white resize-none"
                    placeholder="Describa el hallazgo patológico..."
                    value={data.sistemasPorExamen[sys].hallazgo}
                    onChange={(e) => setData((p) => ({
                      ...p,
                      sistemasPorExamen: {
                        ...p.sistemasPorExamen,
                        [sys]: { ...p.sistemasPorExamen[sys], hallazgo: e.target.value },
                      },
                    }))} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="print-section-break" />

        {/* ══════════════════════════════════════════════════════════ */}
        {/* IMPRESIÓN DIAGNÓSTICA Y PLAN DE MANEJO                   */}
        {/* ══════════════════════════════════════════════════════════ */}
        <SectionTitle title="Impresión Diagnóstica y Plan de Manejo" icon={FileCheck} color="blue" />
        <div className="bg-blue-50 p-2 rounded-xl border border-blue-200">
          <div className="flex justify-end mb-2 no-print">
            <button
              onClick={generateAIGeneral}
              disabled={isGenerating}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGenerating
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />
              } Análisis IA
            </button>
          </div>

          {/* Diagnósticos CIE-10 */}
          <div className="mb-2">
            <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">
              Diagnósticos (CIE-10)
            </label>
            {(data.diagnosticos || []).map((diag, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <div style={{ flex: '0 0 auto', width: '340px' }}>
                  <CIE10Input
                    value={diag.cie10 ? diag.cie10 + (diag.descripcion ? ' - ' + diag.descripcion : '') : ''}
                    onChange={(v) => {
                      const d = [...data.diagnosticos];
                      const match = v.match(/^([A-Z][0-9]{2}[\.0-9]*)\s+-\s+(.+)$/);
                      if (match) {
                        d[i] = { ...d[i], cie10: match[1], descripcion: match[2] };
                      } else {
                        d[i] = { ...d[i], cie10: v, descripcion: '' };
                      }
                      setData((p) => ({ ...p, diagnosticos: d }));
                    }}
                    placeholder="Buscar CIE-10 - código o descripción..."
                    className="w-full p-1 border rounded text-xs focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                <select value={diag.tipo}
                  onChange={(e) => {
                    const d = [...data.diagnosticos];
                    d[i] = { ...d[i], tipo: e.target.value };
                    setData((p) => ({ ...p, diagnosticos: d }));
                  }}
                  className="w-28 p-1 border rounded text-xs">
                  <option>Principal</option>
                  <option>Secundario</option>
                  <option>En estudio</option>
                </select>
                {i > 0 && (
                  <button
                    onClick={() => setData((p) => ({
                      ...p, diagnosticos: p.diagnosticos.filter((_, j) => j !== i),
                    }))}
                    className="text-red-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setData((p) => ({
                ...p, diagnosticos: [...p.diagnosticos, { cie10: '', descripcion: '', tipo: 'Secundario' }],
              }))}
              className="text-blue-600 text-[11px] font-bold flex items-center gap-1 hover:underline mt-1"
            >
              <Plus className="w-3 h-3" /> Agregar diagnóstico
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <TextAreaGroup label="Conducta y Plan de Manejo" name="planConducta"
              value={data.plan?.conducta || ''}
              onChange={(e) => setData((p) => ({
                ...p, plan: { ...p.plan, conducta: e.target.value },
              }))} />
            <TextAreaGroup label="Recomendaciones al Paciente" name="planReco"
              value={data.plan?.recomendaciones || ''}
              onChange={(e) => setData((p) => ({
                ...p, plan: { ...p.plan, recomendaciones: e.target.value },
              }))} />
          </div>

          {/* P4 FIX: Restricciones y Recomendaciones con IA */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-black text-amber-800 uppercase">Restricciones M�dicas</h3>
              {onGenerateRestrictions && (
                <button type="button" onClick={onGenerateRestrictions} disabled={isGeneratingRestr}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg">
                  {isGeneratingRestr ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Generar con IA
                </button>
              )}
            </div>
            <textarea rows={3} className="w-full text-xs p-2 border border-amber-300 rounded-lg"
              placeholder="Restricciones m�dicas del paciente..."
              value={data.restricciones || data.restriccionesTexto || ''}
              onChange={(e) => setData((p) => ({ ...p, restricciones: e.target.value, restriccionesTexto: e.target.value }))}
            />
          </div>
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mt-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-black text-teal-800 uppercase">Recomendaciones M�dicas</h3>
              {onGenerateRecommendations && (
                <button type="button" onClick={onGenerateRecommendations} disabled={isGeneratingReco}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-lg">
                  {isGeneratingReco ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Generar con IA
                </button>
              )}
            </div>
            <textarea rows={3} className="w-full text-xs p-2 border border-teal-300 rounded-lg"
              placeholder="Recomendaciones m�dicas..."
              value={data.recomendaciones || data.recomendacionesTexto || ''}
              onChange={(e) => setData((p) => ({ ...p, recomendaciones: e.target.value, recomendacionesTexto: e.target.value }))}
            />
          </div>
        </div>

        {/* ── Firma y Verificación ──────────────────────────────── */}
        <div className={`mt-6 px-4 print-break-avoid transition-all ${
          data.estadoHistoria === 'Cerrada' ? 'block' : 'hidden print:block'
        }`}>
          <div className="border-t-2 border-gray-300 pt-4">
            <div className="flex justify-between items-end">
              <div className="text-center w-1/3">
                <div className="border-t border-gray-800 pt-1">
                  <p className="text-[10px] font-bold text-gray-700">Firma del Paciente / Responsable</p>
                  <p className="text-[9px] text-gray-400 mt-1">{data.nombres || ''}</p>
                </div>
              </div>
              <div className="text-center w-1/3" />
              <div className="text-center w-1/3">
                <DoctorSignature signature={activeSignature} data={activeDoctorData} showData={true} />
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      {/* Datalists */}
      <datalist id="eps-list-gen">
        {EPS_LIST.map((o) => <option key={o} value={o} />)}
      </datalist>
    </div>
  );
};

export default GeneralHC;
