#!/usr/bin/env node
/**
 * sync-portal-safe.mjs — Sincronización SEGURA y DEDICADA del portal empresas
 *
 * Compara TODAS las claves del portal entre D1 y Supabase:
 *   - siso_portal_empresa_docs_<nit>       (códigos de acceso + periodos publicados)
 *   - siso_portal_empresa_<nit>            (índice de documentos cerrados)
 *   - siso_portal_empresa_atenciones_<nit> (atenciones agrupadas multi-fecha)
 *   - siso_portal_doc_<cedula>             (certificado por cédula)
 *   - siso_portal_CV-* / siso_portal_SISO-* (certificados por código)
 *
 * REGLA DE GANADOR:
 *   - Si ambas tienen `updatedAt`, gana la más reciente.
 *   - Si solo una tiene `updatedAt`, esa gana (la otra es legacy sin marca).
 *   - Para `siso_portal_empresa_docs_*`: HACE MERGE de los `periodos[]` por
 *     periodo+tipo, para que NUNCA se pierda una publicación.
 *
 * USO:
 *   node scripts/sync-portal-safe.mjs                → dry-run (lectura)
 *   node scripts/sync-portal-safe.mjs --apply        → aplicar cambios
 *   node scripts/sync-portal-safe.mjs --only-empresa → solo claves docs_
 *   node scripts/sync-portal-safe.mjs --verbose      → detalle por clave
 *
 * Snapshot pre-sincronización automático antes del --apply.
 */

import { createHash } from "crypto";

const WORKER_URL   = process.env.WORKER_URL   || "https://siso-api.dr-juliancucalon.workers.dev";
const WORKER_TOKEN = process.env.WORKER_TOKEN || "gRxbhIfKs9ur86PDXZH7qdwjvnpQUOM2";
const SB_URL       = process.env.SB_URL       || "https://morlvrofvzrlekkqxglc.supabase.co";
const SB_KEY       = process.env.SB_KEY       || "sb_publishable_ZFMNDq1HMsBqrvhtREydiA_AT4lKyg_";

const args = process.argv.slice(2);
const APPLY        = args.includes("--apply");
const ONLY_EMPRESA = args.includes("--only-empresa");
const VERBOSE      = args.includes("--verbose");

const hash = (v) => createHash("md5").update(JSON.stringify(v)).digest("hex").slice(0, 8);
const kb   = (v) => { const b = JSON.stringify(v).length; return b < 1024 ? `${b}B` : `${(b/1024).toFixed(1)}KB`; };
const tsOf = (val) => {
  if (!val || typeof val !== "object") return "";
  return val.updatedAt || val.updated_at || val.ts || "";
};
const portalPrefixes = ONLY_EMPRESA
  ? ["siso_portal_empresa_docs_"]
  : ["siso_portal_empresa_docs_", "siso_portal_empresa_", "siso_portal_doc_", "siso_portal_CV-", "siso_portal_SISO-"];

const isPortalKey = (k) => portalPrefixes.some(p => k.startsWith(p));

// ─── Lectura D1 ─────────────────────────────────────────────────────────────
async function fetchD1All() {
  process.stdout.write("📡 D1 portal keys… ");
  const out = [];
  for (const prefix of portalPrefixes) {
    try {
      const r = await fetch(`${WORKER_URL}/store/prefix/${encodeURIComponent(prefix)}`, {
        headers: { "X-Siso-Token": WORKER_TOKEN },
      });
      if (!r.ok) continue;
      const rows = await r.json();
      out.push(...rows);
    } catch (e) { console.log(`(prefix ${prefix} falló: ${e.message})`); }
  }
  console.log(`${out.length} registros`);
  return out;
}

