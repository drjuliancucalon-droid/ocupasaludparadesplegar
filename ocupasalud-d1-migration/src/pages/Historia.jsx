// ═══════════════════════════════════════════════════════════════════════════
// Historia.jsx — Coordinador de página Historia Clínica
// Tabs: Ocupacional, General, Fórmula, Derivación, Solicitud Exámenes, Incapacidad
// Res. 1843/2025 · Res. 2346/2007 · Res. 1995/1999
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText, Search, Plus, User, ClipboardList, Stethoscope,
  Pill, ArrowRightLeft, History, X, Printer, Save, Sparkles,
  Loader2, TestTube, Calendar
} from 'lucide-react';
import { OccupationalHC } from '../modules/clinical/components/OccupationalHC';
import { GeneralHC } from '../modules/clinical/components/GeneralHC';
import { CertificateView } from '../modules/clinical/components/CertificateView';

// ── Tabs definition ────────────────────────────────────────────────────────
const TABS = [
  { id: 'ocupacional', label: 'HC Ocupacional', icon: ClipboardList, color: 'emerald' },
  { id: 'general', label: 'HC General', icon: Stethoscope, color: 'blue' },
  { id: 'certificado', label: 'Certificado', icon: FileText, color: 'gray' },
  { id: 'formula', label: 'Fórmula Médica', icon: Pill, color: 'purple' },
  { id: 'derivacion', label: 'Derivación', icon: ArrowRightLeft, color: 'amber' },
  { id: 'solicitud', label: 'Solicitud Exámenes', icon: TestTube, color: 'teal' },
  { id: 'incapacidad', label: 'Incapacidad', icon: Calendar, color: 'red' },
];

/**
 * Historia — Page coordinator for all clinical record types.
 *
 * Props:
 *   currentUser, patientsList, companies, data, onDataChange (or setData),
 *   onNewPatient, onSelectPatient, onSave, onPrint, onShowHistory,
 *   onGenerateAI, saveStatus, isGenerating, activeDoctorData, activeSignature,
 *   aiConfig, onOpenConsent, onOpenRecommendations, onOpenRestrictions,
 *   handleChange, handleCompanySelect, handleNameChange,
 *   patientSuggestions, selectPatientSuggestion, historyNotification,
 *   isGeneratingReco, isGeneratingRestr,
 *   showConsentModal, setShowConsentModal,
 *   showRecomendacionesPanel, setShowRecomendacionesPanel,
 *   showRestriccionesPanel, setShowRestriccionesPanel,
 *   FormulaComponent, DerivacionComponent, SolicitudComponent, IncapacidadComponent,
 *   onDownloadRDA, onPrintCarnet,
 */
