import { useState, useCallback, useRef } from 'react';
import { initialOccupPatientState as INITIAL_HC_STATE } from '../../../shared/data/initialStates';

/**
 * useClinicalRecord - Hook para manejo de historias clínicas
 * Gestión de estado, guardado, carga, historial
 * Normativa: Res. 1843/2025, Res. 1995/1999
 */
export const useClinicalRecord = ({
  currentUser,
  patients,
  setPatients,
  syncPatients,
  generateVerificationCode,
  showAlert,
} = {}) => {
  const [data, setData] = useState({ ...INITIAL_HC_STATE });
  const [historyList, setHistoryList] = useState([]);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showRestrictionsPanel, setShowRestrictionsPanel] = useState(false);
  const [showRecommendationsPanel, setShowRecommendationsPanel] = useState(false);
  const [historyNotification, setHistoryNotification] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveRef = useRef(null);

  // Load HC for editing
  const loadRecord = useCallback((record) => {
    setData({ ...INITIAL_HC_STATE, ...record });
    setEditingHistoryId(record.id || null);
    setIsDirty(false);
  }, []);

  // Initialize new HC
  const initNewRecord = useCallback((type = 'ocupacional', patientData = null) => {
    const now = new Date();
    const base = {
      ...INITIAL_HC_STATE,
      tipoHistoria: type,
      fechaExamen: now.toISOString().split('T')[0],
      horaInicio: now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      medicoId: currentUser?.id || '',
      medicoNombre: currentUser?.nombre || '',
      estadoHistoria: 'Abierta',
    };
    if (patientData) {
      Object.assign(base, {
        nombres: patientData.nombres || '',
        docTipo: patientData.docTipo || 'CC',
        docNumero: patientData.docNumero || '',
        fechaNacimiento: patientData.fechaNacimiento || '',
        edad: patientData.edad || '',
        genero: patientData.genero || '',
        celular: patientData.celular || '',
        eps: patientData.eps || '',
        arl: patientData.arl || '',
        afp: patientData.afp || '',
        cargo: patientData.cargo || '',
        empresaId: patientData.empresaId || 'particular',
        empresaNombre: patientData.empresaNombre || '',
      });
    }
    setData(base);
    setEditingHistoryId(null);
    setIsDirty(false);
    return base;
  }, [currentUser]);

  // Update data with dirty tracking
  const updateData = useCallback((updates) => {
    setData((prev) => {
      const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      return next;
    });
    setIsDirty(true);
  }, []);

  // Save HC
  const saveRecord = useCallback(() => {
    const now = new Date();
    const recordToSave = {
      ...data,
      fechaModificacion: now.toISOString(),
      medicoId: currentUser?.id || data.medicoId,
      medicoNombre: currentUser?.nombre || data.medicoNombre,
    };

    if (!recordToSave.id) {
      recordToSave.id = `hc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      recordToSave.fechaCreacion = now.toISOString();
    }

    // Generate verification code if closing
    if (recordToSave.estadoHistoria === 'Cerrada' && !recordToSave.codigoVerificacion) {
      if (generateVerificationCode) {
        recordToSave.codigoVerificacion = generateVerificationCode(recordToSave);
      } else {
        const hash = Math.random().toString(36).slice(2, 10).toUpperCase();
        recordToSave.codigoVerificacion = `SISO-${now.toISOString().split('T')[0].replace(/-/g, '')}-${hash}`;
      }
      recordToSave.fechaCierre = now.toISOString();
    }

    setData(recordToSave);
    setEditingHistoryId(recordToSave.id);
    setIsDirty(false);

    return recordToSave;
  }, [data, currentUser, generateVerificationCode]);

  // Close HC
  const closeRecord = useCallback(() => {
    const closed = {
      ...data,
      estadoHistoria: 'Cerrada',
      fechaCierre: new Date().toISOString(),
      horaFin: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    };
    setData(closed);
    return saveRecord();
  }, [data, saveRecord]);

  // Load patient history
  const loadPatientHistory = useCallback((docNumero) => {
    if (!patients || !docNumero) return [];
    const patient = patients.find((p) => p.docNumero === docNumero);
    if (!patient) return [];
    const history = (patient.historias || []).sort(
      (a, b) => new Date(b.fechaExamen || 0) - new Date(a.fechaExamen || 0)
    );
    setHistoryList(history);
    if (history.length > 0) {
      setHistoryNotification(history.length);
    }
    return history;
  }, [patients]);

  // Apply antecedentes from previous HC
  const applyPreviousAntecedentes = useCallback((previousHC) => {
    if (!previousHC) return;
    const fieldsToCarry = [
      'antPatologicos', 'antQuirurgicos', 'antTraumaticos',
      'antToxicoAlergicos', 'antFarmacologicos', 'antFamiliares',
      'antGinecoObstetricos', 'tabaquismo', 'alcoholismo',
      'sustanciasPsicoactivas', 'actividadFisica',
    ];
    setData((prev) => {
      const updates = {};
      fieldsToCarry.forEach((field) => {
        if (previousHC[field] && !prev[field]) {
          updates[field] = previousHC[field];
        }
      });
      return { ...prev, ...updates };
    });
  }, []);

  return {
    data,
    setData: updateData,
    rawSetData: setData,
    historyList,
    editingHistoryId,
    showConsentModal,
    setShowConsentModal,
    showRestrictionsPanel,
    setShowRestrictionsPanel,
    showRecommendationsPanel,
    setShowRecommendationsPanel,
    historyNotification,
    isDirty,
    loadRecord,
    initNewRecord,
    saveRecord,
    closeRecord,
    loadPatientHistory,
    applyPreviousAntecedentes,
  };
};
