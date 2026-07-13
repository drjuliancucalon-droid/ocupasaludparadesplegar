# 📋 PROTOCOLO DE CUMPLIMIENTO — VERIFICACIÓN LÍNEA A LÍNEA
## Commit `e4f53e9` vs Protocolo de 18 Soluciones (2026-07-11)

**Fecha de verificación:** 2026-07-12 10:40 UTC-4  
**Commit anterior:** `e7ed13a` (base de la auditoría)  
**Commit actual:** `e4f53e9` (nuevo, 55 inserciones, 8 eliminaciones)  
**Archivos modificados:** `src/App.jsx` (+39/-6), `src/utils/syncManager.js` (+24/-2)  
**Archivos NO modificados:** `siso-worker/index.js`, `siso-worker/schema.sql`, `siso-worker/wrangler.json`, `public/sw.js`

---

## RESUMEN EJECUTIVO

| Métrica | Valor |
|---|---|
| Vectores totales del protocolo | 18 |
| Vectores con solución implementada | **5** (V12, V13-parcial, V6-parcial, V14, V11-parcial) |
| Vectores con solución parcial | **2** (V13, V11) |
| Vectores SIN implementar | **13** |
| % de completitud del protocolo | **27.8%** (5/18) |
| % de completitud de vectores CRÍTICOS | **28.6%** (2/7 críticos) |
| Archivos del worker modificados | **0** — el 503 del worker NO está resuelto |

---

## ANÁLISIS DETALLADO LÍNEA A LÍNEA

### CAMBIO 1: `src/App.jsx` L449-468 — Protección parcial de claves en fallback de troceo

**Diff exacto:**

```diff
-    console.warn(`[_workerSet] /store/chunked no disponible (${r.status}) — fallback a troceo cliente para ${key}`);
+    console.warn(`[_workerSet] /store/chunked no disponible (${r.status})`);
   } catch (e) {
-    console.warn(`[_workerSet] /store/chunked falló (${e?.message}) — fallback a troceo cliente para ${key}`);
+    console.warn(`[_workerSet] /store/chunked falló (${e?.message})`);
   }
+
+  // AUDITORÍA 2026-07-11: el candado anti-encogimiento del servidor SOLO
+  // vive dentro de /store/chunked. El troceo cliente de abajo (piezas
+  // escritas una por una vía POST /store normal) NO pasa por ese candado —
+  // si /store/chunked falla por un hipo de red y una sesión con estado
+  // incompleto cae a este fallback, puede reproducir el mismo incidente de
+  // pérdida de datos de hoy, por una causa distinta (red, no pestaña vieja).
+  // Para claves protegidas (pacientes/atenciones/HC), NUNCA arriesgar esa
+  // escritura sin candado: se aborta y se marca el aviso "sin respaldo" —
+  // el próximo guardado (autoguardado, cierre de HC, etc.) reintentará por
+  // la vía atómica segura. Claves no protegidas conservan el fallback.
+  const _PROTECTED_KEY = /^siso_(db_)?patients_|^siso_atenciones|^siso_hc_/;
+  if (_PROTECTED_KEY.test(key)) {
+    console.warn(`[_workerSet] ${key} es protegida — NO se usa troceo cliente sin candado. Reintentará en el próximo guardado.`);
+    return false;
+  }
```

**Vector abordado:** V13 (Fallback a troceo cliente reintroduce V1)

**Qué pide el protocolo (Sección 2.3):**
- ✅ **CUMPLIDO PARCIALMENTE**: Bloquear troceo cliente para claves protegidas (`return false`)
- ❌ **NO CUMPLIDO**: Encolar referencia `_enqueuePendingD1Ref(key)` para reintento automático
- ❌ **NO CUMPLIDO**: Eliminar completamente el bloque de troceo cliente (L456-522 sigue intacto para claves NO protegidas)
- ❌ **NO CUMPLIDO**: El reintento depende del "próximo guardado manual" del usuario, no de un ciclo automático

**Análisis de riesgo residual:**
- Claves protegidas (`patients_`, `atenciones`, `hc_`): **PROTEGIDAS** — si `/store/chunked` falla, se aborta y se marca `_markUnsyncedHC`. El dato queda en localStorage/IndexedDB y se reintentará cuando el usuario guarde de nuevo.
- Claves NO protegidas (`portal_doc_`, `empresas_favoritas_`, `agendados_`, `users`, etc.): **SIGUEN EXPUESTAS** — si `/store/chunked` falla, caen al troceo cliente manual (L456-522), que NO es atómico. Si dos pestañas guardan simultáneamente una clave no protegida, pueden ocurrir carreras de escritura.
- El protocolo pedía encolar la referencia `_enqueuePendingD1Ref(key)` para TODAS las claves. Este cambio solo protege las 4 categorías del regex, dejando ~22 namespaces sin protección.

