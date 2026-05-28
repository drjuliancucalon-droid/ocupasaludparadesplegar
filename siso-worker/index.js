// SISO API Worker — Cloudflare D1 backend
// Reemplaza Supabase siso_store como almacenamiento en nube

const ALLOWED_ORIGIN = "https://ocupasaludparadesplegar.pages.dev";

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN || (origin && origin.endsWith(".ocupasaludparadesplegar.pages.dev"));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Siso-Token",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
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

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ── GET /store/:key ──────────────────────────────────────────────
      if (request.method === "GET" && path.startsWith("/store/") && !path.startsWith("/store/prefix/")) {
        const key = decodeURIComponent(path.slice(7));
        const row = await env.DB.prepare("SELECT value FROM siso_store WHERE key = ?").bind(key).first();
        if (!row) return new Response(JSON.stringify([]), { headers });
        const value = JSON.parse(row.value);
        return new Response(JSON.stringify([{ key, value }]), { headers });
      }

      // ── GET /store/prefix/:prefix — buscar por prefijo ───────────────
      if (request.method === "GET" && path.startsWith("/store/prefix/")) {
        const prefix = decodeURIComponent(path.slice(14));
        const rows = await env.DB.prepare(
          "SELECT key, value FROM siso_store WHERE key LIKE ? LIMIT 2000"
        ).bind(prefix + "%").all();
        const result = (rows.results || []).map(r => ({ key: r.key, value: JSON.parse(r.value) }));
        return new Response(JSON.stringify(result), { headers });
      }

      // ── GET /store — listar todas las claves ─────────────────────────
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
          value: JSON.parse(r.value),
          updated_at: r.updated_at,
        }));
        return new Response(JSON.stringify(result), { headers });
      }

      // ── POST /store — upsert uno o varios {key, value} ───────────────
      if (request.method === "POST" && path === "/store") {
        const body = await request.json();
        const rows = Array.isArray(body) ? body : [body];
        const stmt = env.DB.prepare(
          "INSERT INTO siso_store(key, value, updated_at) VALUES(?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
        );
        // Batch en chunks de 50
        const CHUNK = 50;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          const batch = chunk.map(({ key, value }) => stmt.bind(key, JSON.stringify(value)));
          await env.DB.batch(batch);
        }
        return new Response(JSON.stringify({ ok: true, count: rows.length }), { headers });
      }

      // ── DELETE /store/:key ───────────────────────────────────────────
      if (request.method === "DELETE" && path.startsWith("/store/")) {
        const key = decodeURIComponent(path.slice(7));
        await env.DB.prepare("DELETE FROM siso_store WHERE key = ?").bind(key).run();
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
  },
};
