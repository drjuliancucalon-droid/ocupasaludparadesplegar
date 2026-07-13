# 🔬 ADDENDUM FORENSE — NUEVOS HALLAZGOS DEL TERMINAL DE PRODUCCIÓN
## SISO OCUPASALUD — Análisis post-auditoría con logs reales

**Fecha:** 2026-07-11 19:45 UTC-4  
**Commit:** `e7ed13a`  
**Origen de datos:** Consola del navegador en producción  
**Ambiente:** `https://84853c82.ocupasaludparadesplegar-f4q.pages.dev/`

---

## 1. CONTEXTO: LÍNEA TEMPORAL DEL INCIDENTE

```
T+0s   App carga, Service Worker registrado
T+2s   IndexedDB lista → 442 pacientes restaurados desde D1
T+3s   [AUDIT] LS ↔ D1 sincronizados
T+4s   1806 claves actualizadas desde D1 → sync exitoso
T+8s   1806 claves actualizadas desde D1 (segundo sync)
T+12s  1806 claves actualizadas desde D1 (tercer sync)
T+15s  ⚠️ CORS 503 en /store/prefix/siso_ (D1 no responde)
T+16s  ⚠️ ERR_QUIC_PROTOCOL_ERROR en chunks __c0, __c1, __c3, __c4
T+16s  ⚠️ "[_workerGet] chunk X/10 faltante para siso_patients_drcucalon"
T+17s  1 clave actualizada desde Supabase (fallback porque D1 cayó)
T+19s  ⚠️ CORS 503 en POST /store/chunked
T+20s  ⚠️ "[_workerSet] /store/chunked falló — fallback a troceo cliente"
```

---

## 2. NUEVOS ERRORES IDENTIFICADOS (8 errores)

### ERROR A · CRÍTICO · NUEVO VECTOR 🔴
**Worker D1 responde 503 (Service Unavailable) de forma intermitente**

```
Mensaje: Access to fetch at 'https://siso-api.dr-juliancucalon.workers.dev/store/prefix/siso_'
         has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header
         net::ERR_FAILED 503 (Service Unavailable)
```

| Campo | Valor |
|---|---|
| **Archivos involucrados** | `siso-worker/index.js` (todo el worker), `src/App.jsx:400-522` (_workerSet), `src/utils/syncManager.js:44-67` (_d1GetAll) |
| **Status HTTP** | 503 (Service Unavailable) — emitido por Cloudflare, NO por el código del worker |
| **Causa raíz probable** | El worker está CRASHEANDO antes de ejecutar `corsHeaders()`. Posibles causas: 1) CPU timeout del plan gratuito (10ms), 2) Error no capturado en `new URL(request.url)` (línea 83, fuera del try/catch), 3) `JSON.stringify` de un error de D1 con referencias circulares que rompe el catch (línea 436), 4) D1 rechazando conexiones por exceder límite gratuito de lecturas |
| **Evidencia** | El error CORS dice "No 'Access-Control-Allow-Origin' header" — significa que el worker NUNCA llegó a ejecutar `corsHeaders(origin)`. Si el código hubiera llegado al try/catch, el catch en línea 435-437 devuelve 500 con headers CORS. El 503 + sin CORS = Cloudflare mató el worker antes de que el código corriera |
| **¿Pérdida de datos?** | **SÍ — CRÍTICA**. Cuando `/store/prefix/siso_` responde 503: 1) `_d1GetAll()` retorna `null`, 2) `syncNow()` cae a Supabase como fallback, 3) Supabase tiene datos viejos, 4) el diff de timestamps puede SOBREESCRIBIR IndexedDB con datos viejos de Supabase (reintroduce Vector 3) |
| **Severidad** | 🔴 CRÍTICA |