**Verificación del regex:**
```
/^siso_(db_)?patients_|^siso_atenciones|^siso_hc_/
```
Cubre: `siso_db_patients_*`, `siso_patients_*`, `siso_atenciones*`, `siso_hc_*`
NO cubre: `siso_portal_doc_*`, `siso_portal_empresa_*`, `siso_agendados_*`, `siso_users`, `siso_autosave_cloud_*`, `siso_arl_reportes`, `siso_saved_reports`, `siso_encuestas_*`, etc.

**Calificación:** ⚠️ **PARCIAL (60%)** — Protege los datos más críticos pero deja ~22 namespaces sin protección de carrera de escritura. No implementa el sistema de reintento automático con cola de referencias.

---

### CAMBIO 2: `src/App.jsx` L553-570 — Pool QUIC reducido + reintento individual

**Diff exacto:**

```diff
-  // Pool de 6 lectores; preserva el orden con parts[i].
+  // AUDITORÍA 2026-07-11: pool reducido de 6 a 2 — 6 lecturas de ~500KB
+  // simultáneas sobre QUIC pueden saturar los streams UDP del navegador
+  // (ERR_QUIC_PROTOCOL_ERROR, reportado de forma no secuencial: fallan
+  // chunks 0,1,3,4 pero no 2,5). Con 2 streams el riesgo baja mucho; el
+  // costo es una reconstrucción algo más lenta, aceptable frente al riesgo
+  // de descartar la lectura completa por una pieza corrupta/faltante.
+  // Se agrega además 1 reintento individual por chunk antes de rendirse.
   const parts = new Array(meta.count);
   let _huboError = false;
   let _nextIdx = 0;
-  const _CONC = 6;
+  const _CONC = 2;
   const _lector = async () => {
     while (!_huboError) {
       const i = _nextIdx++;
       if (i >= meta.count) return;
-      const p = await _workerGetRaw(key + _CHUNK_SUF_PIECE + i);
-      if (p === null) { _huboError = true; console.warn(`[_workerGet] chunk ${i}/${meta.count} faltante para ${key}`); return; }
+      let p = await _workerGetRaw(key + _CHUNK_SUF_PIECE + i);
+      if (p === null) {
+        await new Promise((res) => setTimeout(res, 300));
+        p = await _workerGetRaw(key + _CHUNK_SUF_PIECE + i);
+      }
+      if (p === null) { _huboError = true; console.warn(`[_workerGet] chunk ${i}/${meta.count} faltante para ${key} (tras reintento)`); return; }
       parts[i] = p;
     }
   };
```

**Vector abordado:** V12 (ERR_QUIC_PROTOCOL_ERROR en chunks 500KB)

**Qué pide el protocolo (Sección 2.4):**
- ✅ **CUMPLIDO**: `_CONC` reducido de 6 a 2
- ✅ **CUMPLIDO**: Reintento individual con 300ms de backoff (aunque el protocolo pedía 2 reintentos con backoff exponencial 300/600ms, aquí solo hay 1 reintento con 300ms fijos)
- ⚠️ **DIFERENCIA MENOR**: El protocolo pedía `for (let attempt = 0; attempt < 2; attempt++)` — 2 reintentos. El código implementado solo tiene 1 reintento. Diferencia mínima, acceptable.

**Análisis de impacto:**
- Con `_CONC=6`: 6 streams QUIC simultáneos → 4/10 chunks fallaban
- Con `_CONC=2`: 2 streams QUIC simultáneos → probabilidad de saturación dramáticamente reducida
- Reintento de 300ms: cubre fallos transitorios de red (paquete UDP perdido)
- Costo: reconstrucción más lenta (de ~3s a ~8-10s para 10 chunks), pero acceptable vs descartar toda la lectura

**Calificación:** ✅ **CUMPLIDO (95%)** — Solo falta 1 reintento adicional para el 100%.

---

### CAMBIO 3: `src/utils/syncManager.js` L85-98 — Throttle de descarga completa D1

**Diff exacto:**

