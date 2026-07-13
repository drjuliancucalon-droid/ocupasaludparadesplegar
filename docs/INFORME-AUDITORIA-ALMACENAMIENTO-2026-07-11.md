# 🔬 INFORME DE AUDITORÍA FORENSE DE ALMACENAMIENTO
## SISO OCUPASALUD — Monolito + Worker D1 + Capas de Persistencia

**Fecha:** 2026-07-11 · **Commit:** `e7ed13a` · **Versión:** 1.0  
**Auditores:** IA Forense (análisis automatizado línea a línea)  
**Alcance:** Arquitectura completa de almacenamiento, todos los vectores de pérdida de datos, protocolo de diagnóstico

---

## 1. RESUMEN EJECUTIVO

OcupaSalud es una PWA (Progressive Web App) de salud ocupacional con **6 capas de almacenamiento** que operan simultáneamente. El sistema está en **transición de Supabase → Cloudflare D1**. Actualmente D1 es la **fuente autoritativa** y Supabase es **backup pasivo (solo escritura)**. Existe un **refactor en desarrollo (`siso-appultimo`)** que comparte la misma base D1 con el monolito, creando una superficie de riesgo adicional.

Se identificaron **10 vectores de pérdida de datos**, de los cuales 3 fueron mitigados en los últimos 30 días (2026-06-05 a 2026-07-11) y 7 permanecen activos con distintos niveles de severidad.

---

## 2. MAPA DE ARQUITECTURA DE DATOS

```
╔══════════════════════════════════════════════════════════════════════╗
║                    CAPAS DE ALMACENAMIENTO                          ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  CAPA 0: Memoria RAM (_memStore)                                    ║
║  ┌────────────────────────────────────────────────────────────┐     ║
║  │ Objeto JS en memoria. Fallback cuando localStorage/session │     ║
║  │ Storage no están disponibles (contexto restringido).       │     ║
║  │ VOLÁTIL: se pierde al cerrar/recargar la pestaña.          │     ║
║  │ Archivo: src/utils/storage.js, línea 3                      │     ║
║  └────────────────────────────────────────────────────────────┘     ║
║                                                                      ║
║  CAPA 1: sessionStorage (_ss)                                       ║
║  ┌────────────────────────────────────────────────────────────┐     ║
║  │ Almacena API Keys y tokens sensibles.                      │     ║
║  │ Se limpia automáticamente al cerrar la pestaña.            │     ║
║  │ Archivo: src/utils/storage.js, líneas 28-50                 │     ║
║  │ Límite: ~5-10 MB (varía por navegador)                     │     ║
║  └────────────────────────────────────────────────────────────┘     ║
║                                                                      ║
║  CAPA 2: localStorage (_ls)                                        ║
║  ┌────────────────────────────────────────────────────────────┐     ║
║  │ PRIMERA CAPA DE ESCRITURA. Siempre se escribe ANTES que    │     ║
║  │ cualquier otra. Respaldo inmediato.                        │     ║
║  │                                                             │     ║
║  │ Mecanismos de protección:                                   │     ║
║  │ • Purga de autosaves > 24h (línea 19458-19468 App.jsx)     │     ║
║  │ • Dedup de firma redundante en pacientes (línea 19485+)    │     ║
║  │ • "Cuota llena: purgar entradas pesadas" (línea ~6908)     │     ║
║  │                                                             │     ║
║  │ Archivo: src/utils/storage.js, líneas 4-26                  │     ║
║  │ Límite: ~5-10 MB (varía por navegador)                     │     ║
║  └────────────────────────────────────────────────────────────┘     ║
║                                                                      ║
║  CAPA 3: IndexedDB (siso_offline_db)                               ║
║  ┌────────────────────────────────────────────────────────────┐     ║
║  │ ESPEJO LOCAL PRINCIPAL.                                      │     ║
║  │                                                             │     ║
║  │ Stores:                                                     │     ║
║  │ • kv_store (keyPath: 'key') — espejo de siso_store D1       │     ║
║  │ • sync_queue (keyPath: 'id', autoIncrement) — cola offline  │     ║
║  │ • audit_queue (keyPath: 'id', autoIncrement) — logs         │     ║
║  │ • sync_meta (keyPath: 'key') — timestamps de sincronización │     ║
║  │                                                             │     ║
║  │ Archivo: src/utils/offlineDB.js (301 líneas)                │     ║
║  │ Versión: 1 (sin migraciones/upgrades)                       │     ║
║  │ Límite: ~50% del espacio disponible en disco (GB)           │     ║
║  └────────────────────────────────────────────────────────────┘     ║
║                                                                      ║
║  CAPA 4: Cloudflare D1 (siso-db) ← AUTORITATIVO                    ║
║  ┌────────────────────────────────────────────────────────────┐     ║
║  │ Tabla ÚNICA: siso_store                                     │     ║
║  │ ┌─────────────┬──────────┬────────────────────────────────┐ │     ║
║  │ │ Columna     │ Tipo     │ Descripción                    │ │     ║
║  │ │─────────────┼──────────┼────────────────────────────────│ │     ║
║  │ │ key         │ TEXT PK  │ Clave primaria                  │ │     ║
║  │ │ value       │ TEXT NN  │ JSON serializado                │ │     ║
║  │ │ updated_at  │ TEXT     │ DEFAULT datetime('now')         │ │     ║
║  │ └─────────────┴──────────┴────────────────────────────────┘ │     ║
║  │                                                             │     ║
║  │ Índice: idx_key ON siso_store(key)                         │     ║
║  │ Motor: SQLite (D1)                                         │     ║
║  │ Límite: 500 MB / 5M lecturas-día (plan gratuito)           │     ║
║  │                                                             │     ║
║  │ API: Worker siso-api (wrangler.json)                       │     ║
║  │ • GET  /store/:key             → Leer una clave            │     ║
║  │ • GET  /store/prefix/:prefix   → Listar por prefijo       │     ║
║  │ • GET  /store?userId=          → Listar por usuario        │     ║
║  │ • POST /store                  → Upsert (batch 50)         │     ║
║  │ • POST /store/chunked          → Escritura atómica chunked │     ║
║  │ • POST /store/append           → Append atómico server-side│     ║
║  │ • DELETE /store/:key           → Borrado FÍSICO            │     ║
║  │ • POST /cleanup                → Limpieza emergencia       │     ║
║  │ • POST /snapshot               → Snapshot manual           │     ║
║  │ • GET  /snapshot/list          → Listar snapshots          │     ║
║  │ • GET  /health                 → Healthcheck               │     ║
║  │ • GET  /storage-stats          → Estadísticas uso          │     ║
║  │                                                             │     ║
║  │ CRON: "0 6 * * *" (6:00 UTC diario → runDailySnapshot)    │     ║
║  │                                                             │     ║
║  │ Auth: header X-Siso-Token == env.SISO_TOKEN                │     ║
║  │ CORS: ALLOWED_ORIGINS + wildcard *.pages.dev                │     ║
║  │                                                             │     ║
║  │ ⚠️ COMPARTIDO CON: siso-appultimo (refactor)                │     ║
║  │   Origen: siso-appultimo-arp.pages.dev                     │     ║
║  │   Misma D1, misma tabla siso_store                         │     ║
║  └────────────────────────────────────────────────────────────┘     ║
║                                                                      ║
║  CAPA 5: Supabase (LEGACY — BACKUP PASIVO)                         ║
║  ┌────────────────────────────────────────────────────────────┐     ║
║  │ Tablas:                                                     │     ║
║  │ • siso_store (key/value — misma semántica que D1)          │     ║
║  │ • siso_audit_log_server (logs de auditoría centralizados)  │     ║
║  │                                                             │     ║
║  │ Storage: adjuntos/documentos (Supabase Storage buckets)     │     ║
║  │                                                             │     ║
║  │ URL:   yqrrktrgoijgzccrxnpz.supabase.co                    │     ║
║  │ KEY:   sb_publishable_K88q... (anon key)                   │     ║
║  │ SK:    (service_role key, solo super_admin)                │     ║
║  │                                                             │     ║
║  │ ESTADO: SOLO ESCRITURA. NUNCA fuente de lectura para       │     ║
║  │ sync periódico (FIX 2026-06-05).                           │     ║
║  │                                                             │     ║
║  │ Operaciones desde frontend:                                 │     ║
║  │ • _sbSet(key, value)     → POST/PATCH a siso_store         │     ║
║  │ • _sbGetAll()            → GET siso_store (solo fallback)  │     ║
║  │ • _sbDelete(key)         → DELETE siso_store               │     ║
║  │ • _sbStorageGet/Set/Del  → Supabase Storage (adjuntos)     │     ║
║  │                                                             │     ║
║  │ Archivo: src/utils/supabase.js (376+ líneas)               │     ║
║  └────────────────────────────────────────────────────────────┘     ║
║                                                                      ║
║  CAPA 6: Snapshots D1 (BACKUP DIARIO)                              ║
║  ┌────────────────────────────────────────────────────────────┐     ║
║  │ Formato: siso_snapshot_YYYY-MM-DD__c0..cN + __meta         │     ║
║  │          siso_snapshot_YYYY-MM-DD__manifest                  │     ║
║  │                                                             │     ║
║  │ Contenido del manifest: { snapshotVersion, createdAt,       │     ║
║  │   totalKeys, totalBytes, pieceCount, durationMs, log }      │     ║
║  │                                                             │     ║
║  │ Generación: CRON diario 6AM UTC + POST /snapshot manual    │     ║
║  │ Rotación: DELETE snapshots con fecha > 7 días atrás        │     ║
║  │ Reconstrucción: concatena __cN → JSON.parse                │     ║
║  │                                                             │     ║
║  │ ⚠️ ES EL ÚNICO MECANISMO DE BACKUP. No hay R2, no hay      │     ║
║  │   exportación externa. Si falla el CRON 7+ días seguidos   │     ║
║  │   → pérdida total de capacidad de recuperación histórica.  │     ║
║  └────────────────────────────────────────────────────────────┘     ║
║                                                                      ║
║  CAPA 7: Service Worker (PWA — CACHE HTTP)                         ║
║  ┌────────────────────────────────────────────────────────────┐     ║
║  │ Estrategias:                                                │     ║
║  │ • cacheFirst (assets estáticos)                             │     ║
║  │ • networkFirst (datos dinámicos)                            │     ║
║  │ • networkOnly + offline fallback                            │     ║
║  │                                                             │     ║
║  │ Background Sync:                                            │     ║
║  │ • sync-siso-queue  → flushSyncQueue() → postMessage a app  │     ║
║  │ • sync-audit-queue → flushAuditQueue()                      │     ║
║  │                                                             │     ║
║  │ Archivo: public/sw.js (líneas 1-232)                        │     ║
║  └────────────────────────────────────────────────────────────┘     ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 3. ANÁLISIS FORENSE LÍNEA POR LÍNEA

### 3.1 Worker D1: `siso-worker/index.js` (594 líneas)

#### 3.1.1 Autenticación y CORS (Líneas 1-81)

```
L6-14  ALLOWED_ORIGINS: 4 orígenes fijos + 3 patrones wildcard
       → Monolito: ocupasaludparadesplegar.pages.dev
       → Monolito alias: ocupasaludparadesplegar-f4q.pages.dev
       → Refactor: siso-appultimo-arp.pages.dev ← COMPARTE D1
       → Local dev: localhost:5173, localhost:4173
       
