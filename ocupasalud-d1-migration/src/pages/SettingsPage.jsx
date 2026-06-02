// src/pages/SettingsPage.jsx
// Sprint 3.6: Settings with Backup/Restore + AI Config
// FIX: Compatible con backups del monolito OcupaSalud (version+patients),
//      formato _meta, y formato v2.0 refactorizado. Lee/escribe Supabase.
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Settings, Download, Upload, AlertCircle, CheckCircle,
  Loader2, Database, Shield, RefreshCw,
} from 'lucide-react';
import { useAIStore } from '../stores/aiStore';

// ── Supabase ──────────────────────────────────────────────────────────
const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yqrrktrgoijgzccrxnpz.supabase.co';
const SB_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_K88qYuJ9wsWjQqnIhLVK7Q_NroFvPI7';

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
};

const fetchStoreKey = async (key) => {
  const res = await fetch(
    `${SB_URL}/rest/v1/siso_store?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: sbHeaders }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.value ?? null;
};

const upsertStoreKey = async (key, value) => {
  const res = await fetch(`${SB_URL}/rest/v1/siso_store`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  return res.ok;
};

// ── Claves a exportar desde esta app ─────────────────────────────────
const EXPORT_KEYS = [
  { key: 'siso_patients_drcucalon',    label: 'Pacientes' },
  { key: 'siso_companies_drcucalon',   label: 'Empresas' },
  { key: 'siso_users',                 label: 'Usuarios' },
  { key: 'siso_agendados_drcucalon',   label: 'Agenda' },
  { key: 'siso_saved_bills_drcucalon', label: 'Facturas' },
  { key: 'siso_audit_log',             label: 'Auditoría' },
  { key: 'siso_doctor_data_drcucalon', label: 'Doctor' },
  { key: 'siso_doctor_signature',      label: 'Firma Digital' },
  { key: 'siso_ai_config_provider',    label: 'Config IA' },
  { key: 'siso_saved_reports',         label: 'Informes IA' },
  { key: 'siso_mensajes',              label: 'Mensajes' },
  { key: 'siso_atenciones_cerradas',   label: 'Atenciones cerradas' },
  { key: 'siso_atl_cases',             label: 'Casos ARL' },
  { key: 'siso_privacidad_aceptada',   label: 'Habeas Data' },
  { key: 'siso_sgsst_drcucalon',       label: 'SG-SST' },
  { key: 'siso_caja_movs_drcucalon',   label: 'Caja' },
];

// Claves visibles en el panel Datos del Sistema
const DISPLAY_KEYS = [
  { key: 'siso_patients_drcucalon',    label: 'db patients' },
  { key: 'siso_companies_drcucalon',   label: 'companies' },
  { key: 'siso_doctor_data_drcucalon', label: 'doctor data' },
  { key: 'siso_agendados_drcucalon',   label: 'agenda' },
  { key: 'siso_saved_bills_drcucalon', label: 'bills' },
  { key: 'siso_privacidad_aceptada',   label: 'habeas data requests' },
];

// ── Mapa monolito → app refactorizada ────────────────────────────────
// El monolito (OcupaSalud) exporta bajo siso_db_patients, siso_companies,
// siso_agendados, siso_saved_bills, siso_arl_reportes, etc.
// Esta app almacena bajo siso_patients_drcucalon, siso_companies_drcucalon, etc.
const MONOLITH_KEY_MAP = {
  'siso_db_patients':           'siso_patients_drcucalon',
  'siso_db_patients_drcucalon': 'siso_patients_drcucalon',
  'siso_patients':              'siso_patients_drcucalon',
  'siso_companies':             'siso_companies_drcucalon',
  'siso_agendados':             'siso_agendados_drcucalon',
  'siso_saved_bills':           'siso_saved_bills_drcucalon',
  'siso_arl_reportes':          'siso_atl_cases',
  // Claves idénticas en ambas versiones
  'siso_users':                 'siso_users',
  'siso_audit_log':             'siso_audit_log',
  'siso_mensajes':              'siso_mensajes',
  'siso_ai_config_provider':    'siso_ai_config_provider',
  'siso_doctor_signature':      'siso_doctor_signature',
  'siso_privacidad_aceptada':   'siso_privacidad_aceptada',
  'siso_atenciones_cerradas':   'siso_atenciones_cerradas',
  'siso_saved_reports':         'siso_saved_reports',
  'siso_atenciones':            'siso_atenciones',
};

// ── SHA-256 (Ley 527/1999) ───────────────────────────────────────────
const sha256 = async (str) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// ════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const [backupStatus, setBackupStatus] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [systemCounts, setSystemCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const fileInputRef = useRef(null);

  // ── Cargar conteos desde Supabase ──
  const loadCounts = useCallback(async () => {
    setLoadingCounts(true);
    const counts = {};
    await Promise.all(
      DISPLAY_KEYS.map(async ({ key, label }) => {
        try {
          const val = await fetchStoreKey(key);
          if (val === null) counts[label] = null;
          else if (Array.isArray(val)) counts[label] = val.length;
          else counts[label] = 1;
        } catch { counts[label] = null; }
      })
    );
    setSystemCounts(counts);
    setLoadingCounts(false);
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  // ── Export Backup (desde Supabase) ───────────────────────────────
  const handleExport = useCallback(async () => {
    setBackupStatus('exporting');
    setStatusMsg('Preparando backup…');
    try {
      const backup = { version: '2.0', date: new Date().toISOString(), data: {} };

      for (const { key } of EXPORT_KEYS) {
        try {
          const val = await fetchStoreKey(key);
          if (val !== null) backup.data[key] = val;
        } catch {}
      }

      const counts = Object.entries(backup.data).map(
        ([k, v]) => `${k.replace('siso_', '').replace('_drcucalon', '')}: ${Array.isArray(v) ? v.length : 1}`
      );
      backup.summary = counts;
      backup.sha256 = await sha256(JSON.stringify(backup.data));
      backup.integrity = 'SHA-256 — Ley 527/1999 art. 7';

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `backup_ocupasalud_${new Date().toISOString().split('T')[0]}.json`,
      });
      a.click();
      URL.revokeObjectURL(url);

      setBackupStatus('success');
      setStatusMsg(`✅ Backup exportado: ${counts.length} colecciones`);
    } catch (err) {
      setBackupStatus('error');
      setStatusMsg(`❌ Error: ${err.message}`);
    }
  }, []);

  // ── Import Backup ────────────────────────────────────────────────
  // Soporta 4 formatos:
  //   1. { version, date, data: { siso_patients_drcucalon: [...] } }  — esta app v2.0
  //   2. { version, backupDate, patients: [...], companies: [...] }    — monolito OcupaSalud legacy
  //   3. { _meta: { ... }, data: { patients: [...] } }                 — formato _meta
  //   4. { version, data: { siso_db_patients: [...] } }               — monolito v2 con data{}
  const handleImport = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBackupStatus('importing');
    setStatusMsg('Leyendo archivo…');
    setImportProgress(0);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      // Verificar SHA-256 si existe
      if (backup.sha256 && backup.data) {
        const computed = await sha256(JSON.stringify(backup.data));
        if (computed !== backup.sha256) {
          if (!window.confirm(
            '⚠️ La integridad SHA-256 del backup no coincide.\n' +
            'El archivo puede estar modificado o corrompido.\n\n¿Continuar de todas formas?'
          )) {
            setBackupStatus(null);
            setStatusMsg('');
            event.target.value = '';
            return;
          }
        }
      }

      // ── Normalizar a { KEY: VALUE } ──
      let rawData = {};

      if (backup.version && backup.data && typeof backup.data === 'object' && !Array.isArray(backup.data)) {
        // Formato v2.0 (esta app o monolito con data{})
        rawData = backup.data;
      } else if (backup._meta && backup._meta.data) {
        // Formato _meta
        const src = backup._meta.data;
        if (src.patients)          rawData['siso_db_patients']            = src.patients;
        if (src.db_patients)       rawData['siso_db_patients']            = src.db_patients;
        if (src.companies)         rawData['siso_companies']              = src.companies;
        if (src.users)             rawData['siso_users']                  = src.users;
        if (src.agenda)            rawData['siso_agendados']              = src.agenda;
        if (src.agendados)         rawData['siso_agendados']              = src.agendados;
        if (src.bills)             rawData['siso_saved_bills']            = src.bills;
        if (src.facturas)          rawData['siso_saved_bills']            = src.facturas;
        if (src.doctor)            rawData['siso_doctor_data_drcucalon']  = src.doctor;
        if (src.mensajes)          rawData['siso_mensajes']               = src.mensajes;
        if (src.arl)               rawData['siso_arl_reportes']           = src.arl;
        if (src.ai_config)         rawData['siso_ai_config_provider']     = src.ai_config;
        if (src.doctor_signature)  rawData['siso_doctor_signature']       = src.doctor_signature;
      } else if (backup.patients || backup.companies || backup.aiConfig) {
        // Formato legacy monolito: { version, backupDate, patients: [...], aiConfig: {...}, ... }
        // Claves en snake_case
        if (backup.patients)         rawData['siso_db_patients']            = backup.patients;
        if (backup.db_patients)      rawData['siso_db_patients']            = backup.db_patients;
        if (backup.companies)        rawData['siso_companies']              = backup.companies;
        if (backup.users)            rawData['siso_users']                  = backup.users;
        if (backup.agenda)           rawData['siso_agendados']              = backup.agenda;
        if (backup.agendados)        rawData['siso_agendados']              = backup.agendados;
        if (backup.bills)            rawData['siso_saved_bills']            = backup.bills;
        if (backup.facturas)         rawData['siso_saved_bills']            = backup.facturas;
        if (backup.doctor)           rawData['siso_doctor_data_drcucalon']  = backup.doctor;
        if (backup.mensajes)         rawData['siso_mensajes']               = backup.mensajes;
        if (backup.arl)              rawData['siso_arl_reportes']           = backup.arl;
        if (backup.ai_config)        rawData['siso_ai_config_provider']     = backup.ai_config;
        if (backup.doctor_signature) rawData['siso_doctor_signature']       = backup.doctor_signature;
        // Claves camelCase del monolito OcupaSalud v3.x
        if (backup.aiConfig)           rawData['siso_ai_config_provider']     = backup.aiConfig;
        if (backup.savedBills)         rawData['siso_saved_bills']            = backup.savedBills;
        if (backup.savedReports)       rawData['siso_saved_reports']          = backup.savedReports;
        if (backup.atencionesCerradas) rawData['siso_atenciones_cerradas']    = backup.atencionesCerradas;
        if (backup.customMedicamentos) rawData['siso_custom_meds']            = backup.customMedicamentos;
        if (backup.propuestas)         rawData['siso_cotizaciones']           = backup.propuestas;
        if (backup.habeasData)         rawData['siso_privacidad_aceptada']    = backup.habeasData;
        if (backup.sgsst)              rawData['siso_sgsst_drcucalon']        = backup.sgsst;
        // Cualquier clave siso_ directa
        for (const [k, v] of Object.entries(backup)) {
          if (k.startsWith('siso_') && !rawData[k]) rawData[k] = v;
        }
      } else {
        throw new Error(
          'Formato de backup no reconocido.\n' +
          'Formatos soportados: monolito OcupaSalud, refactorizado v2.0, _meta.'
        );
      }

      if (Object.keys(rawData).length === 0) {
        throw new Error('El archivo de backup no contiene datos.');
      }

      // ── Remap claves monolito → claves refactorizadas ──
      const remappedData = {};
      for (const [srcKey, value] of Object.entries(rawData)) {
        const destKey = MONOLITH_KEY_MAP[srcKey] ?? srcKey;
        if (!remappedData[destKey]) remappedData[destKey] = value;
      }

      const entries = Object.entries(remappedData);

      // ── MERGE INTELIGENTE: verificar qué ya existe en Supabase ──
      setStatusMsg('Analizando datos existentes en Supabase…');
      const toWrite   = [];   // claves vacías en Supabase → se importan
      const toSkip    = [];   // claves con datos → se omiten

      for (const [key, value] of entries) {
        const existing = await fetchStoreKey(key);
        const hasData = existing !== null && (
          !Array.isArray(existing) || existing.length > 0
        );
        if (hasData) {
          const label = key.replace('siso_', '').replace('_drcucalon', '');
          const cnt = Array.isArray(existing) ? existing.length : 1;
          toSkip.push({ key, label, cnt });
        } else {
          const label = key.replace('siso_', '').replace('_drcucalon', '');
          const cnt = Array.isArray(value) ? value.length : 1;
          toWrite.push({ key, value, label, cnt });
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
        setBackupStatus(null);
        setStatusMsg('');
        event.target.value = '';
        return;
      }

      // ── Escribir solo los que están vacíos ──
      let ok = 0;
      let fail = 0;
      for (let i = 0; i < toWrite.length; i++) {
        const { key, value } = toWrite[i];
        const success = await upsertStoreKey(key, value);
        if (success) ok++; else fail++;
        setImportProgress(Math.round(((i + 1) / toWrite.length) * 100));
        setStatusMsg(`Importando… ${i + 1}/${toWrite.length} (${toWrite[i].label})`);
      }

      const skipCount = toSkip.length;

      // ── Aplicar config IA al Zustand store si fue importada ──
      // El modal de IA lee de useAIStore (Zustand/localStorage), no de Supabase.
      // Si importamos siso_ai_config_provider, actualizamos el store directamente.
      const aiImported = toWrite.find(x => x.key === 'siso_ai_config_provider');
      if (aiImported && aiImported.value && typeof aiImported.value === 'object') {
        try {
          const aiCfg = aiImported.value;
          const { setActiveProvider, setKey } = useAIStore.getState();
          if (aiCfg.activeProvider) setActiveProvider(aiCfg.activeProvider);
          if (aiCfg.keys && typeof aiCfg.keys === 'object') {
            for (const [provider, key] of Object.entries(aiCfg.keys)) {
              if (key) setKey(provider, key);
            }
          }
        } catch (e) {
          console.warn('No se pudo actualizar AI store:', e.message);
        }
      }

      setBackupStatus('success');
      setStatusMsg(
        fail > 0
          ? `✅ ${ok} importadas · ⚠️ ${fail} con error · ⏭️ ${skipCount} omitidas (ya tenían datos)` +
            (aiImported ? ' · 🤖 Claves API restauradas' : '')
          : `✅ ${ok} colecciones importadas · ⏭️ ${skipCount} omitidas` +
            (aiImported ? ' · 🤖 Claves API restauradas — abre Config IA para verlas' : '')
      );

      // Refrescar conteos
      await loadCounts();
    } catch (err) {
      setBackupStatus('error');
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      event.target.value = '';
    }
  }, [loadCounts]);

  // ════════════════════════════════════════════════════════════════
  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-100 p-2.5 rounded-xl">
          <Settings className="w-6 h-6 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-lg font-black text-gray-800">Configuración</h1>
          <p className="text-xs text-gray-500">Backup, restauración y ajustes del sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Backup / Restore Card ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-black text-gray-800">Backup y Restauración</h2>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Exporta o importa todos los datos del sistema en formato JSON.
            El backup incluye pacientes, empresas, agenda, facturación y configuración.
            <span className="block mt-1 text-emerald-600 font-semibold">
              ✅ Compatible con backups del monolito OcupaSalud.
            </span>
          </p>

          <div className="flex gap-3 mb-4">
            <button
              onClick={handleExport}
              disabled={backupStatus === 'exporting'}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              {backupStatus === 'exporting'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              Exportar Backup
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={backupStatus === 'importing'}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-emerald-700 border-2 border-emerald-300 px-4 py-3 rounded-lg text-xs font-bold hover:bg-emerald-50 disabled:opacity-50"
            >
              {backupStatus === 'importing'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Upload className="w-4 h-4" />}
              Importar Backup
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>

          {/* Progress bar */}
          {backupStatus === 'importing' && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-200"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          )}

          {/* Status message */}
          {statusMsg && (
            <div className={`flex items-start gap-2 text-xs p-2.5 rounded-lg ${
              backupStatus === 'success' ? 'bg-green-50 text-green-700' :
              backupStatus === 'error'   ? 'bg-red-50 text-red-700' :
                                          'bg-blue-50 text-blue-700'
            }`}>
              {backupStatus === 'success' ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> :
               backupStatus === 'error'   ? <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> :
                                           <Loader2 className="w-3.5 h-3.5 mt-0.5 animate-spin shrink-0" />}
              <span>{statusMsg}</span>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3">
            🔒 Integridad verificada con SHA-256 (Ley 527/1999 art. 7)
          </p>
        </div>

        {/* ── Datos del Sistema ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-black text-gray-800">Datos del Sistema</h2>
            </div>
            <button
              onClick={loadCounts}
              disabled={loadingCounts}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600 disabled:opacity-40"
              title="Actualizar conteos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCounts ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2">
            {DISPLAY_KEYS.map(({ label }) => {
              const count = systemCounts[label];
              const isEmpty = count === null || count === undefined;
              return (
                <div
                  key={label}
                  className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0"
                >
                  <span className="text-xs font-medium text-gray-600">{label}</span>
                  <span className={`text-xs font-bold ${
                    loadingCounts ? 'text-gray-300' :
                    isEmpty       ? 'text-gray-400' :
                                    'text-emerald-700'
                  }`}>
                    {loadingCounts ? '…' : isEmpty ? 'Vacío' : `${count} registros`}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Datos almacenados en Supabase (nube). Importa un backup del monolito para poblar los vacíos.
          </p>
        </div>
      </div>
    </div>
  );
}
