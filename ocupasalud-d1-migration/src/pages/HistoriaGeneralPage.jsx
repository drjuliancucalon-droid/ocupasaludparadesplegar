// src/pages/HistoriaGeneralPage.jsx — HC General (reconstrucción desde ocupasalud)
// REGLA: CERO React.lazy() para tabs internos.
import React, { useReducer, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAIStore } from '../stores/aiStore';
import { useBackendData, useBackendObject } from '../hooks/useBackendData';
import { useSaveData } from '../hooks/useSaveData';
import { printHC } from '../lib/printService';
import { initialGeneralPatientState } from '../shared/data/initialStates';
import {
  ArrowLeft, Save, Printer, Loader2, CheckCircle, AlertTriangle,
  FileText, Pill, GitBranch, TestTube, Paperclip, Hospital, Sparkles, ClipboardList, Settings, Lock
} from 'lucide-react';

// ═══ STATIC IMPORTS ═══
import { GeneralHC } from '../modules/clinical/components/GeneralHC';
import TabFormulaDerivacion from '../components/forms/TabFormulaDerivacion';
import { ExamRequestTab } from '../modules/clinical/components/ExamRequestTab';
import { AttachmentsTab } from '../modules/clinical/components/AttachmentsTab';
import { DisabilityTab } from '../modules/clinical/components/DisabilityTab';
import { EvolucionModal } from '../modules/clinical/components/EvolucionModal';
import { AIConfigPanel } from '../modules/ai/components/AIConfigPanel';

// Error boundary
class HCErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(e) { console.error('HC General Error:', e.message, e.stack); }
  render() {
    if (this.state.error) return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-4">
        <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
        <h3 className="font-bold text-red-800 text-sm">Error en este módulo</h3>
        <p className="text-xs text-red-600 mt-1 font-mono">{this.state.error.message}</p>
        <button onClick={() => this.setState({ error: null })} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">Reintentar</button>
      </div>
    );
    return this.props.children;
  }
}

const TABS = [
  { id: 'form', label: 'HC General', icon: FileText, color: 'blue' },
  { id: 'formulaTab', label: 'Fórmula', icon: Pill, color: 'purple' },
  { id: 'derivacionTab', label: 'Derivación', icon: GitBranch, color: 'indigo' },
  { id: 'examenes', label: 'Exámenes', icon: TestTube, color: 'teal' },
  { id: 'adjuntos', label: 'Adjuntos', icon: Paperclip, color: 'orange' },
  { id: 'incapacidad', label: 'Incapacidad', icon: Hospital, color: 'red' },
  { id: 'evolucion', label: 'Evolución', icon: ClipboardList, color: 'violet' },
];

function hcReducer(state, action) {
  if (typeof action === 'function') return action(state);
  return { ...state, ...action };
}