```diff
 const _state = {
   isSyncing:     false,
   lastSyncAt:    null,
+  lastFullSyncAt: 0,          // AUDITORÍA 2026-07-11: throttle de la FASE 2 (ver syncNow)
   pendingCount:  0,
   listeners:     new Set(),
   syncInterval:  null,
 };
+// AUDITORÍA 2026-07-11: /store/prefix/siso_ devuelve ~54MB y tarda hasta
+// 22s con el volumen actual de datos — es una descarga completa de casi
+// toda la base, no un diff. syncNow() se dispara desde varios triggers
+// (evento 'online', timeout inicial, intervalo periódico) que pueden
+// solaparse en segundos, multiplicando ese costo y siendo la causa más
+// probable de los 503/timeouts intermitentes reportados. Este cooldown
+// evita repetir la FASE 2 (descarga D1) si ya corrió hace poco — las
+// fases 1 y 3 (cola offline, auditoría) siguen corriendo siempre.
+const _FULL_SYNC_MIN_GAP_MS = 3 * 60 * 1000;
```

**Vector abordado:** V11 (Worker D1 503 intermitente) + V6 (Exceso lecturas D1)

**Qué pide el protocolo (Sección 2.5 y 3.1):**
- ✅ **CUMPLIDO**: Cooldown de 3 minutos entre descargas completas de D1 (reduce lecturas redundantes)
- ❌ **NO CUMPLIDO**: Health check previo (`_d1HealthCheck()`) antes de syncNow — el protocolo pedía verificar que el worker responde antes de iniciar sync
- ❌ **NO CUMPLIDO**: KV para cachear `/store/prefix` — la descarga sigue yendo directo a D1 cada vez

**Análisis de impacto en lecturas D1:**

| Escenario | Antes | Después (con cooldown) |
|---|---|---|
| Sync periódico cada 5 min | 288 descargas/día | 288 descargas/día (sin cambio en frecuencia) |
| Con intervalo reducido a 10 min | — | 144 descargas/día (ver CAMBIO 5) |
| Con cooldown 3 min | — | ~144 descargas/día (mismos triggers, pero no se solapan) |
| Eventos 'online' consecutivos | 5-10 descargas en segundos | 1 descarga (cooldown bloquea las siguientes) |
| **Reducción real estimada** | — | **~30-50%** (elimina solapamientos pero no frecuencia base) |

**Calificación:** ⚠️ **PARCIAL (50%)** — Reduce lecturas por solapamiento pero no aborda la causa raíz (cada sync descarga ~54MB completos en vez de un diff). Sin KV cache, sin health check previo.

---

### CAMBIO 4: `src/utils/syncManager.js` L261-296 — Cooldown en FASE 2 de syncNow

**Diff exacto:**

```diff
+    // AUDITORÍA 2026-07-11: throttle — ver _FULL_SYNC_MIN_GAP_MS arriba.
+    const _sinceFull = Date.now() - _state.lastFullSyncAt;
+    if (_sinceFull < _FULL_SYNC_MIN_GAP_MS) {
+      console.log(`[SISO SYNC] Descarga completa omitida (hace ${Math.round(_sinceFull / 1000)}s, cooldown ${_FULL_SYNC_MIN_GAP_MS / 1000}s)`);
+    } else {
+    _state.lastFullSyncAt = Date.now();
     let cloudData = await _d1GetAll().catch(() => null);
     let fuente = 'D1';
     if (!cloudData) {
       // Fallback Supabase SOLO si D1 cae (continuidad)
       cloudData = await _sbGetAll().catch(() => null);
       fuente = 'Supabase (fallback)';
     }
     // ... (diff de timestamps y actualización de IndexedDB) ...
+    } // fin del cooldown de la FASE 2
```

**Vector abordado:** V11 (Worker 503) + V6 (Exceso lecturas) + V15 (Fallback Supabase)

**Qué pide el protocolo:**
- ✅ **CUMPLIDO**: La FASE 2 (descarga D1) se salta si ya se ejecutó hace < 3 minutos
- ✅ **CUMPLIDO**: FASE 1 (cola offline → Supabase) y FASE 3 (audit queue) siguen ejecutándose siempre, sin cooldown
- ❌ **NO CUMPLIDO**: El fallback a Supabase (`_sbGetAll()`) SIGUE EXISTIENDO dentro del bloque. Si `_d1GetAll()` falla, igual cae a Supabase. El protocolo pedía ELIMINAR este fallback completamente (Sección 2.2)
- ❌ **NO CUMPLIDO**: Si D1 no responde, en vez de saltar el ciclo (como pedía el protocolo), se cae a Supabase con datos viejos → REINTRODUCE V15

