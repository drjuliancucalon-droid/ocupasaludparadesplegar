// src/hooks/useAppState.js
// Central state hook - documents all AppInner useState calls
// TODO: Extract all state from AppInner to this hook for centralized management
//
// USAGE (future):
// import useAppState from './hooks/useAppState';
// const state = useAppState();
//
// All AppInner useState declarations (to be moved here):
  // const [view, setView] = useState(() => {
  // const [navStack, setNavStack] = useState(() => {
  // const [currentUser, setCurrentUser] = useState(() => {
  // const [loginAttempts, setLoginAttempts] = useState(() => {
  // const [loginBlockedUntil, setLoginBlockedUntil] = useState(() => {
  // const [privacidadAceptada, setPrivacidadAceptada] = useState(() => {
  // const [syncStatus, setSyncStatus] = useState("idle");
  // const [showSyncReport, setShowSyncReport] = useState(false);
  // const [syncReport, setSyncReport] = useState(null); // 'idle'|'loading'|'syncing'|'ok'|'error'
  // const [alertMsg, setAlertMsg] = useState("");
  // const [confirmConfig, setConfirmConfig] = useState(null);
  // const [promptConfig, setPromptConfig] = useState(null);
  // const [promptValue, setPromptValue] = useState("");
  // const [aiConfig, setAiConfig] = useState({
  // const [showAIConfig, setShowAIConfig] = useState(false);
  // const [aiStatus, setAiStatus] = useState(null); // null | 'ok' | 'error'
  // const [companies, setCompanies] = useState([]);
  // const [usersList, setUsersList] = useState(initialUsers);
  // const [usersReady, setUsersReady] = useState(false); // FIX: esperar Supabase antes de login
  // const [patientsList, setPatientsList] = useState([]);
  // const [savedReports, setSavedReports] = useState([]);
  // const [savedBills, setSavedBills] = useState([]);
  // const [atencionesCerradas, setAtencionesCerradas] = useState(() => {
  // const [doctorSignature, setDoctorSignature] = useState(null);
  // const [auditLog, setAuditLog] = useState(() => {
  // const [activeTab, setActiveTab] = useState(() => {
  // const [data, setData] = useState(() => {
  // const [dataType, setDataType] = useState(() => {
  // const [isGenerating, setIsGenerating] = useState(false);
  // const [isGeneratingRestr, setIsGeneratingRestr] = useState(false);
  // const [isGeneratingReco, setIsGeneratingReco] = useState(false);
  // const [saveStatus, setSaveStatus] = useState("");
  // const [_hcDirty, _setHcDirty] = useState(false);
  // const [_exitHcConfirm, _setExitHcConfirm] = useState(null); // { onProceed }
  // const [patientSuggestions, setPatientSuggestions] = useState([]);
  // const [historyNotification, setHistoryNotification] = useState(null);
  // const [showRestriccionesPanel, setShowRestriccionesPanel] = useState(false);
  // const [showHistoryModal, setShowHistoryModal] = useState(false);
  // const [ripsModalData, setRipsModalData] = useState(null); // {json: string, filename: string}
  // const [backupModalData, setBackupModalData] = useState(null); // {json: string, filename: string}
  // const [hcChoiceAgenda, setHcChoiceAgenda] = useState(null);
  // const [historyRecords, setHistoryRecords] = useState([]);
  // const [patientSearchTerm, setPatientSearchTerm] = useState("");
  // const [genPatSearch, setGenPatSearch] = useState(""); // búsqueda paciente HC General
  // const [examSearch, setExamSearch] = useState(""); // solicitud examenes
  // const [examList, setExamList] = useState([]); // lista exámenes solicitados
  // const [showExamSuggs, setShowExamSuggs] = useState(false);
  // const [diagExamen, setDiagExamen] = useState("");
  // const [justExamen, setJustExamen] = useState("");
  // const [printPreview, setPrintPreview] = useState(null); // 'prescripcion'|'examenes'|'incapacidad'|null
  // const [selectedCompanyReport, setSelectedCompanyReport] = useState("");
  // const [reporteActiveTab, setReporteActiveTab] = useState("estadisticas"); // 'estadisticas' | 'certificados'
  // const [certSelected, setCertSelected] = useState({}); // {[patientId]: bool}
  // const [reportStartDate, setReportStartDate] = useState("");
  // const [reportEndDate, setReportEndDate] = useState("");
  // const [reportAIResult, setReportAIResult] = useState(null);
  // const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  // const [showExportTable, setShowExportTable] = useState(false);
  // const [precioPorPaciente, setPrecioPorPaciente] = useState("");
  // const [showDianPanel, setShowDianPanel] = useState(false);
  // const [showSecretariaPatientModal, setShowSecretariaPatientModal] = useState(null);
  // const [selectedMedicoReport, setSelectedMedicoReport] = useState("");
  // const [showTodoChecklist, setShowTodoChecklist] = useState(false);
  // const [todoSelection, setTodoSelection] = useState({
  // const [dianProvider, setDianProvider] = useState("siigo"); // 'siigo' | 'alegra' | 'manual'
  // const [dianApiKey, setDianApiKey] = useState(() => {
  // const [billData, setBillData] = useState({
  // const [savedBillsList, setSavedBillsList] = useState([]);
  // const [portafolioItems, setPortafolioItems] = useState(() => {
  // const [portafolioForm, setPortafolioForm] = useState({
  // const [portafolioEditId, setPortafolioEditId] = useState(null);
  // const [cotizaciones, setCotizaciones] = useState(() => {
  // const [cotizacionForm, setCotizacionForm] = useState({
  // const [cotizacionView, setCotizacionView] = useState("list");
  // const [cotizacionSelId, setCotizacionSelId] = useState(null);
  // const [cajaMovimientos, setCajaMovimientos] = useState(() => {
  // const [cajaForm, setCajaForm] = useState({
  // const [cajaTab, setCajaTab] = useState("hoy");
  // const [cajaFiltroPeriodo, setCajaFiltroPeriodo] = useState("hoy");
  // const [cajaFiltroDesde, setCajaFiltroDesde] = useState("");
  // const [cajaFiltroHasta, setCajaFiltroHasta] = useState("");
  // const [contabTab, setContabTab] = useState("resumen");
  // const [contabPeriodo, setContabPeriodo] = useState("mes");
  // const [asistenciaFecha, setAsistenciaFecha] = useState(
  // const [evolucionForm, setEvolucionForm] = useState({
  // const [showEvolucionModal, setShowEvolucionModal] = useState(false);
  // const [selectedPackage, setSelectedPackage] = useState(null);
  // const [packageChecklist, setPackageChecklist] = useState({});
  // const [showPackages, setShowPackages] = useState(false);
  // const [newComp, setNewComp] = useState(initialCompanyState);
  // const [ipsPerfilForm, setIpsPerfilForm] = useState({
  // const [verificationCode, setVerificationCode] = useState("");
  // const [verificationFound, setVerificationFound] = useState(null);
  // const [activeUserMgmtTab, setActiveUserMgmtTab] = useState("list");
  // const [pendingActivationPlan, setPendingActivationPlan] = useState(null); // plan pre-seleccionado desde renderPlanes
  // const [sbCloudData, setSbCloudData] = useState(null); // datos reales de Supabase para almacenamiento
  // const [sbLoading, setSbLoading] = useState(false);
  // const [newUserForm, setNewUserForm] = useState({
  // const [userEditId, setUserEditId] = useState(null);
  // const [editForm, setEditForm] = useState({});
  // const [propForm, setPropForm] = useState({
  // const [selSvc, setSelSvc] = useState("");
  // const [propModulo, setPropModulo] = useState("propuesta"); // 'propuesta' | 'cotizacion'
  // const [mensajes, setMensajes] = useState([]); // [{id,from,to,text,fecha,leido,respuesta,respondido}]
  // const [showMensajePanel, setShowMensajePanel] = useState(false);
  // const [showConsentModal, setShowConsentModal] = useState(false); // B-19
  // const [twoFAStep, setTwoFAStep] = useState(null); // null | {user, foundUser}
  // const [twoFAToken, setTwoFAToken] = useState("");
  // const [twoFAError, setTwoFAError] = useState("");
  // const [habeasRequests, setHabeasRequests] = useState(() => {
  // const [showHabeasModal, setShowHabeasModal] = useState(false);
  // const [habeasForm, setHabeasForm] = useState({
  // const [showPortalPublico, setShowPortalPublico] = useState(false);
  // const [arlTab, setArlTab] = useState("at");
  // const [svePrograma, setSvePrograma] = useState("DME");
  // const [sveFiltroEmpresa, setSveFiltroEmpresa] = useState("");
  // const [sveAIAnalisis, setSveAIAnalisis] = useState(null);
  // const [sveAICargando, setSveAIAnalisisCargando] = useState(false);
  // const [sveAIFiltroEmpresa, setSveAIFiltroEmpresa] = useState("");
  // const [arlForm, setArlForm] = useState({});
  // const [arlGuardados, setArlGuardados] = useState(() =>
  // const [showNotifModal, setShowNotifModal] = useState(false);
  // const [notifData, setNotifData] = useState({});
  // const [portalCodigo, setPortalCodigo] = useState("");
  // const [portalPaciente, setPortalPaciente] = useState(null);
  // const [portalMultiple, setPortalMultiple] = useState([]); // múltiples HCs por cédula
  // const [epiEmpresa, setEpiEmpresa] = useState("todas");
  // const [epiPeriodo, setEpiPeriodo] = useState("anio");
  // const [epiTab, setEpiTab] = useState("resumen");
  // const [teleconsultas, setTeleconsultas] = useState(() => {
  // const [teleForm, setTeleForm] = useState({
  // const [teleSalaActiva, setTeleSalaActiva] = useState(null); // {roomName, paciente, fecha, hora}
  // const [teleTab, setTeleTab] = useState("nueva"); // 'nueva' | 'historial'
  // const [mensajeRespuesta, setMensajeRespuesta] = useState(""); // texto de respuesta libre
  // const [agendados, setAgendados] = useState([]); // [{id,nombre,doc,tipo,medicoId,hora,estado:'espera'|'atendiendo'|'atendido',horaInicio,horaFin}]
  // const [showAgenda, setShowAgenda] = useState(false);
  // const [agendaForm, setAgendaForm] = useState({
  // const [agendaSuggs, setAgendaSuggs] = useState([]);
  // const [agendaTab, setAgendaTab] = useState("hoy"); // 'hoy' | 'proximas' | 'nueva'
  // const [showComposeMensaje, setShowComposeMensaje] = useState(false);
  // const [composeMensaje, setComposeMensaje] = useState({
  // const [inactivityWarning, setInactivityWarning] = useState(false);
  // const [inactivityCountdown, setInactivityCountdown] = useState(0);
  // const [companiesTab, setCompaniesTab] = useState("lista");
  // const [editingCompany, setEditingCompany] = useState(null);
  // const [cajaMedicoPeriodo, setCajaMedicoPeriodo] = useState("mes");
  // const [porcentajeMedico, setPorcentajeMedico] = useState(60); // % honorarios médico vs clínica
  // const [medicoTurnoActivo, setMedicoTurnoActivo] = useState(() => {
  // const [orgsList, setOrgsList] = useState(() => {
  // const [activeOrgId, setActiveOrgId] = useState(ORG_DEFAULT_ID);
  // const [superAdminTab, setSuperAdminTab] = useState("orgs");
  // const [newOrgForm, setNewOrgForm] = useState({
  // const [portalEmpresaCodigo, setPortalEmpresaCodigo] = useState("");
  // const [portalEmpresaEncontrada, setPortalEmpresaEncontrada] = useState(null);
  // const [portalEmpresaPacientes, setPortalEmpresaPacientes] = useState([]);
  // const [portalEmpresaTab, setPortalEmpresaTab] = useState("trabajadores");
  // const [portalEmpresaBuscando, setPortalEmpresaBuscando] = useState(false);
  // const [portalEmpresaFiltroDoc, setPortalEmpresaFiltroDoc] = useState(""); // filtro cédula en portal empresa
  // const [portalActivadoInfo, setPortalActivadoInfo] = useState(null); // {empresa, portalCode} post-activación
  // const [portalEmpresaAdmin, setPortalEmpresaAdmin] = useState(null); // empresa admin logueado
  // const [portalAdminTab, setPortalAdminTab] = useState("medicos");
  // const [portalAdminLoginUser, setPortalAdminLoginUser] = useState("");
  // const [portalAdminLoginPass, setPortalAdminLoginPass] = useState("");
  // const [nuevoMedicoEmpForm, setNuevoMedicoEmpForm] = useState({
  // const [sedeForm, setSedeForm] = useState({
  // const [ipsCredForm, setIpsCredForm] = useState({
  // const [ipsEditingEmpId, setIpsEditingEmpId] = useState(null);

// Placeholder export
export default function useAppState() {
  // Implementation pending - see App.jsx AppInner function for all state
  throw new Error('useAppState not yet extracted - see App.jsx AppInner');
}