L20-36 corsHeaders(): match exacto + wildcard *.pages.dev
       ⚠️ Cualquier preview deploy de Pages en esos dominios
       tiene acceso total a D1 si posee el token.

L78-81 Auth: X-Siso-Token header == env.SISO_TOKEN
       Sin token → 401 Unauthorized
       ⚠️ NO hay rate limiting por token/IP
```

#### 3.1.2 Compresión GZIP (Líneas 38-65)

```
L44-51 FIX 2026-06-18: Compresión DESACTIVADA definitivamente.
       Causó 500 en producción: valores guardados como "gz:..."
       que no se descomprimían bien → JSON.parse fallaba.
       
L49   compressValue(text): return text (no-op)
L52-65 decompressValue(stored): retrocompatible con gz: legacy
       • Si NO empieza con "gz:" → devuelve tal cual
       • Si empieza con "gz:" → intenta descomprimir
       • Si falla → devuelve crudo (⚠️ JSON.parse de "gz:..." fallará)
       
⚠️ RIESGO: Valores legacy con prefijo "gz:" que no se puedan
   descomprimir → pérdida de datos permanente para esas claves.
```

#### 3.1.3 GET /store/:key (Líneas 87-98)

```
L89-98 Lectura de clave exacta
       SELECT value, updated_at FROM siso_store WHERE key = ?
       
       Retorna: [{ key, value, ts }]
       Headers: ETag con updated_at, X-Siso-Ts
       
       ⚠️ NO reconstruye chunks. Si la clave es chunked y alguien
       llama a este endpoint, solo devuelve el valor base (vacío
       después de POST /store/chunked que borra la clave base con del.bind(key)).
