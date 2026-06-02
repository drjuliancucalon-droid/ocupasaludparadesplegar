// src/pages/HistoriaPage.jsx — HC Ocupacional (reconstrucción desde ocupasalud)
// REGLA: CERO React.lazy() para tabs internos. Todo estático.
import React, { useReducer, useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAIStore } from '../stores/aiStore';
import { useBackendData, useBackendObject } from '../hooks/useBackendData';
import { useSaveData } from '../hooks/useSaveData';
import { printHC, generateHCPrintHTML, openPrintWindow, _printHCClean, PrintStyles, printSection } from '../lib/printService';
import { initialOccupPatientState } from '../shared/data/initialStates';
import { _sha256 } from '../shared/lib/crypto';
import { _generarCertificadoHTMLNormalizado } from '../shared/lib/printUtils';

// Lucide icons — imported ONCE at page level
import {
  ArrowLeft, Save, Printer, Loader2, CheckCircle, AlertTriangle,
  Stethoscope, FileText, Pill, GitBranch, TestTube, Paperclip,
  Hospital, Sparkles, Database, Heart, Lock, ClipboardList,
  Download, Settings, X
} from 'lucide-react';

// ═══ STATIC IMPORTS — NO React.lazy() ═══
// Each component is bundled with this page chunk
import OccupationalHC from '../modules/clinical/components/OccupationalHC';
import { CertificateView } from '../modules/clinical/components/CertificateView';
import TabFormulaDerivacion from '../components/forms/TabFormulaDerivacion';
import { ExamRequestTab } from '../modules/clinical/components/ExamRequestTab';
import { AttachmentsTab } from '../modules/clinical/components/AttachmentsTab';
import { DisabilityTab } from '../modules/clinical/components/DisabilityTab';
import { EvolucionModal } from '../modules/clinical/components/EvolucionModal';
import { AIConfigPanel } from '../modules/ai/components/AIConfigPanel';
import RestriccionesChecklistPanel from '../components/panels/RestriccionesChecklistPanel';
import RecomendacionesChecklistPanel from '../components/panels/RecomendacionesChecklistPanel';
import ConsentimientoModal from '../components/modals/ConsentimientoModal';

// ═══ Error Boundary ═══
class HCErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(e) { console.error('HC Error:', e.message, e.stack); }
  render() {
    if (this.state.error) return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-4">
        <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
        <h3 className="font-bold text-red-800 text-sm">Error en este módulo</h3>
        <p className="text-xs text-red-600 mt-1 font-mono">{this.state.error.message}</p>
        <button onClick={() => this.setState({ error: null })} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">Reintentar</button>
      </div>
    );
    return this.props.children;
  }
}

// ═══ Tabs definition (matches ocupasalud) ═══
const HC_TABS = [
  { id: 'form', label: 'HC', icon: Stethoscope, color: 'emerald' },
  { id: 'certificado', label: 'Certificado', icon: FileText, color: 'blue' },
  { id: 'formulaTab', label: 'Fórmula', icon: Pill, color: 'purple' },
  { id: 'derivacionTab', label: 'Derivación', icon: GitBranch, color: 'indigo' },
  { id: 'solicitudExamenes', label: 'Exámenes', icon: TestTube, color: 'teal' },
  { id: 'adjuntos', label: 'Adjuntos', icon: Paperclip, color: 'orange' },
  { id: 'incapacidad', label: 'Incapacidad', icon: Hospital, color: 'red' },
  { id: 'evolucion', label: 'Evolución', icon: ClipboardList, color: 'violet' },
];

function hcReducer(state, action) {
  if (typeof action === 'function') return action(state);
  return { ...state, ...action };
}