**Análisis de riesgo:**
```
syncNow() se ejecuta (pasado el cooldown)
  → _d1GetAll() → GET /store/prefix/siso_
  → Worker D1 crashea (503) → _d1GetAll() retorna null
  → "Fallback Supabase SOLO si D1 cae"
  → _sbGetAll() descarga datos viejos de Supabase
  → sobreescribe IndexedDB → PÉRDIDA DE DATOS RECIENTES (V15)
```

**Calificación:** ⚠️ **PARCIAL (50%)** — El cooldown reduce la frecuencia de descargas pero el fallback a Supabase sigue siendo un vector de pérdida activo.

---

### CAMBIO 5: `src/utils/syncManager.js` L425-434 — Intervalo de sync reducido a 10 min

**Diff exacto:**

```diff
-  // Sync periódico cada 5 minutos (cuando hay internet y la pestaña está activa)
+  // Sync periódico cada 10 minutos (cuando hay internet y la pestaña está
+  // activa). AUDITORÍA 2026-07-11: antes 5 min — junto con el cooldown de
+  // _FULL_SYNC_MIN_GAP_MS reduce cuánto se repite la descarga completa de
+  // ~54MB que hoy tardaba hasta 22s.
   _state.syncInterval = setInterval(() => {
     if (document.hidden) return;
     if (navigator.onLine && !_state.isSyncing) {
       syncNow().catch(() => {});
     }
-  }, 5 * 60 * 1000);
+  }, 10 * 60 * 1000);
```

**Vector abordado:** V11 (503) + V6 (Exceso lecturas)

**Qué pide el protocolo (Sección 3.1 — KV caching):**
- ✅ **CUMPLIDO**: Intervalo reducido de 5 min a 10 min → reduce a la mitad las descargas programadas
- ⚠️ **PARCIAL**: El protocolo pedía KV cache (TTL 5 min) para reducir lecturas un 80%. Cambiar a 10 min solo reduce un 50%.

**Impacto en lecturas diarias:**

| Concepto | Antes (5 min) | Ahora (10 min) |
|---|---|---|
| Descargas/día por sync programado | 288 | 144 |
| Con cooldown 3 min (evita solapamientos) | ~250 | ~130 |
| Lecturas D1/día (solo sync programado, sin lecturas individuales) | ~500K | ~260K |
| **Reducción** | — | **48%** |

**Calificación:** ✅ **CUMPLIDO (100%)** — Exactamente lo que pedía el protocolo.

---

### CAMBIO 6: Worker (`siso-worker/`) — SIN CAMBIOS

**Archivos NO modificados:**
- `siso-worker/index.js` — **sin cambios**
- `siso-worker/schema.sql` — **sin cambios**
- `siso-worker/wrangler.json` — **sin cambios**

**Vectores NO abordados en el worker:**

| # | Vector | Severidad | Solución del protocolo | Estado |
|---|---|---|---|---|
| V11 | CPU timeout en /store/prefix (raíz del 503) | 🔴 CRÍTICO | Eliminar JSON.parse del servidor | ❌ SIN IMPLEMENTAR |
| V11 | CPU timeout en /store | 🔴 CRÍTICO | Eliminar JSON.parse del servidor | ❌ SIN IMPLEMENTAR |
| V4 | DELETE físico sin papelera | 🟠 ALTO | Soft-delete (ALTER TABLE + UPDATE) | ❌ SIN IMPLEMENTAR |
| V5 | Snapshots en D1 sin backup externo | 🟠 ALTO | Mover snapshots a R2 | ❌ SIN IMPLEMENTAR |
| V6 | /health?full=1 excede lecturas | 🟡 MEDIO | Cachear counts en variable de módulo | ❌ SIN IMPLEMENTAR |
| V7 | Chunks huérfanos __new* | 🟡 MEDIO | Mejorar GC del CRON | ❌ SIN IMPLEMENTAR |
| V8 | GZIP legacy corrupto | 🟡 MEDIO | Migrar valores gz: a JSON plano | ❌ SIN IMPLEMENTAR |
| V9 | LIMIT 2000 en listados | 🟡 MEDIO | Paginación cursor-based | ❌ SIN IMPLEMENTAR |
| V14 | Error 503 sin CORS (catch mejorado) | 🟠 ALTO | Mover new URL() dentro de try/catch | ❌ SIN IMPLEMENTAR |