// ─── Lectura Supabase ───────────────────────────────────────────────────────
async function fetchSBAll() {
  process.stdout.write("📡 Supabase portal keys… ");
  const out = [];
  for (const prefix of portalPrefixes) {
    const PAGE = 1000;
    let offset = 0;
    while (true) {
      try {
        const url = `${SB_URL}/rest/v1/siso_store?select=key,value,updated_at&key=like.${encodeURIComponent(prefix)}*&limit=${PAGE}&offset=${offset}`;
        const r = await fetch(url, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
        if (!r.ok) {
          const err = await r.text();
          console.log(`\n   ⛔ ${prefix} → ${r.status}: ${err.slice(0, 100)}`);
          break;
        }
        const rows = await r.json();
        for (const row of rows) {
          // Supabase devuelve `value` como objeto o string JSON dependiendo de la columna
          const v = typeof row.value === "string" ? (() => { try { return JSON.parse(row.value); } catch { return row.value; } })() : row.value;
          out.push({ key: row.key, value: v, updated_at: row.updated_at });
        }
        if (rows.length < PAGE) break;
        offset += PAGE;
      } catch (e) { console.log(`\n   ⛔ ${prefix} excepción: ${e.message}`); break; }
    }
  }
  console.log(`${out.length} registros`);
  return out;
}

// ─── Merge inteligente de siso_portal_empresa_docs_<nit> ────────────────────
// Combina periodos[] por (periodo+fecha), prefiriendo la versión con
// updatedAt más reciente cuando el mismo periodo existe en ambas.
function mergePortalDocs(a, b) {
  // a y b son objetos { nit, nombre, codigoAcceso, periodos[], updatedAt }
  const result = {
    nit: a?.nit || b?.nit,
    nombre: a?.nombre || b?.nombre,
    codigoAcceso: a?.codigoAcceso || b?.codigoAcceso,
    periodos: [],
    updatedAt: new Date().toISOString(),
    _mergedFrom: "d1+supabase",
  };
  const all = [...(a?.periodos || []), ...(b?.periodos || [])];
  const byKey = new Map();
  for (const p of all) {
    const k = (p.periodo || "") + "|" + (p.fecha || "").slice(0, 7);
    const existing = byKey.get(k);
    if (!existing) { byKey.set(k, p); continue; }
    // Conservar el periodo con cualquier propiedad presente — merge campos
    const merged = { ...existing };
    for (const field of ["informe", "custodia", "cuenta", "certificados"]) {
      const eVal = existing[field], pVal = p[field];
      if (!eVal && pVal) merged[field] = pVal;
      else if (eVal && pVal) {
        // Conservar el más reciente
        const eTs = tsOf(eVal) || existing.updatedAt || "";
        const pTs = tsOf(pVal) || p.updatedAt || "";
        merged[field] = pTs > eTs ? pVal : eVal;
      }
    }
    merged.updatedAt = (existing.updatedAt || "") > (p.updatedAt || "") ? existing.updatedAt : p.updatedAt;
    byKey.set(k, merged);
  }
  result.periodos = [...byKey.values()].sort((x, y) => (y.fecha || "").localeCompare(x.fecha || ""));
  return result;
}

// ─── Escribir a D1 con auto-chunking transparente ───────────────────────────
async function writeD1(key, value) {
  const r = await fetch(`${WORKER_URL}/store`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Siso-Token": WORKER_TOKEN },
    body: JSON.stringify({ key, value }),
  }).catch(() => ({ ok: false }));
  return r.ok;
}

// ─── Escribir a Supabase ────────────────────────────────────────────────────
async function writeSB(key, value) {
  const r = await fetch(`${SB_URL}/rest/v1/siso_store`, {
    method: "POST",
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ key, value }),
  }).catch(() => ({ ok: false }));
  return r.ok;
}

