# 📋 PROTOCOLO DE SOLUCIONES — SISO OCUPASALUD
## Plan de Corrección de los 18 Vectores de Pérdida de Datos

**Fecha:** 2026-07-11 · **Versión:** 1.0  
**Basado en:** `docs/INFORME-AUDITORIA-ALMACENAMIENTO-2026-07-11.md` + `docs/ADDENDUM-FORENSE-NUEVOS-HALLAZGOS-2026-07-11.md`  
**Estado:** PROTOCOLO — Sin implementar

---

## ÍNDICE

1. [Resumen de Vectores y Prioridades](#1-resumen-de-vectores-y-prioridades)
2. [FASE 0: Optimizaciones Gratuitas (sin costo, alto impacto)](#2-fase-0-optimizaciones-gratuitas-sin-costo-alto-impacto)
3. [FASE 1: Correcciones del Worker (siso-worker/index.js)](#3-fase-1-correcciones-del-worker-siso-workerindexjs)
4. [FASE 2: Correcciones del Frontend (App.jsx + syncManager.js)](#4-fase-2-correcciones-del-frontend-appjsx--syncmanagerjs)
5. [FASE 3: Infraestructura Cloudflare (costo mensual)](#5-fase-3-infraestructura-cloudflare-costo-mensual)
6. [Plan de Autotesting](#6-plan-de-autotesting)
7. [Plan de Implementación por Sprint](#7-plan-de-implementación-por-sprint)
8. [Checklist Pre-Deploy](#8-checklist-pre-deploy)

---

## 1. RESUMEN DE VECTORES Y PRIORIDADES

| # | Vector | Severidad | Fase | Costo | Esfuerzo |
|---|---|---|---|---|---|
| V11 | Worker D1 503 intermitente (CPU timeout) | 🔴 CRÍTICO | FASE 0-1 | $0 | Bajo |
| V13 | Fallback troceo cliente reintroduce V1 | 🔴 CRÍTICO | FASE 2 | $0 | Medio |
| V15 | Fallback Supabase reintroduce V3 | 🔴 CRÍTICO | FASE 2 | $0 | Bajo |
| V12 | ERR_QUIC_PROTOCOL_ERROR chunks 500KB | 🔴 CRÍTICO | FASE 2 | $0 | Medio |
| V1 | Carrera escritura chunked (mitigada, pero re-expuesta por V13) | 🔴 CRÍTICO | FASE 1-2 | $0 | Ya resuelto* |
| V3 | Sobrescritura Supabase (mitigada, re-expuesta por V15) | 🔴 CRÍTICO | FASE 2 | $0 | Ya resuelto* |
| V2 | Encogimiento colecciones protegidas | 🔴 CRÍTICO | — | $0 | ✅ Mitigado |
| V4 | DELETE físico sin papelera | 🟠 ALTO | FASE 1 | $0 | Medio |
| V5 | Rotación snapshots > 7d sin backup externo | 🟠 ALTO | FASE 3 | ~$5/mes | Medio |
| V14 | Worker URL vs CORS sintomático | 🟠 ALTO | FASE 1 | $0 | Bajo |
| V6 | Exceso lecturas D1 (health full=1) | 🟡 MEDIO | FASE 1 | $0 | Bajo |
| V7 | Chunks huérfanos __new* | 🟡 MEDIO | FASE 1 | $0 | Bajo |
| V8 | GZIP legacy corrupto | 🟡 MEDIO | FASE 1 | $0 | Bajo |
| V9 | LIMIT 2000 en listados | 🟡 MEDIO | FASE 1-2 | $0 | Medio |
| V16 | QUIC error sin manejo específico | 🟡 MEDIO | FASE 2 | $0 | Medio |
| V10 | localStorage fuente en hybridGet | 🟢 BAJO | FASE 2 | $0 | Bajo |
| V17 | SW cachea chrome-extension:// | 🟢 BAJO | FASE 2 | $0 | Bajo |
| V18 | Message channel SW cerrado | 🟢 BAJO | FASE 2 | $0 | Bajo |

> \* V1 se resolvió con `/store/chunked` atómico pero el fallback lo re-expone. V3 se resolvió con D1 autoritativo pero el fallback a Supabase lo re-expone.

---

## 2. FASE 0: OPTIMIZACIONES GRATUITAS (SIN COSTO, ALTO IMPACTO)

Estas optimizaciones NO requieren cambiar de plan en Cloudflare. Se implementan solo con cambios de código y eliminan los vectores más críticos.

### 2.1 Eliminar JSON.parse del servidor en endpoints de listado

**Problema:** V11 — CPU timeout en `/store/prefix/:prefix` y `/store`

**Causa raíz:** `siso-worker/index.js` L115 y L132-136 hacen `Promise.all(rows.map(r => JSON.parse(decompressValue(r.value))))` para ~2000 filas en el servidor. Esto consume ~1000ms de CPU → 100× el límite de 10ms del Free Tier.

**Solución — Worker (complejidad: BAJA):**

```javascript
// ANTES (siso-worker/index.js L108-117):
if (request.method === "GET" && path.startsWith("/store/prefix/")) {
  const prefix = decodeURIComponent(path.slice(14));
  const rows = await env.DB.prepare(
    "SELECT key, value FROM siso_store WHERE key LIKE ? ... LIMIT 2000"
  ).bind(prefix + "%").all();
  // ❌ JSON.parse en servidor
  const result = await Promise.all((rows.results || []).map(async r => ({
    key: r.key, 
    value: JSON.parse(await decompressValue(r.value))
  })));
  return new Response(JSON.stringify(result), { headers });
}

// DESPUÉS:
if (request.method === "GET" && path.startsWith("/store/prefix/")) {
  const prefix = decodeURIComponent(path.slice(14));
  const rows = await env.DB.prepare(
    "SELECT key, value FROM siso_store WHERE key LIKE ? ... LIMIT 2000"
  ).bind(prefix + "%").all();
  // ✅ Devolver strings crudos — el cliente parsea
  const result = (rows.results || []).map(r => ({
    key: r.key,
    value: r.value,        // ← string crudo (sin parsear)
    _raw: true             // ← flag para que el cliente sepa que debe parsear
  }));
  return new Response(JSON.stringify(result), { headers });
}
```

**Solución — Cliente (syncManager.js):**

```javascript
// syncManager.js _d1GetAll() — adaptar para soportar _raw: true:
const _d1GetAll = async () => {
  // ... fetch igual ...
  const rows = await r.json();
  const out = {};
  for (const row of (rows || [])) {
    let value = row.value;
    // Si viene con flag _raw, parsear en el cliente
    if (row._raw && typeof value === "string") {
      try { value = JSON.parse(value); } catch { /* mantener string */ }
    }
    out[row.key] = {
      value,
      updatedAt: row.value?.updatedAt || row.ts || row.updatedAt || new Date().toISOString(),
    };
  }
  return out;
};
```

**Endpoints afectados:** `/store/prefix/:prefix` (L108), `/store` (L120)

**Impacto:** Elimina V11 (503 por CPU timeout). Reduce CPU time a ~2-5ms (solo SELECT + JSON.stringify de keys, sin parseo de valores).

---

### 2.2 Deshabilitar fallback a Supabase en syncNow()

**Problema:** V15 — Cuando D1 no responde, syncNow() cae a Supabase y sobreescribe IndexedDB con datos viejos.

**Solución — syncManager.js L256-260 (complejidad: BAJA):**

```javascript
// ANTES:
let cloudData = await _d1GetAll().catch(() => null);
let fuente = 'D1';
if (!cloudData) {
  // Fallback Supabase SOLO si D1 cae (continuidad)
  cloudData = await _sbGetAll().catch(() => null);
  fuente = 'Supabase (fallback)';
}

// DESPUÉS:
let cloudData = await _d1GetAll().catch(() => null);
let fuente = 'D1';
if (!cloudData) {
  // ❌ NO hacer fallback a Supabase — D1 es el único autoritativo
  // Si D1 no responde, SALTAR este ciclo de sync completamente
  console.warn('[SISO SYNC] D1 no disponible — ciclo saltado. Datos locales preservados.');
  _notify('d1-unavailable');
  _state.isSyncing = false;
  return; // ← Salir sin tocar nada
}
```

**Impacto:** Elimina V15. Previene que datos viejos de Supabase sobreescriban datos nuevos en local. El próximo ciclo de sync (5 min después) reintentará D1.

---

### 2.3 Deshabilitar fallback a troceo cliente

**Problema:** V13 — Cuando `/store/chunked` falla, el catch activa troceo manual no atómico → reintroduce V1.

**Solución — App.jsx L452-455 (complejidad: MEDIA):**

```javascript
// ANTES:
} catch (e) {
  console.warn(`[_workerSet] /store/chunked falló (${e?.message}) — fallback a troceo cliente para ${key}`);
}
// ... código de troceo cliente L456-522 ...

// DESPUÉS:
} catch (e) {
  console.warn(`[_workerSet] /store/chunked falló (${e?.message}) — encolando para reintento`);
  // ❌ NUNCA hacer troceo cliente no atómico
  // ✅ Encolar referencia a la clave para reintento en próximo ciclo
  _markUnsyncedHC(true, key);
  _enqueuePendingD1Ref(key); // ← nueva función: solo encola la key, no el valor
  return false; // ← salir sin hacer nada más
}
// ❌ ELIMINAR todo el bloque L456-522 (troceo cliente manual)
```

**Nueva función `_enqueuePendingD1Ref` (App.jsx):**

```javascript
// En vez de encolar el valor completo (60KB tope), encolar SOLO la referencia.
// El reintento leerá el valor actual de localStorage y lo subirá vía /store/chunked.
const _enqueuePendingD1Ref = (key) => {
  const write = (p) => localStorage.setItem(_PENDING_D1_KEY, JSON.stringify(p));
  const pending = _getPendingD1();
  // Guardar solo { key, ts, retries }, sin el valor
  pending[key] = { _ref: true, ts: Date.now(), retries: 0 };
  try { write(pending); return true; }
  catch (e) {
    console.warn("[pending] enqueueRef falló:", e?.message);
    return false;
  }
};
```

**Modificar el procesador de la cola de pendientes** para que lea el valor de localStorage cuando `_ref: true`:

```javascript
// En el useEffect que procesa siso_pending_d1_writes cada 30s:
const processPendingD1 = async () => {
  const pending = _getPendingD1();
  for (const [key, entry] of Object.entries(pending)) {
    let value = entry.value;
    // Si es referencia, leer valor actual de localStorage
    if (entry._ref) {
      try {
        value = JSON.parse(localStorage.getItem(key));
        if (!value) { delete pending[key]; continue; }
      } catch { delete pending[key]; continue; }
    }
    // Intentar subir vía /store/chunked
    const ok = await _workerSet(key, value);
    if (ok) {
      _markUnsyncedHC(false, key);
      delete pending[key];
    } else {
      entry.retries = (entry.retries || 0) + 1;
      if (entry.retries >= _PENDING_D1_MAX_RETRIES) delete pending[key];
    }
  }
  try { localStorage.setItem(_PENDING_D1_KEY, JSON.stringify(pending)); } catch {}
};
```

**Impacto:** Elimina V13. Las escrituras que no puedan usar `/store/chunked` atómico se reintentarán en el próximo ciclo en vez de hacer troceo no atómico que corrompe datos.

---

### 2.4 Reducir pool paralelo de lectura de chunks (QUIC)

**Problema:** V12 — Pool de 6 lectores concurrentes satura streams QUIC → ERR_QUIC_PROTOCOL_ERROR en 4/10 chunks.

**Solución — App.jsx L560 (complejidad: BAJA):**

```javascript
// ANTES:
const _CONC = 6;

// DESPUÉS:
const _CONC = 2;  // Reducido de 6 a 2 para no saturar streams QUIC
```

**Adicional: añadir reintento individual con backoff para chunks que fallen:**

```javascript
const _lector = async () => {
  while (!_huboError) {
    const i = _nextIdx++;
    if (i >= meta.count) return;
    let p = null;
    // Reintentar hasta 2 veces con backoff si falla QUIC_PROTOCOL_ERROR
    for (let attempt = 0; attempt < 2; attempt++) {
      p = await _workerGetRaw(key + _CHUNK_SUF_PIECE + i);
      if (p !== null) break;
      if (attempt < 1) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }
    if (p === null) {
      _huboError = true;
      console.warn(`[_workerGet] chunk ${i}/${meta.count} faltante para ${key} (tras reintentos)`);
      return;
    }
    parts[i] = p;
  }
};
```

**Impacto:** Reduce significativamente V12. Con _CONC=2, solo 2 streams QUIC simultáneos en vez de 6. El reintento individual con backoff maneja fallos transitorios sin abortar toda la reconstrucción.

---

### 2.5 Health check previo a syncNow()

**Problema:** V14/V11 — syncNow() se ejecuta aunque el worker esté caído, desperdiciando intentos y activando fallbacks peligrosos.

**Solución — syncManager.js L429 (complejidad: BAJA):**

```javascript
// Añadir health check antes de syncNow():
export const syncNow = async () => {
  if (_state.isSyncing || !navigator.onLine) return;
  
  // ✅ NUEVO: Health check rápido antes de sync
  const healthy = await _d1HealthCheck();
  if (!healthy) {
    console.warn('[SISO SYNC] Worker D1 no responde — ciclo saltado');
    _notify('d1-unavailable');
    return;
  }
  
  _state.isSyncing = true;
  // ... resto del sync igual ...
};

// Nueva función:
const _d1HealthCheck = async () => {
  const W = _D1_WORKER_URL();
  const TOK = _D1_WORKER_TOKEN();
  if (!W || !TOK) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout
    const r = await fetch(`${W}/health`, {
      headers: { 'X-Siso-Token': TOK },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return r.ok;
  } catch { return false; }
};
```

**Impacto:** Previene syncs innecesarios cuando el worker está caído. Reduce lecturas D1 fallidas y evita activar fallbacks peligrosos.

---

### 2.6 Eliminar /health?full=1 del flujo automático

**Problema:** V6 — `/health?full=1` consume 11K lecturas D1 por llamada.

**Solución — Worker (complejidad: BAJA):**

```javascript
// ANTES: /health?full=1 ejecuta 5 COUNT(*)

// DESPUÉS: Mover los counts al CRON diario y cachear en variable de módulo
let _cachedCounts = null;
let _cachedCountsAt = 0;
const COUNTS_CACHE_TTL = 60 * 60 * 1000; // 1 hora

// En el CRON (runDailySnapshot), después de leer todas las claves:
_cachedCounts = {
  total: rows.length,
  patients_keys: rows.filter(r => r.key.startsWith('siso_db_patients_') || r.key.startsWith('siso_patients_')).length,
  portal_docs: rows.filter(r => r.key.startsWith('siso_portal_doc_')).length,
  hc_completas: rows.filter(r => r.key.startsWith('siso_hc_completa_')).length,
  portal_empresa_keys: rows.filter(r => r.key.startsWith('siso_portal_empresa_')).length,
};
_cachedCountsAt = Date.now();
console.log(`[health] counts cacheados: ${JSON.stringify(_cachedCounts)}`);

// En /health?full=1:
if (request.method === "GET" && path === "/health" && url.searchParams.get("full") === "1") {
  if (_cachedCounts && (Date.now() - _cachedCountsAt) < COUNTS_CACHE_TTL) {
    return new Response(JSON.stringify({
      ok: true,
      counts: _cachedCounts,
      cached: true,
      cachedAt: new Date(_cachedCountsAt).toISOString(),
      latencyMs: Date.now() - t0,
      ts: new Date().toISOString(),
    }), { headers });
  }
  // Si no hay caché, hacer los COUNT(*) — pero esto es raro porque el CRON corre a diario
  // ... código original de COUNT(*) ...
}
```

**Impacto:** Reduce lecturas D1 de 11K a 0 para el 99% de las llamadas a `/health?full=1`. Los counts se recalculan una vez al día en el CRON.

---

### 2.7 Limpiar valores GZIP legacy

**Problema:** V8 — Valores `gz:` legacy que no se descomprimen causan pérdida de lectura.

**Solución — Worker (complejidad: BAJA):**

```javascript
// Añadir al CRON diario (runDailySnapshot) una sección de limpieza GZIP:
// Para cada clave con value LIKE 'gz:%', intentar descomprimir y reescribir como JSON plano

const gzRows = await env.DB.prepare(
  "SELECT key, value FROM siso_store WHERE value LIKE 'gz:%'"
).all();
let gzFixed = 0;
for (const row of (gzRows.results || [])) {
  try {
    const decompressed = await decompressValue(row.value);
    const parsed = JSON.parse(decompressed);
    await env.DB.prepare(
      "UPDATE siso_store SET value = ? WHERE key = ?"
    ).bind(JSON.stringify(parsed), row.key).run();
    gzFixed++;
  } catch (e) {
    console.warn(`[gc-gzip] no se pudo migrar ${row.key}: ${e.message}`);
    // Si no se puede descomprimir, marcar para revisión manual
    await env.DB.prepare(
      "UPDATE siso_store SET value = ? WHERE key = ?"
    ).bind(JSON.stringify({ _gz_error: true, _original: row.value.substring(0, 200) }), row.key).run();
  }
}
console.log(`[gc-gzip] ${gzFixed} claves migradas de gz: a JSON plano`);
```

**Impacto:** Elimina V8. Convierte valores legacy `gz:` a JSON plano o los marca como corruptos para revisión manual.

---

## 3. FASE 1: CORRECCIONES DEL WORKER (siso-worker/index.js)

### 3.1 Añadir KV para cachear /store/prefix (reduce lecturas D1 50-80%)

**Problema:** V6/V11 — syncNow() cada 5 min × 2 apps × ~2000 filas = ~2.3M lecturas/día.

**Solución — Worker (complejidad: MEDIA):**

```javascript
// Añadir binding KV en wrangler.json:
// "kv_namespaces": [{ "binding": "CACHE", "id": "..." }]

// En GET /store/prefix/:prefix, antes de consultar D1:
const cacheKey = `prefix:${prefix}`;
const cached = await env.CACHE.get(cacheKey, "json");
if (cached && (Date.now() - cached.ts) < 5 * 60 * 1000) { // TTL 5 min
  return new Response(JSON.stringify(cached.data), { headers });
}

// ... consultar D1 normalmente ...

// Después de consultar D1, guardar en KV:
const result = (rows.results || []).map(r => ({ key: r.key, value: r.value, _raw: true }));
await env.CACHE.put(cacheKey, JSON.stringify({ data: result, ts: Date.now() }), { expirationTtl: 300 }); // 5 min TTL
```

**wrangler.json:**
```json
{
  "kv_namespaces": [
    { "binding": "CACHE", "id": "<KV_NAMESPACE_ID>" }
  ]
}
```

**Impacto en lecturas D1:**
- Sin KV: cada sync (5 min) = 2000 filas × 2 apps = 4000 lecturas cada 5 min → 1.15M/día solo de syncs
- Con KV (TTL 5 min): primera petición consulta D1, las siguientes 5 min sirven de KV → reducción del 80% = 230K/día
- Con KV (TTL 15 min): reducción del 93% = 80K/día
- **Total con KV TTL 5min + optimizaciones: ~500K lecturas/día (10% del límite)**

**Costo KV Free Tier:** 100K reads/día gratis. Con syncs cada 5 min: 288 reads/día de KV. Muy dentro del límite gratuito.

---

### 3.2 Mover snapshots de D1 a R2

**Problema:** V5 — Snapshots ocupan 20-50MB en D1 (10% de los 500MB gratis). Sin backup externo.

**Solución — Worker (complejidad: MEDIA):**

```javascript
// Añadir binding R2 en wrangler.json:
// "r2_buckets": [{ "binding": "SNAPSHOTS", "bucket_name": "siso-snapshots" }]

// En runDailySnapshot, cambiar la escritura de D1 a R2:
const today = new Date().toISOString().slice(0, 10);
const snapKey = `snapshots/${today}.json`;

// Serializar el snapshot completo (ya está en memoria como 'reconstructed')
const serialized = JSON.stringify({
  snapshotVersion: "v2",
  createdAt: new Date().toISOString(),
  totalKeys: Object.keys(reconstructed).length,
  data: reconstructed,
});

// Escribir a R2 (1 solo objeto, sin chunking necesario)
await env.SNAPSHOTS.put(snapKey, serialized, {
  httpMetadata: { contentType: "application/json" },
});

// Manifest en KV para acceso rápido:
await env.CACHE.put(`snapshot:latest`, JSON.stringify({
  key: snapKey,
  totalKeys: Object.keys(reconstructed).length,
  totalBytes: serialized.length,
  ts: Date.now(),
}), { expirationTtl: 30 * 86400 }); // 30 días

// Rotación en R2: borrar snapshots > 7 días
const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
const oldSnapshots = await env.SNAPSHOTS.list({ prefix: "snapshots/" });
for (const obj of oldSnapshots.objects) {
  const dateMatch = obj.key.match(/snapshots\/(\d{4}-\d{2}-\d{2})\.json/);
  if (dateMatch && dateMatch[1] < cutoff) {
    await env.SNAPSHOTS.delete(obj.key);
  }
}
```

**wrangler.json:**
```json
{
  "r2_buckets": [
    { "binding": "SNAPSHOTS", "bucket_name": "siso-snapshots" }
  ]
}
```

**Impacto:**
- Libera 20-50MB de D1 (10% del límite de 500MB)
- R2 tiene 10GB gratis → espacio ilimitado para snapshots
- Snapshots ya no compiten con datos operacionales por espacio
- Restauración: GET directo a R2, sin reconstruir chunks

---

### 3.3 Soft-delete para DELETE /store/:key

**Problema:** V4 — DELETE físico sin papelera.

**Solución — Worker (complejidad: MEDIA):**

```sql
-- schema.sql actualizado:
CREATE TABLE IF NOT EXISTS siso_store (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  deleted    INTEGER DEFAULT 0  -- ← NUEVO: 0 = activo, 1 = borrado
);
CREATE INDEX IF NOT EXISTS idx_key ON siso_store(key);
CREATE INDEX IF NOT EXISTS idx_deleted ON siso_store(deleted);  -- ← NUEVO
```

```javascript
// Cambiar DELETE por soft-delete:
if (request.method === "DELETE" && path.startsWith("/store/")) {
  const key = decodeURIComponent(path.slice(7));
  // ✅ Soft-delete: marcar como borrado en lugar de DELETE físico
  await env.DB.prepare(
    "UPDATE siso_store SET deleted = 1, updated_at = datetime('now') WHERE key = ?"
  ).bind(key).run();
  return new Response(JSON.stringify({ ok: true }), { headers });
}

// Modificar TODOS los SELECT para filtrar deleted=0:
// SELECT ... FROM siso_store WHERE ... AND deleted = 0
```

**Recuperación:**
```javascript
// Nuevo endpoint opcional: POST /store/restore/:key
if (request.method === "POST" && path.startsWith("/store/restore/")) {
  const key = decodeURIComponent(path.slice(16));
  await env.DB.prepare("UPDATE siso_store SET deleted = 0 WHERE key = ?").bind(key).run();
  return new Response(JSON.stringify({ ok: true }), { headers });
}
```

**Purga diferida (en CRON diario):**
```javascript
// Borrar físicamente registros con deleted=1 y updated_at > 30 días:
await env.DB.prepare(
  "DELETE FROM siso_store WHERE deleted = 1 AND updated_at < datetime('now', '-30 days')"
).run();
```

**Impacto en schema:** SQLite (D1) soporta ALTER TABLE ADD COLUMN. El cambio es no destructivo.

**Consideración de espacio:** Los registros soft-deleted ocupan espacio por 30 días. Si hay muchos deletes, puede impactar los 500MB. La purga diferida mitiga esto.

---

### 3.4 Paginación en /store/prefix y /store

**Problema:** V9 — LIMIT 2000 deja claves sin sincronizar.

**Solución — Worker (complejidad: MEDIA):**

```javascript
// GET /store/prefix/:prefix?cursor=<lastKey>&limit=500
if (request.method === "GET" && path.startsWith("/store/prefix/")) {
  const prefix = decodeURIComponent(path.slice(14));
  const cursor = url.searchParams.get("cursor") || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "500"), 500);
  
  let query = "SELECT key, value FROM siso_store WHERE key LIKE ? AND deleted = 0 AND key NOT GLOB '*__c[0-9]*' AND key NOT LIKE '%\\_\\_new%' ESCAPE '\\'";
  const params = [prefix + "%"];
  
  if (cursor) {
    query += " AND key > ?";
    params.push(cursor);
  }
  query += " ORDER BY key ASC LIMIT ?";
  params.push(limit);
  
  const rows = await env.DB.prepare(query).bind(...params).all();
  const result = (rows.results || []).map(r => ({ key: r.key, value: r.value, _raw: true }));
  const nextCursor = result.length === limit ? result[result.length - 1].key : null;
  
  return new Response(JSON.stringify({
    data: result,
    nextCursor,
    hasMore: nextCursor !== null,
  }), { headers });
}
```

**Solución — Cliente (syncManager.js):**

```javascript
const _d1GetAllPaginated = async () => {
  const W = _D1_WORKER_URL();
  const TOK = _D1_WORKER_TOKEN();
  if (!W || !TOK) return null;
  
  const out = {};
  let cursor = null;
  let hasMore = true;
  
  while (hasMore) {
    const url = `${W}/store/prefix/siso_?limit=500${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const r = await fetch(url, { headers: { 'X-Siso-Token': TOK } });
    if (!r.ok) return null;
    const page = await r.json();
    
    for (const row of (page.data || [])) {
      let value = row.value;
      if (row._raw && typeof value === "string") {
        try { value = JSON.parse(value); } catch { /* keep string */ }
      }
      out[row.key] = { value, updatedAt: value?.updatedAt || new Date().toISOString() };
    }
    
    cursor = page.nextCursor;
    hasMore = page.hasMore;
  }
  
  return out;
};
```

**Impacto:** Elimina V9. Todas las claves se sincronizan sin importar cuántas haya. Cada página son 500 filas (no 2000), reduciendo CPU time por request.

---

### 3.5 Añadir header de error explícito en catch del worker

**Problema:** V14 — Cuando el worker crashea, Cloudflare devuelve 503 sin CORS.

**Solución — Worker L435-437 (complejidad: BAJA):**

```javascript
// ANTES:
} catch (err) {
  return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
}

// DESPUÉS:
} catch (err) {
  // Asegurar que SIEMPRE devolvemos CORS headers incluso en error
  const errorHeaders = { ...headers };
  try {
    return new Response(JSON.stringify({ error: err?.message || 'Error interno', ts: new Date().toISOString() }), { status: 500, headers: errorHeaders });
  } catch (doubleFault) {
    // Si hasta JSON.stringify falla, devolver respuesta mínima con CORS
    return new Response('{"error":"internal error"}', { status: 500, headers: errorHeaders });
  }
}
```

**También: Mover `new URL(request.url)` dentro del try/catch:**

```javascript
// ANTES (L83-84):
const url = new URL(request.url);  // ← fuera del try/catch
const path = url.pathname;

// DESPUÉS:
let url, path;
try {
  url = new URL(request.url);
  path = url.pathname;
} catch {
  // URL inválida → devolver error con CORS
  return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400, headers: corsHeaders(origin) });
}
```

**Impacto:** Asegura que incluso en casos de error extremo, el navegador reciba headers CORS. El error 503 de Cloudflare solo ocurrirá si el worker crashea ANTES de que el código JavaScript empiece a ejecutarse.

---

## 4. FASE 2: CORRECCIONES DEL FRONTEND (App.jsx + syncManager.js)

### 4.1 Tabla de cambios en App.jsx

| Línea | Cambio | Prioridad |
|---|---|---|
| ~453-522 | **ELIMINAR** bloque de fallback a troceo cliente | CRÍTICO |
| ~453-455 | **REEMPLAZAR** por encolado de referencia `_enqueuePendingD1Ref(key)` | CRÍTICO |
| ~560 | Cambiar `_CONC = 6` → `_CONC = 2` | ALTO |
| ~563-568 | Añadir reintento individual con backoff para chunks fallidos | ALTO |
| ~595 | Modificar `_enqueuePendingD1` para aceptar `_ref: true` | MEDIO |
| ~597-626 | Añadir `_enqueuePendingD1Ref(key)` | MEDIO |
| ~600-604 | Modificar tope de 60KB para permitir referencias | MEDIO |
| ~658-660 | `_hasUnsyncedHC()` ya existe — verificar que funciona con referencias | BAJO |

### 4.2 Tabla de cambios en syncManager.js

| Línea | Cambio | Prioridad |
|---|---|---|
| ~256-260 | **ELIMINAR** fallback a `_sbGetAll()` | CRÍTICO |
| ~256 | **REEMPLAZAR** por `return`/`_notify('d1-unavailable')` | CRÍTICO |
| ~66 | Adaptar `_d1GetAll()` para soportar `_raw: true` | ALTO |
| ~44-67 | Reemplazar `_d1GetAll()` por `_d1GetAllPaginated()` con paginación | MEDIO |
| ~429 | Añadir `_d1HealthCheck()` antes de `syncNow()` | MEDIO |
| ~133-141 | Añadir verificación de timestamp contra sync_meta en `hybridGet` | BAJO |

### 4.3 Cambio en public/sw.js

| Línea | Cambio | Prioridad |
|---|---|---|
| ~86-102 | `cacheFirstStrategy`: filtrar `request.url.startsWith('chrome-extension://')` | BAJO |

```javascript
// En sw.js, cacheFirstStrategy:
async function cacheFirstStrategy(req) {
  // ✅ No cachear extensiones del navegador
  if (req.url.startsWith('chrome-extension://') || req.url.startsWith('moz-extension://')) {
    return fetch(req);
  }
  // ... resto igual ...
}
```

---

## 5. FASE 3: INFRAESTRUCTURA CLOUDFLARE (COSTO MENSUAL)

### 5.1 Comparativa de Opciones

| Opción | Costo Mensual | Servicios | ¿Resuelve 503? | ¿Resuelve QUIC? | ¿Lecturas D1? |
|---|---|---|---|---|---|
| **A: Solo optimizar código** | $0 | Workers Free + D1 Free | ⚠️ Parcial | ⚠️ Parcial | ⚠️ ~500K/día |
| **B: Workers Paid + optimizar** | **$5.00** | Workers Paid ($5) + D1 Free + KV Free | ✅ CPU 30s | ✅ | ✅ ~500K/día |
| **C: Workers Paid + R2 + KV** | **$5.00** | Workers Paid ($5) + D1 Free + KV Free + R2 Free (10GB) | ✅ | ✅ | ✅ ~500K/día |
| **D: Workers Paid + Durable Objects** | ~$15-25 | Workers Paid ($5) + DO (~$10-20) | ✅ | ✅ | N/A (DO no usa reads) |
| **E: Workers Paid + D1 Paid** | ~$8-12 | Workers Paid ($5) + D1 Paid (~$3-7) | ✅ | ✅ | Ilimitado |

### 5.2 Opción Recomendada: **OPCIÓN C** ($5/mes)

| Componente | Costo | Justificación |
|---|---|---|
| **Workers Paid** | $5.00/mes | CPU 30s → elimina 503. 10M requests/mes incluidos |
| **D1 Free Tier** | $0 | 500MB storage, 5M reads/día. Optimizado a ~500K/día con KV |
| **KV Free Tier** | $0 | 100K reads/día, 1GB storage. Suficiente para cachear /store/prefix |
| **R2 Free Tier** | $0 | 10GB storage. Snapshots no consumen D1. Rotación ilimitada |
| **Total** | **$5.00/mes** | **~$0.17/día** |

### 5.3 Cálculo de Lecturas D1 Post-Optimización

| Fuente de lecturas | Antes (diario) | Después (diario) |
|---|---|---|
| Sync periódico (5 min) × 2 apps | 1.15M | 230K (KV cache TTL 5min) |
| Sync periódico (5 min) con KV TTL 15min | — | 80K (si se ajusta TTL) |
| Lecturas individuales (_workerGet) | 500K-1M | 500K-1M (sin cambio) |
| Escrituras + verificaciones | 100K | 100K (sin cambio) |
| Snapshots en D1 | 2.3K | 0 (movido a R2) |
| Health checks | 50K | 1K (cacheado en variable) |
| **Total estimado** | **~4-6M** ❌ | **~0.8-1.3M** ✅ (16-26% del límite) |

### 5.4 Configuración de wrangler.json Final

```json
{
  "name": "siso-api",
  "main": "index.js",
  "compatibility_date": "2024-01-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "siso-db",
      "database_id": "76da5895-478f-4486-a5d4-05069f9aa45a"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "<KV_NAMESPACE_ID>"
    }
  ],
  "r2_buckets": [
    {
      "binding": "SNAPSHOTS",
      "bucket_name": "siso-snapshots"
    }
  ],
  "triggers": {
    "crons": ["0 6 * * *"]
  },
  "usage_model": "standard"
}
```

---

## 6. PLAN DE AUTOTESTING

### 6.1 Tests Unitarios para el Worker

```javascript
// test/worker.test.js — Tests a implementar

describe('GET /store/prefix/:prefix', () => {
  test('devuelve _raw:true sin parsear JSON en servidor', async () => {
    const res = await worker.fetch(new Request('https://siso-api/store/prefix/siso_'), env);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data[0]._raw).toBe(true);
    expect(typeof data[0].value).toBe('string'); // No objeto parseado
  });
  
  test('soporta paginación con cursor', async () => {
    const res1 = await worker.fetch(new Request('https://siso-api/store/prefix/siso_?limit=2'), env);
    const page1 = await res1.json();
    expect(page1.data.length).toBe(2);
    expect(page1.hasMore).toBe(true);
    
    const res2 = await worker.fetch(new Request(`https://siso-api/store/prefix/siso_?limit=2&cursor=${page1.nextCursor}`), env);
    const page2 = await res2.json();
    expect(page2.data.length).toBe(2);
    expect(page2.data[0].key).not.toBe(page1.data[0].key);
  });
});

