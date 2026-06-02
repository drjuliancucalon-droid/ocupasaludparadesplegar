// src/pages/BackupPage.jsx — Backup & Restore + RIPS
// T-03: Completar Backup - Automático + RIPS
// FIX: Compatible con backups del monolito OcupaSalud (claves siso_db_patients, siso_companies, etc.)
import React, { useState, useEffect, useCallback } from 'react';
import { Download, Upload, Loader2, CheckCircle, AlertCircle, Database, Clock, FileText, RefreshCw } from 'lucide-react';
import { useAIStore } from '../stores/aiStore';

const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yqrrktrgoijgzccrxnpz.supabase.co';
const SB_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_K88qYuJ9wsWjQqnIhLVK7Q_NroFvPI7';

// ══════════════════════════════════════════════════════════════════════
// CLAVES QUE EXPORTA/IMPORTA ESTA APP REFACTORIZADA
// ══════════════════════════════════════════════════════════════════════
const BACKUP_KEYS = [
  { key: 'siso_patients_drcucalon',    label: 'Pacientes',           icon: '👤' },
  { key: 'siso_companies_drcucalon',   label: 'Empresas',            icon: '🏢' },
  { key: 'siso_users',                 label: 'Usuarios',            icon: '👥' },
  { key: 'siso_agendados_drcucalon',   label: 'Agenda',              icon: '📅' },
  { key: 'siso_saved_bills_drcucalon', label: 'Facturas',            icon: '💰' },
  { key: 'siso_audit_log',             label: 'Auditoría',           icon: '📋' },
  { key: 'siso_caja_movs_drcucalon',   label: 'Caja',                icon: '💵' },
  { key: 'siso_atenciones',            label: 'Atenciones',          icon: '🏥' },
  { key: 'siso_doctor_data_drcucalon', label: 'Doctor',              icon: '👨‍⚕️' },
  { key: 'siso_doctor_signature',      label: 'Firma Digital',       icon: '✍️' },
  { key: 'siso_ai_config_provider',    label: 'Config IA',           icon: '🤖' },
  { key: 'siso_saved_reports',         label: 'Informes guardados',  icon: '📊' },
  { key: 'siso_mensajes',              label: 'Mensajes',            icon: '💬' },
  { key: 'siso_atenciones_cerradas',   label: 'Atenciones cerradas', icon: '📁' },
  { key: 'siso_atl_cases',             label: 'Casos ARL',           icon: '⚠️' },
  { key: 'siso_privacidad_aceptada',   label: 'Habeas data',         icon: '🔒' },
  { key: 'siso_sgsst_drcucalon',       label: 'SG-SST',             icon: '🦺' },
];

// ══════════════════════════════════════════════════════════════════════
// MAPA DE CLAVES MONOLITO → APP REFACTORIZADA
// El monolito exporta con claves como siso_db_patients, siso_companies,
// siso_agendados, etc. Esta app usa siso_patients_drcucalon, etc.
// ══════════════════════════════════════════════════════════════════════
const MONOLITH_KEY_MAP = {
  // Pacientes — monolito usa siso_db_patients (global) o siso_db_patients_USER
  'siso_db_patients':            'siso_patients_drcucalon',
  'siso_db_patients_drcucalon':  'siso_patients_drcucalon',
  'siso_patients':               'siso_patients_drcucalon',
  // Empresas
  'siso_companies':              'siso_companies_drcucalon',
  // Agenda
  'siso_agendados':              'siso_agendados_drcucalon',
  // Facturas
  'siso_saved_bills':            'siso_saved_bills_drcucalon',
  // Casos ARL
  'siso_arl_reportes':           'siso_atl_cases',
  // Claves que coinciden exactamente entre monolito y app refactorizada
  'siso_users':                  'siso_users',
  'siso_audit_log':              'siso_audit_log',
  'siso_mensajes':               'siso_mensajes',
  'siso_ai_config_provider':     'siso_ai_config_provider',
  'siso_doctor_signature':       'siso_doctor_signature',
  'siso_privacidad_aceptada':    'siso_privacidad_aceptada',
  'siso_atenciones_cerradas':    'siso_atenciones_cerradas',
  'siso_saved_reports':          'siso_saved_reports',
  'siso_atenciones':             'siso_atenciones',
};