```

#### 3.1.4 GET /store/prefix/:prefix (Líneas 100-117)

```
L108-117 Búsqueda por prefijo LIKE con filtros anti-ruido
         SELECT key, value FROM siso_store
         WHERE key LIKE ? 
         AND key NOT GLOB '*__c[0-9]*'           ← excluye piezas chunked
         AND key NOT LIKE '%\\_\\_new%' ESCAPE '\' ← excluye chunks temporales
         AND key NOT GLOB '*_chunk_[0-9]*_of_[0-9]*' ← excluye chunks legacy
         LIMIT 2000

⚠️ LIMIT 2000: si hay > 2000 claves con prefijo "siso_",
   el syncManager NO recibe las claves 2001+. Esto causa que
   algunas claves nunca se sincronicen al frontend.

⚠️ Excluye __cN del resultado pero los __meta SÍ se incluyen.
   Un __meta sin sus __cN es inútil para el lector.
```

#### 3.1.5 GET /store (Líneas 119-138)

```
L120-138 Listar todas las claves
         ?userId= → filtra por %_userId o %_userId_%
         Sin filtro → LIMIT 2000 de toda la tabla
         
⚠️ Mismo problema LIMIT 2000 que /store/prefix.
⚠️ El orden no es determinista (no hay ORDER BY).
   Llamadas consecutivas pueden devolver claves diferentes.
```

#### 3.1.6 POST /store — Upsert (Líneas 140-176)

```
L144-176 Upsert simple (no chunked, no atómico multi-clave parcial)
        Soporta array de {key, value} → batch en chunks de 50.
        
        If-Match / X-Siso-If-Match: escritura optimista
        • Si el ts actual != If-Match → 409 Conflict
        • Si coincide o no envió → ejecuta

⚠️ Sin If-Match: última escritura gana (last-write-wins).
   Dos pestañas pueden sobrescribirse mutuamente.
   
⚠️ Batch de 50: si hay 51 items, se ejecutan 2 batches.
   Si el primer batch (items 1-50) tiene éxito pero el segundo
   falla (51), los primeros 50 quedan escritos → estado parcial.
```

#### 3.1.7 POST /store/chunked — Escritura Atómica (Líneas 178-270)

```
L178-270 CRÍTICO: Escritura chunked TRANSACCIONAL.

        Recibe: { key, value }
        
        Paso 1 (L205-238): CANDADO ANTI-ENCOGIMIENTO
        Solo para claves protegidas: /^siso_(db_)?patients_|^siso_atenciones|^siso_hc_/
        • Lee el valor actual de D1 (o reconstruye chunks si chunked)
        • Compara IDs del valor entrante vs existente
        • Si hay registros existentes que lo entrante NO conoce → PRESERVA
        • Log: "[chunked] CANDADO {key}: +N preservados"
        
        Paso 2 (L239-247): Hash de integridad
        • Mismo algoritmo _hash64 del monolito (h1 base31 + h2 base127*31)
        
        Paso 3 (L248-268): Preparación y ejecución de batch
        • Trocea payload en piezas de 500KB → __c0, __c1, ... __cN
        • Prepara:
          - up.bind(key + "__c0", pieza0)
          - up.bind(key + "__c1", pieza1)
          - ...
          - up.bind(key + "__meta", JSON.stringify(meta))
          - del.bind(key)  ← BORRA la clave base (sin sufijo)
          - del.bind(key + "__cN+1") ... para piezas sobrantes
        • env.DB.batch(batch) ← TRANSACCIONAL
        
        ⚠️ El del.bind(key) borra la clave base. Los lectores
        DEBEN detectar que la clave no existe y buscar __meta.
        Si un lector legacy no entiende chunked → ve clave vacía.

⚠️ RIESGO: Si oldCount (piezas previas) se calcula mal,
   se pueden borrar __cN que no son huérfanos.
```

#### 3.1.8 POST /store/append — Append Atómico (Líneas 272-301)

```
L272-301 Append atómico server-side. Soluciona carrera read-modify-write
        en encuestas concurrentes.
        
        • Lee el array actual de D1
        • Busca item por idField (default "id")
        • Si existe → reemplaza. Si no → push al final
        • Escribe el array completo
        
        ⚠️ Si dos appends concurrentes llegan CON EL MISMO idField,
        el último gana (sobrescribe). Esto es correcto para updates
        pero si el id es autogenerado con colisión potencial → pérdida.
        
        ⚠️ No tiene mecanismo If-Match como POST /store.
```

#### 3.1.9 GET /health (Líneas 303-340)

```
L303-340 Healthcheck con dos modos:
        • Sin ?full=1: SELECT 1 (≈0 filas leídas, rápido, barato)
        • Con ?full=1: 5 COUNT(*) sobre ~2.300 filas c/u
          → ~11K lecturas por llamada
          
        ⚠️ Si alguna app/servicio/monitor llama cada 2 min con ?full=1
        desde 2 pestañas → ~7M lecturas/día > límite gratuito 5M.
        Al exceder → D1 rechaza lecturas Y ESCRITURAS → pérdida.
```

#### 3.1.10 DELETE /store/:key (Líneas 342-346)

```
L342-346 DELETE físico directo SIN papelera
        DELETE FROM siso_store WHERE key = ?
        
⚠️ CRÍTICO: Sin soft-delete, sin backup previo, sin undo.
   Cualquier bug en frontend que llame _workerDeleteRaw con
   la clave equivocada → borrado permanente e irreversible.
   
   Usos en frontend (src/App.jsx):
   • _workerDeleteRaw(key) en limpieza de chunks viejos
   • _workerDeleteRaw en POST /cleanup
   • _workerDeleteRaw en limpieza de temporales
```

#### 3.1.11 POST /cleanup (Líneas 355-388)

```
L355-388 Limpieza de emergencia (cuando D1 está lleno)
        Secciones:
        1. Rotación snapshots: DELETE snapshots > 7 días (por fecha en key)
        2. Chunks temporales: DELETE keys LIKE '%__new%' 
           ⚠️ Borra TODOS, sin verificar si alguno es de escritura en curso
        3. Autosaves > 48h: DELETE siso_autosave_cloud_% WHERE updated_at < cutoff
        
        ⚠️ Riesgo de borrar chunks de una escritura en progreso
        ⚠️ El cutoff de 48h para autosaves puede borrar datos que el
        usuario esperaba recuperar
```

#### 3.1.12 GET /storage-stats (Líneas 398-431)

```
L398-431 Estadísticas de uso de D1
        • COUNT(*) + SUM(LENGTH(value)) total
        • Agrupación por tipo de clave (top 25 grupos)
        • Cálculo de % uso (mb/500*100)
        • Alertas: 70% y 90%
        
        ⚠️ SUM(LENGTH(value)) cuenta el valor RAW (JSON), no el tamaño
        real en disco SQLite. El tamaño real puede ser mayor (overhead
        de índice, páginas SQLite, etc.).
