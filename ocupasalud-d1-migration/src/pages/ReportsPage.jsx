// src/pages/ReportsPage.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// REPORTES — Wrapper que conecta con hooks de data fetching
// FIX: Ahora carga datos desde Supabase usando useBackendData
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useAIStore } from '../stores/aiStore';
import { useBackendData } from '../hooks/useBackendData';
import { callAIWithFailover, analyzeEpidemiologicalData } from '../modules/ai/services/aiAnalysis';
import Reporte from './Reporte';

export default function ReportsPage() {
  const { currentUser } = useAuthStore();
  const { activeProvider, keys: aiKeys } = useAIStore();
  const aiConfigFromStore = useMemo(() => ({ activeProvider, keys: aiKeys }), [activeProvider, aiKeys]);

  // ═══ CARGAR DATOS DESDE SUPABASE / localStorage ═══
  const { data: patientsList } = useBackendData(
    '/data/patients',
    'siso_db_patients',
    'patients'
  );

  const { data: companies } = useBackendData(
    '/data/companies',
    'siso_companies',
    'companies'
  );

  // ═══ Cargar usersList para secretaria gate y filtro médico ═══
  const { data: usersList } = useBackendData(
    '/data/users',
    'siso_users',
    'users'
  );

  // ═══ ESTADO LOCAL PARA FILTROS Y REPORTES ═══
  const [selectedCompanyReport, setSelectedCompanyReport] = useState('');
  const [reporteActiveTab, setReporteActiveTab] = useState('estadisticas');
  const [certSelected, setCertSelected] = useState({});
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportAIResult, setReportAIResult] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [precioPorPaciente, setPrecioPorPaciente] = useState('');
  const [selectedMedicoReport, setSelectedMedicoReport] = useState('');
  const [showExportTable, setShowExportTable] = useState(false);

  // ═══ HELPERS ═══
  const showAlert = useCallback((msg) => {
    alert(msg);
  }, []);

  const showConfirm = useCallback((msg) => {
    return window.confirm(msg);
  }, []);

  // ═══ CONFIG AI — usa useAIStore para soporte multi-proveedor ═══
  const aiConfig = aiConfigFromStore;

  // ═══ CALLBACK AI — usa callAIWithFailover (gemini/groq/together/openrouter) ═══
  const callAI = useCallback(async (prompt) => {
    return await callAIWithFailover(prompt, null, aiConfigFromStore);
  }, [aiConfigFromStore]);

  // ═══ GENERATE AI REPORT — conecta analyzeEpidemiologicalData con la UI ═══
  const generateAIReport = useCallback(async (stats, total, compName) => {
    setIsGeneratingReport(true);
    setReportAIResult(null);
    try {
      const result = await analyzeEpidemiologicalData(stats, total, compName, aiConfigFromStore);
      setReportAIResult(result);
    } catch (err) {
      showAlert('Error generando análisis IA: ' + (err?.message || 'Intente de nuevo'));
    } finally {
      setIsGeneratingReport(false);
    }
  }, [aiConfigFromStore, showAlert]);

  // ═══ PASAR TODOS LOS PROPS AL COMPONENTE REPORTE ═══
  return (
    <Reporte
      patientsList={patientsList || []}
      companies={companies || []}
      currentUser={currentUser}
      aiConfig={aiConfig}
      savedReports={[]}
      goTo={() => {}}
      selectedCompanyReport={selectedCompanyReport}
      setSelectedCompanyReport={setSelectedCompanyReport}
      reporteActiveTab={reporteActiveTab}
      setReporteActiveTab={setReporteActiveTab}
      certSelected={certSelected}
      setCertSelected={setCertSelected}
      reportStartDate={reportStartDate}
      setReportStartDate={setReportStartDate}
      reportEndDate={reportEndDate}
      setReportEndDate={setReportEndDate}
      reportAIResult={reportAIResult}
      setReportAIResult={setReportAIResult}
      isGeneratingReport={isGeneratingReport}
      setIsGeneratingReport={setIsGeneratingReport}
      showExportTable={showExportTable}
      setShowExportTable={setShowExportTable}
      precioPorPaciente={precioPorPaciente}
      setPrecioPorPaciente={setPrecioPorPaciente}
      selectedMedicoReport={selectedMedicoReport}
      setSelectedMedicoReport={setSelectedMedicoReport}
      generateAIReport={generateAIReport}
      callAI={callAI}
      showAlert={showAlert}
      showConfirm={showConfirm}
      usersList={usersList || []}
    />
  );
}
