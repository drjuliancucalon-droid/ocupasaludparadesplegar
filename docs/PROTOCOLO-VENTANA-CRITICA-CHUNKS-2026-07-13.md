# PROTOCOLO DE MITIGACIÓN: VENTANA CRÍTICA DE PÉRDIDA (CHUNKS PENDIENTES)
## 13 de Julio 2026 — OcupaSalud v4.8

---

# RESUMEN EJECUTIVO

**Tu miedo es válido.** Existe una ventana real de 2-30 minutos donde los datos pueden perderse si cierras el navegador en el momento equivocado. Este documento explica exactamente cuándo, por qué, cómo mitigarlo HOY sin cambios de código, y qué cambios se necesitan para cerrar la ventana permanentemente.

---

# PARTE I: LA CADENA DE EVENTOS QUE CAUSA LA PÉRDIDA

## 1.1 El escenario de riesgo (tu caso: 100 pacientes en un día)

```
08:00  Abres la app. localStorage tiene 285 pacientes (cargados de sesión anterior).
08:05  Atiendes paciente #1. Guardas HC. _syncPatients() se dispara.
       │
       ├─ localStorage: ✅ guarda 286 pacientes (inmediato, <1ms)
       ├─ IndexedDB:    ✅ guarda 286 pacientes (async, ~50ms)
       ├─ Supabase:     ✅ guarda slim (sin firmas) (async, ~200ms)
       └─ D1 /store/chunked: ⏳ intenta subir ~4MB en 180s timeout
              │
              └─ ❌ FALLA (red lenta del consultorio, timeout a 180s)
                     │
                     ├─ _workerSet() retorna false
                     ├─ _enqueuePendingD1() se llama...
                     │   └─ PERO: 4MB > 60KB tope → NO se encola
                     │      └─ console: "[pending] omitido siso_db_patients_drcucalon (3900KB > tope)"
                     └─ _markUnsyncedHC(true) → badge "⚠️ Sin respaldo" visible

08:10  Atiendes paciente #2. Guardas HC. Mismo flujo.
       └─ _syncPatients() se dispara DE NUEVO.
          └─ VUELVE a intentar _workerSet() con los 287 pacientes completos.
             └─ Si la red mejoró → ✅ OK. Badge desaparece.
             └─ Si la red sigue mala → ❌ FALLA OTRA VEZ. Badge sigue.

...    (Sigues atendiendo pacientes. Cada guardado reintenta el array COMPLETO.)

12:00  CIERRAS EL NAVEGADOR PARA ALMORZAR.
       │
       ├─ localStorage: ✅ TIENE los 310 pacientes (sobrevive al cierre)
       ├─ IndexedDB:    ✅ TIENE los 310 pacientes (sobrevive al cierre)
       ├─ D1:           ❌ TIENE los 285 pacientes originales (NUNCA se subieron)
       └─ Supabase:     ❌ TIENE los 285 pacientes originales (mismo problema)

       HASTA AQUÍ NO HAY PÉRDIDA. Los datos están en localStorage + IndexedDB.

13:00  Vuelves de almorzar. Abres el navegador.
       │
       └─ La app carga desde localStorage. 310 pacientes. Todo bien.

       PERO SI EN LUGAR DE ABRIR EL NAVEGADOR, FORMATEASTE LA MÁQUINA,
       O EL NAVEGADOR DECIDIÓ LIMPIAR DATOS (Chrome a veces limpia),
       O ABRES DESDE OTRO DISPOSITIVO...
       │
       └─ ❌ SOLO VES 285 PACIENTES. Perdiste 25 pacientes del día.
```

## 1.2 Los 3 momentos exactos donde se puede perder información

| # | Momento | Qué está en riesgo | Gravedad | Probabilidad |
|---|--------|-------------------|----------|-------------|
| **M1** | Entre guardado y siguiente guardado (ventana 2-30 min) | Los cambios del ÚLTIMO guardado que no llegó a D1 | 🟡 MEDIA | ALTA (red lenta + cierre inesperado) |
| **M2** | Al cerrar el navegador con badge "⚠️ Sin respaldo" activo | TODOS los cambios acumulados desde que falló D1 | 🔴 CRÍTICA | MEDIA (depende de si el usuario ve el badge) |
| **M3** | Al abrir desde otro dispositivo/navegador | Todos los pacientes creados en sesiones donde D1 falló | 🔴 CRÍTICA | BAJA (requiere cambio de dispositivo) |