```

#### 3.1.13 CRON: runDailySnapshot (Líneas 444-593)

```
L444-593 Snapshot diario automático
        Trigger: "0 6 * * *" (6:00 AM UTC)
        
        Secuencia:
        1. ROTAR PRIMERO (L470-478): DELETE snapshots > 7 días
           ⚠️ Si el snapshot nuevo falla, los viejos YA fueron borrados
        2. GC chunks temporales > 1h (L479-499): itera y borra uno a uno
           ⚠️ Itera con SELECT + DELETE individual → lento, no atómico
        3. Leer TODAS las claves operacionales (L502-503)
           ⚠️ SELECT key, value FROM siso_store WHERE key NOT LIKE 'siso_snapshot_%'
              Sin LIMIT → puede leer cientos de MB en una sola query
              Si D1 tiene > 100MB → posible timeout del worker (30s CPU)
        4. Reconstruir chunks en memoria (L508-542)
        5. Serializar todo → trocear en 500KB → escribir (L544-590)
        
        ⚠️ CRÍTICO: Si el snapshot falla por timeout, no hay reintento.
        Si falla 8+ días seguidos → se pierde TODA la capacidad de
        recuperación histórica (los snapshots > 7d se borraron en el paso 1
        de días anteriores).
        
        ⚠️ Sin notificación de fallo. Si el CRON falla silenciosamente,
        nadie lo sabe hasta que se necesita restaurar.
```

---

### 3.2 SyncManager: `src/utils/syncManager.js` (466 líneas)

#### 3.2.1 D1 como fuente autoritativa (Líneas 37-82)

```
L37-41  Configuración D1:
        _D1_WORKER_URL = window.__SISO_CONFIG?.workerUrl
        _D1_WORKER_TOKEN = window.__SISO_CONFIG?.workerToken
        
L44-67 _d1GetAll(): GET /store/prefix/siso_ → formato {key: {value, updatedAt}}
        ⚠️ Sufre del LIMIT 2000 del worker
        ⚠️ updatedAt se infiere de row.value.updatedAt → row.ts → row.updatedAt → now()
           Si ninguna fuente tiene timestamp real, pone now() → siempre "más reciente"
           → el diff nunca detecta que local es más nuevo

L69-82 _d1Get(key): GET /store/:key → retorna d[0]?.value
        ⚠️ No reconstruye chunks. Una clave chunked devuelta
        por /store/:key (no /prefix) puede ser null si la clave
        base fue borrada por chunkedPost.
```

#### 3.2.2 Lectura Híbrida (Líneas 118-161)

```
L118-161 hybridGet(key, fallback):
        Prioridad: IndexedDB → localStorage → D1 → Supabase → fallback
        
        ⚠️ Línea 133-141: si IndexedDB no tiene el dato, 
        lee de localStorage y lo promueve a IndexedDB SIN verificar
        contra D1. Si localStorage tiene datos viejos/corruptos → se propagan.
        
        ⚠️ Línea 125-128: _refreshFromD1 en background después de
        devolver el valor de IndexedDB. Si D1 tiene algo diferente,
        se actualiza IndexedDB y localStorage en background. El usuario
        ve el dato viejo momentáneamente (stale-while-revalidate).
```

#### 3.2.3 Escritura Híbrida (Líneas 173-194)

```
L173-194 hybridSet(key, value):
        1. localStorage.setItem → INMEDIATO
        2. idbSet(key, value) → IndexedDB
        3. Si online → _sbSet(key, value) → SUPABASE (no D1!)
        
        ⚠️ hybridSet escribe a Supabase, NO a D1.
        El worker D1 se actualiza por otras vías (_workerPostUpsert en App.jsx).
        
        ⚠️ Si _sbSet falla → encola en sync_queue para reintento.
        Si nunca hay conexión → se pierde la sincronización a Supabase
        (pero D1 puede tenerlo por otra vía, inconsistencia potencial).
```

#### 3.2.4 Sincronización Periódica (Líneas 223-298)

```
L223-298 syncNow():
        FASE 1: Vaciar cola offline → Supabase
        FASE 2: D1 (PRIMARIO) → descargar y comparar timestamps
        
        ⚠️ Línea 270: "Cloud más reciente → actualizar local"
        La comparación usa updatedAt. Si D1 tiene un timestamp más
        reciente que local → sobreescribe. Si local tiene datos que
        D1 no tiene (pérdida en D1) → NO se suben a D1 en syncNow().
        Solo se suben a Supabase en la FASE 1.
        
        ⚠️ Línea 429: setInterval cada 5 minutos
        Solo si !document.hidden → si el usuario está en otra pestaña
        pero la app está abierta, NO sincroniza.
        
        ⚠️ Línea 438: setTimeout 3000ms para sync inicial
        Si la app carga offline y el usuario conecta después,
        el sync se dispara por el evento 'online', no por este timeout.
```

#### 3.2.5 Auditoría (Líneas 307-335)

```
L307-335 hybridAuditLog(action, user, detail, extra):
        1. localStorage siso_audit_log (últimos 500, circular)
        2. Si online → Supabase siso_audit_log_server (últimos 1000)
        3. Si offline → IndexedDB audit_queue
        
        ⚠️ Los logs de auditoría van a Supabase, NO a D1.
        Si Supabase está caído, los logs quedan en IndexedDB.
        Si el usuario hace logout → clearOfflineDB borra TODO IndexedDB
        incluyendo audit_queue no enviada.
```

---

### 3.3 OfflineDB: `src/utils/offlineDB.js` (301 líneas)

#### 3.3.1 Estructura

```
L8-21  Configuración:
       DB_NAME: 'siso_offline_db'
       DB_VERSION: 1 (FIJO, sin migraciones)
       
       Stores:
       • kv_store: { keyPath: 'key' } — datos clínicos
       • sync_queue: { keyPath: 'id', autoIncrement: true } — cola sync
       • audit_queue: { keyPath: 'id', autoIncrement: true } — cola auditoría
       • sync_meta: { keyPath: 'key' } — timestamps
```

#### 3.3.2 Problemas identificados

```
L9    DB_VERSION = 1: Si se cambia el esquema, onupgradeneeded 
      solo maneja creación, no migración. Si se agrega una store
      nueva en V2, usuarios con V1 no la obtienen automáticamente
      porque no hay lógica de upgrade.

L26-52 openDB(): 
      • Cachea _db global. Si otra pestaña cambia la versión
        → onversionchange cierra _db y lo setea a null.
      • ⚠️ Si dos pestañas abren la DB concurrentemente con
        diferente versión → comportamiento impredecible.

L54-64 withStore():
      • Crea una transacción por operación (no reusa)
      • ⚠️ No hay manejo de transacciones multi-store
      