export default function HistoriaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore.getState().currentUser;
  const aiConfig = useMemo(() => useAIStore.getState().getConfig(), []);
  const { data: patients } = useBackendData('/data/patients', 'siso_db_patients', 'patients');
  const { data: companies } = useBackendData('/data/companies', 'siso_companies', 'companies');
  const { data: doctor } = useBackendObject('/data/doctor', 'siso_doctor_data', 'doctor');

  // ═══ State ═══
  const [data, dispatch] = useReducer(hcReducer, {
    ...initialOccupPatientState,
    tipoHistoria: 'ocupacional',
    fechaExamen: new Date().toISOString().split('T')[0],
  });
  const setData = useCallback((updates) => dispatch(updates), []);
  const [activeTab, setActiveTab] = useState('form');

  // Doctor data (declared EARLY to avoid TDZ)
  const activeDoctorData = useMemo(() => doctor || {
    nombre: currentUser?.nombre || 'Médico',
    titulo: 'Especialista SST',
    licencia: '--', cedula: '--', ciudad: '', celular: ''
  }, [doctor, currentUser]);

  // Save hook (declared EARLY)
  const { save, saving, lastSaveStatus } = useSaveData();

  // ═══ Load patient ═══
  const loaded = useRef(false);
  useEffect(() => {
    if (id && patients.length > 0 && !loaded.current) {
      const p = patients.find((x) => x.docNumero === id || x.id === id);
      if (p) { dispatch(p); loaded.current = true; }
    }
  }, [id, patients.length]);

  // ═══ Dirty tracking + Auto-save ═══
  const [isDirty, setIsDirty] = useState(false);
  const prevDataRef = useRef(JSON.stringify(data));
  useEffect(() => {
    const current = JSON.stringify(data);
    if (current !== prevDataRef.current) { setIsDirty(true); prevDataRef.current = current; }
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty && data.nombres) {
        const userId = currentUser?.user || 'drcucalon';
        const toSave = { ...data, medicoId: userId, fechaModificacion: new Date().toISOString(), autoSaved: true };
        save('/write/hc/save', toSave, `siso_patients_${userId}`).then((r) => {
          if (r.ok) { setIsDirty(false); }
        }).catch(() => {});
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [isDirty, data, currentUser, save]);

  // ═══ Save ═══
  const handleSave = useCallback(async () => {
    const userId = currentUser?.user || 'drcucalon';
    const isNew = !data.id;
    const toSave = { ...data, medicoId: userId, fechaModificacion: new Date().toISOString() };
    if (!toSave.id) {
      toSave.id = `hc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      toSave.fechaCreacion = new Date().toISOString();
    }
    const result = await save('/write/hc/save', toSave, `siso_patients_${userId}`);
    // Auto-agenda para paciente nuevo
    if (result.ok && isNew && data.nombres) {
      try {
        const company = companies.find(c => c.id === data.empresaId);
        const tarifa = company?.tarifaPeriodico || company?.tarifaConsulta || 35000;
        await save('/write/agenda/add', {
          id: `cita_${Date.now()}`, paciente: data.nombres, docNumero: data.docNumero,
          empresa: company?.nombre || 'Particular', tipo: data.tipoExamen || 'PERIODICO',
          medicoId: userId, fecha: new Date().toISOString().split('T')[0],
          hora: new Date().toTimeString().slice(0, 5), estado: 'atendido', costo: tarifa,
        }, 'siso_agendados');
      } catch {}
    }
    setIsDirty(false);
    if (result.ok) alert('✅ HC guardada'); else alert('❌ Error al guardar');
  }, [data, save, currentUser, companies]);

  // ═══ AI ═══
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingRestr, setIsGeneratingRestr] = useState(false);
  const [isGeneratingReco, setIsGeneratingReco] = useState(false);

  // B-01: onGenerateAI — Análisis IA completo (monolito líneas 14911-15144)
  // analyzeHC() retorna un objeto estructurado (NO string) — auto-aplica 10 campos
  const onGenerateAI = useCallback(async () => {
    // Plan gate (monolito línea 14912)
    const { canUse } = useAuthStore.getState();
    if (!canUse('ia_analisis')) {
      alert('🔒 El análisis IA está disponible en el plan ⭐ Pro ($79.000/mes).\n\nVe a Planes para actualizar.');
      return;
    }
    if (!data.cargo) {
      alert('Ingrese el cargo del trabajador para usar el análisis IA.');
      return;
    }
    setIsGenerating(true);
    try {
      const { analyzeHC } = await import('../modules/ai/services/aiAnalysis');
      // analyzeHC ahora retorna objeto parsed directamente (B-01 reescritura)
      const r = await analyzeHC(data, aiConfig);

      // Aplicar campos principales (monolito líneas 15023-15042)
      dispatch({
        diagnosticoPrincipal: r.diagnosticoPrincipal || data.diagnosticoPrincipal,
        diagnosticoSecundario1: r.diagnosticoSecundario1 || data.diagnosticoSecundario1,
        diagnosticoSecundario2: r.diagnosticoSecundario2 || data.diagnosticoSecundario2,
        conceptoAptitud: r.conceptoAptitud || data.conceptoAptitud,
        vigencia: r.vigencia || data.vigencia,
        recomendaciones: r.recomendaciones || data.recomendaciones,
        analisisRestricciones: r.analisisRestricciones || data.analisisRestricciones,
        analisisIA: r.analisisIA || data.analisisIA,
      });

      // Auto-aplicar derivaciones (monolito líneas 15044-15056)
      if (r.derivaciones?.length > 0) {
        dispatch((prev) => ({
          ...prev,
          derivaciones: [...(prev.derivaciones || []), ...r.derivaciones],
        }));
      }

      // Auto-aplicar exámenes sugeridos — sin duplicados (monolito líneas 15057-15079)
      if (r.examenesSugeridos?.length > 0) {
        dispatch((prev) => {
          const existentes = new Set((prev.solicitudExamenes || []).map((e) => (e.nombre || '').toLowerCase()));
          const nuevos = r.examenesSugeridos
            .filter((n) => !existentes.has(n.toLowerCase()))
            .map((n) => ({
              nombre: n, fecha: new Date().toISOString().split('T')[0],
              urgente: false, incluirEnRecomendaciones: false, _fromAI: true,
            }));
          return { ...prev, solicitudExamenes: [...(prev.solicitudExamenes || []), ...nuevos] };
        });
      }

      // Auto-aplicar incapacidad (monolito líneas 15080-15100)
      if (r.incapacidadSugerida?.aplica && r.incapacidadSugerida.dias > 0) {
        dispatch((prev) => ({
          ...prev,
          incapacidad: {
            ...(prev.incapacidad || {}),
            dias: r.incapacidadSugerida.dias,
            motivo: r.incapacidadSugerida.motivo || prev.incapacidad?.motivo || '',
            diagnosticoCIE: r.incapacidadSugerida.diagnosticoCIE || prev.incapacidad?.diagnosticoCIE || '',
          },
        }));
      }

      // Auto-aplicar SVE recomendado (monolito líneas 15109-15113)
      if (r.sveRecomendado?.length > 0) {
        dispatch((prev) => ({ ...prev, sveRecomendado: r.sveRecomendado }));
      }

      // Mensaje de confirmación detallado (monolito líneas 15115-15136)
      const extras = [
        r.derivaciones?.length > 0 ? `\n• ${r.derivaciones.length} derivación(es) sugerida(s)` : '',
        r.examenesSugeridos?.length > 0 ? `\n• ${r.examenesSugeridos.length} examen(es) sugerido(s)` : '',
        r.incapacidadSugerida?.aplica ? `\n• Incapacidad sugerida: ${r.incapacidadSugerida.dias} días` : '',
        r.analisisIA ? `\n• Análisis clínico generado` : '',
        r.sveRecomendado?.length > 0 ? `\n• ${r.sveRecomendado.length} SVE sugerido(s)` : '',
      ].join('');
      alert(`✅ Análisis IA completado.\n• Diagnóstico principal: Z10.0 - EXAMEN MÉDICO OCUPACIONAL\n• Diagnósticos secundarios incluidos si hay hallazgos.${extras}\n\nRevise y ajuste los campos según su criterio clínico.`);
    } catch (e) {
      alert(`Error IA: ${e.message}\n\nConfigure un proveedor de IA en el botón ⚙️ IA o verifique su conexión.`);
    } finally {
      setIsGenerating(false);
    }
  }, [data, aiConfig]);

  // B-05: onGenerateRestrictions — con maniobras osteomusculares (monolito líneas 15146-15194)
  const onGenerateRestrictions = useCallback(async () => {
    setIsGeneratingRestr(true);
    try {
      const { generateRestrictions } = await import('../modules/ai/services/aiAnalysis');
      const result = await generateRestrictions(data, aiConfig);
      // Guardar en analisisRestricciones (campo correcto del monolito)
      dispatch({ analisisRestricciones: result });
      alert('✅ Restricciones generadas por IA. Seleccione las adicionales en el checklist.');
    } catch (e) { alert('Error IA Restricciones: ' + e.message); }
    finally { setIsGeneratingRestr(false); }
  }, [data, aiConfig]);

  // B-06: onGenerateRecommendations — 4 categorías (monolito líneas 15196-15225)
  const onGenerateRecommendations = useCallback(async () => {
    setIsGeneratingReco(true);
    try {
      const { generateRecommendations } = await import('../modules/ai/services/aiAnalysis');
      const result = await generateRecommendations(data, aiConfig);
      dispatch({ recomendaciones: result });
      alert('✅ Recomendaciones generadas por IA.');
    } catch (e) { alert('Error IA Recomendaciones: ' + e.message); }
    finally { setIsGeneratingReco(false); }
  }, [data, aiConfig]);

  // B-02: handleCloseHC forense completo (monolito líneas 16185-16446)
  // Nota: useBackendData no puede llamarse dentro de callbacks — usamos save() para leer/escribir
  const handleCloseHC = useCallback(async () => {
    // B-02.1: Validación de concepto de aptitud (monolito línea 16186)
    if (!data.conceptoAptitud && (data.tipoHistoria === 'ocupacional' || data.type === 'ocupacional')) {
      alert('Debe generar el concepto de aptitud antes de cerrar. Use el botón IA Resumen o escríbalo manualmente.');
      return;
    }
    if (!window.confirm('¿Cerrar esta Historia Clínica? Una vez cerrada no se puede editar sin código de auditoría.')) return;

    const now = new Date();
    const code = `SISO-${now.toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-8)}-${Math.random().toString(16).slice(2, 18).toUpperCase()}`;
    let hcHash = '';
    try { hcHash = await _sha256(JSON.stringify(data)); } catch { hcHash = 'hash-error'; }

    const userId = currentUser?.user || 'drcucalon';
    const fechaFirma = now.toISOString();
    // Empresa del paciente (declarada aquí para uso en billing + portal)
    const company = companies.find((c) => c.id === data.empresaId || c.nit === data.empresaNit);

    // B-02.2: Objeto firmaDigital completo — Ley 527/1999 (monolito líneas 16200-16218)
    const firmaDigital = {
      hash: hcHash,
      codigoQR: code,
      firmadoPor: activeDoctorData?.nombre || currentUser?.nombre || userId,
      medicoId: userId,
      fechaFirma,
      ley: 'Ley 527/1999 - Decreto 2364/2012',
      verificable: true,
    };

    const closeData = {
      estadoHistoria: 'Cerrada',
      codigoVerificacion: code,
      fechaCierre: now.toISOString(),
      hashHC: hcHash,
      firmaDigital,
    };
    dispatch(closeData);

    // B-02.3: portalData completo ~25 campos (monolito líneas 16235-16280)
    const portalData = {
      // Identificación paciente
      nombres: data.nombres, apellidos: data.apellidos || '',
      docTipo: data.docTipo, docNumero: data.docNumero,
      eps: data.eps || '', edad: data.edad || '',
      empresaNombre: data.empresaNombre || '', empresaNit: data.empresaNit || '',
      arl: data.arl || '', cargo: data.cargo || '',
      tipoExamen: data.tipoExamen, enfasisExamen: data.enfasisExamen || 'GENERAL',
      fechaExamen: data.fechaExamen, vigencia: data.vigencia || '1 año',
      // Concepto
      conceptoAptitud: data.conceptoAptitud,
      codigoVerificacion: code, estadoHistoria: 'Cerrada',
      fechaCierre: now.toISOString().split('T')[0],
      // Diagnósticos (campos correctos del monolito)
      diagnosticoPrincipal: data.diagnosticoPrincipal || '',
      diagnosticoSecundario1: data.diagnosticoSecundario1 || '',
      diagnosticoSecundario2: data.diagnosticoSecundario2 || '',
      // Restricciones y recomendaciones con checklists
      restricciones: data.analisisRestricciones || '',
      restriccionesChecklist: data.restriccionesChecklist || {},
      recomendaciones: data.recomendaciones || '',
      recomendacionesMedicas: data.recomendacionesMedicas || data.recomendaciones || '',
      recomendacionesOcupacionales: data.recomendacionesOcupacionales || '',
      recomendacionesChecklist: data.recomendacionesChecklist || {},
      // Médico firmante completo (para generar PDF en portal)
      medicoNombre: activeDoctorData?.nombre || userId,
      _doctorData: {
        nombre: activeDoctorData?.nombre || 'MÉDICO OCUPACIONAL',
        titulo: activeDoctorData?.titulo || 'Médico Especialista en Salud Ocupacional',
        licencia: activeDoctorData?.licencia || '--',
        ciudad: activeDoctorData?.ciudad || 'Popayán',
        email: activeDoctorData?.email || '',
        cel: activeDoctorData?.cel || activeDoctorData?.celular || '',
      },
      _firma: data._firmaDigital || null,
      hashHC: hcHash,
    };

    // B-02.4: Guardar con 4 claves (monolito líneas 16281-16306)
    try {
      await save('/write/portal/save', portalData, `siso_portal_${code}`);
      if (data.docNumero) await save('/write/portal/save', portalData, `siso_portal_doc_${(data.docNumero || '').replace(/\s/g, '')}`);
      // Clave legacy para compatibilidad
      if (!code.startsWith('CV-')) await save('/write/portal/save', portalData, `siso_portal_CV-${code}`);
      // Índice por NIT de empresa (agrega docNumero al array documentos[])
      if (company?.nit) {
        const nitLimpio = (company.nit || '').replace(/[^0-9]/g, '');
        if (nitLimpio.length >= 3) {
          const existingRaw = localStorage.getItem(`siso_portal_empresa_${nitLimpio}`);
          const existing = existingRaw ? JSON.parse(existingRaw) : { nit: nitLimpio, nombre: company.nombre || '', documentos: [] };
          if (!existing.documentos.includes(data.docNumero)) existing.documentos.push(data.docNumero);
          existing.updatedAt = now.toISOString();
          existing.nombre = company.nombre || existing.nombre;
          await save('/write/portal/empresa', existing, `siso_portal_empresa_${nitLimpio}`);
        }
      }
    } catch (portalErr) { console.warn('[handleCloseHC] portal error:', portalErr); }

    // B-02.5: Auto-sincronización de agenda — marcar como "atendido" (monolito líneas 16307-16328)
    if (data._agendaId) {
      try {
        const horaFin = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        await save('/write/agenda/attended', {
          id: data._agendaId, estado: 'atendido', horaFin, vistoEn: now.toISOString(),
        }, 'siso_agendados');
      } catch {}
    }

    // B-02.6: Registro en atencionesCerradas[] — máx 100 (monolito líneas 16330-16355)
    try {
      const horaFin = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      const nuevaAtencion = {
        id: 'ac_' + Date.now(),
        agendaId: data._agendaId || null,
        pacienteId: data.id || data.docNumero,
        nombre: data.nombres, docNumero: data.docNumero,
        empresa: data.empresaNombre, cargo: data.cargo,
        tipo: data.type || 'ocupacional', tipoConsulta: data.tipoExamen,
        conceptoAptitud: data.conceptoAptitud,
        codigoVerificacion: code,
        medicoId: userId, medicoNombre: activeDoctorData?.nombre || userId,
        fechaAtencion: now.toISOString().split('T')[0],
        horaInicio: data.horaInicio || '',
        horaFin, cerradaEn: now.toISOString(), estadoHistoria: 'Cerrada',
      };
      // Leer lista existente desde localStorage y prepend
      const existing = JSON.parse(localStorage.getItem(`siso_atenciones_${userId}`) || '[]');
      const updAC = [nuevaAtencion, ...existing].slice(0, 100);
      await save('/write/atenciones/save', updAC, `siso_atenciones_${userId}`);
    } catch {}

    // B-02.7: Auto-billing con tarifa por TIPO de examen (monolito líneas 16357-16436)
    try {
      const tipoExam = (data.tipoExamen || '').toUpperCase();
      let tarifa = 0;
      if (company) {
        if (tipoExam.includes('INGRESO')) tarifa = Number(company.tarifaIngreso || 0);
        else if (tipoExam.includes('PERI') || tipoExam.includes('PERIODICO')) tarifa = Number(company.tarifaPeriodico || 0);
        else if (tipoExam.includes('EGRESO') || tipoExam.includes('RETIRO')) tarifa = Number(company.tarifaEgreso || 0);
        else tarifa = Number(company.tarifaConsulta || 0);
      }
      if (!tarifa) tarifa = Number(activeDoctorData?.tarifaExamenOcup || 35000);
      const tipoLabel = tipoExam.includes('INGRESO') ? 'Examen Ingreso'
        : tipoExam.includes('PERI') ? 'Examen Periódico'
        : tipoExam.includes('EGRESO') || tipoExam.includes('RETIRO') ? 'Examen Egreso'
        : tipoExam.includes('GENERAL') ? 'Consulta General' : 'Examen Médico';

      await save('/write/caja/add', {
        id: `mob_${Date.now()}`, tipo: 'ingreso',
        concepto: `${tipoLabel} · ${data.nombres || ''} · ${data.empresaNombre || company?.nombre || 'Particular'}`,
        monto: String(tarifa), formaPago: 'Por cobrar', estado: 'pendiente',
        fecha: now.toISOString().split('T')[0],
        pacienteId: data.id, pacienteNombre: data.nombres, pacienteDoc: data.docNumero,
        tipoConsulta: data.tipoExamen, empresaClienteId: company?.id || '',
        empresaClienteNombre: data.empresaNombre || company?.nombre || 'Particular',
        medicoId: userId, medicoNombre: activeDoctorData?.nombre || userId,
        codigoVerificacion: code, _autoGenerated: true,
      }, `siso_caja_movs_${userId}`);
    } catch (billingErr) { console.warn('[handleCloseHC] billing error:', billingErr); }

    // Guardar HC cerrada con todos los datos
    const toSave = { ...data, ...closeData, medicoId: userId, fechaModificacion: now.toISOString() };
    await save('/write/hc/save', toSave, `siso_patients_${userId}`);
    setIsDirty(false);

    // B-02.8: Mensaje de cierre forense (monolito línea 16437-16443)
    alert(`✅ Historia cerrada y firmada digitalmente.\n📋 Código QR: ${code}\n🔐 Hash integridad: ${hcHash.substring(0, 20)}...\n⚖️ Válido: Ley 527/1999 - Decreto 2364/2012`);
  }, [data, companies, currentUser, activeDoctorData, save]);

  // ═══ RIPS ═══
  const handleRIPS = useCallback(async () => {
    try {
      const { generateRIPSBatch } = await import('../modules/reports/services/ripsService');
      const blob = new Blob([JSON.stringify(generateRIPSBatch([data]), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `RIPS_${data.docNumero || 'pac'}.json` }).click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Error RIPS: ' + e.message); }
  }, [data]);

  // ═══ FHIR ═══
  const handleFHIR = useCallback(async () => {
    try {
      const { generateFHIRBundle } = await import('../modules/reports/services/fhirService');
      const blob = new Blob([JSON.stringify(generateFHIRBundle(data, activeDoctorData), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `FHIR_${data.docNumero || 'pac'}.json` }).click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Error FHIR: ' + e.message); }
  }, [data, activeDoctorData]);

  // ═══ UI state ═══
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showRecomendacionesPanel, setShowRecomendacionesPanel] = useState(false);
  const [showRestriccionesPanel, setShowRestriccionesPanel] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [showEnviarPanel, setShowEnviarPanel] = useState(false);
  const [enviarChecklist, setEnviarChecklist] = useState({
    certificado: true, historia: true, formula: false, derivacion: false, examenes: false,
  });

  // ═══ Enviar multi-doc (F4-F5: combinación con page-break) ═══
  const handleEnviar = useCallback(() => {
    const selected = Object.entries(enviarChecklist).filter(([_, v]) => v).map(([k]) => k);
    if (selected.length === 0) { alert('Selecciona al menos un documento'); return; }

    const sections = [];
    if (enviarChecklist.certificado) {
      try {
        const certHtml = _generarCertificadoHTMLNormalizado(data, activeDoctorData, null, null);
        if (certHtml) sections.push(certHtml);
      } catch { sections.push('<p>Certificado no disponible</p>'); }
    }
    if (enviarChecklist.historia) {
      _printHCClean(data, activeDoctorData, true); // silentMode → window._lastHCCleanBody
      if (typeof window !== 'undefined' && window._lastHCCleanBody) {
        sections.push(window._lastHCCleanBody);
      } else {
        sections.push(generateHCPrintHTML(data, activeDoctorData));
      }
    }
    if (enviarChecklist.formula && (data.formulaMedicamentos || []).length > 0) {
      sections.push('<h2 style="text-align:center;font-weight:900;">Fórmula Médica</h2>' + 
        (data.formulaMedicamentos || []).map(m => `<p>• ${m.nombre || m.medicamento || ''} — ${m.dosis || ''} — ${m.via || 'Oral'} — ${m.frecuencia || ''} — ${m.duracion || ''}</p>`).join(''));
    }
    if (enviarChecklist.derivacion && (data.derivaciones || []).length > 0) {
      sections.push('<h2 style="text-align:center;font-weight:900;">Derivaciones</h2>' +
        (data.derivaciones || []).map(d => `<p>• ${d.especialidad || ''} — ${d.motivo || ''} — Prioridad: ${d.prioridad || 'Normal'}</p>`).join(''));
    }
    if (enviarChecklist.examenes && (data.examenesSolicitados || []).length > 0) {
      sections.push('<h2 style="text-align:center;font-weight:900;">Solicitud de Exámenes</h2>' +
        (data.examenesSolicitados || []).map(e => `<p>• ${e.nombre || e.examen || ''} — ${e.justificacion || ''}</p>`).join(''));
    }

    const combined = sections.join('<div style="page-break-before:always"></div>');
    openPrintWindow(`OcupaSalud — ${data.nombres || 'Paciente'}`, combined);
    setShowEnviarPanel(false);
  }, [data, activeDoctorData, enviarChecklist]);

  // ═══ RENDER ═══
  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Back */}
      
      {/* --- VOLVER A PACIENTES --- */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/patients')} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a Pacientes
        </button>
        <button onClick={() => navigate('/hc/general')} className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-xl transition-all shadow-sm">
          <Stethoscope className="w-4 h-4" /> Ingresar a HC General
        </button>
      </div>

      {/* --- PATIENT HEADER & TABS --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50/50 gap-3">
          <div>
            <h2 className="text-xl font-black text-gray-800">{data.nombres || "Nuevo Paciente"} {data.apellidos || ""}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold px-2 py-0.5 bg-gray-200 text-gray-700 rounded">{data.docTipo || "CC"} {data.docNumero || "---"}</span>
              <span className="text-xs text-gray-500 font-medium">{data.empresaNombre || "Sin empresa"}</span>
            </div>
          </div>
          {data.estadoHistoria === 'Cerrada' && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl">
              <Lock className="w-3.5 h-3.5" /> Cerrada: {data.codigoVerificacion}
            </span>
          )}
        </div>

        {/* Modern Segmented Tabs */}
        <div className="p-3 bg-white">
          <div className="flex gap-1 overflow-x-auto p-1.5 bg-gray-100 rounded-xl" style={{ scrollbarWidth: 'none' }}>
            {HC_TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-5 py-2 text-[11px] uppercase tracking-wider font-black rounded-lg whitespace-nowrap transition-all flex-shrink-0 ${
                  activeTab === tab.id 
                    ? `bg-white text-${tab.color}-700 shadow-sm ring-1 ring-gray-900/5` 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}>
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-' + tab.color + '-600' : 'opacity-50'}`} /> 
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- STICKY ACTION BAR --- */}
      <div className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl p-3 mb-6 shadow-sm print:hidden">
        {/* Left: Primary Actions */}
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-sm transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {data.id ? 'Guardar Cambios' : 'Crear Historia'}
          </button>
          {lastSaveStatus === 'ok' && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> OK</span>}
          {isDirty && <span className="text-[10px] uppercase tracking-wider text-amber-600 font-black flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-lg animate-pulse"><AlertTriangle className="w-3.5 h-3.5" /> Sin guardar</span>}
        </div>

        {/* Right: Secondary Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* AI Group */}
          <div className="flex bg-indigo-50/50 rounded-xl p-1 border border-indigo-100 hidden sm:flex">
            
            <button onClick={onGenerateAI} disabled={isGenerating} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-white rounded-lg transition-colors">
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} IA Resumen
            </button>
            <button onClick={onGenerateRestrictions} disabled={isGeneratingRestr} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-white rounded-lg transition-colors">
              {isGeneratingRestr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} IA Restr
            </button>
            <button onClick={onGenerateRecommendations} disabled={isGeneratingReco} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-teal-700 hover:bg-white rounded-lg transition-colors">
              {isGeneratingReco ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} IA Reco
            </button>
            <button onClick={() => setShowAIConfig(true)} className="flex items-center justify-center w-8 h-8 text-gray-500 hover:bg-white hover:text-gray-800 rounded-lg transition-colors" title="Configuracion IA">
              <Settings className="w-4 h-4" />
            </button>
      
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

          <button onClick={() => printHC(data, activeDoctorData)} className="flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase tracking-wider font-black text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm">
            <Printer className="w-3.5 h-3.5 text-gray-500" /> Imprimir
          </button>
          
          <button onClick={handleRIPS} className="hidden lg:flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase tracking-wider font-black text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm">
            <Database className="w-3.5 h-3.5 text-blue-500" /> RIPS
          </button>
          
          <button onClick={handleFHIR} className="hidden lg:flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase tracking-wider font-black text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm">
            <Heart className="w-3.5 h-3.5 text-red-500" /> FHIR
          </button>
          
          
          <button onClick={handleRIPS} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
            <Database className="w-3.5 h-3.5 text-blue-500" /> RIPS
          </button>
          <button onClick={handleFHIR} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
            <Heart className="w-3.5 h-3.5 text-red-500" /> FHIR
          </button>
          
          <div className="relative">
            <button onClick={() => setShowEnviarPanel(!showEnviarPanel)} className="flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-wider font-black text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors shadow-sm">
              <Download className="w-3.5 h-3.5" /> Descargar Docs
            </button>
            {showEnviarPanel && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-50 w-72 animate-fade-in">
                <p className="text-xs font-black text-gray-800 mb-3 border-b pb-2">Selecciona documentos:</p>
                <div className="space-y-2">
                  {[
                    { key: 'certificado', label: 'Certificado Ocupacional', has: !!data.conceptoAptitud, icon: "??" },
                    { key: 'historia', label: 'Historia Cl�nica Completa', has: true, icon: "??" },
                    { key: 'formula', label: 'F�rmula / Prescripci�n', has: !!(data.formulaMedicamentos?.length), icon: "??" },
                    { key: 'derivacion', label: 'Interconsulta', has: !!(data.derivaciones?.length), icon: "??" },
                    { key: 'examenes', label: 'Solicitud Ex�menes', has: !!(data.examenesSolicitados?.length), icon: "??" },
                  ].map(({ key, label, has, icon }) => (
                    <label key={key} className={`flex items-center gap-3 text-xs p-2 rounded-lg cursor-pointer transition-colors ${has ? 'hover:bg-gray-50' : 'opacity-50 grayscale'}`}>
                      <input type="checkbox" checked={has ? !!enviarChecklist[key] : false} disabled={!has}
                        onChange={(e) => setEnviarChecklist(prev => ({ ...prev, [key]: e.target.checked }))} className="w-4 h-4 accent-blue-600 rounded" />
                      <span className="font-semibold text-gray-700">{icon} {label}</span>
                    </label>
                  ))}
                </div>
                <button onClick={handleEnviar} className="w-full mt-4 px-4 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all active:scale-95 flex justify-center gap-2">
                  <Printer className="w-4 h-4" /> Generar Paquete
                </button>
              </div>
            )}
          </div>
      

          
          <button onClick={handleCloseHC} className="flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase tracking-wider font-black text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-100 rounded-xl transition-all ml-1 shadow-sm">
            <Lock className="w-3.5 h-3.5" /> Cerrar HC
          </button>
      
        </div>
      </div>

      {/* --- TAB CONTENT --- */}

      <HCErrorBoundary>
        {activeTab === 'form' && (
          <OccupationalHC
            data={data} setData={setData} companies={companies} currentUser={currentUser}
            aiConfig={aiConfig} activeDoctorData={activeDoctorData} activeSignature={null}
            onGenerateAI={onGenerateAI} onGenerateRestrictions={onGenerateRestrictions}
            onGenerateRecommendations={onGenerateRecommendations}
            onOpenConsent={() => setShowConsentModal(true)}
            onOpenHistory={() => {}}
            onOpenRecommendations={() => setShowRecomendacionesPanel(true)}
            onOpenRestrictions={() => setShowRestriccionesPanel(true)}
            handleChange={null}
            handleCompanySelect={(e) => {
              const comp = companies.find(c => c.id === e.target.value);
              if (comp) dispatch({ empresaId: comp.id, empresaNombre: comp.nombre, ...(comp.arl && { arl: comp.arl }), ...(comp.claseRiesgo && { nivelRiesgoARL: comp.claseRiesgo }) });
              else dispatch({ empresaId: 'particular', empresaNombre: '' });
            }}
            handleNameChange={null} patientSuggestions={[]} selectPatientSuggestion={() => {}}
            historyNotification={null} isGenerating={isGenerating}
            isGeneratingReco={isGeneratingReco} isGeneratingRestr={isGeneratingRestr}
            showConsentModal={showConsentModal} setShowConsentModal={setShowConsentModal}
            showRecomendacionesPanel={showRecomendacionesPanel} setShowRecomendacionesPanel={setShowRecomendacionesPanel}
            showRestriccionesPanel={showRestriccionesPanel} setShowRestriccionesPanel={setShowRestriccionesPanel}
          />
        )}
        {activeTab === 'certificado' && (
          <CertificateView data={data} activeDoctorData={activeDoctorData} activeSignature={null} currentUser={currentUser} />
        )}
        {activeTab === 'formulaTab' && (
          <TabFormulaDerivacion data={data} setData={setData} activeDoctorData={activeDoctorData} activeSignature={null} forceTab="formula" currentUser={currentUser} companies={companies} />
        )}
        {activeTab === 'derivacionTab' && (
          <TabFormulaDerivacion data={data} setData={setData} activeDoctorData={activeDoctorData} activeSignature={null} forceTab="derivacion" currentUser={currentUser} companies={companies} />
        )}
        {activeTab === 'solicitudExamenes' && (
          <ExamRequestTab patientData={data} doctorData={activeDoctorData} />
        )}
        {activeTab === 'adjuntos' && (
          <AttachmentsTab patientId={data.docNumero} />
        )}
        {activeTab === 'incapacidad' && (
          <DisabilityTab patientData={data} doctorData={activeDoctorData} />
        )}
        {activeTab === 'evolucion' && (
          <EvolucionModal patientId={data.docNumero || data.id} patientName={data.nombres} doctorData={activeDoctorData} onClose={() => setActiveTab('form')} />
        )}
      </HCErrorBoundary>

      {/* ═══ Panels: Restricciones, Recomendaciones, Consentimiento ═══ */}
      {showRestriccionesPanel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowRestriccionesPanel(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <RestriccionesChecklistPanel data={data} setData={setData} onClose={() => setShowRestriccionesPanel(false)} isGenerating={isGeneratingRestr} />
          </div>
        </div>
      )}
      {showRecomendacionesPanel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowRecomendacionesPanel(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <RecomendacionesChecklistPanel data={data} setData={setData} onClose={() => setShowRecomendacionesPanel(false)} isGenerating={isGeneratingReco} />
          </div>
        </div>
      )}
      {showConsentModal && (
        <ConsentimientoModal data={data} estadoCerrada={data.estadoHistoria === 'Cerrada'}
          onCerrar={() => setShowConsentModal(false)}
          onConfirmar={(campos) => { dispatch(campos); setShowConsentModal(false); }} />
      )}

      {/* ═══ AI Config Modal ═══ */}
      {showAIConfig && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAIConfig(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <AIConfigPanel
              aiConfig={aiConfig}
              onSave={(newConfig) => {
                const store = useAIStore.getState();
                if (newConfig.activeProvider) store.setActiveProvider(newConfig.activeProvider);
                if (newConfig.keys) Object.entries(newConfig.keys).forEach(([p, k]) => store.setKey(p, k));
                setShowAIConfig(false);
              }}
              onClose={() => setShowAIConfig(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