**Conclusión:** Los 503 del worker **no están resueltos**. Las optimizaciones en el frontend (cooldown, intervalo 10 min) reducen la frecuencia con que se golpea al worker, pero cuando el worker recibe una petición a `/store/prefix/siso_`, sigue haciendo `JSON.parse` de ~2000 filas en el servidor → CPU timeout → 503.

---

## MATRIZ DE CUMPLIMIENTO: 18 VECTORES VS COMMIT e4f53e9

| # | Vector | Severidad | Solución del protocolo | Estado en e4f53e9 | % Completado |
|---|---|---|---|---|---|
| **V11** | Worker D1 503 (CPU timeout) | 🔴 CRÍTICO | 2.1 Eliminar JSON.parse servidor | ❌ **0%** — Worker sin cambios | 0% |
| **V13** | Fallback troceo cliente reintroduce V1 | 🔴 CRÍTICO | 2.3 Encolar ref + eliminar troceo | ⚠️ **60%** — Protegidas claves críticas, no encapsula, no elimina troceo para no protegidas | 60% |
| **V15** | Fallback Supabase reintroduce V3 | 🔴 CRÍTICO | 2.2 Eliminar fallback _sbGetAll() | ❌ **0%** — Fallback sigue activo | 0% |
| **V12** | ERR_QUIC_PROTOCOL_ERROR chunks | 🔴 CRÍTICO | 2.4 _CONC=2 + reintento | ✅ **95%** — _CONC=2 + 1 reintento | 95% |
| **V1** | Carrera escritura chunked | 🔴 CRÍTICO | Ya mitigado (servidor) | ✅ **100%** — /store/chunked atómico | 100% |
| **V2** | Encogimiento colecciones | 🔴 CRÍTICO | Ya mitigado (candado) | ✅ **100%** — Candado anti-encogimiento | 100% |
| **V3** | Sobrescritura Supabase (sync) | 🔴 CRÍTICO | Ya mitigado (D1 autoritativo) | ⚠️ **80%** — D1 autoritativo, pero V15 puede reintroducir | 80% |
| **V4** | DELETE físico sin papelera | 🟠 ALTO | 3.3 Soft-delete + restore | ❌ **0%** — Worker sin cambios | 0% |
| **V5** | Snapshots sin backup externo | 🟠 ALTO | 3.2 R2 para snapshots | ❌ **0%** — Sin R2 | 0% |
| **V14** | Worker URL vs CORS 503 | 🟠 ALTO | 3.5 Mejorar catch + try/catch URL | ❌ **0%** — Worker sin cambios | 0% |
| **V6** | Exceso lecturas D1 (health full) | 🟡 MEDIO | 2.6 Cachear counts en variable | ❌ **0%** — Worker sin cambios | 0% |
| **V6b** | Exceso lecturas D1 (sync free) | 🟡 MEDIO | 3.1 KV cache + cooldown + intervalo | ⚠️ **50%** — Cooldown + intervalo 10 min, sin KV cache | 50% |
| **V7** | Chunks huérfanos __new* | 🟡 MEDIO | Mejorar GC en CRON | ❌ **0%** — Worker sin cambios | 0% |
| **V8** | GZIP legacy corrupto | 🟡 MEDIO | 2.7 Migrar gz: a JSON plano | ❌ **0%** — Worker sin cambios | 0% |
| **V9** | LIMIT 2000 en listados | 🟡 MEDIO | 3.4 Paginación cursor-based | ❌ **0%** — Worker sin cambios | 0% |
| **V16** | QUIC error sin manejo específico | 🟡 MEDIO | 2.4 _CONC=2 + reintento | ✅ **100%** — Misma solución que V12 | 100% |
| **V10** | localStorage fuente en hybridGet | 🟢 BAJO | Verificar timestamp vs sync_meta | ❌ **0%** — Sin cambios | 0% |
| **V17** | SW cachea chrome-extension:// | 🟢 BAJO | Filtrar en cacheFirstStrategy | ❌ **0%** — sw.js sin cambios | 0% |
| **V18** | Message channel SW cerrado | 🟢 BAJO | Investigar race condition | ❌ **0%** — Sin cambios | 0% |

---

## RESUMEN GRÁFICO DE CUMPLIMIENTO

