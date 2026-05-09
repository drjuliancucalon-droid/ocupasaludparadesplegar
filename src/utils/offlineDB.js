// ═══════════════════════════════════════════════════════════════
// SISO OcupaSalud — offlineDB.js v1.0
// Base de datos IndexedDB local para modo offline completo.
// Espejo exacto de las claves de Supabase/localStorage actuales.
// NO rompe ningún código existente — agrega capacidad offline.
// ═══════════════════════════════════════════════════════════════

const DB_NAME    = 'siso_offline_db';
const DB_VERSION = 1;

// Stores (tablas) que espejamos localmente
const STORES = {
  // Datos clínicos principales
  kv_store:      { keyPath: 'key' },          // espejo de siso_store de Supabase
  // Cola de operaciones pendientes de sincronizar
  sync_queue:    { keyPath: 'id', autoIncrement: true },
  // Cola de logs de auditoría pendientes
  audit_queue:   { keyPath: 'id', autoIncrement: true },
  // Metadatos de sincronización (timestamps por clave)
  sync_meta:     { keyPath: 'key' },
};

let _db = null;

// ── Abrir / inicializar la base de datos ─────────────────────────
const openDB = () => new Promise((resolve, reject) => {
  if (_db) return resolve(_db);

  const req = indexedDB.open(DB_NAME, DB_VERSION);

  req.onupgradeneeded = (event) => {
    const db = event.target.result;
    Object.entries(STORES).forEach(([name, opts]) => {
      if (!db.objectStoreNames.contains(name)) {
        db.createObjectStore(name, opts);
        console.log('[SISO DB] Store creado:', name);
      }
    });
  };

  req.onsuccess = (event) => {
    _db = event.target.result;
    _db.onversionchange = () => { _db.close(); _db = null; };
    console.log('[SISO DB] IndexedDB lista — versión', DB_VERSION);
    resolve(_db);
  };

  req.onerror = (event) => {
    console.error('[SISO DB] Error al abrir IndexedDB:', event.target.error);
    reject(event.target.error);
  };
});

// ── Helper: ejecutar transacción ──────────────────────────────────
const withStore = async (storeName, mode, fn) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
};

// ── KV STORE — espejo de siso_store ──────────────────────────────

/**
 * Guarda un valor en IndexedDB (equivale a localStorage.setItem)
 * @param {string} key - clave SISO (ej: "siso_db_patients_abc123")
 * @param {*} value - valor (se guarda como JSON)
 * @param {string} [updatedAt] - timestamp ISO (opcional)
 */
export const idbSet = async (key, value, updatedAt = null) => {
  try {
    await withStore('kv_store', 'readwrite', store =>
      store.put({ key, value, updatedAt: updatedAt || new Date().toISOString() })
    );
    return true;
  } catch (e) {
    console.warn('[SISO DB] idbSet error:', key, e);
    return false;
  }
};

/**
 * Lee un valor de IndexedDB (equivale a localStorage.getItem)
 * @param {string} key
 * @returns {*} value o null si no existe
 */
export const idbGet = async (key) => {
  try {
    const row = await withStore('kv_store', 'readonly', store => store.get(key));
    return row ? row.value : null;
  } catch (e) {
    console.warn('[SISO DB] idbGet error:', key, e);
    return null;
  }
};

/**
 * Elimina una clave de IndexedDB
 */
export const idbDelete = async (key) => {
  try {
    await withStore('kv_store', 'readwrite', store => store.delete(key));
    return true;
  } catch { return false; }
};

/**
 * Obtiene todas las claves y sus timestamps (para diff con Supabase)
 * @returns {{ [key]: { value, updatedAt } }}
 */
export const idbGetAll = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv_store', 'readonly');
      const store = tx.objectStore('kv_store');
      const req = store.getAll();
      req.onsuccess = () => {
        const result = {};
        req.result.forEach(row => {
          result[row.key] = { value: row.value, updatedAt: row.updatedAt };
        });
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[SISO DB] idbGetAll error:', e);
    return {};
  }
};

// ── SYNC QUEUE — cola de operaciones offline pendientes ───────────