**Mecanismo de pérdida detallado:**
```
syncNow() se ejecuta cada 5 min (syncManager.js L429)
  → _d1GetAll() → GET /store/prefix/siso_
  → Worker crashea → 503 sin CORS → fetch falla
  → _d1GetAll() retorna null (L66: catch { return null })
  → syncNow() L256-258: "Fallback Supabase SOLO si D1 cae"
  → _sbGetAll() descarga de Supabase
  → datos viejos de Supabase sobreescriben IndexedDB
  → PÉRDIDA DE DATOS RECIENTES
```

### ERROR B · CRÍTICO · NUEVO VECTOR 🔴
**ERR_QUIC_PROTOCOL_ERROR en chunks de ~500KB con HTTP 200**

```
Mensaje: GET .../store/siso_patients_drcucalon__c0 net::ERR_QUIC_PROTOCOL_ERROR 200 (OK)
         [_workerGet] chunk 0/10 faltante para siso_patients_drcucalon
```

| Campo | Valor |
|---|---|
| **Archivos involucrados** | `siso-worker/index.js:89-98` (GET /store/:key), `src/App.jsx:524-580` (_workerGet con pool paralelo) |
| **Síntoma** | El chunk 0/10, 1/10, 3/10, 4/10 fallan — pero NO 2, 5, 6, 7, 8, 9. El patrón NO es secuencial ni total. |
| **Causa raíz** | QUIC (HTTP/3) está fragmentando/truncando respuestas de ~500KB. El navegador recibe los headers (status 200) pero el cuerpo se corrompe o trunca a nivel de protocolo. El fetch retorna `r.ok === true` pero `r.json()` falla → `_workerGetRaw` retorna `null` → `_workerGet` marca "chunk faltante" |
| **Factor agravante** | El `_workerGet` usa POOL PARALELO de 6 lectores (App.jsx L559-570). 6 peticiones concurrentes de 500KB cada una sobre QUIC saturan los streams UDP del navegador → corrupción de paquetes |
| **¿Pérdida de datos?** | **SÍ — ALTA**. Si 4/10 chunks fallan, la reconstrucción completa falla → `_workerGet` retorna `null` → el paciente/HC NO se carga → el sistema cree que no existe. Si en ese momento se guarda (con estado vacío), se SOBREESCRIBE en D1 con datos incompletos |
| **Severidad** | 🔴 CRÍTICA |

**Patrón de fallo:**
```
Chunks solicitados: __c0, __c1, __c2, __c3, __c4, __c5, __c6, __c7, __c8, __c9
Pool concurrente (6): arrancan __c0..__c5 simultáneamente
Fallan: __c0 ❌, __c1 ❌, __c3 ❌, __c4 ❌  (4 de los primeros 6)
OK:     __c2 ✅, __c5 ✅ (asumido), __c6..__c9 ✅ (llegan después del pool)

Esto sugiere que los PRIMEROS 6 streams QUIC simultáneos colapsan.
Los chunks que llegan después (cuando el pool ya drenó algunos) funcionan.
```

### ERROR C · CRÍTICO · REINTRODUCE VECTOR 1 🔴
**POST /store/chunked falla → fallback a troceo cliente NO ATÓMICO**

```
Mensaje: [_workerSet] /store/chunked falló (Failed to fetch) — fallback a troceo cliente
```

| Campo | Valor |
|---|---|
| **Archivo** | `src/App.jsx:434-455` (try/catch de /store/chunked), `src/App.jsx:456-522` (troceo cliente manual) |
| **Mecanismo** | Cuando `/store/chunked` responde 503, el catch (L453-455) activa el fallback. El troceo cliente (L456-522): 1) escribe piezas UNA A UNA vía `_workerSetRaw` → `POST /store`, 2) CADA pieza es una petición HTTP independiente, 3) NO hay transacción, 4) NO hay candado anti-encogimiento |
| **Consecuencia** | **REINTRODUCE el Vector 1 (carrera de escritura chunked)**. Si dos pestañas ejecutan este fallback simultáneamente, las piezas `__cN` se entrelazan → hash mismatch → "CORRUPCIÓN detectada" → lectura descartada |
| **¿Pérdida de datos?** | **SÍ — CRÍTICA**. El Vector 1 se MITIGÓ en 2026-07-11 con `/store/chunked` atómico. Pero el fallback reintroduce exactamente el mismo bug cuando el worker está caído |
| **Severidad** | 🔴 CRÍTICA |