## 1.3 Línea de código exacta que causa el problema

**Archivo**: `src/App.jsx`
**Línea**: 622 y 628-630

```javascript
const _PENDING_D1_MAX_VALUE = 60 * 1024; // 60KB serializado por entrada

const _enqueuePendingD1 = (key, value) => {
  let serializedLen;
  try { serializedLen = JSON.stringify(value).length; } catch { return false; }
  // No encolar valores gigantes: se re-sincronizan por la vía normal (auto-sync/AUDIT).
  if (serializedLen > _PENDING_D1_MAX_VALUE) {
    console.warn(`[pending] omitido ${key} (${(serializedLen / 1024) | 0}KB > tope) — se re-sincroniza en el próximo guardado`);
    return false;  // ← AQUÍ: el array de pacientes NUNCA entra en la cola
  }
```

**El problema**: La cola `siso_pending_d1_writes` tiene un tope de 60KB por entrada. Un array de 300 pacientes slim (sin firmas) pesa ~2-4MB serializado. **Nunca entra en la cola.** La única forma de reintentar la subida es que el usuario haga OTRO guardado (otro paciente, otra factura) que dispare `_syncPatients()` de nuevo.

**Archivo**: `src/App.jsx`
**Línea**: 19470-19474 (el descarte silencioso)

```javascript
if (!item || item.retries >= _PENDING_D1_MAX_RETRIES) {
  console.warn(`[pending] descartando ${k} tras ${_PENDING_D1_MAX_RETRIES} reintentos`);
  _clearPendingD1(k);
  continue;
}
```

**El problema**: Después de 20 reintentos fallidos (20 × 30s = 10 minutos), la entrada se descarta PERMANENTEMENTE. Para entradas que SÍ caben en la cola (<60KB), como facturas o propuestas, esto significa que después de 10 minutos de worker caído, los datos se pierden.

**Archivo**: `src/App.jsx`
**Línea**: 20930-20934 (el beforeunload)

```javascript
const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
window.addEventListener("beforeunload", handler);
return () => window.removeEventListener("beforeunload", handler);
```

**El problema**: El `beforeunload` solo muestra un diálogo de "¿Estás seguro de que quieres salir?" (cuando `_hcDirty` es true), pero NO hace flush de la cola de pendientes, NO intenta subir a D1, NO avisa si hay datos sin respaldo. Es puramente cosmético.

---

# PARTE II: ¿QUÉ PASA EXACTAMENTE CON LOS CHUNKS?

## 2.1 El ciclo de vida de un chunk

```
1. _syncPatients() guarda el array de pacientes
2. _workerSet() se llama con el array completo (~4MB para 300 pacientes)
3. _workerSet() serializa → 4MB. Como > 128KB (_CHUNK_THRESHOLD), va por path chunked
4. Intenta POST /store/chunked con timeout de 180 segundos
   │
   ├─ ✅ ÉXITO (worker responde ok en <180s):
   │   └─ D1 recibe key+value, trocea en 500KB pieces, escribe en batch atómico
   │      └─ CANDADO ANTI-ENCOGIMIENTO en servidor protege la escritura
   │      └─ return true → todo bien, _markUnsyncedHC(false)
   │
   └─ ❌ FALLO (timeout, error de red, worker caído, status != 200):
       │
       ├─ La clave ES protegida (/^siso_(db_)?patients_/):
       │   └─ NO se usa troceo cliente (sin candado anti-encogimiento)
       │   └─ return false
       │   └─ _enqueuePendingD1() → PERO 4MB > 60KB → NO se encola
       │   └─ _markUnsyncedHC(true) → badge visible
       │   └─ ⚠️ LOS DATOS QUEDAN SOLO EN localStorage + IndexedDB
       │
       └─ La clave NO es protegida (facturas, propuestas, etc.):
           └─ Cae al troceo cliente (piezas __cN una por una)
           └─ Si el troceo cliente falla → _enqueuePendingD1()
           └─ Si <60KB → ✅ se encola, se reintenta cada 30s
           └─ Si >60KB → ❌ no se encola, mismo problema
```

## 2.2 ¿Por qué falla el chunk?

