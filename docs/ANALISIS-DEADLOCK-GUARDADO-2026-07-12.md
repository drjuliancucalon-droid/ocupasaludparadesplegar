# 🔴 ANÁLISIS DE DEADLOCK DE GUARDADO
## Worker D1 503 + Cola de pendientes saturada

**Fecha:** 2026-07-12 20:25 UTC-4  
**Build en producción:** `index-BjR7zEZ2.js` (build viejo, anterior a los cambios locales)  
**Worker real:** `siso-api.dr-juliancucalon.workers.dev`

---

## 1. ¿QUÉ ESTÁ PASANDO? — LA CADENA DE BLOQUEO

El usuario intentó guardar pacientes 3 veces seguidas. Las 3 fallaron. Esta es la secuencia exacta:

```
PASO 1: Usuario guarda pacientes (4671KB de datos)
         │
         ▼
PASO 2: _workerSet() intenta POST /store/chunked
         │
         ▼
PASO 3: ❌ Worker responde 503 (Service Unavailable)
         "Access to fetch ... blocked by CORS policy: No Access-Control-Allow-Origin header"
         │
         ▼
PASO 4: ✅ Protección anti-troceo: detecta clave protegida "siso_db_patients_drcucalon"
         "NO se usa troceo cliente sin candado. Reintentará en el próximo guardado."
         return false → NO CORROMPE DATOS (correcto)
         │
         ▼
PASO 5: ❌ Intenta encolar en siso_pending_d1_writes
         "[pending] omitido siso_db_patients_drcucalon (4671KB > tope)"
         ¡EL ARRAY DE 4.6MB NO CABE EN LA COLA!
         │
         ▼
PASO 6: ⚠️ "[_syncPatients] D1 siso_db_patients_drcucalon → cola pendientes"
         Pero el paso 5 ya rechazó el valor. El dato NO se encoló.
         │
         ▼
PASO 7: El usuario reintenta guardar → mismo ciclo → mismo fallo (×3)
```

---

## 2. LOS 3 PROBLEMAS SIMULTÁNEOS

### Problema A: El worker D1 está caído (503)

| Campo | Valor |
|---|---|
| **Worker URL** | `https://siso-api.dr-juliancucalon.workers.dev` |
| **Error** | `net::ERR_FAILED 503 (Service Unavailable)` |
| **CORS** | `No 'Access-Control-Allow-Origin' header` |
| **Causa raíz** | El worker crashea antes de ejecutar `corsHeaders()` → Cloudflare devuelve su error 503 por defecto sin headers CORS |
| **¿Por qué crashea?** | CPU timeout (10ms free tier) al hacer `JSON.parse` de ~2000 valores en `/store/prefix/siso_`, o D1 rechazando conexiones por exceder límite de lecturas |

**Este problema YA ESTÁ CORREGIDO en el código local** (`siso-worker/index.js` L108-138 — se eliminó el `JSON.parse` del servidor y ahora devuelve `_raw: true` con strings crudos). **Pero NO está desplegado.** El build en producción (`index-BjR7zEZ2.js`) es del commit `4f8b81f` (anterior), no del commit actual `e4f53e9`.

### Problema B: La cola de pendientes rechaza arrays grandes

| Campo | Valor |
|---|---|
| **Tamaño del array de pacientes** | 4671 KB (4.6 MB) |
| **Tope de la cola** | 60 KB (`_PENDING_D1_MAX_VALUE = 60 * 1024`) |
| **Consecuencia** | El array es 78× más grande que el tope → se rechaza |
| **Mensaje** | `[pending] omitido siso_db_patients_drcucalon (4671KB > tope) — se re-sincroniza en el próximo guardado` |
| **Problema real** | "Se re-sincroniza en el próximo guardado" es falso si el worker sigue caído. El próximo guardado también fallará con 503. |

### Problema C: No hay mecanismo de reintento automático

Cuando falla `/store/chunked` para una clave protegida:
1. `_workerSet` retorna `false` ✅ (protege contra corrupción)
2. `_syncPatients` intenta encolar en `siso_pending_d1_writes`
3. La cola rechaza el valor por ser > 60KB
4. **El dato queda SOLO en localStorage/IndexedDB**
5. **No hay un timer/setInterval que reintente automáticamente**
6. El usuario tiene que guardar manualmente otra vez
7. Si el worker sigue caído → mismo ciclo infinito

---

## 3. ¿SE ESTÁ PERDIENDO INFORMACIÓN?

### RESPUESTA: NO en este momento. Pero está EN RIESGO.

**Lo que SÍ está pasando:**
- Los datos del usuario están seguros en **localStorage** e **IndexedDB** (las capas locales)
- La protección anti-troceo cliente está funcionando correctamente (evitó corrupción)
- Los datos NO se perdieron — simplemente NO se subieron a D1

**Lo que está EN RIESGO:**
- Si el usuario cierra el navegador o cambia de equipo, los datos de esta sesión no están en D1
- Si el usuario hace logout → `stopSyncManager` → `clearOfflineDB` → **PÉRDIDA IRREVERSIBLE** de los datos no sincronizados
- Si el localStorage se llena y el navegador lo limpia → **PÉRDIDA**

**El badge de advertencia "HC sin respaldo" SÍ se muestra** (el código `_markUnsyncedHC(true, key)` se ejecuta), así que el usuario SABE que los datos no están en la nube. Esto es correcto.

---

## 4. SOLUCIONES DEFINITIVAS (SIN HACER CAMBIOS — DIAGNÓSTICO)

### Solución 1 (INMEDIATA): Desplegar el worker corregido