**Código exacto del fallback (App.jsx L453-522):**
```
L453: } catch (e) {
L454:   console.warn(`[_workerSet] /store/chunked falló... — fallback a troceo cliente`);
L455: }
L456: const pieces = [];
L457-459: // Trocea serialized en piezas de 500KB
L461-463: // Escribe a claves TEMPORALES __new<ts>__cN
L466-469: for (let i = 0; i < pieces.length; i++) {
           const ok = await _workerSetRaw(key + newSuffix + __c + i, pieces[i]);
           // ← _workerSetRaw llama a POST /store (upsert normal, no atómico)
         }
L495-499: // PROMOCIÓN: copia temporales a claves finales __cN
         for (let i = 0; i < pieces.length; i++) {
           await _workerSetRaw(key + __c + i, pieces[i]); // ← OTRA ronda de POST /store
         }
```

### ERROR D · ALTO · NUEVO VECTOR 🟠
**Worker URL no coincide con el CORS configurado**

| Campo | Valor |
|---|---|
| **Archivo** | `siso-worker/wrangler.json` (nombre: `siso-api`), `siso-worker/index.js:6-14` (ALLOWED_ORIGINS) |
| **Worker real en logs** | `siso-api.dr-juliancucalon.workers.dev` |
| **Origen del frontend** | `84853c82.ocupasaludparadesplegar-f4q.pages.dev` |
| **¿CORS configurado para este origin?** | **SÍ** — el wildcard `endsWith(".ocupasaludparadesplegar-f4q.pages.dev")` en línea 27 DEBERÍA cubrirlo |
| **¿Por qué falla CORS?** | **NO es un problema de CORS**. El error CORS es un SÍNTOMA, no la causa. La causa es el 503: el worker crashea antes de ejecutar `corsHeaders()`. Cloudflare devuelve su propia página de error 503 SIN headers CORS. El navegador reporta "blocked by CORS" porque no ve `Access-Control-Allow-Origin`, pero el problema real es que el worker está muerto |
| **Severidad** | 🟠 ALTA (es síntoma de que el worker crashea frecuentemente) |

### ERROR E · ALTO · YA DOCUMENTADO (Vector 3) 🟠
**SyncManager cae a Supabase con datos viejos**

```
Mensaje: [SISO SYNC] 1 claves actualizadas desde Supabase (fallback)
```

| Campo | Valor |
|---|---|
| **Archivo** | `src/utils/syncManager.js:256-260` |
| **Causa** | `_d1GetAll()` retorna `null` (D1 caído) → fallback a `_sbGetAll()` → Supabase tiene datos viejos |
| **Consecuencia** | El diff de timestamps (L270) dice "Cloud más reciente" (porque `_d1GetAll` infiere `updatedAt` con `now()` cuando no hay timestamp real, L57-63) → sobreescribe IndexedDB con datos de Supabase → REINTRODUCE Vector 3 |
| **Estado** | El Vector 3 se mitigó en 2026-06-05 cambiando `_sbGetAll` por `_d1GetAll`. Pero el FALLBACK a Supabase cuando D1 cae reintroduce el mismo bug |
| **Severidad** | 🟠 ALTA |

### ERROR F · MEDIO · NUEVO VECTOR 🟡
**ERR_QUIC_PROTOCOL_ERROR sin manejo específico**

