// SISO API Worker — Cloudflare D1 backend
// Reemplaza Supabase siso_store como almacenamiento en nube

// Lista explícita de orígenes permitidos. Incluye el proyecto git-connected
// (-f4q) Y el alias antiguo sin sufijo, por compatibilidad histórica.
const ALLOWED_ORIGINS = [
  "https://ocupasaludparadesplegar.pages.dev",
  "https://ocupasaludparadesplegar-f4q.pages.dev",
  // Refactor en desarrollo (siso-appultimo): comparte este mismo backend/D1
  // mientras se construye. Ver también el sufijo permitido en corsHeaders.
  "https://siso-appultimo-arp.pages.dev",
  "http://localhost:5173",
  "http://localhost:4173",
];
// Fallback usado en respuestas cuando el Origin no fue reconocido (preserva
// retro-compatibilidad: si alguien llama sin Origin válido, igual recibe CORS
// dirigido al alias original).
const DEFAULT_ORIGIN = ALLOWED_ORIGINS[0];

function corsHeaders(origin) {
  // Match exacto contra la lista O cualquier subdomio bajo
  // *.ocupasaludparadesplegar.pages.dev y *.ocupasaludparadesplegar-f4q.pages.dev
  // (preview deploys de Cloudflare Pages usan hash.proyecto.pages.dev).
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    (origin && origin.endsWith(".ocupasaludparadesplegar.pages.dev")) ||
    (origin && origin.endsWith(".ocupasaludparadesplegar-f4q.pages.dev")) ||
    (origin && origin.endsWith(".siso-appultimo-arp.pages.dev"));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : DEFAULT_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Siso-Token",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
}

// ── COMPRESIÓN GZIP — reduce 50-80% el tamaño en D1 ──────────────────────────
// Usa la Web Compression Streams API nativa de Cloudflare (sin dependencias).
// Los valores comprimidos llevan prefijo 'gz:'. Retrocompatible: si un valor NO
// empieza con 'gz:' se trata como JSON plano legacy (lee igual que antes).
// Tanto compress como decompress tienen fallback: nunca lanzan excepción.
// ─────────────────────────────────────────────────────────────────────────────
// FIX 2026-06-18: compresión DESACTIVADA. Causó 500 en producción (datos
// guardados como gz: que no se descomprimían bien en el edge → JSON.parse
// fallaba). Como la limpieza de huérfanos dejó D1 al ~10%, NO se necesita
// comprimir. Escribimos JSON plano (cero riesgo). decompressValue se mantiene
// para leer cualquier valor gz: legacy que aún exista (retrocompatibilidad).
async function compressValue(text) {
  return text; // no-op: guardar siempre JSON plano
}
async function decompressValue(stored) {
  if (typeof stored !== "string" || !stored.startsWith("gz:")) return stored;
  try {
    const binary = atob(stored.slice(3));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const stream = new DecompressionStream("gzip");
    const writer = stream.writable.getWriter();
    writer.write(bytes);
    writer.close();
    return await new Response(stream.readable).text();
  } catch (e) {
    return stored; // fallback: devolver crudo
  }
}

// ── CLAVES PROTEGIDAS (fusión por id, nunca reemplazo total) ───────────────
// FIX 2026-07-15: siso_encuestas quedaba FUERA de esta lista y además el
// candado solo existía en /store/chunked — pero siso_encuestas es pequeña y
// pasa por el POST /store normal (línea ~164), que no tenía NINGÚN candado.
// Una encuesta creada en un dispositivo se perdía en cuanto CUALQUIER otra
// sesión (con su copia local desactualizada) guardaba esta clave, porque el
// POST /store normal siempre reemplazaba el arreglo completo. Ahora
// siso_encuestas también se fusiona por id en ambas rutas de escritura.
const _PROTECTED = /^siso_(db_)?patients_|^siso_atenciones|^siso_hc_|^siso_encuestas|^siso_companies|^siso_cartas_custodia|^siso_saved_reports|^siso_informes|^siso_users|^siso_portal_empresa_docs|^siso_portal_empresa_atenciones/;