| Causa | Probabilidad | Timeout actual |
|-------|-------------|----------------|
| Red lenta de subida (consultorio típico: 0.5-1 Mbps up) | 🔴 ALTA | 180s → 4MB a 0.5Mbps = ~64s, debería alcanzar |
| Worker cold start (>30s sin requests) | 🟡 MEDIA | 180s → suficiente |
| D1 batch timeout (>30s para escribir 8-10 piezas) | 🟡 MEDIA | D1 tiene su propio timeout de ~30s por batch |
| El usuario cierra la pestaña mientras el fetch está en vuelo | 🟡 MEDIA | El fetch se aborta al cerrar |
| Error 500 en worker (bug, cuota D1, etc.) | ✅ BAJA | - |
| Cloudflare rate limiting | ✅ BAJA | - |

**El escenario más probable**: D1 tarda >30s en ejecutar el batch de 8-10 piezas (cada INSERT ON CONFLICT). Como el batch es atómico, si una pieza tarda, TODA la operación falla. Esto es consistente con lo que ves en el terminal: "quedan pendientes que posteriormente pueda subirlos si lo sube".

---

# PARTE III: PROTOCOLO DE TRABAJO SEGURO (SIN CAMBIOS DE CÓDIGO)

## Para tu jornada de 100 pacientes mañana:

### REGLA DE ORO: Antes de cerrar el navegador, VERIFICA EL BADGE

```
╔══════════════════════════════════════════════════════════════╗
║  SI VES ESTE BADGE EN EL HEADER:                            ║
║  ⚠️ Datos sin respaldo en nube                             ║
║                                                              ║
║  NO CIERRES EL NAVEGADOR.                                    ║
║                                                              ║
║  Haz un guardado de cualquier cosa (editar un paciente,      ║
║  crear una factura dummy) para forzar el reintento a D1.     ║
║  Espera a que el badge desaparezca.                          ║
╚══════════════════════════════════════════════════════════════╝
```

### Checklist pre-cierre (cada vez que termines una sesión):

- [ ] **CHECK 1**: ¿Ves el badge "⚠️ Datos sin respaldo en nube" en el header?
  - Si SÍ → **NO CERRAR**. Ve al Paso de Forzar Sincronización.
  - Si NO → Puedes cerrar tranquilo. Datos en D1 ✅.

- [ ] **CHECK 2**: Abre DevTools (F12) → Console. Pega esto:
  ```javascript
  const unsynced = JSON.parse(localStorage.getItem('siso_hc_sin_respaldo') || '{}');
  if (Object.keys(unsynced).length) {
    console.warn('⚠️ DATOS SIN RESPALDO:', unsynced);
    console.warn('Fuentes pendientes:', Object.keys(unsynced).join(', '));
  } else {
    console.log('✅ Todos los datos están respaldados en D1');
  }

  const pending = JSON.parse(localStorage.getItem('siso_pending_d1_writes') || '{}');
  const pendingKeys = Object.keys(pending);
  if (pendingKeys.length) {
    console.warn('⚠️ COLA D1 PENDIENTE:', pendingKeys.length, 'entradas');
    pendingKeys.forEach(k => {
      console.log(`  ${k}: ${pending[k].retries} reintentos, ${new Date(pending[k].ts).toLocaleTimeString()}`);
    });
  }
  ```
  - Si todo OK → procede al cierre.
  - Si hay advertencias → ve al Paso de Forzar Sincronización.