L281-299 clearOfflineDB():
      • Borra TODAS las stores en paralelo
      • ⚠️ Se llama en stopSyncManager (logout)
      • ⚠️ Si el logout ocurre con sync_queue o audit_queue
        con datos pendientes → PÉRDIDA IRREVERSIBLE de esas colas
```

---

### 3.4 Storage (localStorage/sessionStorage): `src/utils/storage.js` (71 líneas)

#### 3.4.1 Arquitectura

```
L3    _memStore: objeto JS en RAM, fallback cuando storage no disponible
L4-26 _ls: wrapper de localStorage con fallback a _memStore
L28-50 _ss: wrapper de sessionStorage con fallback a _memStore["_ss_"+key]
L52-69 sp(k, fb), sps(k, fb): helpers JSON.parse con fallback
```

#### 3.4.2 Riesgos

```
L14   _ls.setItem → String(v). Si v es undefined → "undefined".
      ⚠️ Al leer con sp/JSON.parse → error silencioso → retorna fb

L53-59 sp(k, fb): si JSON.parse falla → retorna fb sin log.
      Datos corruptos en localStorage son silenciosamente ignorados.
      El usuario nunca sabe que sus datos se perdieron.

⚠️ No hay monitoreo de cuota. localStorage tiene ~5-10MB.
   Cuando se llena → QuotaExceededError → deriva a _memStore
   (volátil). El usuario cree que guardó, pero los datos
   desaparecen al recargar la página.
```

#### 3.4.3 Purga de autosaves en App.jsx (Líneas 19449-19471)

```
L19449-19471 useEffect al montar:
         • Itera localStorage al revés
         • Para claves siso_autosave_* (no cloud_*)
         • Si _autoSaved > 24h → removeItem
         
         ⚠️ SOLO corre UNA VEZ al montar la app.
         Si la app se mantiene abierta días, los autosaves
         se acumulan sin purgar.
         
         ⚠️ La purga NO verifica si el autosave fue syncado a D1.
         Si un autosave local de >24h no llegó a la nube → se pierde.
```

#### 3.4.4 Dedup de firma en localStorage (Líneas 19473-19500+)

```
L19473-19500 _dedupFirmaLSKey(k, campo, label):
         • Detecta la firma más repetida entre pacientes (la del médico)
         • La elimina de cada paciente para ahorrar ~3.8MB
         • Conserva firmas distintas
         
         ⚠️ Si la detección falla, puede eliminar firmas legítimas.
         ⚠️ Opera sobre localStorage, no sobre D1/Supabase.
           La próxima sincronización puede reintroducir las firmas.
```

---

### 3.5 Supabase Client: `src/utils/supabase.js` (376+ líneas)

```
Variables de conexión (líneas 4-23):
  _PROXY_URL       = window.__SISO_PROXY_URL (opcional)
  _SB_URL          = yqrrktrgoijgzccrxnpz.supabase.co
  _SB_KEY          = sb_publishable_K88q... (anon key)
  _SB_SERVICE_KEY  = null por defecto (service_role, solo super_admin)
  _SB_HEADERS      = { apikey, Authorization, Content-Type }

Funciones principales:
  _sbSet(key, value)     → POST/PATCH a siso_store
  _sbGetAll()            → GET siso_store?select=key,value,updated_at
  _sbDelete(key)         → DELETE siso_store?key=eq.{key}
  _sbStorageGet(bucket, path) → GET Supabase Storage
  _sbStorageSet(bucket, path, file) → POST Supabase Storage
  _sbStorageDelete(bucket, path) → DELETE Supabase Storage

⚠️ _sbGetAll no tiene LIMIT → si siso_store en Supabase tiene
  miles de filas, puede exceder el límite de respuesta (1000 por default
  en Supabase REST API).
  
⚠️ _sbDelete usa DELETE con query parameter key=eq.{key}.
  Sin verificación previa de existencia. Si la key no existe
  en Supabase pero sí en D1 → inconsistencia silenciosa.

⚠️ _sbStorageDelete: "Habeas Data Art.8 Ley 1581/2012"
  Borrado de documentos de storage por solicitud legal.
  Una vez borrado de Supabase Storage, NO hay recuperación.