// siso_portal_empresa_docs_<nit> no es un arreglo: es un objeto
// {nit, nombre, codigoAcceso, periodos:[{periodo, informe, cuenta, custodia, certificados}]}.
// Fusiona por periodo, y dentro de cada periodo preserva informe/cuenta/custodia/
// certificados que el entrante traiga en null pero el viejo sí tenía — mismo
// criterio que ya usa el cliente en varios puntos (_readSmart + merge manual),
// ahora también aplicado server-side como respaldo si el cliente fusiona mal.
async function _mergePeriodosObjeto(env, key, incoming) {
  try {
    const oldRow = await env.DB.prepare("SELECT value FROM siso_store WHERE key = ?").bind(key).first();
    if (!oldRow?.value) return incoming;
    let old = null;
    try { old = JSON.parse(await decompressValue(oldRow.value)); } catch { return incoming; }
    if (!old || typeof old !== "object" || !Array.isArray(old.periodos)) return incoming;
    const byPeriodo = new Map(old.periodos.map(p => [p?.periodo, p]));
    const merged = incoming.periodos.map(p => {
      const op = byPeriodo.get(p?.periodo);
      if (!op) return p;
      byPeriodo.delete(p?.periodo);
      return {
        ...op, ...p,
        informe: p.informe || op.informe || null,
        cuenta: p.cuenta || op.cuenta || null,
        custodia: p.custodia || op.custodia || null,
        certificados: (p.certificados && p.certificados.count) ? p.certificados : (op.certificados || p.certificados || null),
      };
    });
    const extras = [...byPeriodo.values()];
    if (extras.length > 0) console.log(`[merge] CANDADO ${key}: +${extras.length} periodos preservados`);
    return { ...incoming, periodos: [...merged, ...extras] };
  } catch (e) { console.warn(`[merge] candado-objeto ${key} error:`, e.message); return incoming; }
}