**Problema que resuelve:** A (worker 503) y parcialmente C (sin reintento)

**Qué hay que hacer:**
```bash
cd siso-worker
wrangler deploy
```

**Por qué funciona:** El código local de `siso-worker/index.js` YA tiene las correcciones:
- L108-117: `/store/prefix` ya no hace `JSON.parse` en el servidor → elimina CPU timeout → adiós 503
- L83-88: `new URL()` dentro de try/catch → el worker nunca crashea por URL inválida
- L270-280 (syncManager): el fallback a Supabase YA está eliminado → no hay riesgo de sobrescritura

**Impacto:** Elimina la causa raíz del 503. El worker responderá en ~2-5ms en vez de crashear.

### Solución 2 (CORTO PLAZO): Sistema de referencias en la cola de pendientes

**Problema que resuelve:** B (cola rechaza arrays > 60KB) y C (sin reintento automático)

**Qué hay que implementar:**
En `App.jsx`, en lugar de intentar encolar el array completo de 4.6MB, encolar SOLO la referencia (la clave):

```javascript
// En _enqueuePendingD1 (App.jsx ~L597), añadir soporte para _ref: true:
const _enqueuePendingD1Ref = (key) => {
  const write = (p) => localStorage.setItem(_PENDING_D1_KEY, JSON.stringify(p));
  const pending = _getPendingD1();
  pending[key] = { _ref: true, ts: Date.now(), retries: 0 };
  try { write(pending); return true; }
  catch (e) { console.warn("[pending] enqueueRef falló:", e?.message); return false; }
};
```

**Modificar el procesador de la cola** (el `useEffect` que procesa `siso_pending_d1_writes` cada 30s):

```javascript
// En el procesador de siso_pending_d1_writes:
for (const [key, entry] of Object.entries(pending)) {
  let value = entry.value;
  // Si es referencia, leer el valor ACTUAL de localStorage
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
    if (entry.retries >= 20) delete pending[key];
  }
}
```

**Por qué funciona:**
- La cola solo guarda `{ _ref: true, ts, retries }` (~100 bytes) en vez del array de 4.6MB
- El reintento lee el valor actual de localStorage (que SIEMPRE está actualizado)
- Cuando el worker vuelva a responder, el próximo ciclo de 30s subirá automáticamente
- Sin intervención del usuario

### Solución 3 (MEDIO PLAZO): Health check antes de intentar guardar

**Problema que resuelve:** C (el usuario intenta guardar sin saber que el worker está caído)

**Qué hay que implementar:**
En `_workerSet`, antes de intentar `/store/chunked`, verificar que el worker responde:

```javascript
const _workerSet = async (key, value) => {
  // Health check rápido (2s timeout)
  const workerAlive = await _quickHealthCheck();
  if (!workerAlive) {
    console.warn('[_workerSet] Worker D1 no responde — guardado diferido');
    _markUnsyncedHC(true, key);
    _enqueuePendingD1Ref(key);
    return false; // ← No intentar POST, ya sabemos que fallará
  }
  // ... resto del código (intentar /store/chunked) ...
};
```

### Solución 4 (LARGO PLAZO): Workers Paid Plan ($5/mes)

**Problema que resuelve:** A (definitivamente)

**Qué cambia:**
- CPU time: 10ms → **30 segundos** (3000× más)
- Requests: 100K/día → **10M/mes** incluidos
- El worker NUNCA crasheará por CPU timeout, incluso con JSON.parse en el servidor

**Costo:** $5.00/mes (~$0.17/día)

---

## 5. RESUMEN DE LA SITUACIÓN ACTUAL

| Componente | Estado | Acción requerida |
|---|---|---|
| **Worker D1** | ❌ Caído (503) en producción | Desplegar `siso-worker/index.js` corregido (ya está listo en local) |
| **Datos locales** | ✅ Seguros en localStorage + IndexedDB | Nada (están protegidos) |
| **Protección anti-troceo** | ✅ Funcionando | Nada (está bloqueando correctamente escrituras inseguras) |
| **Cola de pendientes** | ❌ Rechaza arrays > 60KB | Implementar sistema de referencias `_enqueuePendingD1Ref` |
| **Badge "sin respaldo"** | ✅ Visible | El usuario sabe que los datos no están en la nube |
| **Riesgo de pérdida** | 🟠 ALTO si el usuario cierra sesión/equipo | Los datos existen solo en este navegador |

---

## 6. PRIORIDAD DE ACCIONES

| # | Acción | Tiempo | Impacto |
|---|---|---|---|
| **1** | Desplegar el worker corregido (`wrangler deploy`) | 2 min | Elimina el 503. El worker vuelve a responder. |
| **2** | Implementar `_enqueuePendingD1Ref` + procesador de referencias | 2h | Los arrays grandes se encolan por referencia y se reintentan automáticamente. |
| **3** | Health check previo en `_workerSet` | 1h | El usuario no pierde tiempo intentando guardar cuando el worker está caído. |
| **4** | Workers Paid Plan ($5/mes) | 5 min (cambiar en dashboard) | Elimina definitivamente cualquier riesgo de CPU timeout. |

---

## FIRMA

**Análisis realizado por:** Sistema de análisis forense automatizado  
**Fecha:** 2026-07-12 20:25 UTC-4  
**Build en producción:** `index-BjR7zEZ2.js` (commit `4f8b81f`, anterior al actual)  
**Build local corregido:** `e4f53e9` (worker + syncManager + SW corregidos, NO desplegado)  

---

*Este documento es un diagnóstico. No contiene modificaciones al código. Las soluciones descritas requieren implementación manual.*