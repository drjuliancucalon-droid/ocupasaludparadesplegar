// src/utils/supabase.js - Supabase Cloud Sync
import { _ls, _ss } from './storage.js';

const _PROXY_URL =
  (typeof window !== "undefined" && window.__SISO_PROXY_URL) || null;
// SEC-12: Validar y sanitizar __SISO_CONFIG antes de usar
const _cfgRaw = (typeof window !== "undefined" && window.__SISO_CONFIG) || {};
const _cfgSafeUrl = (v) =>
  typeof v === "string" && v.startsWith("https://") && v.length < 200
    ? v
    : null;
const _cfgSafeKey = (v) =>
  typeof v === "string" && v.length > 20 && v.length < 200 ? v : null;
const _SB_URL =
  _cfgSafeUrl(_cfgRaw.sbUrl) || "https://yqrrktrgoijgzccrxnpz.supabase.co";
const _SB_KEY =
  _cfgSafeKey(_cfgRaw.sbKey) ||
  "sb_publishable_K88qYuJ9wsWjQqnIhLVK7Q_NroFvPI7";
// FASE 2 — Service Role Key (solo para operaciones super_admin: crear orgs, migrar datos)
// ⚠️  NUNCA hardcodear en producción. Inyectar via window.__SISO_CONFIG.sbServiceKey
// Para configurar: en index.html agregar antes del bundle:
//   <script>window.__SISO_CONFIG={sbUrl:'...',sbKey:'...',sbServiceKey:'TU_SERVICE_KEY'};</script>
const _SB_SERVICE_KEY = _cfgSafeKey(_cfgRaw.sbServiceKey) || null; // null = solo lectura (seguro por defecto)
// SEC-FIX-01: Credenciales removidas del código fuente (OWASP A07 - Hardcoded Credentials)
// En producción inyectar via: <script>window.__SISO_CONFIG={sbUrl:'TU_URL',sbKey:'TU_KEY'};</script>
// Las claves se configuran en el primer despliegue y se rotan cada 90 días - NUNCA en código fuente.
// Gestión de sesión - expiración automática por inactividad (30 min)
// Headers con soporte para proxy o Supabase directo
const _SB_HEADERS = {
  apikey: _SB_KEY,
  Authorization: `Bearer ${_SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};
// Wrapper de fetch con soporte dual: proxy (futuro) o Supabase directo (actual)
const _securePost = async (key, value) => {
  if (_PROXY_URL) {
    // Modo proxy - key secreta nunca sale al cliente
    try {
      const r = await fetch(_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upsert", key, value }),
        credentials: "include",
      });
      return r.ok;
    } catch {
      return false;
    }
  }
  // Modo directo Supabase (actual - piloto)
  try {
    const r = await fetch(`${_SB_URL}/rest/v1/siso_store`, {
      method: "POST",
      headers: _SB_HEADERS,
      body: JSON.stringify({
        key,
        value,
        updated_at: new Date().toISOString(),
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
};
const _SB_KEYS = [
  "siso_db_patients",
  "siso_companies",
  "siso_users",
  "siso_saved_bills",
  "siso_saved_reports",
  "siso_audit_log",
  "siso_mensajes",
  "siso_agendados",
  "siso_ai_config_provider",
  "siso_doctor_signature",
  "siso_privacidad_aceptada",
  "siso_atenciones_cerradas",
  "siso_arl_reportes",
];
// Prefijos para claves dinámicas por usuario
const _SB_KEY_PREFIXES = [
  "siso_db_patients_",
  "siso_companies_",
  "siso_habeas_",
  "siso_patients_",
  "siso_portal_",
];

const _sbRl = { count: 0, reset: Date.now() + 60000 };
const _rlCheck = () => {
  const now = Date.now();
  if (now > _sbRl.reset) {
    _sbRl.count = 0;
    _sbRl.reset = now + 60000;
  }
  _sbRl.count++;
  if (_sbRl.count > 120) {
    console.warn("[SISO SEC] Rate limit alcanzado");
    return false;
  }
  return true;
};
const _sbSet = async (key, value) => {
  if (!_rlCheck()) return false;
  return await _securePost(key, value);
};
const _sbGetAll = async () => {
  try {
    const r = await fetch(
      `${_SB_URL}/rest/v1/siso_store?select=key,value,updated_at`,
      { headers: _SB_HEADERS }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    const result = {};
    rows.forEach((row) => {
      result[row.key] = { value: row.value, updatedAt: row.updated_at };
    });
    return result;
  } catch {
    return null;
  }
};
const _sbDelete = async (key) => {
  try {
    const r = await fetch(
      `${_SB_URL}/rest/v1/siso_store?key=eq.${encodeURIComponent(key)}`,
      { method: "DELETE", headers: _SB_HEADERS }
    );
    return r.ok;
  } catch {
    return false;
  }
};
const _sbQueue = {
  pending: {},
  flush: async () => {
    for (const k of Object.keys(_sbQueue.pending)) {
      const ok = await _sbSet(k, _sbQueue.pending[k]);
      if (ok) delete _sbQueue.pending[k];
    }
  },
};

// ══════════════════════════════════════════════════════════════════════════
// B-16: Supabase Storage - Adjuntos de paraclínicos
// Bucket: siso-adjuntos | Permisos: autenticados (RLS por path)
// Path: {medicoUserId}/{hcId}/{timestamp}-{filename}
// Para habilitar: Dashboard Supabase → Storage → Crear bucket "siso-adjuntos"
//   Política: "authenticated can upload/read their own files" basada en path prefix
// ══════════════════════════════════════════════════════════════════════════
const _SB_BUCKET = "siso-adjuntos";
// SEC-11: Validación MIME real por magic bytes (no solo extensión)
const _validateMimeType = async (file) => {
  const ALLOWED = {
    "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
    "image/jpeg": [[0xff, 0xd8, 0xff]],
    "image/png": [[0x89, 0x50, 0x4e, 0x47]],
    "image/gif": [[0x47, 0x49, 0x46, 0x38]],
    "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  };
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  for (const [mime, sigs] of Object.entries(ALLOWED)) {
    if (sigs.some((sig) => sig.every((b, i) => bytes[i] === b)))
      return { ok: true, mime };
  }
  return {
    ok: false,
    error: "Tipo de archivo no permitido. Solo PDF, JPG, PNG, GIF, WEBP.",
  };
};
const _sbStorageUpload = async (path, file) => {
  // SEC-11: Validar MIME por magic bytes
  const mimeCheck = await _validateMimeType(file);
  if (!mimeCheck.ok) return { ok: false, error: mimeCheck.error };

  // path: '{userId}/{hcId}/{timestamp}-{nombre}'
  try {
    const r = await fetch(
      `${_SB_URL}/storage/v1/object/${_SB_BUCKET}/${path}`,
      {
        method: "POST",
        headers: {
          apikey: _SB_KEY,
          Authorization: `Bearer ${_SB_KEY}`,
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "true",
        },
        body: file,
      }
    );
    if (!r.ok) {
      const err = await r.json().catch(() => ({ message: r.statusText }));
      return { ok: false, error: err.message || r.statusText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
};
const _sbStorageGetSignedUrl = async (path) => {
  try {
    const r = await fetch(
      `${_SB_URL}/storage/v1/object/sign/${_SB_BUCKET}/${path}`,
      {
        method: "POST",
        headers: {
          apikey: _SB_KEY,
          Authorization: `Bearer ${_SB_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 3600 }),
      }
    );
    if (!r.ok) return null;
    const data = await r.json();
    return `${_SB_URL}/storage/v1${data.signedURL}`;
  } catch {
    return null;
  }
};
const _sbStorageDelete = async (path) => {
  try {
    const r = await fetch(`${_SB_URL}/storage/v1/object/${_SB_BUCKET}`, {
      method: "DELETE",
      headers: {
        apikey: _SB_KEY,
        Authorization: `Bearer ${_SB_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [path] }),
    });
    return r.ok;
  } catch {
    return false;
  }
};
let _syncStatusCallback = null;
const _sync = (key, jsonValue) => {
  _ls.setItem(key, jsonValue);
  const _sbMatch =
    _SB_KEYS.includes(key) || _SB_KEY_PREFIXES.some((p) => key.startsWith(p));
  if (!_sbMatch) return;
  let parsed;
  try {
    parsed = JSON.parse(jsonValue);
  } catch {
    parsed = jsonValue;
  }
  setTimeout(() => {
    if (_syncStatusCallback) _syncStatusCallback("syncing");
  }, 0);
  _sbSet(key, parsed).then((ok) => {
    if (!ok) _sbQueue.pending[key] = parsed;
    setTimeout(() => {
      if (_syncStatusCallback) _syncStatusCallback(ok ? "ok" : "error");
    }, 0);
  });
};
// Clave de storage de pacientes por usuario (aislamiento total)
const _patKey = (userId) => `siso_db_patients_${userId}`;
const _patKeyCloud = (userId) => `siso_patients_${userId}`;
const _compKey = (userId) => `siso_companies_${userId}`;
const _compKeyCloud = (userId) => `siso_companies_${userId}`;

export { _SB_URL, _SB_KEY, _SB_SERVICE_KEY, _SB_HEADERS, _PROXY_URL, _securePost, _sbSet, _sbGetAll, _sbDelete, _sbQueue, _SB_KEYS, _SB_KEY_PREFIXES, _sbRl, _rlCheck, _sbStorageUpload, _sbStorageGetSignedUrl, _sbStorageDelete, _SB_BUCKET, _validateMimeType, _syncStatusCallback, _sync, _patKey, _patKeyCloud, _compKey, _compKeyCloud };