// Fusiona por id: lo entrante gana por-id, lo existente que el entrante no
// conoce se preserva. Usado por POST /store y POST /store/chunked.
async function _mergeProtegido(env, key, incoming) {
  if (!_PROTECTED.test(key)) return incoming;
  if (incoming && typeof incoming === "object" && !Array.isArray(incoming) && Array.isArray(incoming.periodos)) {
    return _mergePeriodosObjeto(env, key, incoming);
  }
  if (!Array.isArray(incoming)) return incoming;
  try {
    let old = null;
    const oldRow = await env.DB.prepare("SELECT value FROM siso_store WHERE key = ?").bind(key).first();
    if (oldRow?.value) {
      try { old = JSON.parse(await decompressValue(oldRow.value)); } catch {}
    }
    if (!Array.isArray(old)) {
      const om = await env.DB.prepare("SELECT value FROM siso_store WHERE key = ?").bind(key + "__meta").first();
      if (om?.value) {
        const m = JSON.parse(await decompressValue(om.value));
        if (m?.chunked && Number.isFinite(m.count)) {
          let joined = "";
          for (let i = 0; i < m.count; i++) {
            const pr = await env.DB.prepare("SELECT value FROM siso_store WHERE key = ?").bind(`${key}__c${i}`).first();
            if (!pr?.value) { joined = null; break; }
            const pv = JSON.parse(await decompressValue(pr.value));
            joined += (typeof pv === "string") ? pv : "";
          }
          if (joined) { try { const p = JSON.parse(joined); if (Array.isArray(p)) old = p; } catch {} }
        }
      }
    }
    if (Array.isArray(old) && old.length > 0) {
      const ids = new Set(incoming.filter(x => x && x.id != null).map(x => String(x.id)));
      const idsByToken = new Set(incoming.filter(x => x && x.token != null).map(x => String(x.token)));
      const extras = old.filter(x => x && ((x.id != null && !ids.has(String(x.id))) || (x.id == null && x.token != null && !idsByToken.has(String(x.token)))));
      if (extras.length > 0) {
        console.log(`[merge] CANDADO ${key}: +${extras.length} preservados (entrante=${incoming.length}, final=${incoming.length + extras.length})`);
        return [...incoming, ...extras];
      }
    }
  } catch (e) { console.warn(`[merge] candado ${key} error:`, e.message); }
  return incoming;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    // OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // Auth check
    const token = request.headers.get("X-Siso-Token");
    if (!token || token !== env.SISO_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    let url, path;
    try {
      url = new URL(request.url);
      path = url.pathname;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400, headers: corsHeaders(origin) });
    }

    try {
      // ── GET /store/:key ──────────────────────────────────────────────
      // Devuelve también `ts` (updated_at) para soporte de If-Match en POST
      if (request.method === "GET" && path.startsWith("/store/") && !path.startsWith("/store/prefix/")) {
        const key = decodeURIComponent(path.slice(7));
        const row = await env.DB.prepare("SELECT value, updated_at FROM siso_store WHERE key = ?").bind(key).first();
        if (!row) return new Response(JSON.stringify([]), { headers });
        const ts = row.updated_at;
        // Exponer también el etag en header para uso fácil del cliente
        const respHeaders = { ...headers, "ETag": ts ? `"${ts}"` : '""', "X-Siso-Ts": ts || "" };
        // FIX 2026-07-14: modo ?raw=1 — mismo criterio que ya se aplicó a
        // /store/prefix y /store (V11): saltar el JSON.parse del lado del
        // servidor evita el 503 por CPU timeout (10ms free tier) cuando el
        // valor es grande (ej. piezas de ~500KB de un valor troceado). El
        // cliente hace el parse. Sin este flag, comportamiento sin cambios.
        const raw = url.searchParams.get("raw") === "1";
        if (raw) {
          const decompressed = await decompressValue(row.value);
          return new Response(JSON.stringify([{ key, value: decompressed, ts, _raw: true }]), { headers: respHeaders });
        }
        const value = JSON.parse(await decompressValue(row.value));
        return new Response(JSON.stringify([{ key, value, ts }]), { headers: respHeaders });
      }

      // ── GET /store/prefix/:prefix — buscar por prefijo ───────────────
      // FIX 2026-07-11: excluir PIEZAS de chunks (`__cN`, `__new…`, legacy
      // `_chunk_i_of_N` del refactor). Con ~70 claves de pacientes chunked
      // (~500KB c/u) el escaneo completo serializaba decenas de MB y
      // excedía el límite de CPU/memoria del worker → 500 permanente en
      // /store/prefix/siso_ (lo usan los syncManager de ambas apps cada
      // 5 min). Los metadatos `__meta` (pequeños) SÍ se incluyen; las
      // piezas solo se leen por clave directa vía _workerGet.
      // FIX 2026-07-12 (V11): NO hacer JSON.parse en el servidor — devolver
      // strings crudos con flag _raw para que el cliente haga el parseo.
      // Elimina la causa raíz del 503 por CPU timeout (10ms free tier).
      if (request.method === "GET" && path.startsWith("/store/prefix/")) {
        const prefix = decodeURIComponent(path.slice(14));
        const rows = await env.DB.prepare(
          "SELECT key, value FROM siso_store WHERE key LIKE ? " +
          "AND key NOT GLOB '*__c[0-9]*' AND key NOT LIKE '%\\_\\_new%' ESCAPE '\\' AND key NOT GLOB '*_chunk_[0-9]*_of_[0-9]*' " +
          "LIMIT 2000"
        ).bind(prefix + "%").all();
        const result = (rows.results || []).map(r => ({ key: r.key, value: r.value, _raw: true }));
        return new Response(JSON.stringify(result), { headers });
      }

      // ── GET /store — listar todas las claves ─────────────────────────
      // FIX 2026-07-12 (V11): devolver strings crudos con _raw:true.
      if (request.method === "GET" && path === "/store") {
        const userId = url.searchParams.get("userId") || "";
        let rows;
        if (userId) {
          rows = await env.DB.prepare(
            "SELECT key, value, updated_at FROM siso_store WHERE key LIKE ? OR key LIKE ? LIMIT 2000"
          ).bind(`%_${userId}`, `%_${userId}_%`).all();
        } else {
          rows = await env.DB.prepare(
            "SELECT key, value, updated_at FROM siso_store LIMIT 2000"
          ).all();
        }
        const result = (rows.results || []).map(r => ({
          key: r.key,
          value: r.value,
          updated_at: r.updated_at,
          _raw: true,
        }));
        return new Response(JSON.stringify(result), { headers });
      }

      // ── POST /store — upsert uno o varios {key, value} ───────────────
      // Soporta header If-Match: <ts> para escritura optimista (FASE 3):
      //   • Si el ts del row actual != If-Match → 409 con el nuevo ts
      //   • Si coincide o no envió header → ejecuta normal
      if (request.method === "POST" && path === "/store") {
        const body = await request.json();
        const rows = Array.isArray(body) ? body : [body];
        const ifMatch = (request.headers.get("If-Match") || request.headers.get("X-Siso-If-Match") || "").replace(/"/g, "").trim();

        // Validación If-Match: solo aplica a escrituras de UNA clave
        if (ifMatch && rows.length === 1 && rows[0]?.key) {
          const currentRow = await env.DB.prepare("SELECT updated_at FROM siso_store WHERE key = ?").bind(rows[0].key).first();
          const currentTs = currentRow?.updated_at || "";
          // Si la clave existe Y su ts no coincide con If-Match → conflicto
          if (currentTs && currentTs !== ifMatch) {
            return new Response(JSON.stringify({
              ok: false,
              error: "etag_mismatch",
              currentTs,
              expectedTs: ifMatch,
            }), { status: 409, headers: { ...headers, "X-Siso-Current-Ts": currentTs } });
          }
        }

        const stmt = env.DB.prepare(
          "INSERT INTO siso_store(key, value, updated_at) VALUES(?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
        );
        // Batch en chunks de 50 — comprime cada value (gzip) antes de insertar
        const CHUNK = 50;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          // FIX 2026-07-15: fusión por id para claves protegidas (incluye
          // siso_encuestas) — antes este handler reemplazaba el arreglo
          // completo sin fusionar, así que una sesión con copia local vieja
          // borraba encuestas/registros creados por otra sesión.
          const comp = await Promise.all(chunk.map(async ({ key, value }) => {
            const merged = await _mergeProtegido(env, key, value);
            return { key, cv: await compressValue(JSON.stringify(merged)) };
          }));
          const batch = comp.map(({ key, cv }) => stmt.bind(key, cv));
          await env.DB.batch(batch);
        }
        return new Response(JSON.stringify({ ok: true, count: rows.length }), { headers });
      }

      // ── POST /store/chunked — escritura chunked ATÓMICA (2026-07-11) ──
      // El troceo cliente (piezas __cN escritas una a una) no es atómico:
      // dos guardados simultáneos (dos pestañas, o monolito + refactor)
      // entrelazaban piezas de generaciones distintas → hash mismatch →
      // "CORRUPCIÓN detectada" y lectura descartada. Aquí el servidor
      // trocea y escribe TODO (piezas + __meta con hash + borrado de la
      // clave base y de piezas sobrantes) en UN env.DB.batch — transaccional
      // en D1: los lectores ven la generación vieja o la nueva, nunca mezcla.
      // Body: { key, value }. Formato 100% compatible con _workerGet del
      // monolito y _chunkGet del refactor.
      if (request.method === "POST" && path === "/store/chunked") {
        const body = await request.json();
        const { key, value } = body || {};
        if (!key || value === undefined) {
          return new Response(JSON.stringify({ ok: false, error: "key y value requeridos" }), { status: 400, headers });
        }
        // ── CANDADO ANTI-ENCOGIMIENTO (2026-07-11, compartido con POST /store) ──
        // Incidente: una pestaña con estado viejo reescribió la lista de
        // pacientes y borró de la nube los 23 exámenes del día (3 veces).
        // Para colecciones protegidas, el SERVIDOR fusiona por id con lo ya
        // almacenado: lo entrante gana por-id (ediciones), pero los
        // registros existentes que lo entrante NO conoce se PRESERVAN.
        // Ninguna sesión — ni con código viejo, ni con estado incompleto —
        // puede volver a encoger estas listas. Ver _mergeProtegido (module
        // scope) — misma función que usa POST /store.
        const toStore = await _mergeProtegido(env, key, value);
        const payload = JSON.stringify(toStore);
        // Hash idéntico al _hash64 del monolito (h1 base31 + h2 base127*31)
        let h1 = 0, h2 = 0;
        for (let i = 0; i < payload.length; i++) {
          const c = payload.charCodeAt(i);
          h1 = ((h1 << 5) - h1 + c) | 0;
          h2 = ((h2 << 7) - h2 + c * 31) | 0;
        }
        const hash = (h1 >>> 0).toString(16) + "_" + (h2 >>> 0).toString(16);
        const PIECE = 500 * 1024;
        const pieces = [];
        for (let off = 0; off < payload.length; off += PIECE) pieces.push(payload.slice(off, off + PIECE));
        // Piezas viejas a borrar más allá del nuevo count (evita __cN huérfanos)
        let oldCount = 0;
        try {
          const om = await env.DB.prepare("SELECT value FROM siso_store WHERE key = ?").bind(key + "__meta").first();
          if (om?.value) { const m = JSON.parse(await decompressValue(om.value)); if (m?.chunked && Number.isFinite(m.count)) oldCount = m.count; }
        } catch {}
        const up = env.DB.prepare(
          "INSERT INTO siso_store(key, value, updated_at) VALUES(?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
        );
        const del = env.DB.prepare("DELETE FROM siso_store WHERE key = ?");
        const meta = { chunked: true, count: pieces.length, totalBytes: payload.length, hash, ts: Date.now() };
        const batch = [
          ...pieces.map((p, i) => up.bind(key + "__c" + i, JSON.stringify(p))),
          up.bind(key + "__meta", JSON.stringify(meta)),
          del.bind(key), // los lectores caen al __meta
        ];
        for (let i = pieces.length; i < oldCount; i++) batch.push(del.bind(key + "__c" + i));
        await env.DB.batch(batch); // ← transaccional: todo o nada
        return new Response(JSON.stringify({ ok: true, chunks: pieces.length, hash }), { headers });
      }

      // ── POST /store/append — agrega/actualiza UN item dentro de un array
      // almacenado, con la fusión hecha EN EL SERVIDOR (2026-07-09).
      // Evita la carrera read-modify-write de clientes concurrentes: varios
      // trabajadores enviando la encuesta a la vez se pisaban la respuesta
      // (cada navegador leía la lista, agregaba la suya y reescribía TODO).
      // Body: { key, item, idField? } — si ya existe un elemento con el mismo
      // idField se reemplaza; si no, se agrega al final. Nunca borra nada.
      if (request.method === "POST" && path === "/store/append") {
        const body = await request.json();
        const { key, item, idField = "id" } = body || {};
        if (!key || !item || typeof item !== "object") {
          return new Response(JSON.stringify({ ok: false, error: "key e item requeridos" }), { status: 400, headers });
        }
        const row = await env.DB.prepare("SELECT value FROM siso_store WHERE key = ?").bind(key).first();
        let arr = [];
        if (row && row.value) {
          try {
            const parsed = JSON.parse(await decompressValue(row.value));
            if (Array.isArray(parsed)) arr = parsed;
          } catch {}
        }
        const idVal = item[idField];
        const idx = idVal != null ? arr.findIndex(x => x && String(x[idField]) === String(idVal)) : -1;
        if (idx >= 0) arr[idx] = item; else arr.push(item);
        const cv = await compressValue(JSON.stringify(arr));
        await env.DB.prepare(
          "INSERT INTO siso_store(key, value, updated_at) VALUES(?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
        ).bind(key, cv).run();
        return new Response(JSON.stringify({ ok: true, count: arr.length }), { headers });
      }

      // ── GET /health — endpoint de healthcheck para FASE 4 monitoring ──
      // AUDITORÍA 2026-07-10: los 5 COUNT(*) escanean ~2.300 filas cada uno
      // (~11K filas leídas POR LLAMADA). Ambas apps (monolito y refactor) lo
      // llaman cada 2 min → ~7M filas/día con 2 pestañas, superando el límite
      // gratis de D1 (5M lecturas/día). Por defecto ahora responde con un ping
      // barato (SELECT 1 ≈ 0 filas); los conteos completos solo con ?full=1.
      if (request.method === "GET" && path === "/health") {
        const t0 = Date.now();
        if (url.searchParams.get("full") !== "1") {
          try {
            await env.DB.prepare("SELECT 1").first();
            return new Response(JSON.stringify({ ok: true, latencyMs: Date.now() - t0, ts: new Date().toISOString() }), { headers });
          } catch (e) {
            return new Response(JSON.stringify({ ok: false, error: e.message, latencyMs: Date.now() - t0 }), { status: 500, headers });
          }
        }
        const counts = {};
        try {
          const r1 = await env.DB.prepare("SELECT COUNT(*) AS c FROM siso_store").first();
          counts.total = r1?.c ?? 0;
          const r2 = await env.DB.prepare("SELECT COUNT(*) AS c FROM siso_store WHERE key LIKE 'siso_db_patients_%' OR key LIKE 'siso_patients_%'").first();
          counts.patients_keys = r2?.c ?? 0;
          const r3 = await env.DB.prepare("SELECT COUNT(*) AS c FROM siso_store WHERE key LIKE 'siso_portal_doc_%'").first();
          counts.portal_docs = r3?.c ?? 0;
          const r4 = await env.DB.prepare("SELECT COUNT(*) AS c FROM siso_store WHERE key LIKE 'siso_hc_completa_%'").first();
          counts.hc_completas = r4?.c ?? 0;
          const r5 = await env.DB.prepare("SELECT COUNT(*) AS c FROM siso_store WHERE key LIKE 'siso_portal_empresa_%'").first();
          counts.portal_empresa_keys = r5?.c ?? 0;
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message, latencyMs: Date.now() - t0 }), { status: 500, headers });
        }
        return new Response(JSON.stringify({
          ok: true,
          counts,
          latencyMs: Date.now() - t0,
          ts: new Date().toISOString(),
        }), { headers });
      }

      // ── DELETE /store/:key ───────────────────────────────────────────
      if (request.method === "DELETE" && path.startsWith("/store/")) {
        const key = decodeURIComponent(path.slice(7));
        await env.DB.prepare("DELETE FROM siso_store WHERE key = ?").bind(key).run();
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // ── POST /snapshot — disparar snapshot manualmente ───────────────
      if (request.method === "POST" && path === "/snapshot") {
        const result = await runDailySnapshot(env);
        return new Response(JSON.stringify(result), { headers });
      }

      // ── POST /cleanup — limpieza de emergencia (sin crear snapshot nuevo)
      // FIX 2026-06-15: útil cuando D1 está lleno y no permite escrituras.
      // Borra: snapshots > 7 días + chunks temporales __new* > 1h
      if (request.method === "POST" && path === "/cleanup") {
        const log = [];
        // Rotación snapshots
        try {
          const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
          const dr = await env.DB.prepare(
            "DELETE FROM siso_store WHERE key LIKE 'siso_snapshot_%' AND substr(key, 15, 10) < ?"
          ).bind(cutoff).run();
          log.push({ section: "rotacion_snapshots", borradas: dr.meta?.changes ?? 0, cutoff });
        } catch (e) { log.push({ section: "rotacion_snapshots", error: e.message }); }
        // Chunks temporales abandonados (__new<ts>__cN / __meta) — DELETE masivo.
        // FIX 2026-06-17: el loop con filtro de timestamp borraba 0. Los chunks
        // __new son SIEMPRE temporales (una escritura completa los promueve al key
        // real y los borra); cualquier __new que quede es huérfano de escritura
        // fallida. DELETE en una sola sentencia: rápido y libera el espacio real.
        try {
          const dr = await env.DB.prepare(
            "DELETE FROM siso_store WHERE key LIKE '%\\_\\_new%' ESCAPE '\\'"
          ).run();
          log.push({ section: "chunks_temporales", borrados: dr.meta?.changes ?? 0 });
        } catch (e) { log.push({ section: "chunks_temporales", error: e.message }); }
        // Autosaves de sesión > 48h (acumulan sin límite)
        try {
          const cutoff48h = new Date(Date.now() - 48 * 3600000).toISOString();
          const dr = await env.DB.prepare(
            "DELETE FROM siso_store WHERE key LIKE 'siso_autosave_cloud_%' AND updated_at < ?"
          ).bind(cutoff48h).run();
          log.push({ section: "autosaves", borrados: dr.meta?.changes ?? 0 });
        } catch (e) { log.push({ section: "autosaves", error: e.message }); }
        return new Response(JSON.stringify({ ok: true, log }), { headers });
      }

      // ── GET /snapshot/list — listar snapshots disponibles ────────────
      if (request.method === "GET" && path === "/snapshot/list") {
        const rows = await env.DB.prepare(
          "SELECT key, updated_at FROM siso_store WHERE key LIKE 'siso_snapshot_%__manifest' ORDER BY key DESC"
        ).all();
        return new Response(JSON.stringify(rows.results || []), { headers });
      }

      // ── GET /storage-stats — monitoreo de uso de D1 ──────────────────
      if (request.method === "GET" && path === "/storage-stats") {
        try {
          const total = await env.DB.prepare(
            "SELECT COUNT(*) as filas, SUM(LENGTH(value)) as bytes FROM siso_store"
          ).first();
          const top = await env.DB.prepare(
            `SELECT CASE
               WHEN INSTR(key,'__new')>0 THEN substr(key,1,INSTR(key,'__new')-1)||'__new*'
               WHEN key LIKE 'siso_snapshot_%' THEN 'siso_snapshot_*'
               WHEN key LIKE 'siso_autosave_cloud_%' THEN 'siso_autosave_cloud_*'
               WHEN key LIKE 'siso_hc_completa_%' THEN 'siso_hc_completa_*'
               WHEN key LIKE 'siso_portal_doc_%' THEN 'siso_portal_doc_*'
               WHEN key LIKE 'siso_db_patients_%' THEN 'siso_db_patients_*'
               WHEN key LIKE 'siso_patients_%' THEN 'siso_patients_*'
               WHEN key LIKE 'siso_portal_empresa_%' THEN 'siso_portal_empresa_*'
               ELSE key END as grupo,
             COUNT(*) as cant, ROUND(SUM(LENGTH(value))/1024.0,1) as kb
             FROM siso_store GROUP BY grupo ORDER BY kb DESC LIMIT 25`
          ).all();
          const bytes = total?.bytes || 0;
          const mb = bytes / 1048576;
          const pct = (mb / 500 * 100);
          return new Response(JSON.stringify({
            ok: true, filas: total?.filas || 0,
            mb_usados: parseFloat(mb.toFixed(2)), limite_mb: 500,
            uso_pct: pct.toFixed(1) + "%",
            alerta_70: pct >= 70, alerta_90: pct >= 90,
            top_grupos: top.results || [], ts: new Date().toISOString(),
          }), { headers });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
        }
      }

      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
  },

  // ─────────────────────────────────────────────────────────────────────
  // CRON TRIGGER — corre automáticamente según cron expression definido en wrangler.json
  // Genera snapshot diario + rota viejos (>7 días).
  // ─────────────────────────────────────────────────────────────────────
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDailySnapshot(env).catch(err => {
      console.error("[CRON snapshot] error:", err?.message);
    }));
  },
};