export default function HistoriaGeneralPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore.getState().currentUser;
  const aiConfig = useMemo(() => useAIStore.getState().getConfig(), []);
  const { data: patients } = useBackendData('/data/patients', 'siso_db_patients', 'patients');
  const { data: doctor } = useBackendObject('/data/doctor', 'siso_doctor_data', 'doctor');

  // ═══ State (declarations EARLY) ═══
  const activeDoctorData = useMemo(() => doctor || {
    nombre: currentUser?.nombre || 'Médico', titulo: 'Medicina General',
    licencia: '--', cedula: '--', ciudad: '', celular: ''
  }, [doctor, currentUser]);

  const { save, saving, lastSaveStatus } = useSaveData();

  const [data, dispatch] = useReducer(hcReducer, {
    ...initialGeneralPatientState,
    tipoHistoria: 'general',
    fechaExamen: new Date().toISOString().split('T')[0],
  });
  const setData = useCallback((updates) => dispatch(updates), []);
  const [activeTab, setActiveTab] = useState('form');

  // ═══ Dirty tracking ═══
  const [isDirty, setIsDirty] = useState(false);
  const prevDataRef = useRef(JSON.stringify(data));
  useEffect(() => {
    const current = JSON.stringify(data);
    if (current !== prevDataRef.current) { setIsDirty(true); prevDataRef.current = current; }
  }, [data]);

  // ═══ Save ═══
  const handleSave = useCallback(async () => {
    const userId = currentUser?.user || 'drcucalon';
    const toSave = { ...data, medicoId: userId, fechaModificacion: new Date().toISOString() };
    if (!toSave.id) { toSave.id = `hcg_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; toSave.fechaCreacion = new Date().toISOString(); }
    const result = await save('/write/hc/save', toSave, `siso_patients_${userId}`);
    setIsDirty(false);
    if (result.ok) alert('✅ HC General guardada'); else alert('❌ Error al guardar');
  }, [data, save, currentUser]);

  // ═══ AI ═══
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingRestr, setIsGeneratingRestr] = useState(false);
  const [isGeneratingReco, setIsGeneratingReco] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);

  const onGenerateAI = useCallback(async () => {
    setIsGenerating(true);
    try {
      const { analyzeGeneralHC } = await import('../modules/ai/services/aiAnalysis');
      const result = await analyzeGeneralHC(data, aiConfig);
      try {
        const { parseAIJSON } = await import('../shared/lib/aiProviders');
        const parsed = parseAIJSON(result);
        dispatch({
          analisis: parsed.analisis || parsed.resumen || result,
          ...(parsed.diagnosticos && { diagnosticos: parsed.diagnosticos }),
          ...(parsed.planManejo && { planManejo: parsed.planManejo }),
          ...(parsed.recomendaciones && { recomendaciones: parsed.recomendaciones }),
        });
      } catch { dispatch({ analisis: result }); }
    } catch (e) { alert('Error IA: ' + e.message); }
    finally { setIsGenerating(false); }
  }, [data, aiConfig]);

  const onGenerateRestrictions = useCallback(async () => {
    setIsGeneratingRestr(true);
    try {
      const { generateRestrictions } = await import('../modules/ai/services/aiAnalysis');
      dispatch({ restriccionesTexto: await generateRestrictions(data, aiConfig) });
      alert('✅ Restricciones generadas por IA.');
    } catch (e) { alert('Error IA: ' + e.message); }
    finally { setIsGeneratingRestr(false); }
  }, [data, aiConfig]);

  const onGenerateRecommendations = useCallback(async () => {
    setIsGeneratingReco(true);
    try {
      const { generateRecommendations } = await import('../modules/ai/services/aiAnalysis');
      dispatch({ recomendacionesTexto: await generateRecommendations(data, aiConfig) });
      alert('✅ Recomendaciones generadas por IA.');
    } catch (e) { alert('Error IA: ' + e.message); }
    finally { setIsGeneratingReco(false); }
  }, [data, aiConfig]);

  // ═══ RENDER ═══
  return (
    <div className="p-4 max-w-7xl mx-auto">

      {/* --- VOLVER A PACIENTES --- */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/patients')} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a Pacientes
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
            {TABS.map((tab) => (
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
          {/* AI Group — paridad con HistoriaPage (ocupacional) */}
          <div className="flex bg-indigo-50/50 rounded-xl p-1 border border-indigo-100 hidden sm:flex">
            <button onClick={onGenerateAI} disabled={isGenerating} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-white rounded-lg transition-colors">
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} IA General
            </button>
            <button onClick={onGenerateRestrictions} disabled={isGeneratingRestr} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-white rounded-lg transition-colors">
              {isGeneratingRestr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} IA Restr
            </button>
            <button onClick={onGenerateRecommendations} disabled={isGeneratingReco} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-teal-700 hover:bg-white rounded-lg transition-colors">
              {isGeneratingReco ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} IA Reco
            </button>
            <button onClick={() => setShowAIConfig(true)} className="flex items-center justify-center w-8 h-8 text-gray-500 hover:bg-white hover:text-gray-800 rounded-lg transition-colors" title="Configuración IA">
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

          <button onClick={() => printHC(data, activeDoctorData)} className="flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase tracking-wider font-black text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm">
            <Printer className="w-3.5 h-3.5 text-gray-500" /> Imprimir
          </button>
        </div>
      </div>

      {/* --- TAB CONTENT --- */}
      <HCErrorBoundary>
        {activeTab === 'form' && (
          <GeneralHC data={data} setData={setData} activeDoctorData={activeDoctorData} activeSignature={null}
            patientsList={patients} currentUser={currentUser} onGenerateAI={onGenerateAI}
            onGenerateRestrictions={onGenerateRestrictions} onGenerateRecommendations={onGenerateRecommendations}
            isGenerating={isGenerating} isGeneratingRestr={isGeneratingRestr} isGeneratingReco={isGeneratingReco}
            historyNotification={null} />
        )}
        {activeTab === 'formulaTab' && (
          <TabFormulaDerivacion data={data} setData={setData} activeDoctorData={activeDoctorData} activeSignature={null} forceTab="formula" currentUser={currentUser} companies={[]} />
        )}
        {activeTab === 'derivacionTab' && (
          <TabFormulaDerivacion data={data} setData={setData} activeDoctorData={activeDoctorData} activeSignature={null} forceTab="derivacion" currentUser={currentUser} companies={[]} />
        )}
        {activeTab === 'examenes' && <ExamRequestTab patientData={data} doctorData={activeDoctorData} />}
        {activeTab === 'adjuntos' && <AttachmentsTab patientId={data.docNumero} />}
        {activeTab === 'incapacidad' && <DisabilityTab patientData={data} doctorData={activeDoctorData} />}
        {activeTab === 'evolucion' && <EvolucionModal patientId={data.docNumero || data.id} patientName={data.nombres} doctorData={activeDoctorData} onClose={() => setActiveTab('form')} />}
      </HCErrorBoundary>

      {/* AI Config Modal */}
      {showAIConfig && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAIConfig(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <AIConfigPanel aiConfig={aiConfig}
              onSave={(cfg) => { const s = useAIStore.getState(); if (cfg.activeProvider) s.setActiveProvider(cfg.activeProvider); if (cfg.keys) Object.entries(cfg.keys).forEach(([p,k]) => s.setKey(p,k)); setShowAIConfig(false); }}
              onClose={() => setShowAIConfig(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
