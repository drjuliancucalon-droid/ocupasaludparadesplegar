// ═══════════════════════════════════════════════════════════════
// SISO OcupaSalud — syncManager.js v1.0
// Cerebro de la sincronización híbrida Online ↔ Offline
//
// PRINCIPIO: Supabase es la fuente de verdad.
//            IndexedDB es el espejo local.
//            La app siempre lee de IndexedDB (rápido, offline-safe).
//            Supabase actualiza IndexedDB cuando hay conexión.
//
// COMPATIBILIDAD: No rompe nada existente.
//   Las funciones de supabase.js siguen funcionando igual.
//   syncManager las envuelve opcionalmente.
// ═══════════════════════════════════════════════════════════════

import {
  idbGet, idbSet, idbDelete, idbGetAll,
  enqueueSync, drainSyncQueue,
  enqueueAuditLog, drainAuditQueue,
  countSyncQueue, setSyncMeta, getSyncMeta,
  clearOfflineDB,
} from './offlineDB.js';

import {
  _sbSet, _sbGetAll, _sbDelete, _SB_URL, _SB_KEY,
} from './supabase.js';

// ─────────────────────────────────────────────────────────────────
// FIX 2026-06-05: D1 AUTORITATIVO en sync periódico
// Antes este módulo descargaba TODO de Supabase y sobreescribía
// IndexedDB + localStorage. Cuando D1 tenía datos más nuevos que SB
// (por cierres de HC recientes), el sync de SB devolvía datos viejos
// y SOBREESCRIBÍA los nuevos. Esto causaba pérdida sistemática de
// pacientes, atenciones, informes y publicaciones al portal.
// AHORA: sync periódico lee de D1. SB queda como backup de escritura
// pero NUNCA como fuente de lectura para sobrescribir local.
// ─────────────────────────────────────────────────────────────────
const _D1_WORKER_URL = () =>
  (typeof window !== 'undefined' && window.__SISO_CONFIG?.workerUrl) || '';
const _D1_WORKER_TOKEN = () =>
  (typeof window !== 'undefined' && window.__SISO_CONFIG?.workerToken) || '';

// Descarga TODAS las claves siso_* de Worker D1.
// Devuelve formato compatible con _sbGetAll: { key: { value, updatedAt } }
// FIX 2026-07-12: usa ?raw=1 — el worker salta el JSON.parse por fila
// (~1900 filas con el volumen actual) y devuelve el texto crudo; el parse
// se hace aquí, en el cliente, donde sobra CPU/tiempo (a diferencia del
// límite de 10ms del Workers Free Tier). Cambio opt-in: ningún otro
// llamador de /store/prefix en el monolito pasa raw=1, así que su
// comportamiento no cambia.
const _d1GetAll = async () => {
  const W = _D1_WORKER_URL();
  const TOK = _D1_WORKER_TOKEN();
  if (!W || !TOK) return null;
  try {
    const r = await fetch(`${W}/store/prefix/siso_?raw=1`, {
      headers: { 'X-Siso-Token': TOK },
    });
    if (!r.ok) return null;
    const rows = await r.json();
    const out = {};
    for (const row of (rows || [])) {
      let value = row.value;
      if (row._raw && typeof value === 'string') {
        try { value = JSON.parse(value); } catch { /* dejar como string; se ignora igual que un valor no reconocido */ }
      }
      out[row.key] = {
        value,
        updatedAt:
          (value && typeof value === 'object' && value.updatedAt) ||
          row.ts ||
          row.updatedAt ||
          new Date().toISOString(),
      };
    }
    return out;
  } catch { return null; }
};