| Campo | Valor |
|---|---|
| **Archivo** | `src/App.jsx:339-354` (_workerFetch) |
| **Mecanismo** | `_workerFetch` tiene reintento con backoff (200/400/800ms hasta 3 intentos). PERO el código solo distingue: `r.ok`, `r.status >= 400 && < 500`, `null` (error de red). ERR_QUIC_PROTOCOL_ERROR produce un fetch que lanza excepción → cae en `catch { r = null }` → se reintenta como error de red |
| **Problema** | 3 reintentos sobre QUIC colapsado probablemente también fallan con QUIC_PROTOCOL_ERROR. No hay lógica de "cambiar a HTTP/2" o "reducir concurrencia" |
| **Consecuencia** | Si el problema es congestión de streams QUIC, reintentar 3 veces con la misma concurrencia empeora la congestión |
| **Severidad** | 🟡 MEDIA (el reintento ayuda pero no resuelve la causa raíz) |

### ERROR G · BAJO · NUEVO VECTOR 🟢
**Service Worker cachea peticiones chrome-extension://**

```
Mensaje: Uncaught (in promise) TypeError: Failed to execute 'put' on 'Cache': 
         Request scheme 'chrome-extension' is unsupported
         at cacheFirstStrategy (sw.js:94)
```

| Campo | Valor |
|---|---|
| **Archivo** | `public/sw.js:86-102` (cacheFirstStrategy) |
| **Causa raíz** | El SW intercepta TODAS las peticiones GET del scope (L59-64), incluyendo peticiones `chrome-extension://` de extensiones del navegador. La Cache API rechaza esquemas no http/https |
| **¿Pérdida de datos?** | **NO**. Solo afecta el funcionamiento de extensiones del navegador |
| **Severidad** | 🟢 BAJA |

### ERROR H · BAJO · CONOCIDO 🟢
**Message channel closed antes de respuesta (Service Worker)**

```
Mensaje: Uncaught (in promise) Error: A listener indicated an asynchronous response 
         by returning true, but the message channel closed before a response was received
```

| Campo | Valor |
|---|---|
| **Causa** | Un event listener del SW (message, sync, fetch) retornó `true` (indicando respuesta asíncrona) pero la pestaña que envió el mensaje se cerró antes de que el SW respondiera |
| **¿Pérdida de datos?** | **NO**. Puede afectar Background Sync si el mensaje era `SISO_SYNC_NOW` pero es un race condition normal de pestañas cerradas |
| **Severidad** | 🟢 BAJA |

---

## 3. RESUMEN DE NUEVOS VECTORES (NO DOCUMENTADOS EN INFORME V1)

| ID | Vector | Severidad | ¿Ya documentado? |
|---|---|---|---|
| **V11** | Worker D1 503 intermitente (crash antes de corsHeaders) | 🔴 CRÍTICO | **NUEVO** |
| **V12** | ERR_QUIC_PROTOCOL_ERROR en chunks 500KB (streams UDP saturados) | 🔴 CRÍTICO | **NUEVO** |
| **V13** | Fallback a troceo cliente reintroduce Vector 1 (carrera de escritura) | 🔴 CRÍTICO | **EXTENSIÓN de V1** |
| **V14** | Worker URL vs CORS config mismatch sintomático | 🟠 ALTO | **NUEVO** |
| **V15** | Fallback a Supabase reintroduce Vector 3 (sobrescritura) | 🟠 ALTO | **EXTENSIÓN de V3** |
| **V16** | ERR_QUIC_PROTOCOL_ERROR sin manejo específico | 🟡 MEDIO | **NUEVO** |
| **V17** | SW cachea chrome-extension:// | 🟢 BAJO | **NUEVO** |
| **V18** | Message channel SW cerrado prematuramente | 🟢 BAJO | **NUEVO** |

---

## 4. MATRIZ DE VECTORES COMBINADA (V1 + ADDENDUM)