// Claves visibles en el panel "Datos del Sistema"
const SYSTEM_DISPLAY_KEYS = [
  { key: 'siso_patients_drcucalon',    label: 'Pacientes' },
  { key: 'siso_companies_drcucalon',   label: 'Empresas' },
  { key: 'siso_doctor_data_drcucalon', label: 'Doctor' },
  { key: 'siso_agendados_drcucalon',   label: 'Agenda' },
  { key: 'siso_saved_bills_drcucalon', label: 'Facturas' },
  { key: 'siso_privacidad_aceptada',   label: 'Habeas data' },
];

// ── SHA-256 hash (Ley 527/1999 art. 7) ──
const _sha256 = async (str) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// ── Historial ──
const BACKUP_HISTORY_KEY = 'siso_backup_history';
const loadBackupHistory = () => {
  try { return JSON.parse(localStorage.getItem(BACKUP_HISTORY_KEY) || '[]'); } catch { return []; }
};
const saveBackupToHistory = (info) => {
  const history = loadBackupHistory();
  const entry = { ...info, id: `bk_${Date.now()}`, fecha: new Date().toISOString() };
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify([entry, ...history].slice(0, 20)));
};

// ── Fetch un valor de siso_store ──
const fetchStoreKey = async (key) => {
  const res = await fetch(
    `${SB_URL}/rest/v1/siso_store?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.value ?? null;
};

// ── RIPS generator ──
const generateRIPS = (patients, doctor) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const AF = patients.map(p => ({
    tipoDocumentoIdentificacion: p.docTipo || 'CC',
    numeroIdentificacion: p.docNumero || '',
    codigoEPS: p.eps?.substring(0, 6) || 'N/A',
    tipoAfiliado: p.tipoContrato?.toUpperCase().includes('DEPENDIENTE') ? 'C' : 'I',
    primerApellido: p.apellidos?.split(' ')[0] || '',
    segundoApellido: p.apellidos?.split(' ').slice(1).join(' ') || '',
    primerNombre: p.nombres?.split(' ')[0] || '',
    segundoNombre: p.nombres?.split(' ').slice(1).join(' ') || '',
    fechaNacimiento: p.fechaNacimiento || '',
    sexo: p.genero === 'Masculino' ? 'M' : p.genero === 'Femenino' ? 'F' : 'I',
    direccion: p.residencia || '',
    telefono: p.celular || p.telefono || '',
    codigoMunicipio: '19001',
  }));
  const AD = patients.map((p, i) => ({
    numeroFactura: `F${year}${month}${String(i + 1).padStart(6, '0')}`,
    codigoPrestador: doctor?.licencia?.substring(0, 12) || 'SISO001',
    NitPrestador: doctor?.nit || '000000000',
    fechaAtencion: p.fechaExamen || now.toISOString().split('T')[0],
    codigoDiagnosticoPrincipal: p.diagnostico1?.substring(0, 4) || 'Z10.0',
    diagnosticoPrincipal: p.diagnostico1 || '',
    tipoDiagnosticoPrincipal: '1',
    causaMotivoAtencion: p.motivoConsulta || '',
    tipoDocumentoIdentificacion: p.docTipo || 'CC',
    numeroIdentificacion: p.docNumero || '',
    vrServicio: p.costo || 35000,
    vrCup: p.costo || 35000,
    vrTotal: p.costo || 35000,
  }));
  const AC = patients.map((p, i) => ({
    codigoPrestador: doctor?.licencia?.substring(0, 12) || 'SISO001',
    fechaAtencion: p.fechaExamen || now.toISOString().split('T')[0],
    tipoDocumentoIdentificacion: p.docTipo || 'CC',
    numeroIdentificacion: p.docNumero || '',
    sexo: p.genero === 'Masculino' ? 'M' : p.genero === 'Femenino' ? 'F' : 'I',
    edad: parseInt(p.edad) || 0,
    unidadMedidaEdad: 1,
    codigoDiagnosticoPrincipal: p.diagnostico1?.substring(0, 4) || 'Z10.0',
    tipoDiagnosticoPrincipal: '1',
    objetivo: p.tipoExamen || 'Ocupacional',
    causaMotivoAtencion: p.motivoConsulta || '',
    codigoProcedimiento: '890101',
    vrProcedimiento: 35000,
  }));
  const AT = {
    numeroRegistros: patients.length,
    vrTotal: patients.reduce((sum, p) => sum + (parseInt(p.costo) || 35000), 0),
    fechaGeneracion: now.toISOString(),
    codigoPrestador: doctor?.licencia?.substring(0, 12) || 'SISO001',
    NitPrestador: doctor?.nit || '000000000',
    nombrePrestador: doctor?.nombre || 'OcupaSalud',
  };
  return { AF, AD, AC, AT };
};

// ══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════
export default function BackupPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState(null);
  const [systemCounts, setSystemCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [backupHistory, setBackupHistory] = useState([]);

  // ── Cargar conteos de datos del sistema ──
  const loadSystemCounts = useCallback(async () => {
    setLoadingCounts(true);
    const counts = {};
    await Promise.all(
      SYSTEM_DISPLAY_KEYS.map(async ({ key, label }) => {
        try {
          const val = await fetchStoreKey(key);
          if (val === null) {
            counts[label] = null; // Vacío
          } else if (Array.isArray(val)) {
            counts[label] = val.length;
          } else if (typeof val === 'object') {
            counts[label] = 1; // Objeto único (doctor, etc.)
          } else {
            counts[label] = 1;
          }
        } catch {
          counts[label] = null;
        }
      })
    );
    setSystemCounts(counts);
    setLoadingCounts(false);
  }, []);

  useEffect(() => {
    loadSystemCounts();
    setBackupHistory(loadBackupHistory());
  }, [loadSystemCounts]);

  // ══════════════════════════════════════════════════════════════════
  // EXPORTAR — recorre TODAS las claves de BACKUP_KEYS
  // ══════════════════════════════════════════════════════════════════
  const handleExport = async () => {
    setExporting(true); setStatus(null);
    try {
      const backup = { version: '2.0', date: new Date().toISOString(), data: {} };

      for (const { key } of BACKUP_KEYS) {
        try {
          const val = await fetchStoreKey(key);
          if (val !== null) backup.data[key] = val;
        } catch {}
      }

      const counts = Object.entries(backup.data).map(
        ([k, v]) => `${k.replace('siso_', '').replace('_drcucalon', '')}: ${Array.isArray(v) ? v.length : 1}`
      );
      backup.summary = counts;

      // SHA-256 integridad — Ley 527/1999 art. 7
      const dataStr = JSON.stringify(backup.data);
      backup.sha256 = await _sha256(dataStr);
      backup.integrity = 'SHA-256 — Ley 527/1999 art. 7';

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_ocupasalud_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const msg = `Backup exportado · ${counts.length} colecciones · SHA-256: ${backup.sha256.slice(0, 16)}…`;
      setStatus({ type: 'ok', msg });
      saveBackupToHistory({ collections: counts.length, sha256: backup.sha256.slice(0, 16), tipo: 'export' });
      setBackupHistory(loadBackupHistory());
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setExporting(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // IMPORTAR — compatible con formato monolito Y formato refactorizado
  // ══════════════════════════════════════════════════════════════════
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setStatus(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      // ── Paso 1: Verificar integridad SHA-256 si existe ──
      if (backup.sha256 && backup.data) {
        const computed = await _sha256(JSON.stringify(backup.data));
        if (computed !== backup.sha256) {
          if (!window.confirm(
            '⚠️ La integridad SHA-256 del backup no coincide.\n\n' +
            'El archivo puede haber sido modificado o corrompido.\n\n' +
            '¿Continuar de todas formas?'
          )) {
            setImporting(false);
            return;
          }
        }
      }

      // ── Paso 2: Normalizar a { version, date, data: { KEY: VALUE } } ──
      let normalizedData = {};

      if (backup.version && backup.data && typeof backup.data === 'object') {
        // Formato estándar (esta app o monolito): { version, date, data: { ... } }
        normalizedData = backup.data;
      } else if (backup._meta && backup._meta.data) {
        // Formato _meta: { _meta: { data: { patients: [...] } } }
        const src = backup._meta.data;
        if (src.patients)   normalizedData['siso_db_patients']        = src.patients;
        if (src.db_patients) normalizedData['siso_db_patients']       = src.db_patients;
        if (src.companies)  normalizedData['siso_companies']           = src.companies;
        if (src.users)      normalizedData['siso_users']               = src.users;
        if (src.agenda)     normalizedData['siso_agendados']           = src.agenda;
        if (src.agendados)  normalizedData['siso_agendados']           = src.agendados;
        if (src.bills)      normalizedData['siso_saved_bills']         = src.bills;
        if (src.facturas)   normalizedData['siso_saved_bills']         = src.facturas;
        if (src.doctor)     normalizedData['siso_doctor_data_drcucalon'] = src.doctor;
        if (src.mensajes)   normalizedData['siso_mensajes']            = src.mensajes;
        if (src.arl)        normalizedData['siso_arl_reportes']        = src.arl;
        if (src.ai_config)  normalizedData['siso_ai_config_provider']  = src.ai_config;
        if (src.doctor_signature) normalizedData['siso_doctor_signature'] = src.doctor_signature;
      } else if (backup.version && (backup.patients || backup.aiConfig)) {
        // Formato legacy OcupaSalud v3.x — snake_case y camelCase
        if (backup.patients)         normalizedData['siso_db_patients']           = backup.patients;
        if (backup.db_patients)      normalizedData['siso_db_patients']           = backup.db_patients;
        if (backup.companies)        normalizedData['siso_companies']             = backup.companies;
        if (backup.users)            normalizedData['siso_users']                 = backup.users;
        if (backup.agenda)           normalizedData['siso_agendados']             = backup.agenda;
        if (backup.agendados)        normalizedData['siso_agendados']             = backup.agendados;
        if (backup.bills)            normalizedData['siso_saved_bills']           = backup.bills;
        if (backup.facturas)         normalizedData['siso_saved_bills']           = backup.facturas;
        if (backup.doctor)           normalizedData['siso_doctor_data_drcucalon'] = backup.doctor;
        if (backup.mensajes)         normalizedData['siso_mensajes']              = backup.mensajes;
        if (backup.arl)              normalizedData['siso_arl_reportes']          = backup.arl;
        if (backup.ai_config)        normalizedData['siso_ai_config_provider']    = backup.ai_config;
        if (backup.doctor_signature) normalizedData['siso_doctor_signature']      = backup.doctor_signature;
        // camelCase (monolito v3.x)
        if (backup.aiConfig)           normalizedData['siso_ai_config_provider']  = backup.aiConfig;
        if (backup.savedBills)         normalizedData['siso_saved_bills']         = backup.savedBills;
        if (backup.savedReports)       normalizedData['siso_saved_reports']       = backup.savedReports;
        if (backup.atencionesCerradas) normalizedData['siso_atenciones_cerradas'] = backup.atencionesCerradas;
        if (backup.customMedicamentos) normalizedData['siso_custom_meds']         = backup.customMedicamentos;
        if (backup.propuestas)         normalizedData['siso_cotizaciones']        = backup.propuestas;
        if (backup.habeasData)         normalizedData['siso_privacidad_aceptada'] = backup.habeasData;
        if (backup.sgsst)              normalizedData['siso_sgsst_drcucalon']     = backup.sgsst;
        for (const [k, v] of Object.entries(backup)) {
          if (k.startsWith('siso_') && !normalizedData[k]) normalizedData[k] = v;
        }
      } else {
        throw new Error(
          'Formato de backup no reconocido.\n' +
          'Formatos soportados: monolito OcupaSalud, v2.0 refactorizado, legacy _meta.'
        );
      }

      if (Object.keys(normalizedData).length === 0) {
        throw new Error('El archivo de backup no contiene datos.');
      }

      // ── Paso 3: Remap claves monolito → claves app refactorizada ──
      // Esto asegura que siso_db_patients → siso_patients_drcucalon, etc.
      const remappedData = {};
      for (const [srcKey, value] of Object.entries(normalizedData)) {
        // Si la clave está en el mapa de monolito, usar la clave remapeada
        const destKey = MONOLITH_KEY_MAP[srcKey] ?? srcKey;
        // Si ya existe la destKey con datos, no sobreescribir (prioridad al más específico)
        if (!remappedData[destKey]) {
          remappedData[destKey] = value;
        }
      }

      // ── Paso 4: MERGE INTELIGENTE — verificar qué ya existe en Supabase ──
      const toWrite = [];   // vacías → se importan
      const toSkip  = [];   // con datos → se omiten

      for (const [key, value] of Object.entries(remappedData)) {
        const existing = await fetchStoreKey(key);
        const hasData = existing !== null && (!Array.isArray(existing) || existing.length > 0);
        const label = key.replace('siso_', '').replace('_drcucalon', '');
        if (hasData) {
          toSkip.push({ key, label, cnt: Array.isArray(existing) ? existing.length : 1 });
        } else {
          toWrite.push({ key, value, label, cnt: Array.isArray(value) ? value.length : 1 });
        }
      }

      const backupDate = backup.date || backup.backupDate || backup._meta?.exportedAt || '';
      const dateStr = backupDate
        ? (() => { try { return new Date(backupDate).toLocaleDateString('es-CO'); } catch { return backupDate; } })()
        : 'fecha desconocida';

      const writeLines = toWrite.map(x => `  ✅ ${x.label}: ${x.cnt} registros`).join('\n') || '  (ninguna)';
      const skipLines  = toSkip.map(x  => `  ⏭️ ${x.label}: ya tiene ${x.cnt} registros`).join('\n') || '  (ninguna)';

      if (!window.confirm(
        `Backup del ${dateStr}\n\n` +
        `📥 SE IMPORTARÁN (vacías en Supabase):\n${writeLines}\n\n` +
        `⏭️ SE OMITIRÁN (ya tienen datos):\n${skipLines}\n\n` +
        `Solo se escribirán los datos que faltan. ¿Continuar?`
      )) {
        setImporting(false);
        return;
      }

      // ── Paso 5: Escribir solo las claves vacías ──
      let imported = 0;
      let errors = 0;

      for (const { key, value } of toWrite) {
        try {
          const res = await fetch(`${SB_URL}/rest/v1/siso_store`, {
            method: 'POST',
            headers: {
              apikey: SB_KEY,
              Authorization: `Bearer ${SB_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
          });
          if (res.ok) { imported++; } else { errors++; }
        } catch { errors++; }
      }

      // ── Aplicar config IA al Zustand store si fue importada ──
      const aiImported = toWrite.find(x => x.key === 'siso_ai_config_provider');
      if (aiImported?.value && typeof aiImported.value === 'object') {
        try {
          const aiCfg = aiImported.value;
          const { setActiveProvider, setKey } = useAIStore.getState();
          if (aiCfg.activeProvider) setActiveProvider(aiCfg.activeProvider);
          if (aiCfg.keys && typeof aiCfg.keys === 'object') {
            for (const [provider, key] of Object.entries(aiCfg.keys)) {
              if (key) setKey(provider, key);
            }
          }
        } catch (e) { console.warn('AI store update failed:', e.message); }
      }

      const msg = errors > 0
        ? `${imported} importadas · ⚠️ ${errors} errores · ⏭️ ${toSkip.length} omitidas` +
          (aiImported ? ' · 🤖 Claves API restauradas' : '')
        : `✅ ${imported} importadas · ⏭️ ${toSkip.length} omitidas` +
          (aiImported ? ' · 🤖 Claves API restauradas' : '');

      setStatus({ type: errors > 0 ? 'warn' : 'ok', msg });
      saveBackupToHistory({ collections: imported, tipo: 'import', errors, skipped: toSkip.length });
      setBackupHistory(loadBackupHistory());

      // Recargar conteos del sistema
      await loadSystemCounts();
    } catch (err) {
      setStatus({ type: 'error', msg: `Error: ${err.message}` });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-emerald-600" />
        <h1 className="text-2xl font-bold text-gray-800">Backup y Restauración</h1>
      </div>

      {/* Status banner */}
      {status && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
          status.type === 'ok'   ? 'bg-emerald-50 text-emerald-700' :
          status.type === 'warn' ? 'bg-amber-50 text-amber-700' :
                                   'bg-red-50 text-red-700'
        }`}>
          {status.type === 'ok'   ? <CheckCircle className="w-4 h-4 shrink-0" /> :
           status.type === 'warn' ? <AlertCircle className="w-4 h-4 shrink-0" /> :
                                    <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{status.msg}</span>
        </div>
      )}

      {/* Export / Import cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Export */}
        <div className="bg-white border rounded-xl p-6 text-center">
          <Download className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 mb-2">Exportar Backup</h3>
          <p className="text-xs text-gray-500 mb-4">
            Descarga un archivo JSON con todos los datos del sistema (pacientes, empresas, agenda, facturas, firma, IA…)
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exportando…' : 'Exportar'}
          </button>
        </div>

        {/* Import */}
        <div className="bg-white border rounded-xl p-6 text-center">
          <Upload className="w-10 h-10 text-teal-500 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 mb-2">Importar Backup</h3>
          <p className="text-xs text-gray-500 mb-4">
            Restaura datos desde un archivo JSON — compatible con el monolito OcupaSalud y esta app refactorizada
          </p>
          <label className="w-full py-2.5 bg-white border-2 border-emerald-300 text-emerald-700 rounded-lg font-bold text-sm hover:bg-emerald-50 flex items-center justify-center gap-2 cursor-pointer">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? 'Importando…' : 'Seleccionar archivo'}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
        </div>
      </div>

      {/* Datos del Sistema */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-700 text-sm">Datos del Sistema</h3>
          </div>
          <button
            onClick={loadSystemCounts}
            disabled={loadingCounts}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCounts ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SYSTEM_DISPLAY_KEYS.map(({ label }) => {
            const count = systemCounts[label];
            const isEmpty = count === null || count === undefined;
            return (
              <div
                key={label}
                className={`rounded-lg px-3 py-2.5 text-sm border ${
                  loadingCounts ? 'opacity-50' :
                  isEmpty ? 'bg-gray-50 border-gray-200' : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div className="font-semibold text-gray-700 truncate">{label}</div>
                <div className={`text-xs mt-0.5 ${isEmpty ? 'text-gray-400 italic' : 'text-emerald-700 font-bold'}`}>
                  {loadingCounts ? '…' : isEmpty ? 'Vacío' : `${count} registro${count !== 1 ? 's' : ''}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exportar RIPS */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-blue-800 text-sm">Exportar RIPS (Ministerio de Salud)</h3>
        </div>
        <p className="text-xs text-blue-600 mb-3">
          Genera archivos RIPS para reporte obligatorio al Ministerio (Res. 3374/2000)
        </p>
        <button
          onClick={async () => {
            try {
              const patients = (await fetchStoreKey('siso_patients_drcucalon')) || [];
              const doctor   = (await fetchStoreKey('siso_doctor_data_drcucalon')) || {};
              const rips = generateRIPS(patients, doctor);
              const dl = (data, name) => {
                const a = Object.assign(document.createElement('a'), {
                  href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
                  download: name,
                });
                a.click(); URL.revokeObjectURL(a.href);
              };
              const d = new Date().toISOString().split('T')[0];
              dl(rips.AF, `RIPS_AF_${d}.json`);
              setTimeout(() => dl(rips.AD, `RIPS_AD_${d}.json`), 400);
              setTimeout(() => dl(rips.AC, `RIPS_AC_${d}.json`), 800);
              setTimeout(() => dl(rips.AT, `RIPS_AT_${d}.json`), 1200);
              setStatus({ type: 'ok', msg: `RIPS exportados: ${patients.length} registros` });
            } catch (err) {
              setStatus({ type: 'error', msg: 'Error exportando RIPS: ' + err.message });
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5" />
          Exportar RIPS (AF, AD, AC, AT)
        </button>
      </div>

      {/* Historial de backups */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-600" />
          <h3 className="font-bold text-gray-700 text-sm">Historial de Backups</h3>
        </div>
        {backupHistory.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Sin backups registrados</p>
        ) : (
          <div className="space-y-1.5">
            {backupHistory.slice(0, 8).map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs text-gray-600 bg-white border rounded-lg px-3 py-2">
                <span className="font-medium">
                  {h.tipo === 'import' ? '📥 Importación' : '📤 Exportación'}
                  {h.collections ? ` · ${h.collections} colecciones` : ''}
                  {h.errors ? ` · ${h.errors} errores` : ''}
                </span>
                <span className="text-gray-400">
                  {new Date(h.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aviso legal */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
        <p className="font-bold">⚠️ Importante — Ley 1581/2012 · Res. 1995/1999</p>
        <p className="mt-1">
          Los backups contienen datos médicos protegidos. Almacénalos de forma segura y no los compartas.
          Retención mínima: 20 años. La integridad del archivo se verifica mediante SHA-256 (Ley 527/1999 art. 7).
        </p>
        <p className="mt-1 font-semibold">
          ✅ Compatible con backups del monolito OcupaSalud y con versiones anteriores de esta app.
        </p>
      </div>
    </div>
  );
}