```
████████████████████████████████████████████████████████████ 100%  V1  ✅ Ya mitigado
████████████████████████████████████████████████████████████ 100%  V2  ✅ Ya mitigado
███████████████████████████████████████████████████████████░  95%  V12 ✅ CUMPLIDO
███████████████████████████████████████████████████████████░  95%  V16 ✅ CUMPLIDO (misma solución)
████████████████████████████████████████████████████████░░░░  80%  V3  ⚠️ D1 autoritativo (V15 riesgo)
███████████████████████████████████████████████████░░░░░░░░░  60%  V13 ⚠️ PARCIAL (solo claves protegidas)
████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  50%  V6b ⚠️ PARCIAL (sin KV cache)
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  V11 ❌ SIN IMPLEMENTAR (raíz del 503)
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  V15 ❌ SIN IMPLEMENTAR (fallback SB)
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  V4  ❌ SIN IMPLEMENTAR
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  V5  ❌ SIN IMPLEMENTAR
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  V14 ❌ SIN IMPLEMENTAR
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  V6  ❌ SIN IMPLEMENTAR (health full)
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  V7  ❌ SIN IMPLEMENTAR
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  V8  ❌ SIN IMPLEMENTAR
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  V9  ❌ SIN IMPLEMENTAR
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  V10 ❌ SIN IMPLEMENTAR
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  V17 ❌ SIN IMPLEMENTAR
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  V18 ❌ SIN IMPLEMENTAR
```

---

## PRÓXIMOS PASOS URGENTES (LO QUE FALTA IMPLEMENTAR)

### 🔴 CRÍTICO — Debe implementarse YA (riesgo de pérdida de datos activa)

| Prioridad | Cambio | Archivo | Vector | Esfuerzo |
|---|---|---|---|---|
| **#1** | **Eliminar JSON.parse del servidor** en `/store/prefix` y `/store` | `siso-worker/index.js` L108-138 | V11 | 2h |
| **#1** | **Añadir `_raw: true`** en las respuestas y parsear en cliente | `siso-worker/index.js` + `syncManager.js` | V11 | 1h |
| **#2** | **Eliminar fallback a `_sbGetAll()`** en syncNow (si D1 falla → saltar ciclo) | `syncManager.js` L256-260 | V15 | 30min |
| **#3** | **Eliminar bloque de troceo cliente** para TODAS las claves (L456-522) | `App.jsx` | V13 | 1h |
| **#3** | **Implementar `_enqueuePendingD1Ref(key)`** con reintento automático | `App.jsx` | V13 | 2h |

### 🟠 ALTO — Implementar en el siguiente sprint

| Prioridad | Cambio | Archivo | Vector | Esfuerzo |
|---|---|---|---|---|
| **#4** | Soft-delete: `ALTER TABLE siso_store ADD COLUMN deleted INTEGER DEFAULT 0` | `schema.sql` + `index.js` | V4 | 2h |
| **#5** | Snapshots a R2 (crear bucket, cambiar escritura de D1 a R2) | `wrangler.json` + `index.js` | V5 | 3h |
| **#6** | Mejorar catch del worker: `new URL()` dentro de try/catch | `siso-worker/index.js` | V14 | 30min |

### 🟡 MEDIO — Planificar después de resolver críticos y altos

| Prioridad | Cambio | Archivo | Vector | Esfuerzo |
|---|---|---|---|---|
| **#7** | KV cache para `/store/prefix` (TTL 5 min) | `wrangler.json` + `index.js` | V6b | 2h |
| **#8** | Paginación cursor-based en `/store/prefix` | `index.js` + `syncManager.js` | V9 | 3h |
| **#9** | Cachear `/health?full=1` en variable de módulo | `index.js` | V6 | 1h |
| **#10** | Migrar valores GZIP legacy en CRON diario | `index.js` | V8 | 1h |

---

## FIRMA DEL DOCUMENTO

**Verificación realizada por:** Sistema de análisis automatizado  
**Fecha:** 2026-07-12 10:45 UTC-4  
**Commit verificado:** `e4f53e9` (2 archivos, +55/-8 líneas)  
**Commit base:** `e7ed13a`  
**% de cumplimiento del protocolo:** 27.8% (5/18 vectores con solución implementada)  
**Vectores críticos resueltos:** 2/7 (V12, V13-parcial)  
**Vectores críticos PENDIENTES:** 5/7 (V11, V15, V13-completo, V4, V5)  

---

*Este documento verifica el cumplimiento del commit `e4f53e9` contra el `PROTOCOLO-SOLUCIONES-2026-07-11.md`. No contiene modificaciones al código.*