| # | Vector | Severidad | Estado |
|---|---|---|---|
| V1 | Carrera de escritura chunked (piezas entrelazadas) | 🔴 CRÍTICO | ✅ Mitigado (servidor) / ⚠️ REINTRODUCIDO por V13 |
| V2 | Encogimiento de colecciones protegidas | 🔴 CRÍTICO | ✅ Mitigado (candado server-side) |
| V3 | Sobrescritura desde Supabase (sync periódico) | 🔴 CRÍTICO | ✅ Mitigado (D1 autoritativo) / ⚠️ REINTRODUCIDO por V15 |
| V4 | DELETE físico sin papelera | 🟠 ALTO | ❌ No mitigado |
| V5 | Rotación snapshots > 7d (único backup) | 🟠 ALTO | ❌ No mitigado |
| V6 | Exceso lecturas D1 (health full=1) | 🟡 MEDIO | ⚠️ Parcial |
| V7 | Chunks huérfanos __new* | 🟡 MEDIO | ⚠️ Parcial |
| V8 | GZIP legacy corrupto | 🟡 MEDIO | ⚠️ Parcial |
| V9 | LIMIT 2000 en listados | 🟡 MEDIO | ❌ No mitigado |
| V10 | localStorage fuente en hybridGet sin verificar | 🟢 BAJO | ❌ No mitigado |
| **V11** | **Worker D1 503 intermitente (crash)** | 🔴 **CRÍTICO** | ❌ **NUEVO** |
| **V12** | **ERR_QUIC_PROTOCOL_ERROR en chunks 500KB** | 🔴 **CRÍTICO** | ❌ **NUEVO** |
| **V13** | **Fallback troceo cliente reintroduce V1** | 🔴 **CRÍTICO** | ❌ **NUEVO** |
| **V14** | **Worker URL vs CORS sintomático** | 🟠 **ALTO** | ❌ **NUEVO** |
| **V15** | **Fallback a Supabase reintroduce V3** | 🟠 **ALTO** | ❌ **NUEVO** |
| **V16** | **QUIC error sin manejo específico** | 🟡 **MEDIO** | ❌ **NUEVO** |
| **V17** | **SW cachea chrome-extension://** | 🟢 **BAJO** | ❌ **NUEVO** |
| **V18** | **Message channel SW cerrado** | 🟢 **BAJO** | ❌ **NUEVO** |

---

## 5. PROTOCOLO DE DIAGNÓSTICO ACTUALIZADO (8 PASOS ORIGINALES + 5 NUEVOS)

### Paso 1-8: Protocolo original (ver INFORME-AUDITORIA-ALMACENAMIENTO-2026-07-11.md, Sección 6)

### PASO 9 (NUEVO): Verificar salud del Worker D1

```bash
# 1. Verificar que el worker responde (health check ligero):
curl -v -H "X-Siso-Token: <TOKEN>" https://siso-api.dr-juliancucalon.workers.dev/health

# 2. Verificar con ?full=1 (solo 1 vez para diagnóstico):
curl -v -H "X-Siso-Token: <TOKEN>" "https://siso-api.dr-juliancucalon.workers.dev/health?full=1"

# 3. Verificar CORS para el preview deploy específico:
curl -v -H "Origin: https://84853c82.ocupasaludparadesplegar-f4q.pages.dev" \
     -H "X-Siso-Token: <TOKEN>" \
     https://siso-api.dr-juliancucalon.workers.dev/store/prefix/siso_

# 4. En Cloudflare Dashboard → Workers → siso-api → Metrics:
#    - CPU time per request (si > 10ms → posible timeout)
#    - Memory usage
#    - 5xx error rate (si > 1% → worker crasheando frecuentemente)
#    - D1 reads per day (si cerca de 5M → cuota excedida)
```

**Indicadores de alerta:**
- `/health` retorna 503 → worker no está corriendo
- `?full=1` retorna 503 pero sin full retorna 200 → el COUNT(*) excede CPU time
- CURL con `-v` no muestra `Access-Control-Allow-Origin` → worker crashea antes de CORS
- D1 reads/day > 4.5M → cerca del límite gratuito

### PASO 10 (NUEVO): Diagnosticar ERR_QUIC_PROTOCOL_ERROR