// Lee una clave específica de D1 (para refresh en background)
const _d1Get = async (key) => {
  const W = _D1_WORKER_URL();
  const TOK = _D1_WORKER_TOKEN();
  if (!W || !TOK) return null;
  try {
    const r = await fetch(`${W}/store/${encodeURIComponent(key)}`, {
      headers: { 'X-Siso-Token': TOK },
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d[0]?.value ?? null;
  } catch { return null; }
};

// ── Estado interno del sync manager ──────────────────────────────
const _state = {
  isSyncing:     false,
  lastSyncAt:    null,
  lastFullSyncAt: 0,          // AUDITORÍA 2026-07-11: throttle de la FASE 2 (ver syncNow)
  pendingCount:  0,
  listeners:     new Set(),   // callbacks que reciben actualizaciones de estado
  syncInterval:  null,
};
// AUDITORÍA 2026-07-11: /store/prefix/siso_ devuelve ~54MB y tarda hasta
// 22s con el volumen actual de datos — es una descarga completa de casi
// toda la base, no un diff. syncNow() se dispara desde varios triggers
// (evento 'online', timeout inicial, intervalo periódico) que pueden
// solaparse en segundos, multiplicando ese costo y siendo la causa más
// probable de los 503/timeouts intermitentes reportados. Este cooldown
// evita repetir la FASE 2 (descarga D1) si ya corrió hace poco — las
// fases 1 y 3 (cola offline, auditoría) siguen corriendo siempre.
const _FULL_SYNC_MIN_GAP_MS = 3 * 60 * 1000;

// ── Notificar a la app del estado de sincronización ──────────────
const _notify = (status, detail = {}) => {
  const payload = { status, pendingCount: _state.pendingCount, lastSyncAt: _state.lastSyncAt, ...detail };
  _state.listeners.forEach(fn => { try { fn(payload); } catch {} });
};

/**
 * Suscribirse a actualizaciones del estado de sync.
 * @param {function} fn - callback({ status, pendingCount, lastSyncAt })
 * @returns {function} unsuscribe
 */
export const onSyncStatus = (fn) => {
  _state.listeners.add(fn);
  return () => _state.listeners.delete(fn);
};

// ── LECTURA HÍBRIDA ───────────────────────────────────────────────
/**
 * Lee un valor con estrategia: IndexedDB primero, Supabase en background.
 * Si no hay IndexedDB, va directo a localStorage (compatibilidad total).
 *
 * @param {string} key - clave SISO
 * @param {*} fallback - valor por defecto si no existe
 * @returns {Promise<*>} valor
 */
export const hybridGet = async (key, fallback = null) => {
  // 1. Intentar IndexedDB primero (instantáneo, funciona offline)
  try {
    const idbVal = await idbGet(key);
    if (idbVal !== null) {
      // En background, verificar si D1 tiene algo más reciente
      // FIX 2026-06-05: cambio _refreshFromSupabase → _refreshFromD1
      if (navigator.onLine) {
        _refreshFromD1(key).catch(() => {});
      }
      return idbVal;
    }
  } catch {}

  // 2. Fallback: localStorage (compatibilidad con código existente)
  try {
    const lsVal = localStorage.getItem(key);
    if (lsVal) {
      const parsed = JSON.parse(lsVal);
      // Guardar en IndexedDB para próxima vez
      idbSet(key, parsed).catch(() => {});
      return parsed;
    }
  } catch {}

  // 3. Sin datos locales → intentar D1 primero (autoritativo), SB fallback
  if (navigator.onLine) {
    try {
      const d1Val = await _d1Get(key);
      if (d1Val !== null) {
        await idbSet(key, d1Val);
        return d1Val;
      }
      // Fallback Supabase si D1 vacío
      const sbData = await _fetchFromSupabase(key);
      if (sbData !== null) {
        await idbSet(key, sbData);
        return sbData;
      }
    } catch {}
  }

  return fallback;
};

/**
 * Guarda un valor con estrategia híbrida:
 * Siempre → IndexedDB + localStorage (respaldo inmediato)
 * Si online → también Supabase
 * Si offline → encolar para sync posterior
 *
 * @param {string} key
 * @param {*} value
 * @returns {Promise<{ok: boolean, source: string}>}
 */
export const hybridSet = async (key, value) => {
  // 1. Guardar localmente de inmediato (el usuario no espera)
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  await idbSet(key, value);

  // 2. Si hay internet → sincronizar a Supabase ahora
  if (navigator.onLine) {
    const ok = await _sbSet(key, value).catch(() => false);
    if (ok) {
      await setSyncMeta(key, new Date().toISOString());
      _state.lastSyncAt = new Date().toISOString();
      _notify('synced', { key });
      return { ok: true, source: 'supabase' };
    }
  }

  // 3. Sin internet o error → encolar para sync posterior
  await enqueueSync('upsert', key, value);
  _state.pendingCount = await countSyncQueue();
  _notify('queued', { key, pending: _state.pendingCount });
  return { ok: true, source: 'offline-queued' };
};

/**
 * Elimina una clave con estrategia híbrida
 */
export const hybridDelete = async (key) => {
  try { localStorage.removeItem(key); } catch {}
  await idbDelete(key);

  if (navigator.onLine) {
    const ok = await _sbDelete(key).catch(() => false);
    if (ok) return { ok: true, source: 'supabase' };
  }

  await enqueueSync('delete', key);
  _state.pendingCount = await countSyncQueue();
  _notify('queued', { key, pending: _state.pendingCount });
  return { ok: true, source: 'offline-queued' };
};

// ── SINCRONIZACIÓN COMPLETA ───────────────────────────────────────
/**
 * Sincronización bidireccional completa:
 * 1. Vaciar cola offline → Supabase (cambios locales pendientes)
 * 2. Descargar novedades de Supabase → IndexedDB (cambios remotos)
 *
 * Se llama automáticamente al recuperar conexión.
 * También disponible para llamar manualmente.
 */
export const syncNow = async () => {
  if (_state.isSyncing || !navigator.onLine) return;
  _state.isSyncing = true;
  _notify('syncing');

  let errors = 0;

  try {
    // FASE 1: Subir cola offline a Supabase
    const queue = await drainSyncQueue();
    console.log(`[SISO SYNC] Procesando ${queue.length} operaciones pendientes...`);

    for (const op of queue) {
      try {
        if (op.operation === 'upsert') {
          await _sbSet(op.key, op.value);
          await setSyncMeta(op.key, new Date().toISOString());
        } else if (op.operation === 'delete') {
          await _sbDelete(op.key);
        }
      } catch {
        // Si falla, re-encolar
        await enqueueSync(op.operation, op.key, op.value);
        errors++;
      }
    }

    // FASE 2: Descargar novedades de D1 → IndexedDB (D1 PRIMARIO)
    // FIX 2026-06-05: cambio de _sbGetAll() a _d1GetAll() — D1 autoritativo.
    // Esto elimina el bug de sobrescritura donde SB tenía datos viejos y
    // los metía sobre datos nuevos en local.
    // AUDITORÍA 2026-07-11: throttle — ver _FULL_SYNC_MIN_GAP_MS arriba.
    const _sinceFull = Date.now() - _state.lastFullSyncAt;
    if (_sinceFull < _FULL_SYNC_MIN_GAP_MS) {
      console.log(`[SISO SYNC] Descarga completa omitida (hace ${Math.round(_sinceFull / 1000)}s, cooldown ${_FULL_SYNC_MIN_GAP_MS / 1000}s)`);
    } else {
    _state.lastFullSyncAt = Date.now();
    let cloudData = await _d1GetAll().catch(() => null);
    let fuente = 'D1';
    // FIX 2026-07-12 (V15): NUNCA hacer fallback a Supabase.
    // Si D1 no responde, SALTAR este ciclo completamente.
    // Supabase tiene datos viejos que sobreescribirían IndexedDB
    // y causarían pérdida de datos recientes.
    if (!cloudData) {
      console.warn('[SISO SYNC] D1 no disponible — ciclo de descarga saltado. Datos locales preservados.');
      _notify('d1-unavailable');
      _state.isSyncing = false;
      return;
    }
    if (cloudData) {
      const localData = await idbGetAll();
      let updated = 0;

      for (const [key, cloudEntry] of Object.entries(cloudData)) {
        const localEntry = localData[key];
        const cloudTs = new Date(cloudEntry.updatedAt || 0).getTime();
        const locTs   = new Date(localEntry?.updatedAt || 0).getTime();

        // Cloud más reciente → actualizar local
        if (!localEntry || cloudTs > locTs) {
          await idbSet(key, cloudEntry.value, cloudEntry.updatedAt);
          try { localStorage.setItem(key, JSON.stringify(cloudEntry.value)); } catch {}
          updated++;
        }
      }

      if (updated > 0) {
        console.log(`[SISO SYNC] ${updated} claves actualizadas desde ${fuente}`);
        _notify('updated', { count: updated });
      }
    }
    } // fin del cooldown de la FASE 2

    // FASE 3: Flush audit queue
    await _flushAuditQueue();

    _state.pendingCount = await countSyncQueue();
    _state.lastSyncAt = new Date().toISOString();
    _notify(errors > 0 ? 'partial' : 'synced');
    console.log('[SISO SYNC] Sincronización completa ✓');

  } catch (e) {
    console.error('[SISO SYNC] Error en sincronización:', e);
    _notify('error');
  } finally {
    _state.isSyncing = false;
  }
};

// ── AUDIT LOG HÍBRIDO ─────────────────────────────────────────────
/**
 * Registra un evento de auditoría.
 * Si hay internet → va directo a Supabase.
 * Si no hay internet → se encola en IndexedDB.
 * SIEMPRE se guarda también en localStorage (respaldo).
 */
export const hybridAuditLog = async (action, user, detail = '', extra = {}) => {
  const entry = {
    ts:         new Date().toISOString(),
    action:     String(action),
    user:       String(user || 'anonymous'),
    detail:     String(detail),
    ua:         navigator.userAgent.substring(0, 120),
    modulo:     extra.modulo || '',
    registro_id:extra.registroId || '',
    online:     navigator.onLine,
  };

  // 1. Guardar en localStorage (respaldo siempre disponible)
  try {
    const logs = JSON.parse(localStorage.getItem('siso_audit_log') || '[]');
    logs.push(entry);
    if (logs.length > 500) logs.splice(0, logs.length - 500);
    localStorage.setItem('siso_audit_log', JSON.stringify(logs));
  } catch {}

  // 2. Si hay internet → subir directo a Supabase
  if (navigator.onLine) {
    const ok = await _pushAuditToSupabase(entry).catch(() => false);
    if (ok) return;
  }

  // 3. Sin internet → encolar en IndexedDB
  await enqueueAuditLog(entry);
};

// ── HELPERS INTERNOS ──────────────────────────────────────────────

// Refresca una clave específica desde D1 en background (D1 PRIMARIO).
// FIX 2026-06-05: antes _refreshFromSupabase descargaba SB y sobreescribía
// local. Ahora descarga D1 y SOLO actualiza local si D1 tiene datos.
const _refreshFromD1 = async (key) => {
  const d1Val = await _d1Get(key);
  if (d1Val === null) return;
  await idbSet(key, d1Val);
  try { localStorage.setItem(key, JSON.stringify(d1Val)); } catch {}
};

// Legacy: mantenido por compatibilidad con código que pueda referenciarlo.
// Ya NO se usa en hybridGet (reemplazado por _refreshFromD1).
const _refreshFromSupabase = async (key) => {
  const sbData = await _fetchFromSupabase(key);
  if (sbData === null) return;

  const meta = await getSyncMeta(key);
  if (!meta || !meta.serverTs) {
    await idbSet(key, sbData);
    try { localStorage.setItem(key, JSON.stringify(sbData)); } catch {}
  }
};

// Fetch de una clave específica desde Supabase
const _fetchFromSupabase = async (key) => {
  try {
    const r = await fetch(
      `${_SB_URL}/rest/v1/siso_store?key=eq.${encodeURIComponent(key)}&select=value,updated_at`,
      { headers: { apikey: _SB_KEY, Authorization: `Bearer ${_SB_KEY}` } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    if (rows?.[0]?.value !== undefined) {
      await setSyncMeta(key, rows[0].updated_at);
      return rows[0].value;
    }
    return null;
  } catch { return null; }
};

// Enviar log de auditoría a Supabase (tabla siso_audit_log)
const _pushAuditToSupabase = async (entry) => {
  try {
    // Por ahora usa siso_store con key especial hasta que exista tabla dedicada
    // TODO: Migrar a tabla siso_audit_log cuando se cree en Supabase
    const existing = await _fetchFromSupabase('siso_audit_log_server') || [];
    const updated = Array.isArray(existing) ? [...existing, entry] : [entry];
    // Mantener solo últimos 1000 en la nube
    const trimmed = updated.slice(-1000);
    return await _sbSet('siso_audit_log_server', trimmed);
  } catch { return false; }
};

// Vaciar cola de auditoría pendiente
const _flushAuditQueue = async () => {
  const pending = await drainAuditQueue();
  for (const entry of pending) {
    await _pushAuditToSupabase(entry).catch(() => {});
  }
};

// ── INICIALIZACIÓN AUTOMÁTICA ─────────────────────────────────────
/**
 * Inicializa el sync manager.
 * Llama esto en main.jsx una sola vez al iniciar la app.
 */
export const initSyncManager = () => {
  // Escuchar cuando vuelve la conexión → sincronizar
  window.addEventListener('online', () => {
    console.log('[SISO SYNC] Conexión recuperada — iniciando sync...');
    _notify('reconnected');
    setTimeout(syncNow, 1000); // 1s de espera para estabilizar la red
  });

  window.addEventListener('offline', () => {
    console.log('[SISO SYNC] Sin conexión — modo offline activado');
    _notify('offline');
  });

  // Escuchar mensajes del Service Worker (Background Sync)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SISO_SYNC_NOW') {
        console.log('[SISO SYNC] Sync solicitado por Service Worker');
        syncNow().catch(() => {});
      }
    });
  }

  // Sync periódico cada 10 minutos (cuando hay internet y la pestaña está
  // activa). AUDITORÍA 2026-07-11: antes 5 min — junto con el cooldown de
  // _FULL_SYNC_MIN_GAP_MS reduce cuánto se repite la descarga completa de
  // ~54MB que hoy tardaba hasta 22s.
  _state.syncInterval = setInterval(() => {
    if (document.hidden) return;
    if (navigator.onLine && !_state.isSyncing) {
      syncNow().catch(() => {});
    }
  }, 10 * 60 * 1000);

  // Sync inicial al cargar (si hay internet)
  if (navigator.onLine) {
    setTimeout(() => syncNow().catch(() => {}), 3000);
  }

  // Actualizar contador de pendientes al iniciar
  countSyncQueue().then(count => {
    _state.pendingCount = count;
    if (count > 0) {
      console.log(`[SISO SYNC] ${count} operaciones en cola — se sincronizarán al conectar`);
      _notify('pending', { pending: count });
    }
  });

  console.log('[SISO SYNC] SyncManager inicializado ✓');
};

/**
 * Detener el sync manager (al hacer logout)
 */
export const stopSyncManager = async () => {
  if (_state.syncInterval) {
    clearInterval(_state.syncInterval);
    _state.syncInterval = null;
  }
  await clearOfflineDB();
  _state.listeners.clear();
  console.log('[SISO SYNC] SyncManager detenido y datos offline limpiados');
};

export { _state as syncState };