export default function Historia({
  currentUser,
  patientsList = [],
  companies = [],
  activeTab: externalActiveTab,
  onTabChange: externalOnTabChange,
  // Data
  data,
  onDataChange,
  setData: externalSetData,
  // Doctor
  activeDoctorData,
  activeSignature,
  aiConfig,
  // Patient actions
  onNewPatient,
  onSelectPatient,
  // HC actions
  onSave,
  onPrint,
  onShowHistory,
  onGenerateAI,
  onOpenConsent,
  onOpenRecommendations,
  onOpenRestrictions,
  onDownloadRDA,
  onPrintCarnet,
  // Handlers from parent
  handleChange,
  handleCompanySelect,
  handleNameChange,
  // Search & suggestions
  patientSuggestions = [],
  selectPatientSuggestion,
  historyNotification,
  // Status
  saveStatus = '',
  isGenerating = false,
  isGeneratingReco = false,
  isGeneratingRestr = false,
  // Modals
  showConsentModal,
  setShowConsentModal,
  showRecomendacionesPanel,
  setShowRecomendacionesPanel,
  showRestriccionesPanel,
  setShowRestriccionesPanel,
  // Optional slot components for formula, derivación, solicitud, incapacidad
  FormulaComponent,
  DerivacionComponent,
  SolicitudComponent,
  IncapacidadComponent,
}) {
  // ── Local state ─────────────────────────────────────────────────────────
  const [internalActiveTab, setInternalActiveTab] = useState('ocupacional');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = externalOnTabChange || setInternalActiveTab;
  const setData = externalSetData || onDataChange;

  // ── Patient search ──────────────────────────────────────────────────────
  const filteredPatients = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return patientsList
      .filter((p) =>
        (p.nombres || '').toLowerCase().includes(q) ||
        (p.docNumero || '').includes(q) ||
        (p.apellidos || '').toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [search, patientsList]);

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <FileText className="w-7 h-7 text-emerald-500" />
            Historia Clínica
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Res. 1843/2025 · Res. 2346/2007 · Res. 1995/1999
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Buscar Paciente
          </button>
          <button
            onClick={onNewPatient}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Paciente
          </button>
        </div>
      </div>

      {/* ── Patient search panel ─────────────────────────────────── */}
      {showSearch && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o documento..."
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          {filteredPatients.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
              {filteredPatients.map((p, i) => (
                <button
                  key={p.id || i}
                  onClick={() => {
                    onSelectPatient?.(p);
                    setShowSearch(false);
                    setSearch('');
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors flex items-center gap-3"
                >
                  <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{p.nombres} {p.apellidos || ''}</p>
                    <p className="text-xs text-gray-500">{p.docTipo} {p.docNumero} — {p.empresa || p.cargo || 'Sin empresa'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {search.trim() && filteredPatients.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No se encontraron pacientes</p>
          )}
        </div>
      )}

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? `bg-${tab.color}-600 text-white shadow-sm`
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Patient status bar ───────────────────────────────────── */}
      {data?.nombres ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-${currentTab.color}-100 flex items-center justify-center`}>
                <User className={`w-5 h-5 text-${currentTab.color}-600`} />
              </div>
              <div>
                <p className="font-bold text-gray-800">{data.nombres} {data.apellidos || ''}</p>
                <p className="text-xs text-gray-500">
                  {data.docTipo} {data.docNumero} · {data.cargo || ''} · {data.empresaNombre || data.empresa || ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  saveStatus === 'ok' ? 'bg-green-100 text-green-700' :
                  saveStatus === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {saveStatus === 'ok' ? '✓ Guardado' : saveStatus === 'error' ? '✗ Error' : 'Guardando...'}
                </span>
              )}
              {onShowHistory && (
                <button
                  onClick={onShowHistory}
                  className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 text-gray-700"
                >
                  <History className="w-3.5 h-3.5" />
                  Historial
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className={`w-16 h-16 rounded-2xl bg-${currentTab.color}-50 flex items-center justify-center mx-auto mb-4`}>
            <currentTab.icon className={`w-8 h-8 text-${currentTab.color}-400`} />
          </div>
          <h3 className="text-lg font-bold text-gray-700">{currentTab.label}</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            {activeTab === 'ocupacional' && 'Seleccione un paciente existente o cree uno nuevo para iniciar la historia clínica ocupacional.'}
            {activeTab === 'general' && 'Registre consultas de medicina general con su formulario completo.'}
            {activeTab === 'certificado' && 'Visualice e imprima el certificado de aptitud laboral del paciente activo.'}
            {activeTab === 'formula' && 'Genere fórmulas médicas con medicamentos del catálogo INVIMA.'}
            {activeTab === 'derivacion' && 'Cree órdenes de derivación a especialistas o interconsultas.'}
            {activeTab === 'solicitud' && 'Solicite exámenes de laboratorio y paraclínicos complementarios.'}
            {activeTab === 'incapacidad' && 'Genere incapacidades temporales según normatividad vigente.'}
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={() => setShowSearch(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Buscar Paciente
            </button>
            <button
              onClick={onNewPatient}
              className={`px-4 py-2 bg-${currentTab.color}-600 text-white rounded-xl text-sm font-bold hover:bg-${currentTab.color}-700 flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              Nuevo
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT                                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {data?.nombres && (
        <>
          {/* ── HC Ocupacional ──────────────────────────────────── */}
          {activeTab === 'ocupacional' && (
            <OccupationalHC
              data={data}
              setData={setData}
              companies={companies}
              currentUser={currentUser}
              aiConfig={aiConfig}
              activeDoctorData={activeDoctorData}
              activeSignature={activeSignature}
              onGenerateAI={onGenerateAI}
              onOpenConsent={onOpenConsent}
              onOpenHistory={onShowHistory}
              onOpenRecommendations={onOpenRecommendations}
              onOpenRestrictions={onOpenRestrictions}
              handleChange={handleChange}
              handleCompanySelect={handleCompanySelect}
              handleNameChange={handleNameChange}
              patientSuggestions={patientSuggestions}
              selectPatientSuggestion={selectPatientSuggestion}
              historyNotification={historyNotification}
              isGenerating={isGenerating}
              isGeneratingReco={isGeneratingReco}
              isGeneratingRestr={isGeneratingRestr}
              showConsentModal={showConsentModal}
              setShowConsentModal={setShowConsentModal}
              showRecomendacionesPanel={showRecomendacionesPanel}
              setShowRecomendacionesPanel={setShowRecomendacionesPanel}
              showRestriccionesPanel={showRestriccionesPanel}
              setShowRestriccionesPanel={setShowRestriccionesPanel}
            />
          )}

          {/* ── HC General ─────────────────────────────────────── */}
          {activeTab === 'general' && (
            <GeneralHC
              data={data}
              setData={setData}
              activeDoctorData={activeDoctorData}
              activeSignature={activeSignature}
              patientsList={patientsList}
              currentUser={currentUser}
              onGenerateAI={onGenerateAI}
              isGenerating={isGenerating}
              historyNotification={historyNotification}
            />
          )}

          {/* ── Certificado ────────────────────────────────────── */}
          {activeTab === 'certificado' && (
            <CertificateView
              data={data}
              activeDoctorData={activeDoctorData}
              activeSignature={activeSignature}
              currentUser={currentUser}
              onDownloadRDA={onDownloadRDA}
              onPrintCarnet={onPrintCarnet}
            />
          )}

          {/* ── Fórmula Médica ─────────────────────────────────── */}
          {activeTab === 'formula' && (
            FormulaComponent ? (
              <FormulaComponent data={data} setData={setData} currentUser={currentUser}
                activeDoctorData={activeDoctorData} />
            ) : (
              <PlaceholderTab label="Fórmula Médica" description="Componente de prescripción médica — se inyecta desde el módulo clinical" />
            )
          )}

          {/* ── Derivación ─────────────────────────────────────── */}
          {activeTab === 'derivacion' && (
            DerivacionComponent ? (
              <DerivacionComponent data={data} setData={setData} currentUser={currentUser}
                activeDoctorData={activeDoctorData} />
            ) : (
              <PlaceholderTab label="Derivación" description="Componente de órdenes de derivación — se inyecta desde el módulo clinical" />
            )
          )}

          {/* ── Solicitud de Exámenes ──────────────────────────── */}
          {activeTab === 'solicitud' && (
            SolicitudComponent ? (
              <SolicitudComponent data={data} setData={setData} currentUser={currentUser}
                activeDoctorData={activeDoctorData} />
            ) : (
              <PlaceholderTab label="Solicitud de Exámenes" description="Componente de solicitud de paraclínicos — se inyecta desde el módulo clinical" />
            )
          )}

          {/* ── Incapacidad General ────────────────────────────── */}
          {activeTab === 'incapacidad' && (
            IncapacidadComponent ? (
              <IncapacidadComponent data={data} setData={setData} currentUser={currentUser}
                activeDoctorData={activeDoctorData} />
            ) : (
              <PlaceholderTab label="Incapacidad General" description="Componente de incapacidad temporal — se inyecta desde el módulo clinical" />
            )
          )}

          {/* ── Action bar (Save / Print / AI) ─────────────────── */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100 no-print">
            <div className="flex items-center gap-2">
              {saveStatus && (
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                  saveStatus === 'ok' ? 'bg-emerald-100 text-emerald-700' :
                  saveStatus === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {saveStatus === 'ok' ? '✓ Guardado exitosamente' :
                   saveStatus === 'error' ? '✗ Error al guardar' : '⏳ Guardando...'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onGenerateAI && (activeTab === 'ocupacional' || activeTab === 'general') && (
                <button
                  onClick={onGenerateAI}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isGenerating
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Sparkles className="w-4 h-4" />
                  }
                  Análisis IA
                </button>
              )}
              {onPrint && (
                <button
                  onClick={onPrint}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
              )}
              {onSave && (
                <button
                  onClick={onSave}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Placeholder for unimplemented tabs ─────────────────────────────────────
function PlaceholderTab({ label, description }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
      <p className="text-lg font-bold text-gray-400 mb-2">📋 {label}</p>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}