// ─── Snapshot pre-cambios ───────────────────────────────────────────────────
async function snapshotPre() {
  try {
    const r = await fetch(`${WORKER_URL}/snapshot`, {
      method: "POST",
      headers: { "X-Siso-Token": WORKER_TOKEN },
    });
    if (r.ok) {
      const d = await r.json();
      console.log(`📦 Snapshot pre-sync: ${d.snapshotKey || "(creado)"}`);
      return true;
    }
  } catch {}
  console.log("⚠️  Snapshot pre-sync falló (continúa con cuidado)");
  return false;
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────
(async () => {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  SYNC-PORTAL-SAFE — D1 ↔ Supabase con timestamps        ║");
  console.log(`║  Modo: ${APPLY ? "APPLY (escribirá cambios)" : "DRY-RUN (solo lectura)"}                ║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // 1. Snapshot defensivo si vamos a aplicar
  if (APPLY) await snapshotPre();

  // 2. Leer ambos lados
  const [d1Rows, sbRows] = await Promise.all([fetchD1All(), fetchSBAll()]);

  const d1Map = new Map(d1Rows.map(r => [r.key, r.value]));
  const sbMap = new Map(sbRows.map(r => [r.key, r.value]));

  const allKeys = new Set([...d1Map.keys(), ...sbMap.keys()].filter(isPortalKey));
  console.log(`\n📊 Total claves portal únicas: ${allKeys.size}\n`);

  const onlyD1 = [], onlySB = [], identicos = [], conflictos = [];
  for (const key of allKeys) {
    const inD1 = d1Map.has(key), inSB = sbMap.has(key);
    if (inD1 && !inSB) onlyD1.push(key);
    else if (!inD1 && inSB) onlySB.push(key);
    else if (hash(d1Map.get(key)) === hash(sbMap.get(key))) identicos.push(key);
    else conflictos.push(key);
  }

  console.log(`  ✅ Idénticas:            ${identicos.length}`);
  console.log(`  🔵 Solo D1 (subir):      ${onlyD1.length}`);
  console.log(`  🟡 Solo Supabase (bajar):${onlySB.length}`);
  console.log(`  ⚠️  Conflictos:           ${conflictos.length}\n`);

  // 3. Mostrar conflictos con resolución propuesta
  if (conflictos.length > 0) {
    console.log("⚠️  CONFLICTOS (mismo key, valor distinto):");
    console.log("─".repeat(80));
    for (const k of conflictos) {
      const vD1 = d1Map.get(k);
      const vSB = sbMap.get(k);
      const tD1 = tsOf(vD1);
      const tSB = tsOf(vSB);
      let accion;
      if (k.startsWith("siso_portal_empresa_docs_")) {
        accion = "MERGE-PERIODOS";
      } else if (tD1 && tSB) {
        accion = tD1 >= tSB ? "USA-D1 (más reciente)" : "USA-SB (más reciente)";
      } else if (tD1) {
        accion = "USA-D1 (solo D1 tiene timestamp)";
      } else if (tSB) {
        accion = "USA-SB (solo SB tiene timestamp)";
      } else {
        accion = "USA-D1 (ninguno tiene timestamp, D1 por defecto)";
      }
      console.log(`  ${k}`);
      console.log(`    D1: ${kb(vD1)} ts:${tD1 || "-"}`);
      console.log(`    SB: ${kb(vSB)} ts:${tSB || "-"}`);
      console.log(`    → ${accion}`);
    }
    console.log();
  }

  if (VERBOSE && onlyD1.length > 0) {
    console.log("🔵 SOLO EN D1:");
    for (const k of onlyD1) console.log(`  + ${k} [${kb(d1Map.get(k))}]`);
    console.log();
  }
  if (VERBOSE && onlySB.length > 0) {
    console.log("🟡 SOLO EN SUPABASE:");
    for (const k of onlySB) console.log(`  + ${k} [${kb(sbMap.get(k))}]`);
    console.log();
  }

  if (!APPLY) {
    console.log("ℹ️  Dry-run completo. Ejecuta con --apply para aplicar cambios.\n");
    return;
  }

  // 4. APLICAR cambios
  let resultsToSB = { ok: 0, fail: 0 };
  let resultsToD1 = { ok: 0, fail: 0 };

  // Conflictos primero (con merge o ganador por timestamp)
  for (const k of conflictos) {
    const vD1 = d1Map.get(k), vSB = sbMap.get(k);
    let finalVal, sendBoth = true;
    if (k.startsWith("siso_portal_empresa_docs_")) {
      finalVal = mergePortalDocs(vD1, vSB);
    } else {
      const tD1 = tsOf(vD1), tSB = tsOf(vSB);
      finalVal = (tD1 >= tSB) ? vD1 : vSB;
    }
    if (sendBoth) {
      if (await writeD1(k, finalVal)) resultsToD1.ok++; else resultsToD1.fail++;
      if (await writeSB(k, finalVal)) resultsToSB.ok++; else resultsToSB.fail++;
    }
  }

  // Subir a SB lo que solo está en D1
  for (const k of onlyD1) {
    if (await writeSB(k, d1Map.get(k))) resultsToSB.ok++; else resultsToSB.fail++;
  }
  // Bajar a D1 lo que solo está en SB
  for (const k of onlySB) {
    if (await writeD1(k, sbMap.get(k))) resultsToD1.ok++; else resultsToD1.fail++;
  }

  console.log("\n✅ APLICACIÓN COMPLETADA");
  console.log(`   ⬆️  Hacia Supabase: ✓${resultsToSB.ok} ✗${resultsToSB.fail}`);
  console.log(`   ⬇️  Hacia D1:       ✓${resultsToD1.ok} ✗${resultsToD1.fail}`);
  console.log("\n💡 Recomendación: re-ejecuta sin --apply para verificar.\n");
})();