/**
 * Agrega una operación a la cola de sync (cuando no hay internet)
 * @param {'upsert'|'delete'} operation
 * @param {string} key
 * @param {*} value
 */
export const enqueueSync = async (operation, key, value = null) => {
  try {
    await withStore('sync_queue', 'readwrite', store =>
      store.add({
        operation,
        key,
        value,
        ts: new Date().toISOString(),
        retries: 0,
      })
    );
    // Registrar para Background Sync cuando vuelva internet
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg?.sync) {
        await reg.sync.register('siso-sync-queue').catch(() => {});
      }
    }
    return true;
  } catch (e) {
    console.warn('[SISO DB] enqueueSync error:', e);
    return false;
  }
};

/**
 * Lee y vacía la cola de sync
 * @returns {Array} lista de operaciones pendientes
 */
export const drainSyncQueue = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const items = [];
      const cursor = store.openCursor();
      cursor.onsuccess = (e) => {
        const c = e.target.result;
        if (c) {
          items.push({ id: c.key, ...c.value });
          c.continue();
        } else {
          // Borrar todos los procesados
          items.forEach(item => store.delete(item.id));
          resolve(items);
        }
      };
      cursor.onerror = () => reject(cursor.error);
    });
  } catch (e) {
    console.warn('[SISO DB] drainSyncQueue error:', e);
    return [];
  }
};

/**
 * Cuenta cuántas operaciones hay pendientes en la cola
 */
export const countSyncQueue = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const req = tx.objectStore('sync_queue').count();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => resolve(0);
    });
  } catch { return 0; }
};

// ── AUDIT QUEUE — cola de logs pendientes de enviar al servidor ───

/**
 * Agrega un log de auditoría a la cola local
 */
export const enqueueAuditLog = async (entry) => {
  try {
    await withStore('audit_queue', 'readwrite', store =>
      store.add({ ...entry, queuedAt: new Date().toISOString() })
    );
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg?.sync) {
        await reg.sync.register('siso-audit-queue').catch(() => {});
      }
    }
    return true;
  } catch { return false; }
};

/**
 * Lee y vacía la cola de auditoría
 */
export const drainAuditQueue = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('audit_queue', 'readwrite');
      const store = tx.objectStore('audit_queue');
      const items = [];
      const cursor = store.openCursor();
      cursor.onsuccess = (e) => {
        const c = e.target.result;
        if (c) { items.push({ id: c.key, ...c.value }); c.continue(); }
        else    { items.forEach(i => store.delete(i.id)); resolve(items); }
      };
      cursor.onerror = () => resolve([]);
    });
  } catch { return []; }
};

// ── SYNC META — timestamps de última sincronización por clave ─────

export const setSyncMeta = async (key, serverTimestamp) => {
  try {
    await withStore('sync_meta', 'readwrite', store =>
      store.put({ key, serverTs: serverTimestamp, localTs: new Date().toISOString() })
    );
  } catch {}
};

export const getSyncMeta = async (key) => {
  try {
    const row = await withStore('sync_meta', 'readonly', store => store.get(key));
    return row || null;
  } catch { return null; }
};

// ── Utilidad: verificar si IndexedDB está disponible ─────────────
export const isIndexedDBAvailable = () => {
  try { return typeof indexedDB !== 'undefined' && indexedDB !== null; }
  catch { return false; }
};

// ── Limpiar toda la base de datos (solo para logout seguro) ──────
export const clearOfflineDB = async () => {
  try {
    const db = await openDB();
    const stores = Array.from(db.objectStoreNames);
    await Promise.all(
      stores.map(name => new Promise((resolve) => {
        const tx = db.transaction(name, 'readwrite');
        const req = tx.objectStore(name).clear();
        req.onsuccess = resolve;
        req.onerror   = resolve; // no fallar en logout
      }))
    );
    console.log('[SISO DB] Base de datos offline limpiada (logout)');
    return true;
  } catch (e) {
    console.warn('[SISO DB] Error al limpiar DB:', e);
    return false;
  }
};

export { openDB };