```

---

## 4. MAPA DE CLAVES (NAMESPACES) EN D1

| Prefijo | Contenido | Chunked | Tamaño estimado | Clave protegida |
|---|---|---|---|---|
| `siso_db_patients_*` | Pacientes (indexado por DB) | ✅ | 100-500 KB | ✅ candado |
| `siso_patients_*` | Pacientes (indexado por userId) | ✅ | 100-500 KB | ✅ candado |
| `siso_hc_completa_*` | Historia clínica completa | ✅ | 1-10 MB | ✅ candado |
| `siso_atenciones*` | Atenciones médicas | ✅ | 100-500 KB | ✅ candado |
| `siso_portal_doc_*` | Documentos portal público | ❌ | Variable | ❌ |
| `siso_portal_empresa_*` | Empresas portal público | ❌ | Variable | ❌ |
| `siso_users` | Usuarios del sistema | ❌ | ~50 KB | ❌ |
| `siso_autosave_cloud_*` | Autoguardados cloud | ❌ | Variable | ❌ |
| `siso_autosave_*` (localStorage) | Autoguardados locales | ❌ | Variable | ❌ |
| `siso_agendados_*` | Citas agendadas | ❌ | ~100 KB | ❌ |
| `siso_arl_reportes` | Reportes ARL | ❌ | ~50 KB | ❌ |
| `siso_saved_reports` | Informes guardados | ❌ | ~100 KB | ❌ |
| `siso_audit_log` | Auditoría local | ❌ | ~50 KB | ❌ |
| `siso_doctor_signature` | Firma del médico | ❌ | ~1 KB | ❌ |
| `siso_empresas_favoritas_*` | Empresas favoritas | ❌ | ~10 KB | ❌ |
| `siso_encuestas_*` | Encuestas | ❌ | ~50 KB | ❌ |
| `siso_habeas_*` | Habeas Data | ❌ | ~10 KB | ❌ |
| `siso_teleconsent_*` | Teleconsentimientos | ❌ | ~10 KB | ❌ |
| `siso_habitos_*` | Hábitos de pacientes | ❌ | ~50 KB | ❌ |
| `siso_ant_personales_*` | Antecedentes personales | ❌ | ~50 KB | ❌ |
| `siso_cartas_custodia_*` | Cartas de custodia | ❌ | ~50 KB | ❌ |
| `siso_snapshot_*` | Backups diarios | ✅ | 20-50 MB total | ❌ |
| `*__cN` | Piezas de chunks (500KB c/u) | N/A | 500 KB | ❌ |
| `*__meta` | Metadatos de chunking | ❌ | ~0.5 KB | ❌ |
| `*__new*` | Chunks temporales abandonados | N/A | ~500 KB c/u | ❌ |
| `*__manifest` | Manifiestos de snapshot | ❌ | ~1 KB | ❌ |

---

## 5. TODOS LOS VECTORES DE PÉRDIDA DE DATOS

### VECTOR 1 · CRÍTICO · MITIGADO ✅
**Carrera de escritura chunked (piezas entrelazadas)**

- **Archivo:** `siso-worker/index.js`, líneas 178-270
- **Causa raíz:** El troceo cliente-side (piezas `__cN` escritas una a una) no era atómico. Dos guardados simultáneos entrelazaban piezas de generaciones distintas.
- **Síntoma:** `Hash mismatch → "CORRUPCIÓN detectada" → lectura descartada`
- **Mitigación:** `POST /store/chunked` (2026-07-11). El servidor trocea y escribe TODO en un solo `env.DB.batch` transaccional. Los lectores ven la generación vieja o la nueva completa, nunca mezcla.
- **Estado:** ✅ RESUELTO

### VECTOR 2 · CRÍTICO · MITIGADO ✅
**Encogimiento de colecciones protegidas (estado viejo)**

- **Archivo:** `siso-worker/index.js`, líneas 204-238
- **Causa raíz:** Una pestaña con estado viejo reescribía la lista de pacientes y borraba de la nube los 23 exámenes del día (documentado 3 ocurrencias).
- **Síntoma:** Pacientes/atenciones/HCs desaparecían después de que otra pestaña guardara.
- **Mitigación:** CANDADO ANTI-ENCOGIMIENTO (2026-07-11). El servidor fusiona por ID: lo entrante gana, pero los registros existentes que lo entrante NO conoce se PRESERVAN. Protegido para: `siso_(db_)?patients_`, `siso_atenciones`, `siso_hc_`.
- **Estado:** ✅ RESUELTO para claves protegidas

### VECTOR 3 · CRÍTICO · MITIGADO ✅
**Sobrescritura desde Supabase (sync periódico)**

- **Archivo:** `src/utils/syncManager.js`, líneas 253-282
- **Causa raíz:** El sync periódico (cada 5 min) descargaba TODO de Supabase y sobreescribía IndexedDB + localStorage. Supabase tenía datos viejos porque las escrituras recientes iban a D1 pero no se sincronizaban a SB.
- **Síntoma:** Pérdida sistemática de pacientes, atenciones, informes y publicaciones al portal. Los datos nuevos desaparecían después del sync.
- **Mitigación:** `syncNow()` (2026-06-05) ahora lee de D1 como fuente autoritativa. Supabase solo como fallback si D1 no responde.
- **Estado:** ✅ RESUELTO

### VECTOR 4 · ALTO · NO MITIGADO 🟠
**DELETE físico sin papelera ni backup**

- **Archivo:** `siso-worker/index.js`, líneas 342-346
- **Causa raíz:** `DELETE FROM siso_store WHERE key = ?` — borrado FÍSICO inmediato, sin flag `deleted=true`, sin papelera, sin backup previo al delete.
- **Síntoma:** Cualquier bug en el frontend que llame `_workerDeleteRaw` con la clave equivocada → pérdida permanente e irreversible.
- **Usos del DELETE en frontend (App.jsx):**
  - Eliminación de chunks viejos en `_workerSet` (línea ~419)
  - Limpieza de chunks temporales
  - `POST /cleanup` del worker
- **Ventana de recuperación:** Solo snapshots diarios (si existen y < 7 días)
- **Estado:** 🟠 NO MITIGADO

### VECTOR 5 · ALTO · NO MITIGADO 🟠
**Rotación de snapshots > 7 días (único backup)**

- **Archivo:** `siso-worker/index.js`, líneas 460-499, 355-388
- **Causa raíz:** El CRON diario borra snapshots con fecha > 7 días ANTES de crear el nuevo. Si el nuevo falla y el viejo ya se borró → sin backup.
- **Síntoma:** Si hay corrupción en datos activos y no se detecta en < 7 días, no hay forma de recuperar. Si el CRON falla 8+ días seguidos → pérdida total de snapshots.
- **Ventana de recuperación:** 7 días máximo
- **Estado:** 🟠 NO MITIGADO. No hay R2, no hay exportación externa, no hay notificación de fallo.

### VECTOR 6 · MEDIO · PARCIALMENTE MITIGADO 🟡
**Exceso de lecturas D1 (health full=1)**

- **Archivo:** `siso-worker/index.js`, líneas 303-340
- **Causa raíz:** `/health?full=1` ejecuta 5 COUNT(*) → ~11K lecturas/llamada. Si ambas apps llaman cada 2 min desde 2 pestañas → ~7M/día > límite gratis 5M.
- **Síntoma:** Al exceder el límite, D1 rechaza TODAS las operaciones (lecturas Y escrituras) → imposibilidad de guardar datos nuevos.
- **Mitigación parcial:** El health por defecto ahora solo hace `SELECT 1`. Pero si algún monitor/servicio externo llama con `?full=1`, igual excede.
- **Estado:** 🟡 PARCIALMENTE MITIGADO

### VECTOR 7 · MEDIO · PARCIALMENTE MITIGADO 🟡
**Chunks huérfanos `__new*` no siempre se limpian correctamente**

- **Archivo:** `siso-worker/index.js`, líneas 368-378, 484-498
- **Causa raíz:** Si una escritura chunked falla a medio camino, los chunks `__new<timestamp>__cN` quedan huérfanos.
- **Síntoma:** `POST /cleanup` borra TODOS los `%__new%` sin verificar si son de una escritura en curso. Si coincide en timing con una escritura activa → pérdida.
- **CRON GC:** Solo borra chunks con timestamp > 1h. Los chunks de la última hora quedan.
- **Estado:** 🟡 PARCIALMENTE MITIGADO (GC del CRON ayuda pero no es perfecto)

### VECTOR 8 · MEDIO · MITIGADO (nuevas escrituras) 🟡
**Compresión GZIP legacy puede corromper lecturas**

- **Archivo:** `siso-worker/index.js`, líneas 44-65
- **Causa raíz:** Compresión GZIP se DESACTIVÓ (2026-06-18) porque causó 500 en producción.
- **Síntoma:** Valores legacy con prefijo `gz:` que no se descompriman correctamente → `decompressValue` tiene fallback que devuelve crudo → `JSON.parse("gz:...")` falla → clave ilegible.
- **Nuevas escrituras:** Ya no usan GZIP (no-op en compressValue)
- **Estado:** 🟡 MITIGADO para nuevas escrituras, RIESGO RESIDUAL para datos legacy

### VECTOR 9 · MEDIO · NO MITIGADO 🟡
**LIMIT 2000 en listados de D1**

- **Archivo:** `siso-worker/index.js`, líneas 113, 126, 129
- **Causa raíz:** `GET /store/prefix/:p` y `GET /store` tienen LIMIT 2000.
- **Síntoma:** Si hay > 2000 claves con prefijo `siso_` (~2.300 filas reportadas), las claves 2001+ nunca se retornan. El syncManager solo recibe las primeras 2000 → algunas claves nunca se sincronizan al frontend.
- **Impacto:** Depende de qué claves quedan fuera del LIMIT. Si son críticas (pacientes, HCs) → pérdida funcional.
- **Estado:** 🟡 NO MITIGADO

### VECTOR 10 · BAJO · NO MITIGADO 🟢
**localStorage como fuente en hybridGet sin verificación**

- **Archivo:** `src/utils/syncManager.js`, líneas 133-141
- **Causa raíz:** Si IndexedDB no tiene el dato, `hybridGet` lee de localStorage y lo promueve sin verificar contra D1.
- **Síntoma:** Datos viejos o corruptos en localStorage se propagan a IndexedDB y se muestran al usuario.
- **Impacto:** Bajo (generalmente localStorage tiene datos recientes)
- **Estado:** 🟢 NO MITIGADO (bajo impacto)

---

## 6. PROTOCOLO DE DIAGNÓSTICO DE FUGAS

### Paso 1: Verificar estado actual de D1
```bash
curl -H "X-Siso-Token: <TOKEN>" https://siso-api.<worker>.workers.dev/storage-stats
curl -H "X-Siso-Token: <TOKEN>" "https://siso-api.<worker>.workers.dev/health?full=1"
```
**Indicadores de alerta:**
- `uso_pct` > 90%
- `alerta_90: true`
- `top_grupos` muestra `__new*` > 0 → chunks huérfanos
- `top_grupos` muestra snapshots > 40% → rotación fallando

### Paso 2: Verificar snapshots
```bash
curl -H "X-Siso-Token: <TOKEN>" https://siso-api.<worker>.workers.dev/snapshot/list
```
**Indicadores de alerta:**
- 0 snapshots → CRON no funciona
- Snapshots > 7 días → rotación no funciona
- Snapshot más reciente > 48h → posible fallo reciente

### Paso 3: Verificar integridad de claves chunked
```bash
# Para cada clave crítica (pacientes, atenciones, HCs):
# 1. GET clave__meta → ver count
# 2. GET clave__c0, __c1... __cN → ver que existan count piezas
# 3. Concatenar y JSON.parse → verificar válido
# 4. Comparar hash con __meta.hash
```
**Indicadores de alerta:**
- `__meta.count` ≠ número de `__cN` existentes
- JSON.parse falla → corrupción
- Hash mismatch → piezas de generaciones distintas

### Paso 4: Verificar candado anti-encogimiento
```bash
# En Cloudflare Dashboard → Workers → siso-api → Logs
# Filtrar: "CANDADO"
```
**Indicadores de alerta:**
- Ausencia de logs "CANDADO" en período con actividad → candado no se activó
- Logs "CANDADO ... error:" → candado falló

### Paso 5: Comparar D1 vs Supabase
```bash
node scripts/compare-d1-supabase.mjs --compare
```
**Indicadores de alerta:**
- Claves en D1 ausentes en Supabase → posible pérdida reciente
- Claves en Supabase ausentes en D1 → posible borrado accidental en D1
- Discrepancia de counts → inconsistencia de sincronización

### Paso 6: Inspeccionar colas offline en navegador
```
DevTools → Application → IndexedDB → siso_offline_db:
- sync_queue: ¿items pendientes? ¿muy antiguos?
- audit_queue: ¿logs acumulados sin enviar?
```
**Indicadores de alerta:**
- sync_queue > 100 items → sync no funciona
- Items con ts > 24h → posible loop de error
- audit_queue > 500 → logs sin enviar se perderán en próximo logout

### Paso 7: Verificar logs del Worker
```
Cloudflare Dashboard → Workers → siso-api → Logs
Filtros: "error", "500", "timeout", "CANDADO", "chunked"
```
**Indicadores de alerta:**
- 500 frecuentes en `/store/chunked` → timeout en batch grande
- `[CRON snapshot] error` → snapshots no se generan
- Múltiples 500 en corto período → D1 rechazando operaciones

### Paso 8: Auditoría de integridad de datos
```
Para cada clave crítica, verificar:
1. ¿Existe en D1? → GET /store/:key
2. ¿Existe en Supabase? → comparar via script
3. ¿Existe en localStorage? → DevTools → Application → Local Storage
4. ¿Existe en IndexedDB? → DevTools → Application → IndexedDB
5. ¿Está en el snapshot más reciente?
```
**Indicadores de alerta:**
- Dato en localStorage pero NO en D1 → nunca se sincronizó
- Dato en snapshot pero NO en D1 activo → se perdió después del snapshot
- Dato en IndexedDB pero NO en D1 → sync no lo subió

---

## 7. MECANISMOS DE PROTECCIÓN ACTIVOS

| Mecanismo | Ubicación | Fecha | Estado |
|---|---|---|---|
| Escritura chunked atómica | `siso-worker/index.js` L188-270 | 2026-07-11 | ✅ Activo |
| Candado anti-encogimiento | `siso-worker/index.js` L204-238 | 2026-07-11 | ✅ Activo |
| D1 autoritativo en sync | `syncManager.js` L253-282 | 2026-06-05 | ✅ Activo |
| If-Match / ETag | `siso-worker/index.js` L147-162 | — | ✅ Activo |
| Append atómico server-side | `siso-worker/index.js` L272-301 | 2026-07-09 | ✅ Activo |
| Snapshots diarios | `siso-worker/index.js` L444-593 | — | ⚠️ Sin monitoreo |
| Cleanup emergencia | `siso-worker/index.js` L355-388 | — | ⚠️ Manual |
| Service Worker sync | `public/sw.js` L148-165 | — | ✅ Activo |
| Cola offline (IndexedDB) | `offlineDB.js` L145-167 | — | ✅ Activo |
| localStorage respaldo | `syncManager.js` L175 | — | ✅ Activo |
| Purga autosaves > 24h | `App.jsx` L19449-19471 | — | ⚠️ Solo al montar |
| Dedup firma redundante | `App.jsx` L19485-19500+ | — | ✅ Activo |

---

## 8. DIAGRAMA DE FLUJO DE ESCRITURA

```
Usuario guarda dato
        │
        ▼