- [ ] **CHECK 3**: Verifica que D1 tiene los mismos pacientes que localStorage:
  ```javascript
  const uid = JSON.parse(localStorage.getItem('siso_session') || '{}').user || 'drcucalon';
  const key = `siso_db_patients_${uid}`;
  const lsCount = JSON.parse(localStorage.getItem(key) || '[]').length;
  console.log(`localStorage: ${lsCount} pacientes`);

  // Para verificar D1 (requiere token):
  const workerUrl = localStorage.getItem('siso_worker_url_cache');
  const token = localStorage.getItem('siso_worker_token_cache');
  if (workerUrl && token) {
    fetch(`${workerUrl}/store/${encodeURIComponent(key)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(d => {
      const d1List = Array.isArray(d?.value) ? d.value : [];
      console.log(`D1: ${d1List.length} pacientes`);
      if (d1List.length < lsCount) {
        console.error(`❌ FALTAN ${lsCount - d1List.length} PACIENTES EN D1. NO CIERRES EL NAVEGADOR.`);
      } else if (d1List.length === lsCount) {
        console.log('✅ D1 y localStorage coinciden. Puedes cerrar tranquilo.');
      } else {
        console.log(`ℹ️ D1 tiene ${d1List.length - lsCount} pacientes MÁS que localStorage (normal con multi-dispositivo)`);
      }
    });
  }
  ```

### Paso de Forzar Sincronización (si el badge está activo):

1. **NO CIERRES EL NAVEGADOR.**
2. Ve a la vista de Pacientes.
3. Edita CUALQUIER paciente (agrega un espacio en notas, guarda).
4. Esto dispara `_syncPatients()` con el array COMPLETO → reintenta `POST /store/chunked`.
5. Espera 30-60 segundos.
6. Repite el CHECK 1. Si el badge desapareció → ✅ Listo.
7. Si después de 3 intentos el badge sigue → la red o D1 están caídos. Opciones:
   - **Opción A (recomendada)**: Exporta los pacientes manualmente como backup:
     ```javascript
     const uid = JSON.parse(localStorage.getItem('siso_session') || '{}').user || 'drcucalon';
     const key = `siso_db_patients_${uid}`;
     const data = JSON.parse(localStorage.getItem(key) || '[]');
     const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a'); a.href = url; a.download = `backup-pacientes-${new Date().toISOString().slice(0,10)}.json`;
     a.click();
     console.log(`✅ Backup descargado: ${data.length} pacientes`);
     ```
   - **Opción B**: Espera a que la red vuelva. El badge seguirá activo. NO cierres el navegador.
   - **Opción C**: Si DEBES cerrar, verifica que localStorage TIENE los datos (CHECK 3). Al reabrir, la app cargará desde localStorage y el auto-sync de arranque intentará subir a D1 (si configuraste `siso_d1_patients_pushed_*` = "1" no lo hará, pero `_syncPatients` sí lo hará en el próximo guardado).

---

# PARTE IV: LOS 5 AGENTES DE DIAGNÓSTICO QUE NECESITAS DESPLEGAR

## Agente 1: `chunk-failure-detector`
**Qué hace**: Monitorea cada llamada a `_workerSet()` y registra fallos con timestamp.
**Dónde inyectarlo**: En `_workerSet()`, justo después de `return false`.
**Código del agente**:
```javascript
// Insertar en App.jsx, dentro de _workerSet(), después de cada return false:
if (!ok) {
  const failures = JSON.parse(localStorage.getItem('siso_chunk_failures') || '{}');
  failures[key] = { ts: Date.now(), size: serialized?.length || 0, reason: 'workerSet_failed' };
  localStorage.setItem('siso_chunk_failures', JSON.stringify(failures));
}
```
**Lectura del agente** (desde consola):
```javascript
const failures = JSON.parse(localStorage.getItem('siso_chunk_failures') || '{}');
console.table(Object.entries(failures).map(([k,v]) => ({
  clave: k,
  hora: new Date(v.ts).toLocaleTimeString(),
  tamaño_kb: ((v.size || 0) / 1024).toFixed(1)
})));
```

## Agente 2: `beforeunload-flusher`
**Qué hace**: Al detectar `beforeunload` (usuario cerrando pestaña), intenta DESESPERADAMENTE subir la cola pendiente y los arrays grandes.
**Dónde inyectarlo**: En el handler de `beforeunload`, antes del `e.preventDefault()`.
**Código del agente**:
```javascript
// Reemplazar el handler de beforeunload existente (L20930-20934) con:
const handler = async (e) => {
  // 1. Verificar si hay datos sin respaldo
  const unsynced = JSON.parse(localStorage.getItem('siso_hc_sin_respaldo') || '{}');
  const pending = JSON.parse(localStorage.getItem('siso_pending_d1_writes') || '{}');

  if (Object.keys(unsynced).length > 0 || Object.keys(pending).length > 0) {
    // 2. ÚLTIMO INTENTO de flush SINCRÓNICO (con navigator.sendBeacon)
    const workerUrl = localStorage.getItem('siso_worker_url_cache');
    const token = localStorage.getItem('siso_worker_token_cache');

    if (workerUrl && token) {
      // Intentar flush de pacientes (el array grande)
      const uid = JSON.parse(localStorage.getItem('siso_session') || '{}').user;
      if (uid) {
        const key = `siso_db_patients_${uid}`;
        const data = localStorage.getItem(key);
        if (data && unsynced.hc) {
          // sendBeacon es fuego-y-olvido, perfecto para beforeunload
          navigator.sendBeacon(
            `${workerUrl}/store/chunked`,
            JSON.stringify({ key, value: JSON.parse(data) })
          );
        }
      }

      // Intentar flush de la cola de pendientes
      for (const [k, item] of Object.entries(pending)) {
        if (item && item.value) {
          navigator.sendBeacon(
            `${workerUrl}/store`,
            JSON.stringify([{ key: k, value: item.value }])
          );
        }
      }
    }

    // 3. Guardar flag de "cierre con datos pendientes" para el próximo arranque
    localStorage.setItem('siso_dirty_shutdown', JSON.stringify({
      ts: Date.now(),
      unsynced: Object.keys(unsynced),
      pendingCount: Object.keys(pending).length
    }));
  }

  // 4. Mostrar diálogo si hay HC sucia
  if (_hcDirty) {
    e.preventDefault();
    e.returnValue = "";
  }
};
window.addEventListener("beforeunload", handler);
```

## Agente 3: `healthcheck-beacon`
**Qué hace**: Cada 2 minutos, envía un ping mínimo al worker para mantenerlo caliente y medir latencia.
**Dónde inyectarlo**: Un useEffect nuevo en AppInner.
**Código del agente**:
```javascript
useEffect(() => {
  if (!_WORKER_TOKEN || !_WORKER_URL) return;
  const ping = async () => {
    const start = Date.now();
    try {
      const r = await fetch(`${_WORKER_URL}/health`, {
        headers: { 'X-Siso-Token': _WORKER_TOKEN }
      });
      const latency = Date.now() - start;
      // Guardar última latencia conocida
      if (r.ok) {
        localStorage.setItem('siso_worker_last_seen', String(Date.now()));
        localStorage.setItem('siso_worker_latency_ms', String(latency));
      }
    } catch {
      localStorage.setItem('siso_worker_last_fail', String(Date.now()));
    }
  };
  ping(); // inmediato
  const interval = setInterval(ping, 120_000); // cada 2 min
  return () => clearInterval(interval);
}, [_WORKER_TOKEN, _WORKER_URL]);
```

## Agente 4: `dirty-shutdown-recovery`
**Qué hace**: Al arrancar la app, detecta si la sesión anterior terminó con datos pendientes e intenta recuperarlos.
**Dónde inyectarlo**: En el useEffect de arranque (donde se carga pacientes).
**Código del agente**:
```javascript
// Al inicio del arranque, antes de cargar datos:
const dirtyShutdown = JSON.parse(localStorage.getItem('siso_dirty_shutdown') || 'null');
if (dirtyShutdown && Date.now() - dirtyShutdown.ts < 86400000) { // <24h
  console.warn('[SISO] Detectado cierre con datos pendientes:', dirtyShutdown);
  // Forzar re-sync inmediato de TODAS las claves en localStorage a D1
  const uid = JSON.parse(localStorage.getItem('siso_session') || '{}')?.user;
  if (uid && _WORKER_TOKEN) {
    const keysToResync = [
      `siso_db_patients_${uid}`,
      `siso_saved_bills_${uid}`,
      'siso_saved_reports',
      'siso_companies',
      'siso_users',
      `siso_atenciones_${uid}`
    ];
    for (const k of keysToResync) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const val = JSON.parse(raw);
          console.log(`[recovery] Re-sincronizando ${k} (${JSON.stringify(val).length} bytes)...`);
          _workerSet(k, val).then(ok => {
            if (ok) console.log(`[recovery] ✅ ${k} recuperado`);
            else console.warn(`[recovery] ❌ ${k} falló`);
          });
        } catch {}
      }
    }
  }
  // Limpiar flag
  localStorage.removeItem('siso_dirty_shutdown');
}
```

## Agente 5: `chunk-health-dashboard` (componente visual)
**Qué hace**: Panel colapsable en el header que muestra estado de salud de chunks en tiempo real.
**Información mostrada**:
- 🔵 Worker: ONLINE (último ping hace X segundos, latencia Y ms) / 🔴 OFFLINE
- 🟢 D1 sincronizado: 310/310 pacientes / 🟡 Pendiente: 285/310 (25 sin subir)
- 📦 Cola chunks: 0 pendientes / ⚠️ 3 pendientes
- 🕐 Último chunk exitoso: hace X minutos

---

# PARTE V: SOLUCIONES DE CÓDIGO (PARA IMPLEMENTAR)

## Solución 1 (INMEDIATA - menos invasiva): Aumentar tope de cola para arrays grandes

**Cambio**: Modificar `_PENDING_D1_MAX_VALUE` de 60KB a 5MB, y que `_enqueuePendingD1` comprima con LZ-String antes de guardar.

```javascript
// src/App.jsx L622
const _PENDING_D1_MAX_VALUE = 5 * 1024 * 1024; // 5MB (era 60KB)