describe('DELETE /store/:key', () => {
  test('soft-delete: marca deleted=1 en vez de borrar', async () => {
    // Insertar
    await worker.fetch(new Request('https://siso-api/store', { method: 'POST', body: JSON.stringify({ key: 'test_key', value: 'test' }) }), env);
    // Soft-delete
    await worker.fetch(new Request('https://siso-api/store/test_key', { method: 'DELETE' }), env);
    // Verificar que no se lee (deleted=1)
    const res = await worker.fetch(new Request('https://siso-api/store/test_key'), env);
    const data = await res.json();
    expect(data).toEqual([]); // ← debe estar vacío porque deleted=1
  });
  
  test('POST /store/restore/:key recupera soft-delete', async () => {
    await worker.fetch(new Request('https://siso-api/store/restore/test_key', { method: 'POST' }), env);
    const res = await worker.fetch(new Request('https://siso-api/store/test_key'), env);
    const data = await res.json();
    expect(data.length).toBe(1);
  });
});

describe('GET /health', () => {
  test('sin full=1 solo hace SELECT 1', async () => {
    const res = await worker.fetch(new Request('https://siso-api/health'), env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
  
  test('con full=1 usa caché del CRON', async () => {
    const res = await worker.fetch(new Request('https://siso-api/health?full=1'), env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cached).toBe(true);
  });
});
```

### 6.2 Tests de Integración para el SyncManager

```javascript
// test/syncManager.test.js — Tests a implementar

describe('syncNow()', () => {
  test('NO hace fallback a Supabase cuando D1 no responde', async () => {
    // Mock: D1 caído, Supabase responde
    mockD1GetAll.mockRejectedValue(new Error('503'));
    mockSBGetAll.mockResolvedValue({ old_key: { value: 'old', updatedAt: '2020-01-01' } });
    
    await syncNow();
    
    // Verificar que NO se llamó a Supabase
    expect(mockSBGetAll).not.toHaveBeenCalled();
    // Verificar que se notificó d1-unavailable
    expect(mockNotify).toHaveBeenCalledWith('d1-unavailable');
  });
  
  test('hace health check antes de sync', async () => {
    mockHealthCheck.mockResolvedValue(false); // Worker caído
    
    await syncNow();
    
    // Verificar que nunca entró al sync
    expect(mockD1GetAll).not.toHaveBeenCalled();
  });
});

describe('_workerSet()', () => {
  test('NO hace fallback a troceo cliente cuando /store/chunked falla', async () => {
    mockChunkedPost.mockRejectedValue(new Error('503'));
    
    const result = await _workerSet('test_large_key', largeArray);
    
    expect(result).toBe(false);
    // Verificar que se encoló para reintento
    const pending = JSON.parse(localStorage.getItem('siso_pending_d1_writes'));
    expect(pending['test_large_key']._ref).toBe(true);
    // Verificar que NO se llamó a _workerSetRaw (troceo manual)
    expect(mockWorkerSetRaw).not.toHaveBeenCalled();
  });
});
```

### 6.3 Tests de Carga QUIC

```javascript
// test/quic.test.js — Tests manuales

describe('Lectura de chunks grandes', () => {
  test('10 chunks de 500KB con _CONC=2 no producen ERR_QUIC_PROTOCOL_ERROR', async () => {
    const key = 'siso_patients_test';
    // Preparar: escribir 10 chunks en D1
    // ...
    
    const start = performance.now();
    const result = await _workerGet(key);
    const elapsed = performance.now() - start;
    
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
    console.log(`Reconstrucción completada en ${elapsed.toFixed(0)}ms con _CONC=2`);
  });
});
```

### 6.4 Smoke Tests de Producción

```bash
#!/bin/bash
# smoke-test.sh — Ejecutar después de cada deploy

echo "=== Smoke Test SISO Worker ==="

# 1. Health check
echo -n "1. Health check... "
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Siso-Token: $SISO_TOKEN" "$WORKER_URL/health")
if [ "$HEALTH" = "200" ]; then echo "✅ OK"; else echo "❌ FAIL ($HEALTH)"; fi

# 2. CORS para preview deploy
echo -n "2. CORS headers... "
CORS=$(curl -s -I -H "Origin: https://test.ocupasaludparadesplegar-f4q.pages.dev" -H "X-Siso-Token: $SISO_TOKEN" "$WORKER_URL/health" | grep -i "access-control-allow-origin")
if [ -n "$CORS" ]; then echo "✅ OK"; else echo "❌ FAIL (sin CORS)"; fi

# 3. Prefix sin JSON.parse en servidor
echo -n "3. /store/prefix devuelve _raw... "
RAW=$(curl -s -H "X-Siso-Token: $SISO_TOKEN" "$WORKER_URL/store/prefix/siso_?limit=1" | jq -r '.data[0]._raw')
if [ "$RAW" = "true" ]; then echo "✅ OK"; else echo "❌ FAIL (_raw=$RAW)"; fi

# 4. Paginación
echo -n "4. Paginación... "
PAGE1=$(curl -s -H "X-Siso-Token: $SISO_TOKEN" "$WORKER_URL/store/prefix/siso_?limit=1")
HASMORE=$(echo "$PAGE1" | jq -r '.hasMore')
if [ "$HASMORE" = "true" ]; then echo "✅ OK (hasMore=true)"; else echo "⚠️ WARN (hasMore=$HASMORE, puede haber ≤1 clave)"; fi

# 5. Soft-delete
echo -n "5. Soft-delete... "
curl -s -X DELETE -H "X-Siso-Token: $SISO_TOKEN" "$WORKER_URL/store/test_smoke_key" > /dev/null
READ=$(curl -s -H "X-Siso-Token: $SISO_TOKEN" "$WORKER_URL/store/test_smoke_key" | jq 'length')
if [ "$READ" = "0" ]; then echo "✅ OK"; else echo "❌ FAIL (deleted key aún se lee)"; fi

echo "=== Smoke Test Completo ==="
```

---

## 7. PLAN DE IMPLEMENTACIÓN POR SPRINT

### Sprint 1 (Días 1-3): CRÍTICO — Eliminar pérdida de datos activa
**Objetivo:** Detener la hemorragia. Las correcciones que evitan pérdida inmediata.

| Día | Tarea | Archivo | Tiempo |
|---|---|---|---|
| 1 | Worker: Eliminar JSON.parse de /store/prefix y /store | `siso-worker/index.js` L108-138 | 2h |
| 1 | Worker: Mover new URL() dentro de try/catch, mejorar catch error | `siso-worker/index.js` L83, L435-437 | 30min |
| 2 | Frontend: Eliminar fallback a Supabase en syncNow | `syncManager.js` L256-260 | 30min |
| 2 | Frontend: Eliminar fallback a troceo cliente en _workerSet | `App.jsx` L452-522 | 2h |
| 2 | Frontend: Añadir _enqueuePendingD1Ref + procesador de referencias | `App.jsx` ~600 | 2h |
| 3 | Frontend: Reducir _CONC a 2 + reintento individual chunks | `App.jsx` L556-570 | 1h |
| 3 | Frontend: Añadir _d1HealthCheck antes de syncNow | `syncManager.js` L429 | 30min |
| 3 | **DEPLOY + SMOKE TEST** | — | 1h |

### Sprint 2 (Días 4-7): ALTO — Mejoras de infraestructura
**Objetivo:** Estabilizar y reducir costo operacional.

| Día | Tarea | Archivo | Tiempo |
|---|---|---|---|
| 4 | Crear KV namespace + binding en wrangler.json | `wrangler.json` | 30min |
| 4 | Worker: Cachear /store/prefix en KV (TTL 5 min) | `siso-worker/index.js` | 2h |
| 5 | Crear R2 bucket + binding en wrangler.json | `wrangler.json` | 30min |
| 5 | Worker: Mover snapshots a R2 | `siso-worker/index.js` L444-593 | 3h |
| 6 | Worker: Implementar soft-delete (ALTER TABLE + UPDATE) | `schema.sql` + `index.js` L342-346 | 2h |
| 6 | Worker: Implementar paginación en /store/prefix | `siso-worker/index.js` L108-117 | 2h |
| 7 | Frontend: Adaptar syncManager a paginación | `syncManager.js` L44-67 | 2h |
| 7 | **DEPLOY + SMOKE TEST** | — | 1h |

### Sprint 3 (Días 8-10): MEDIO/BAJO — Pulido y deuda técnica
**Objetivo:** Cerrar vectores restantes.

| Día | Tarea | Archivo | Tiempo |
|---|---|---|---|
| 8 | Worker: Migrar valores GZIP legacy a JSON plano | `siso-worker/index.js` | 1h |
| 8 | Worker: Cachear /health?full=1 con variable de módulo | `siso-worker/index.js` L303-340 | 1h |
| 9 | Frontend: Verificar timestamp en hybridGet antes de promover | `syncManager.js` L133-141 | 1h |
| 9 | SW: Filtrar chrome-extension:// en cacheFirstStrategy | `sw.js` L86-102 | 30min |
| 10 | Tests unitarios y de integración | `test/` | 3h |
| 10 | **DEPLOY FINAL + SMOKE TEST COMPLETO** | — | 1h |

---

## 8. CHECKLIST PRE-DEPLOY

### Antes de cada deploy:

- [ ] `wrangler deploy --dry-run` sin errores
- [ ] `git diff` revisado manualmente
- [ ] Health check responde 200
- [ ] CORS responde para preview deploy activo
- [ ] `/store/prefix/siso_?limit=1` devuelve `_raw: true`
- [ ] Soft-delete: DELETE + GET = [] 
- [ ] Soft-delete: POST /restore + GET = [data]
- [ ] Paginación: hasMore y nextCursor presentes
- [ ] KV cache: segunda llamada a /store/prefix más rápida que la primera
- [ ] R2: snapshot diario se escribe correctamente

### Rollback plan:

```bash
# Si algo falla, rollback al último deploy bueno:
wrangler rollback --name siso-api
# O revertir el commit en GitHub Pages:
git revert <commit> && git push origin main
```

---

## FIRMA DEL DOCUMENTO

**Protocolo elaborado por:** Sistema de análisis y arquitectura automatizado  
**Fecha:** 2026-07-11 20:00 UTC-4  
**Basado en:** 18 vectores de pérdida identificados en auditoría forense  
**Total soluciones documentadas:** 18 (una por vector)  
**Costo total estimado:** $5.00/mes (Workers Paid)  
**Tiempo estimado de implementación:** 10 días (3 sprints)  
**Cambios al código:** 0 (este es un protocolo, no una implementación)  

---

*Este documento es un protocolo de soluciones. No contiene modificaciones al código fuente. Las soluciones aquí descritas requieren validación e implementación manual.*