┌──────────────────────────────────┐
│ 1. localStorage.setItem          │  ← INMEDIATO, primera capa
│    (src/utils/storage.js L12-17) │
└───────────────┬──────────────────┘
                │
                ▼
┌──────────────────────────────────┐
│ 2. IndexedDB idbSet              │  ← Caché offline
│    (src/utils/offlineDB.js L74)  │
└───────────────┬──────────────────┘
                │
         ┌──────┴──────┐
         │    ONLINE?   │
         └──────┬──────┘
           SÍ   │   NO
           ┌────┘   └────┐
           ▼              ▼
┌──────────────────┐ ┌──────────────────────────┐
│ 3a. Worker D1    │ │ 3b. Encolar sync_queue   │
│ _workerPostUpsert│ │ enqueueSync(upsert)      │
│ → POST /store    │ │ (offlineDB.js L145)      │
│                  │ │                          │
│ Si > 450KB:      │ │ + Service Worker         │
│ → POST /store/   │ │   sync.register(         │
│   chunked        │ │   'siso-sync-queue')     │
│ (App.jsx)        │ │                          │
└──────┬───────────┘ └──────────┬───────────────┘
       │                        │
       │                  (al reconectar)
       │                        │
       ▼                        ▼
┌──────────────────┐ ┌──────────────────────────┐
│ 4. Supabase      │ │ drainSyncQueue()         │
│ _sbSet(key,val)  │ │ → procesa cola           │
│ → POST/PATCH     │ │ → _sbSet por cada item   │
│   siso_store     │ │ (syncManager.js L232)    │
│ (supabase.js)    │ │                          │
└──────────────────┘ └──────────────────────────┘
```

---

## 9. DIAGRAMA DE FLUJO DE LECTURA

```
App solicita clave
        │
        ▼
