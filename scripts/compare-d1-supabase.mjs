/**
 * compare-d1-supabase.mjs
 * 1. Lee TODO D1 y muestra inventario completo
 * 2. Intenta leer Supabase (puede estar restringido por cuota)
 * 3. Compara y sincroniza si se pasa el flag --sync
 */

import { createHash } from "crypto";

const WORKER_URL   = "https://siso-api.dr-juliancucalon.workers.dev";
const WORKER_TOKEN = "gRxbhIfKs9ur86PDXZH7qdwjvnpQUOM2";
const SB_URL       = "https://morlvrofvzrlekkqxglc.supabase.co";
const SB_KEY       = "sb_publishable_ZFMNDq1HMsBqrvhtREydiA_AT4lKyg_";

const args = process.argv.slice(2);
const DO_SYNC     = args.includes("--sync") || args.includes("--sync-both");
const SYNC_TO_SB  = args.includes("--to-sb") || DO_SYNC;
const SYNC_TO_D1  = args.includes("--to-d1") || DO_SYNC;

const hash = (val) => createHash("md5").update(JSON.stringify(val)).digest("hex").slice(0, 8);
const kb   = (val) => { const b = JSON.stringify(val).length; return b < 1024 ? `${b}B` : `${(b/1024).toFixed(1)}KB`; };

// ─── Fetch D1 ────────────────────────────────────────────────────────────────
async function fetchD1() {
  process.stdout.write("📡 D1 Worker... ");
  const r = await fetch(`${WORKER_URL}/store`, { headers: { "X-Siso-Token": WORKER_TOKEN } });
  if (!r.ok) throw new Error(`D1 error ${r.status}: ${await r.text()}`);
  const rows = await r.json();
  console.log(`${rows.length} registros ✅`);
  return rows;
}

// ─── Fetch Supabase paginado ──────────────────────────────────────────────────
async function fetchSB() {
  process.stdout.write("📡 Supabase... ");
  const PAGE = 1000;
  let offset = 0, all = [];
  try {
    while (true) {
      const r = await fetch(
        `${SB_URL}/rest/v1/siso_store?select=key,value,updated_at&limit=${PAGE}&offset=${offset}`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        console.log(`ERROR ${r.status} — ${err.message || "sin detalles"} ⛔`);
        return { rows: [], error: `${r.status}: ${err.message || ""}` };
      }
      const rows = await r.json();
      all.push(...rows);
      if (rows.length < PAGE) break;
      offset += PAGE;
    }
    console.log(`${all.length} registros ✅`);
    return { rows: all, error: null };
  } catch (e) {
    console.log(`EXCEPCIÓN: ${e.message} ⛔`);
    return { rows: [], error: e.message };
  }
}

// ─── Sync D1 → Supabase ───────────────────────────────────────────────────────
async function pushToSB(rows) {
  const CHUNK = 50;
  let ok = 0, fail = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map(({ key, value }) => ({ key, value }));
    const r = await fetch(`${SB_URL}/rest/v1/siso_store`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(chunk),
    }).catch(() => ({ ok: false }));
    if (r.ok) ok += chunk.length; else fail += chunk.length;
    process.stdout.write(`\r   Supabase: ${ok + fail}/${rows.length} (✅${ok} ✗${fail})`);
  }
  console.log();
  return { ok, fail };
}