```bash
# 1. Verificar tamaño de los chunks problemáticos:
curl -s -H "X-Siso-Token: <TOKEN>" \
     "https://siso-api.dr-juliancucalon.workers.dev/store/siso_patients_drcucalon__c0" | wc -c

# 2. Probar con HTTP/2 en lugar de QUIC/HTTP3:
curl --http2 -H "X-Siso-Token: <TOKEN>" \
     "https://siso-api.dr-juliancucalon.workers.dev/store/siso_patients_drcucalon__c0"

# 3. Verificar en el navegador: chrome://net-internals/#quic
#    - Buscar "QUIC_SESSION" para el dominio siso-api.dr-juliancucalon.workers.dev
#    - Ver errores: QUIC_STREAM_ERROR, QUIC_CONNECTION_CLOSE
```

**Indicadores de alerta:**
- CURL con HTTP/2 funciona pero el navegador con QUIC falla → problema de QUIC
- Tamaño de chunk > 480KB → más probable que falle en QUIC
- chrome://net-internals muestra QUIC_STREAM_ERROR frecuentes → congestión de streams
- El problema ocurre SOLO al cargar varios chunks simultáneamente → pool paralelo es el trigger

### PASO 11 (NUEVO): Verificar si el fallback a troceo cliente está activo

```bash
# En logs del navegador, buscar:
# "[_workerSet] /store/chunked falló" → indica que el worker no responde
# "[_workerSet] /store/chunked no disponible" → indica 4xx del worker
```

**Indicadores de alerta:**
- Mensajes "fallback a troceo cliente" en logs → Vector 13 activo
- Si aparece "falló (Failed to fetch)" → 503 del worker
- Si aparece "no disponible (4xx)" → endpoint no existe (worker sin actualizar)

### PASO 12 (NUEVO): Verificar si el fallback a Supabase está sobreescribiendo

```bash
# En logs del navegador, buscar:
# "[SISO SYNC] N claves actualizadas desde Supabase (fallback)"
# Cada ocurrencia = posible sobrescritura con datos viejos
```

**Indicadores de alerta:**
- Mensaje "desde Supabase (fallback)" en cualquier sync → D1 no responde
- El número de claves actualizadas desde Supabase > 0 → posible pérdida
- Si coincide temporalmente con logs "CORS 503" → confirmado

### PASO 13 (NUEVO): Auditoría de salud QUIC/HTTP3

```bash
# En el navegador:
# 1. chrome://flags/#enable-quic → verificar que QUIC está habilitado
# 2. Deshabilitar temporalmente QUIC para testing:
#    chrome://flags/#enable-quic → Disabled → Relaunch
# 3. Reproducir la carga de pacientes y verificar si los chunks cargan sin QUIC_PROTOCOL_ERROR
```

---

## 6. HIPÓTESIS SOBRE LA CAUSA RAÍZ DE LOS 503

### Hipótesis Principal: CPU Timeout del Worker (10ms plan gratuito)

El plan gratuito de Cloudflare Workers tiene un límite de **10ms de CPU time por request**. 
La ruta `/store/prefix/siso_` ejecuta:
1. `SELECT key, value FROM siso_store WHERE key LIKE 'siso_%' AND ... NOT GLOB ... LIMIT 2000`
2. `await Promise.all` con `JSON.parse(await decompressValue(r.value))` para CADA fila (L115)
3. Si hay ~2000 filas × ~0.5ms de JSON.parse cada una = ~1000ms = **100× el límite**

**Conclusión:** `/store/prefix/siso_` probablemente excede el CPU time → Cloudflare mata el worker → 503.

### Hipótesis Secundaria: D1 Read Limit Excedido

5M reads/día gratis. Con 2 apps × 2 pestañas × sync cada 5 min + `/store/prefix/siso_` × cada sync + health checks:
- (24h × 60min / 5min) × 2 apps × 2 pestañas = ~1,152 syncs/día
- Cada sync lee ~2000 filas = 2.3M reads solo de syncs
- Health checks, lecturas individuales, escrituras = fácil exceder 5M

