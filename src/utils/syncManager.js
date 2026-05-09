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

// ── Estado interno del sync manager ──────────────────────────────
const _state = {
  isSyncing:     false,
  lastSyncAt:    null,
  pendingCount:  0,
  listeners:     new Set(),   // callbacks que reciben actualizaciones de estado
  syncInterval:  null,
};

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
      // En background, verificar si Supabase tiene algo más reciente
      if (navigator.onLine) {
        _refreshFromSupabase(key).catch(() => {});
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

  // 3. Sin datos locales → intentar Supabase (si hay internet)
  if (navigator.onLine) {
    try {
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

    // FASE 2: Descargar novedades de Supabase → IndexedDB
    const sbData = await _sbGetAll().catch(() => null);
    if (sbData) {
      const localData = await idbGetAll();
      let updated = 0;

      for (const [key, sbEntry] of Object.entries(sbData)) {
        const localEntry = localData[key];
        const sbTs  = new Date(sbEntry.updatedAt || 0).getTime();
        const locTs = new Date(localEntry?.updatedAt || 0).getTime();

        // Supabase más reciente → actualizar local
        if (!localEntry || sbTs > locTs) {
          await idbSet(key, sbEntry.value, sbEntry.updatedAt);
          try { localStorage.setItem(key, JSON.stringify(sbEntry.value)); } catch {}
          updated++;
        }
      }

      if (updated > 0) {
        console.log(`[SISO SYNC] ${updated} claves actualizadas desde Supabase`);
        _notify('updated', { count: updated });
      }
    }

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

// Refresca una clave específica desde Supabase en background
const _refreshFromSupabase = async (key) => {
  const sbData = await _fetchFromSupabase(key);
  if (sbData === null) return;

  const meta = await getSyncMeta(key);
  // Solo actualizar si Supabase tiene datos más recientes
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

  // Sync periódico cada 5 minutos (cuando hay internet)
  _state.syncInterval = setInterval(() => {
    if (navigator.onLine && !_state.isSyncing) {
      syncNow().catch(() => {});
    }
  }, 5 * 60 * 1000);

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