// Y en _enqueuePendingD1, comprimir antes de guardar:
const _enqueuePendingD1 = (key, value) => {
  let serialized;
  try { serialized = JSON.stringify(value); } catch { return false; }
  if (serialized.length > _PENDING_D1_MAX_VALUE) {
    // Intentar comprimir
    try {
      const compressed = LZString.compressToUTF16(serialized);
      if (compressed.length <= _PENDING_D1_MAX_VALUE) {
        serialized = compressed;
      } else {
        console.warn(`[pending] omitido ${key} (${(serialized.length / 1024) | 0}KB > tope incluso comprimido)`);
        // Guardar flag de "esto va a necesitar resync manual en arranque"
        const oversize = JSON.parse(localStorage.getItem('siso_oversize_pending') || '{}');
        oversize[key] = { ts: Date.now(), size: serialized.length };
        localStorage.setItem('siso_oversize_pending', JSON.stringify(oversize));
        return false;
      }
    } catch { return false; }
  }
  // ... resto igual, pero guardar serialized (que puede ser compressed)
};
```

## Solución 2 (RECOMENDADA): Flush en beforeunload + recovery en arranque

Implementar los Agentes 2 y 4 descritos arriba. Código completo listo para copiar.

## Solución 3 (ESTRUCTURAL): Deduplicar pacientes antes de serializar para chunk

En `_syncPatients`, antes de llamar a `_workerSet()`, deduplicar el array por `id` y `docNumero`. Esto reduce el payload significativamente:

```javascript
const _dedupPatients = (list) => {
  const seen = new Map();
  const result = [];
  for (const p of list) {
    const key = p?.id || p?.docNumero || JSON.stringify(p);
    if (!seen.has(key)) {
      seen.set(key, true);
      result.push(p);
    }
  }
  return result;
};
```

## Solución 4 (DEFINITIVA): Subir pacientes incrementalmente (solo el delta)

En lugar de subir el array completo cada vez, usar `POST /store/append` del worker para subir SOLO el paciente modificado. El worker ya tiene este endpoint implementado (L282-290).

```javascript
// En lugar de _syncPatients subir TODO el array:
const _syncPatientDelta = async (patient) => {
  const key = _patKey(suid);
  await _workerAppend(key, patient, "id"); // usa POST /store/append
};
```

Esto reduce el payload de ~4MB a ~15KB por paciente. La cola de pendientes (<60KB) SÍ podría manejar esto.

---

# PARTE VI: RESUMEN DE RIESGOS Y MITIGACIONES

| Riesgo | Sin mitigación | Con Agentes 2+4 | Con Solución 4 |
|--------|---------------|-----------------|-----------------|
| Cerrar navegador con chunks pendientes | ❌ PÉRDIDA al abrir en otro dispositivo | 🟡 Datos en localStorage, recovery en arranque | ✅ Subida atómica por paciente |
| Red caída por 30 min durante jornada | ❌ 30 min de pacientes solo en localStorage | 🟡 Badge visible, backup manual posible | ✅ Cada paciente se sube individualmente |
| Cuota localStorage llena | ❌ _memStore volátil, pérdida al cerrar | 🟡 Quota monitor alerta antes | ✅ Chunks pequeños no llenan cuota |
| 20 reintentos agotados | ❌ Descarte silencioso | 🟡 Flag "oversize_pending" preserva referencia | ✅ N/A (chunks pequeños) |

---

# PARTE VII: COMANDO DE DIAGNÓSTICO RÁPIDO (COPIA Y PEGA EN CONSOLA)

```javascript
(function() {
  console.log('═══ DIAGNÓSTICO RÁPIDO OCUPASALUD ═══');
  console.log('Hora:', new Date().toLocaleTimeString());

  // 1. Badge sin respaldo
  const unsynced = JSON.parse(localStorage.getItem('siso_hc_sin_respaldo') || '{}');
  const unsyncedKeys = Object.keys(unsynced);
  if (unsyncedKeys.length) {
    console.warn('🔴 DATOS SIN RESPALDO:', unsyncedKeys.join(', '));
    unsyncedKeys.forEach(k => console.warn(`  └─ ${k}: desde ${new Date(unsynced[k]).toLocaleTimeString()}`));
  } else {
    console.log('🟢 Sin datos pendientes de respaldo');
  }

  // 2. Cola D1
  const pending = JSON.parse(localStorage.getItem('siso_pending_d1_writes') || '{}');
  const pendingKeys = Object.keys(pending);
  console.log(pendingKeys.length ? `🟡 Cola D1: ${pendingKeys.length} pendientes` : '🟢 Cola D1: vacía');
  pendingKeys.forEach(k => {
    const item = pending[k];
    console.log(`  └─ ${k}: ${item.retries || 0} reintentos, ${((JSON.stringify(item.value||{}).length)/1024).toFixed(1)}KB`);
  });

  // 3. Worker health
  const lastSeen = localStorage.getItem('siso_worker_last_seen');
  const lastFail = localStorage.getItem('siso_worker_last_fail');
  if (lastSeen) {
    const ago = Math.round((Date.now() - parseInt(lastSeen)) / 1000);
    console.log(`🟢 Worker visto hace ${ago}s (latencia: ${localStorage.getItem('siso_worker_latency_ms') || '?'}ms)`);
  }
  if (lastFail) {
    const ago = Math.round((Date.now() - parseInt(lastFail)) / 1000);
    console.warn(`🔴 Último fallo worker: hace ${ago}s`);
  }

  // 4. Pacientes localStorage vs D1 (si hay token)
  const uid = JSON.parse(localStorage.getItem('siso_session') || '{}').user;
  if (uid) {
    const key = `siso_db_patients_${uid}`;
    const lsData = JSON.parse(localStorage.getItem(key) || '[]');
    console.log(`📋 localStorage: ${lsData.length} pacientes`);

    const workerUrl = localStorage.getItem('siso_worker_url_cache');
    const token = localStorage.getItem('siso_worker_token_cache');
    if (workerUrl && token) {
      fetch(`${workerUrl}/store/${encodeURIComponent(key)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(d => {
        const d1Count = Array.isArray(d?.value) ? d.value.length : '?';
        console.log(`☁️ D1: ${d1Count} pacientes`);
        if (typeof d1Count === 'number' && d1Count < lsData.length) {
          console.error(`❌ ALERTA: Faltan ${lsData.length - d1Count} pacientes en D1. NO CIERRES EL NAVEGADOR.`);
        } else if (d1Count === lsData.length) {
          console.log('✅ D1 y localStorage sincronizados');
        }
      }).catch(() => console.warn('⚠️ No se pudo consultar D1'));
    }
  }

  // 5. Cuota localStorage
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    total += (localStorage.getItem(localStorage.key(i)) || '').length;
  }
  const pct = ((total / (5*1024*1024)) * 100).toFixed(1);
  console.log(`💾 Cuota: ${(total/(1024*1024)).toFixed(1)}MB / ~5MB (${pct}%)`);
  if (pct > 80) console.warn('⚠️ Cuota >80%. Riesgo de QuotaExceededError.');

  console.log('═══ FIN DIAGNÓSTICO ═══');
})();
```

---

# CONCLUSIÓN

**¿Se van a perder tus datos si cierras el navegador?**

- **Si el badge "⚠️ Datos sin respaldo" NO está visible**: NO. Los datos están en D1. Puedes cerrar tranquilo.
- **Si el badge SÍ está visible**: TUS DATOS ESTÁN EN localStorage (no se pierden al cerrar), PERO no están en D1. Si vuelves a abrir en el MISMO navegador, los ves. Si abres en OTRO navegador/dispositivo, NO los ves.
- **Si cierras Y formateas Y no hay backup**: PÉRDIDA TOTAL de lo acumulado desde la última subida exitosa a D1.

**Lo que necesitas implementar HOY para dormir tranquilo:**
1. Agente 2 (`beforeunload-flusher`) — intenta subir al cerrar
2. Agente 4 (`dirty-shutdown-recovery`) — recupera al arrancar
3. Agente 1 (`chunk-failure-detector`) — te avisa CUÁNDO falla

**La solución definitiva (para la próxima semana):**
- Solución 4: subir pacientes incrementalmente con `POST /store/append` en lugar del array completo.

---

*Documento generado el 13 de Julio 2026, 09:27 AM (UTC-4:00)*