**Conclusión:** Posible que D1 esté rechazando lecturas por exceder cuota → worker recibe error de D1 → crash.

---

## 7. ACCIONES RECOMENDADAS (SIN IMPLEMENTAR — DIAGNÓSTICO SOLAMENTE)

### Inmediatas (riesgo de pérdida de datos activa)
1. **Investigar el 503 del worker**: Revisar métricas de CPU time en Cloudflare Dashboard
2. **Verificar límite de lecturas D1**: Dashboard → D1 → siso-db → Metrics → Reads/day
3. **Ejecutar PASO 9-13 del protocolo** para confirmar la causa raíz del 503 y QUIC error

### Corto plazo (si se confirman las hipótesis)
4. **Si es CPU timeout**: Optimizar `/store/prefix/siso_` para NO parsear JSON de cada fila (devolver valores raw, parsear en cliente)
5. **Si es D1 read limit**: Reducir frecuencia de sync (5min → 10min), reducir LIMIT, o migrar a plan pago
6. **Si es QUIC fragmentation**: Reducir tamaño de chunks (500KB → 250KB) o deshabilitar pool paralelo
7. **Deshabilitar fallback a troceo cliente**: Si `/store/chunked` falla, reintentar más tarde en lugar de hacer troceo no atómico
8. **Deshabilitar fallback a Supabase en syncNow**: Si D1 no responde, NO caer a Supabase (prevenir reintroducción de Vector 3)

---

## 8. DIAGRAMA DE LA CADENA DE FALLOS

```
┌─────────────────────────────────────────────────────────────────┐
│                    CADENA DE FALLOS EN PRODUCCIÓN                │
└─────────────────────────────────────────────────────────────────┘

CPU Timeout o D1 Read Limit Excedido
          │
          ▼
Worker D1 crashea → 503 (Cloudflare default error, sin CORS)
          │
          ├──────────────────────────────────────────┐
          │                                          │
          ▼                                          ▼
┌─────────────────────────┐              ┌─────────────────────────┐
│ syncNow() cada 5 min    │              │ _workerSet() guarda     │
│ _d1GetAll() → 503       │              │ POST /store/chunked →   │
│ → fallback Supabase     │              │ 503 → fallback a        │
│ → SOBREESCRIBE IndexedDB│              │ troceo cliente no       │
│ con datos viejos (V15)  │              │ atómico (V13)           │
│ 🔴 PÉRDIDA DE DATOS     │              │ 🔴 CARRERA DE ESCRITURA │
└─────────────────────────┘              └─────────────────────────┘
          │                                          │
          │                                          │
          ▼                                          ▼
┌─────────────────────────┐              ┌─────────────────────────┐
│ _workerGet() carga      │              │ Pool paralelo 6 lectores│
│ chunks con QUIC/HTTP3   │              │ QUIC streams saturados  │
│ ERR_QUIC_PROTOCOL_ERROR │              │ Chunks 0,1,3,4 fallan   │
│ en 4/10 chunks (V12)    │              │ chunk faltante → null   │
│ 🔴 LECTURA CORRUPTA     │              │ 🔴 RECONSTRUCCIÓN FALLA │
└─────────────────────────┘              └─────────────────────────┘
```

---

## 9. FIRMA DEL ADDENDUM

**Análisis realizado por:** Sistema de análisis forense automatizado  
**Fecha:** 2026-07-11 19:45 UTC-4  
**Commit:** `e7ed13a`  
**Fuente de datos:** Logs de consola del navegador en producción  
**Nuevos vectores identificados:** 8 (2 críticos, 2 altos, 2 medios, 2 bajos)  
**Vectores previamente mitigados que se reintroducen:** 2 (V1 y V3)  
**Total de vectores acumulados:** 18  

---

*Este addendum complementa el INFORME-AUDITORIA-ALMACENAMIENTO-2026-07-11.md. No contiene modificaciones al código fuente. Las recomendaciones son sugerencias de diagnóstico/mitigación que requieren validación humana.*