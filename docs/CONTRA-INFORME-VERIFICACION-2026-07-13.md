# Contra-informe de verificación — 2026-07-13

Verificación independiente de los dos documentos:
- `ADDENDUM-FORENSE-CASCADA-ERRORES-2026-07-13.md` (hallazgos V19, V20, V21)
- `INFORME-DIAGNOSTICO-VIVO-2026-07-13.md` (diagnóstico en `localhost:5173`)

Metodología: cada afirmación se contrastó leyendo el código real (`functions/_middleware.js`,
`siso-worker/index.js`, `src/App.jsx`, `public/sw.js`), no solo el texto del informe.

---

## Hallazgo raíz: el entorno de prueba invalida la mayoría de los hallazgos

El propio "INFORME-DIAGNOSTICO-VIVO" declara su entorno: **"Desarrollo local (localhost:5173) con Vite"**.

Evidencia de por qué eso importa:

1. `functions/_middleware.js` es una **Cloudflare Pages Function**. Solo se ejecuta cuando el
   sitio se sirve DESDE Cloudflare Pages (`ocupasaludparadesplegar-f4q.pages.dev`). Un `vite dev`
   local plano **nunca la ejecuta** — no existe ese paso intermedio.
2. Esa función es la ÚNICA vía por la que `window.__SISO_CONFIG.workerToken` recibe un valor real.
3. No existe ningún archivo `.env`/`.env.local` en el repo con `VITE_WORKER_TOKEN` (verificado:
   `ls .env*` no devuelve nada). Esa es la única otra vía de fallback en el código
   (`App.jsx:288`).
4. Conclusión obligada: en `localhost:5173`, `_WORKER_TOKEN` está **vacío**.

**Consecuencia directa en el código:** `_workerSet`, `_workerGetRaw` y toda función que toca el
worker empiezan con `if (!_WORKER_TOKEN) return false;` / `return null;` (líneas 352, 361, 369,
401, 546, 698, 788 de `App.jsx`). Es decir: **con token vacío no se hace ninguna petición de red
al worker.** No hay 401, no hay 200 — no hay llamada.

Esto explica, sin necesidad de ningún bug nuevo:
- La discrepancia "391 (localStorage) vs 443 (Supabase)": si D1 nunca se consulta, la app cae a
  Supabase, que es una fuente distinta con un snapshot distinto. No es pérdida de datos en
  producción — es la ausencia de credenciales en el entorno de prueba.
- "IndexedDB abandonado" / "D1 no disponible": consistente con un cliente que jamás intentó
  hablar con D1 en esa sesión de prueba.

---

## V19 — "verify-after-write falla porque GET devuelve 401 y POST devuelve 200"

**Contradicho por el código.** El chequeo de autenticación del worker (`siso-worker/index.js:78-81`):

```js
const token = request.headers.get("X-Siso-Token");
if (!token || token !== env.SISO_TOKEN) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
}
```

Este chequeo se ejecuta **antes de cualquier despacho de ruta**, idéntico para GET y POST — no
existe ninguna rama que trate los métodos de forma distinta. Con el mismo token, ambos métodos
tienen que tener el mismo resultado de auth. Y como se estableció arriba: en el entorno donde se
hizo esta prueba (local, sin token), ni el POST ni el GET deberían haber salido siquiera del
guard `if (!_WORKER_TOKEN)` del lado del cliente — el informe describe una secuencia de respuestas
HTTP (200 luego 401) que el código actual no puede producir en ese entorno.

**Veredicto: no reproducible con el código actual. Se descarta.**

## V20 — "Promise.race no aborta el fetch perdedor → cache.put() corre sobre stream incompleto"

**Parcialmente correcto, mecanismo mal descrito.** Confirmé que `networkFirstStrategy` en
`sw.js` sí usaba `Promise.race([fetch(req), timeoutPromise])` sin `AbortController` — eso es
real. Pero el mecanismo de daño que describen (el `cache.put()` corriendo contra un body
incompleto) no ocurre así: el `cache.put()` solo se ejecuta dentro del `try` ligado a la promesa
**ganadora** de la carrera. Si gana el timeout, esa rama de éxito nunca se ejecuta. Lo que sí pasa
es que el `fetch()` perdedor queda **huérfano**, corriendo en segundo plano sin ningún `.catch()`
enganchado — desperdicio de red y posibles "unhandled rejection" en consola, no corrupción de
caché.

**Veredicto: hallazgo válido pero de severidad menor a la descrita. Corregido igualmente**
(ver Acción 2 abajo) porque es buena higiene de código, no porque previniera el escenario
catastrófico que describe el informe.

## V21 — "cascada: V19 hace que syncNow() crea que D1 no está disponible y se salte la descarga"

Depende enteramente de V19, que fue descartado. Sin la premisa, la cascada no aplica.

**Veredicto: se descarta junto con V19.**

## V8 (informe de diagnóstico) — "D1 tiene límite de 100KB por valor; `siso_db_patients` (4.3MB) será rechazado silenciosamente"

**Falso respecto a este sistema, verificado en código:**

```js
const _CHUNK_THRESHOLD = 600 * 1024;   // si JSON > 600KB chars → chunked
const _CHUNK_SIZE      = 500 * 1024;   // 500KB chars por pieza
const _PROTECTED_KEY = /^siso_(db_)?patients_|^siso_atenciones|^siso_hc_/;
```

Cualquier valor que matchee ese patrón (incluye `siso_db_patients_*`) y supere 600KB se trocea
automáticamente en piezas de 500KB vía `/store/chunked`, endpoint atómico del lado del worker.
Este mecanismo se probó en vivo hoy mismo con cargas reales de 4.5MB+ (varias veces, con
verificación de hash post-escritura). El informe no menciona el sistema de chunking en absoluto
— parece evaluar un escenario de "un solo POST directo", que no es como este sistema escribe
datos grandes.

**Veredicto: se descarta. No representa un riesgo real.**

---

## Resumen de acciones tomadas (las únicas justificadas por evidencia)

| # | Acción | Archivo | Justificación |
|---|--------|---------|----------------|
| 1 | Escala no uniforme en certificados ZIP: ancho siempre `cW` (hoja completa), solo la altura se comprime por `s` | `src/App.jsx` (`_tryFitCanvasOnePage`) | Resuelve el problema real observado (bordes anchos), no relacionado con los informes forenses |
| 2 | `AbortController` en vez de `Promise.race` desnudo en `networkFirstStrategy` | `public/sw.js` | V20 tiene una base real (aunque el mecanismo de daño descrito era impreciso); corregirlo es buena práctica de bajo riesgo |

## Lo que NO se hizo, y por qué

Ningún otro cambio de los sugeridos en los dos informes se implementó: V19, V21 y el reclamo del
"límite de 100KB" no se sostienen frente al código real y, en el caso de V19/V21/391-vs-443,
parecen ser artefactos de probar en `localhost:5173` sin las credenciales de producción
(`window.__SISO_CONFIG`), no fallas reales de la aplicación desplegada.

**Recomendación:** si se quiere repetir ese diagnóstico "en vivo" de forma válida, debe hacerse
contra `ocupasaludparadesplegar-f4q.pages.dev` (dominio estable de producción) o usando
`wrangler pages dev` localmente con las variables de entorno de Cloudflare Pages cargadas —
nunca con `vite dev` plano, que estructuralmente no puede alcanzar D1.