┌──────────────────────────────────┐
│ 1. IndexedDB idbGet              │  ← Instantáneo, offline
│    Si encuentra → retorna        │
│    + background _refreshFromD1   │
│    (syncManager.js L121-128)     │
└───────────────┬──────────────────┘
                │ (no encontrado)
                ▼
┌──────────────────────────────────┐
│ 2. localStorage sp(k, fb)        │  ← Compatibilidad legacy
│    Si encuentra → promueve a     │
│    IndexedDB + retorna           │
│    (syncManager.js L133-141)     │
└───────────────┬──────────────────┘
                │ (no encontrado)
                ▼
┌──────────────────────────────────┐
│ 3. Worker D1 _d1Get(key)         │  ← Fuente autoritativa
│    GET /store/:key               │
│    Si encuentra → guarda IDB +   │
│    localStorage + retorna        │
│    (syncManager.js L69-82)       │
└───────────────┬──────────────────┘
                │ (no encontrado en D1)
                ▼
┌──────────────────────────────────┐
│ 4. Supabase _fetchFromSupabase   │  ← Fallback
│    GET siso_store?key=eq.{key}   │
│    Si encuentra → guarda IDB +   │
│    retorna                       │
│    (syncManager.js L363-377)     │
└───────────────┬──────────────────┘
                │ (no encontrado)
                ▼
┌──────────────────────────────────┐
│ 5. Retorna fallback (default)    │
└──────────────────────────────────┘
```

---

## 10. RECOMENDACIONES (SIN IMPLEMENTAR — SOLO DIAGNÓSTICO)

### Críticas (acción inmediata recomendada)
1. **Activar R2 backups** como capa externa de respaldo (independiente de D1)
2. **Implementar soft-delete** en DELETE /store/:key (`deleted=1` + purga diferida)
3. **Notificación de fallo de CRON** (alertas si el snapshot diario falla 2+ días)
4. **Aumentar LIMIT o implementar paginación** en GET /store y /store/prefix

### Altas (acción a corto plazo)
5. **Monitoreo de cuota D1** con alertas automáticas al 70%, 85%, 95%
6. **Verificación de integridad post-chunked** (hash check automático en lectura)
7. **Añadir If-Match a POST /store/append** para detectar colisiones

### Medias (acción planificada)
8. **DB_VERSION upgrade path** en offlineDB.js para migraciones de esquema
9. **Rate limiting** en el worker por token/IP
10. **Métricas de sync** (dashboard de salud de sincronización)

---

## 11. GLOSARIO DE ARCHIVOS CLAVE

| Archivo | Líneas | Rol en almacenamiento |
|---|---|---|
| `siso-worker/index.js` | 594 | API REST sobre D1. CRUD, chunking, snapshots, cleanup, health |
| `siso-worker/schema.sql` | 6 | Schema DDL de D1 (1 tabla: siso_store) |
| `siso-worker/wrangler.json` | 15 | Configuración del worker (D1 binding, CRON, nombre) |
| `src/utils/syncManager.js` | 466 | Orquestador de sincronización híbrida (D1 ↔ IndexedDB ↔ Supabase) |
| `src/utils/offlineDB.js` | 301 | IndexedDB: 4 stores (kv_store, sync_queue, audit_queue, sync_meta) |
| `src/utils/storage.js` | 71 | Wrappers de localStorage/sessionStorage con fallback a RAM |
| `src/utils/supabase.js` | 376+ | Cliente Supabase REST (siso_store + Storage) |
| `src/App.jsx` | ~21,000 | Monolito frontend. Contiene _workerGet, _workerSet, _sync, _dedup, purgas |
| `public/sw.js` | 232 | Service Worker: cache HTTP + Background Sync triggers |
| `scripts/compare-d1-supabase.mjs` | — | Script de comparación y sync D1 ↔ Supabase |
| `scripts/sync-portal-safe.mjs` | — | Script de sincronización del portal público |
| `scripts/export-safe.mjs` | — | Script de exportación segura de datos |
| `scripts/optimizar-atenciones-portal.mjs` | — | Script de optimización de atenciones para portal |
| `scripts/recuperar-firma-portal.mjs` | — | Script de recuperación de firmas del portal |
| `scripts/migrar-stats-informes-a-d1.mjs` | — | Script de migración de estadísticas a D1 |

---

## 12. FIRMA DEL DOCUMENTO

**Auditoría realizada por:** Sistema de análisis forense automatizado  
**Fecha de análisis:** 2026-07-11 19:30 UTC-4  
**Commit analizado:** `e7ed13a` (último commit en main)  
**Total líneas de código analizadas:** ~23,000 entre worker y frontend  
**Total vectores identificados:** 10 (3 críticos mitigados, 2 altos activos, 4 medios, 1 bajo)  
**Archivos auditados:** 15 archivos fuente + 6 scripts de soporte  
**Versión del documento:** 1.0  

---

*Este documento es un diagnóstico técnico. No contiene modificaciones al código fuente. Las recomendaciones son sugerencias de mitigación que requieren validación humana antes de su implementación.*