// ─── Sync Supabase → D1 ───────────────────────────────────────────────────────
async function pushToD1(rows) {
  const CHUNK = 50;
  let ok = 0, fail = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map(({ key, value }) => ({
      key,
      value: typeof value === "string" ? (() => { try { return JSON.parse(value); } catch { return value; } })() : value,
    }));
    const r = await fetch(`${WORKER_URL}/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Siso-Token": WORKER_TOKEN },
      body: JSON.stringify(chunk),
    }).catch(() => ({ ok: false }));
    if (r.ok) ok += chunk.length; else fail += chunk.length;
    process.stdout.write(`\r   D1: ${ok + fail}/${rows.length} (✅${ok} ✗${fail})`);
  }
  console.log();
  return { ok, fail };
}

// ─── Clasificar claves por tipo ───────────────────────────────────────────────
function classify(key) {
  if (key.startsWith("siso_patients_") || key.startsWith("siso_db_patients_")) return "👤 Pacientes";
  if (key.startsWith("siso_companies_"))      return "🏢 Empresas";
  if (key.startsWith("siso_portal_empresa_")) return "🏛️  Portal empresa";
  if (key.startsWith("siso_portal_doc_"))     return "📄 Portal docs";
  if (key.startsWith("siso_saved_bills"))     return "💰 Facturas";
  if (key.startsWith("siso_caja_"))           return "💵 Caja";
  if (key.startsWith("siso_informes_") || key.startsWith("siso_saved_reports")) return "📊 Informes";
  if (key.startsWith("siso_encuesta"))        return "📋 Encuestas";
  if (key.startsWith("siso_users"))           return "👥 Usuarios";
  if (key.startsWith("siso_permisos_"))       return "🔐 Permisos";
  if (key.startsWith("siso_atenciones_"))     return "📅 Atenciones";
  if (key.startsWith("siso_cartas_"))         return "📁 Custodia";
  if (key.startsWith("siso_raw_"))            return "🔬 Estudios raw";
  if (key.startsWith("siso_audit_"))          return "🗒️  Auditoría";
  if (key.startsWith("adj_") || key.startsWith("siso_adj")) return "📎 Adjuntos";
  return "⚙️  Otros";
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   SISO — Comparación & Sincronización D1 ↔ Supabase     ║");
  console.log(`║   ${new Date().toLocaleString("es-CO").padEnd(54)}║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const [d1Rows, { rows: sbRows, error: sbError }] = await Promise.all([fetchD1(), fetchSB()]);

  // ─── INVENTARIO D1 ──────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}`);
  console.log("  📦 INVENTARIO D1 — Agrupado por tipo");
  console.log(`${"─".repeat(60)}`);

  const d1Map  = new Map(d1Rows.map(r => [r.key, r.value]));
  const byType = {};
  let d1TotalBytes = 0;
  for (const row of d1Rows) {
    const cat = classify(row.key);
    if (!byType[cat]) byType[cat] = [];
    byType[cat].push(row.key);
    d1TotalBytes += JSON.stringify(row.value).length;
  }
  for (const [cat, keys] of Object.entries(byType).sort()) {
    console.log(`  ${cat.padEnd(22)} ${keys.length.toString().padStart(4)} claves`);
  }
  console.log(`${"─".repeat(60)}`);
  console.log(`  TOTAL D1: ${d1Rows.length} claves | ${(d1TotalBytes / 1024).toFixed(1)} KB`);

  // ─── ESTADO SUPABASE ────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}`);
  if (sbError) {
    console.log("  ⛔ SUPABASE INACCESIBLE");
    if (sbError.includes("exceed_egress_quota")) {
      console.log("  Causa: Cuota de egreso (transferencia) AGOTADA");
      console.log("  Plan free: 5 GB/mes de egreso. Se ha superado el límite.");
      console.log("  Solución: Upgrade a Supabase Pro ($25/mes) ó esperar reset.");
      console.log("  → D1 es ahora el ÚNICO backend operativo ✅");
    } else {
      console.log(`  Error: ${sbError}`);
    }
    console.log(`${"─".repeat(60)}`);

    if (SYNC_TO_SB) {
      console.log("\n⬆️  Intentando escribir D1 → Supabase de todos modos...");
      console.log("   (Escrituras pueden funcionar aunque lecturas fallen)\n");
      const res = await pushToSB(d1Rows);
      if (res.fail === 0) {
        console.log(`\n✅ ${res.ok} registros escritos en Supabase exitosamente`);
      } else {
        console.log(`\n⚠️  OK: ${res.ok}  ✗ FAIL: ${res.fail}`);
        console.log("   Supabase también bloqueó las escrituras por cuota.");
      }
    } else {
      console.log("\n💡 Para intentar sincronizar D1 → Supabase de todos modos:");
      console.log("   node scripts/compare-d1-supabase.mjs --to-sb");
    }

    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║  RESUMEN DE SITUACIÓN                                    ║");
    console.log(`║  D1 operativo:    ${d1Rows.length} registros (${(d1TotalBytes/1024).toFixed(0)} KB)`.padEnd(59) + "║");
    console.log("║  Supabase:        BLOQUEADO (cuota egreso agotada)       ║");
    console.log("║  App funcionando: SÍ (D1 como backend primario)          ║");
    console.log("║  Acción requerida: Upgrade Supabase o esperar reset      ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");
    return;
  }

  // ─── COMPARACIÓN COMPLETA ───────────────────────────────────────────────────
  const sbMap = new Map(sbRows.map(r => [
    r.key,
    typeof r.value === "string" ? (() => { try { return JSON.parse(r.value); } catch { return r.value; } })() : r.value,
  ]));

  const allKeys   = new Set([...d1Map.keys(), ...sbMap.keys()]);
  const onlyD1    = [], onlySb = [], different = [], same = [];

  for (const key of allKeys) {
    const inD1 = d1Map.has(key), inSb = sbMap.has(key);
    if (inD1 && !inSb)  { onlyD1.push(key);    continue; }
    if (!inD1 && inSb)  { onlySb.push(key);    continue; }
    hash(d1Map.get(key)) === hash(sbMap.get(key)) ? same.push(key) : different.push(key);
  }

  console.log("  📊 COMPARACIÓN DETALLADA");
  console.log(`${"─".repeat(60)}`);
  console.log(`  Total claves únicas : ${allKeys.size}`);
  console.log(`  ✅ Idénticas        : ${same.length}`);
  console.log(`  🔵 Solo en D1       : ${onlyD1.length}`);
  console.log(`  🟡 Solo en Supabase : ${onlySb.length}`);
  console.log(`  🔴 Valores distintos: ${different.length}`);
  console.log(`${"─".repeat(60)}\n`);

  if (onlyD1.length > 0) {
    console.log(`🔵 SOLO EN D1 (${onlyD1.length}) — Faltan en Supabase:`);
    for (const k of onlyD1) console.log(`   + ${k}  [${kb(d1Map.get(k))}]`);
    console.log();
  }
  if (onlySb.length > 0) {
    console.log(`🟡 SOLO EN SUPABASE (${onlySb.length}) — Faltan en D1:`);
    for (const k of onlySb) console.log(`   + ${k}  [${kb(sbMap.get(k))}]`);
    console.log();
  }
  // ─── REGLA DE GANADOR para claves PORTAL EMPRESA ──────────────────────────
  // Para claves siso_portal_empresa_docs_* y siso_portal_empresa_<nit> el
  // ganador es quien tenga updatedAt MÁS RECIENTE. Esto protege publicaciones
  // hechas hoy en D1 de ser sobreescritas por versiones antiguas de Supabase.
  const isPortalKey = (k) => k.startsWith("siso_portal_empresa_") || k.startsWith("siso_portal_doc_");
  const tsOf = (val) => {
    if (!val || typeof val !== "object") return "";
    return val.updatedAt || val.updated_at || val.ts || "";
  };
  const portalWinner = new Map(); // key → "d1" | "sb"
  for (const k of different) {
    if (isPortalKey(k)) {
      const tD1 = tsOf(d1Map.get(k));
      const tSb = tsOf(sbMap.get(k));
      // Si ambos tienen timestamp, gana el más reciente. Si solo D1 lo tiene
      // (porque Supabase es legacy sin timestamp), gana D1. Si solo Sb lo tiene
      // (porque D1 importó antes que se publicara), gana Sb.
      const ganador = tD1 >= tSb ? "d1" : "sb";
      portalWinner.set(k, ganador);
    }
  }

  if (different.length > 0) {
    console.log(`🔴 DISTINTOS (${different.length}):`);
    for (const k of different) {
      const vD1 = d1Map.get(k), vSb = sbMap.get(k);
      const tag = portalWinner.has(k) ? ` [portal-protect: gana ${portalWinner.get(k).toUpperCase()}]` : "";
      console.log(`   ≠ ${k}${tag}`);
      console.log(`     D1: ${kb(vD1)} hash:${hash(vD1)} ts:${tsOf(vD1)||"-"}`);
      console.log(`     SB: ${kb(vSb)} hash:${hash(vSb)} ts:${tsOf(vSb)||"-"}`);
    }
    console.log();
  }

  if (same.length === allKeys.size) {
    console.log("🎉 D1 y Supabase están 100% SINCRONIZADOS. Sin diferencias.\n");
    return;
  }

  // ─── SINCRONIZACIÓN ─────────────────────────────────────────────────────────
  if (SYNC_TO_SB) {
    // D1 → Supabase: claves SOLO en D1 + claves diferentes donde D1 debe ganar
    const toSB = [
      ...onlyD1.map(k => ({ key: k, value: d1Map.get(k) })),
      ...different
        .filter(k => !portalWinner.has(k) || portalWinner.get(k) === "d1")
        .map(k => ({ key: k, value: d1Map.get(k) })),
    ];
    console.log(`\n⬆️  Sincronizando D1 → Supabase (${toSB.length} registros)...`);
    const res = await pushToSB(toSB);
    console.log(`   Resultado: ✅ ${res.ok}  ✗ ${res.fail}`);
  }

  if (SYNC_TO_D1) {
    // Supabase → D1: claves SOLO en SB + claves portal donde SB gana por timestamp más reciente
    const toD1 = [
      ...onlySb.map(k => ({ key: k, value: sbMap.get(k) })),
      ...different
        .filter(k => portalWinner.get(k) === "sb")
        .map(k => ({ key: k, value: sbMap.get(k) })),
    ];
    if (toD1.length > 0) {
      console.log(`\n⬇️  Sincronizando Supabase → D1 (${toD1.length} registros)...`);
      const res = await pushToD1(toD1);
      console.log(`   Resultado: ✅ ${res.ok}  ✗ ${res.fail}`);
    }
  }

  if (!SYNC_TO_SB && !SYNC_TO_D1) {
    const total = onlyD1.length + onlySb.length + different.length;
    console.log(`💡 Hay ${total} diferencias. Opciones de sincronización:`);
    console.log("   --to-sb     → D1 → Supabase (actualizar SB con datos D1)");
    console.log("   --to-d1     → Supabase → D1 (copiar claves que faltan en D1)");
    console.log("   --sync-both → Bidireccional completo (recomendado)\n");
  }
})();