// ─────────────────────────────────────────────────────────────────────────
// runDailySnapshot — reconstruye estado completo y lo guarda como snapshot
// Estrategia:
//   1) Lee TODAS las claves operacionales (excluye snapshots/legacy)
//   2) Reconstruye claves chunked en memoria (concatena __cN)
//   3) Serializa el estado completo y lo trocea en piezas de 500KB
//   4) Guarda como siso_snapshot_YYYY-MM-DD__c0..cN + __meta + __manifest
//   5) Rota: borra snapshots con fecha > 7 días atrás
// ─────────────────────────────────────────────────────────────────────────
async function runDailySnapshot(env) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const snapPrefix = `siso_snapshot_${today}`;
  const t0 = Date.now();
  const log = [];

  // FIX 2026-06-15: Rotación PRIMERO (antes de escribir nuevo snapshot).
  // Bug previo: rotación al final → si la escritura fallaba (timeout, DB llena),
  // los snapshots viejos nunca se borraban. Resultado: acumulación de snapshots
  // de 17+ días que llenaron D1.
  try {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const delRes = await env.DB.prepare(
      "DELETE FROM siso_store WHERE key LIKE 'siso_snapshot_%' AND substr(key, 15, 10) < ?"
    ).bind(cutoff).run();
    log.push(`[ROT-INICIO] borradas ${delRes.meta?.changes ?? 0} claves snapshots anteriores a ${cutoff}`);
  } catch (e) {
    log.push(`[ROT-INICIO] error: ${e?.message}`);
  }
  // FIX 2026-06-15: Limpieza de chunks temporales abandonados (> 1h)
  try {
    const cutoffMs = Date.now() - 60 * 60 * 1000;
    const cutoffTs = cutoffMs.toString();
    // Borrar __new[timestamp]__c* y __new[timestamp]__meta con timestamp < cutoff
    // Como el ts está embebido en la key, usamos LIKE + substr para extraer
    const rows = await env.DB.prepare(
      "SELECT key FROM siso_store WHERE key LIKE '%\\_\\_new%\\_\\_c%' OR key LIKE '%\\_\\_new%\\_\\_meta' ESCAPE '\\'"
    ).all();
    let tempsBorrados = 0;
    for (const r of (rows.results || [])) {
      const m = r.key.match(/__new(\d+)__/);
      if (m && parseInt(m[1], 10) < cutoffMs) {
        await env.DB.prepare("DELETE FROM siso_store WHERE key = ?").bind(r.key).run();
        tempsBorrados++;
      }
    }
    log.push(`[GC-TEMP] borrados ${tempsBorrados} chunks temporales abandonados`);
  } catch (e) {
    log.push(`[GC-TEMP] error: ${e?.message}`);
  }

  // 1) Leer todas las claves (excluir snapshots y legacy — no respaldar respaldos)
  const allRows = await env.DB.prepare(
    "SELECT key, value FROM siso_store WHERE key NOT LIKE 'siso_snapshot_%' AND key NOT LIKE 'siso_legacy_%'"
  ).all();
  const rows = allRows.results || [];
  log.push(`leídas ${rows.length} claves operacionales`);

  // 2) Indexar y reconstruir chunks
  const metas = {};         // baseKey → meta value
  const chunkBags = {};     // baseKey → { idx → string }
  const direct = {};
  const chunkRe = /__c(\d+)$/;
  for (const row of rows) {
    const rawVal = await decompressValue(row.value); // soporta valores gz: y legacy
    if (row.key.endsWith("__meta")) {
      try { metas[row.key.slice(0, -6)] = JSON.parse(rawVal); } catch {}
      continue;
    }
    const m = chunkRe.exec(row.key);
    if (m) {
      const base = row.key.slice(0, -m[0].length);
      (chunkBags[base] ||= {})[Number(m[1])] = JSON.parse(rawVal);
      continue;
    }
    try { direct[row.key] = JSON.parse(rawVal); } catch { direct[row.key] = rawVal; }
  }

  const reconstructed = { ...direct };
  let reconstructedCount = 0;
  for (const [base, meta] of Object.entries(metas)) {
    if (!meta?.chunked || !Number.isFinite(meta.count)) continue;
    const bag = chunkBags[base] || {};
    const parts = [];
    let ok = true;
    for (let i = 0; i < meta.count; i++) {
      if (typeof bag[i] !== "string") { ok = false; break; }
      parts.push(bag[i]);
    }
    if (!ok) continue;
    try { reconstructed[base] = JSON.parse(parts.join("")); reconstructedCount++; } catch {}
  }
  log.push(`reconstruidas ${reconstructedCount} claves chunked`);

  // 3) Serializar y trocear el snapshot
  const serialized = JSON.stringify({
    snapshotVersion: "v1",
    createdAt: new Date().toISOString(),
    totalKeys: Object.keys(reconstructed).length,
    data: reconstructed,
  });
  const totalBytes = serialized.length;
  const CHUNK = 500 * 1024;
  const pieceCount = Math.ceil(totalBytes / CHUNK);
  log.push(`serializado ${(totalBytes/1024).toFixed(0)} KB → ${pieceCount} piezas`);

  // 4) Escribir piezas + meta + manifest
  const insertStmt = env.DB.prepare(
    "INSERT INTO siso_store(key, value, updated_at) VALUES(?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  );
  // Batch para piezas (max 50 por batch para no exceder D1 binds)
  const writeBatch = [];
  for (let i = 0; i < pieceCount; i++) {
    const piece = serialized.slice(i * CHUNK, (i + 1) * CHUNK);
    writeBatch.push(insertStmt.bind(`${snapPrefix}__c${i}`, JSON.stringify(piece)));
  }
  // Meta y manifest
  const meta = {
    chunked: true,
    count: pieceCount,
    totalBytes,
    ts: Date.now(),
  };
  const manifest = {
    snapshotVersion: "v1",
    createdAt: new Date().toISOString(),
    totalKeys: Object.keys(reconstructed).length,
    totalBytes,
    pieceCount,
    reconstructedCount,
    durationMs: Date.now() - t0,
    log,
  };
  writeBatch.push(insertStmt.bind(`${snapPrefix}__meta`, JSON.stringify(meta)));
  writeBatch.push(insertStmt.bind(`${snapPrefix}__manifest`, JSON.stringify(manifest)));

  // Ejecutar en batches de 50
  for (let i = 0; i < writeBatch.length; i += 50) {
    await env.DB.batch(writeBatch.slice(i, i + 50));
  }
  log.push(`escritas ${writeBatch.length} claves del snapshot`);

  // Rotación ya se hizo al inicio (ver FIX 2026-06-15 arriba).
  return { ok: true, snapshotKey: snapPrefix, manifest, log };
}
