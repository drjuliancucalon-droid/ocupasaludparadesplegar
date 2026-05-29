#!/usr/bin/env node
/**
 * export-safe.mjs — Exporta el D1 completo en formato PORTABLE (sin chunks).
 *
 * Reconstruye automáticamente cualquier clave chunked (__c0..cN + __meta) en su
 * valor original, validando hash si meta.hash está presente. El JSON resultante
 * puede importarse a cualquier base de datos (Supabase, MongoDB, PostgreSQL,
 * filesystem, etc.) sin conocer la lógica interna del chunking.
 *
 * USO:
 *   node scripts/export-safe.mjs                        → escribe backup-YYYY-MM-DD.json
 *   node scripts/export-safe.mjs --out=mi-backup.json   → archivo específico
 *   node scripts/export-safe.mjs --skip-legacy          → omitir siso_legacy_*
 *   node scripts/export-safe.mjs --skip-snapshot        → omitir siso_snapshot_*
 *   node scripts/export-safe.mjs --verify-only          → solo valida integridad
 *
 * El archivo de salida tiene esta estructura:
 *   {
 *     version: "siso-export-v1",
 *     createdAt: ISO,
 *     workerUrl: "...",
 *     totalKeys: 1218,
 *     totalBytes: 12345678,
 *     hashIntegrityOk: 1042,
 *     hashIntegrityFail: 0,
 *     missingChunks: [],
 *     data: { "siso_db_patients_drcucalon": [...], ... }
 *   }
 */
import { createHash } from "crypto";
import { writeFileSync } from "fs";

const WORKER = process.env.WORKER_URL || "https://siso-api.dr-juliancucalon.workers.dev";
const TOKEN  = process.env.WORKER_TOKEN || "gRxbhIfKs9ur86PDXZH7qdwjvnpQUOM2";

const args = process.argv.slice(2);
const skipLegacy   = args.includes("--skip-legacy");
const skipSnapshot = args.includes("--skip-snapshot");
const verifyOnly   = args.includes("--verify-only");
const outArg = args.find(a => a.startsWith("--out=")) || "";
const outFile = outArg ? outArg.slice(6) : `backup-${new Date().toISOString().slice(0,10)}.json`;

// Mismo algoritmo hash que App.jsx — para validar meta.hash si existe
const hash64 = (s) => {
  let h1 = 0, h2 = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = ((h1 << 5) - h1 + c) | 0;
    h2 = ((h2 << 7) - h2 + c * 31) | 0;
  }
  return ((h1 >>> 0).toString(16) + "_" + (h2 >>> 0).toString(16));
};
const md5 = (s) => createHash("md5").update(s).digest("hex");

async function listAll() {
  const r = await fetch(`${WORKER}/store`, { headers: { "X-Siso-Token": TOKEN } });
  if (!r.ok) throw new Error(`LIST falló: HTTP ${r.status}`);
  return r.json();
}

async function getKey(key) {
  const r = await fetch(`${WORKER}/store/${encodeURIComponent(key)}`, { headers: { "X-Siso-Token": TOKEN } });
  if (!r.ok) return null;
  const d = await r.json();
  return d[0]?.value ?? null;
}

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║  EXPORT-SAFE — backup portable del D1 (sin chunks raw)     ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

const startTs = Date.now();
console.log("📡 Listando todas las claves...");
const rows = await listAll();
console.log(`   ${rows.length} claves totales\n`);

// Indexar
const directRows = [];
const metaRows = [];
const chunkRows = new Map();  // baseKey → { idx → string }
const chunkRe = /__c(\d+)$/;

for (const row of rows) {
  if (row.key.endsWith("__meta")) {
    metaRows.push(row);
  } else {
    const m = chunkRe.exec(row.key);
    if (m) {
      const base = row.key.slice(0, -m[0].length);
      if (!chunkRows.has(base)) chunkRows.set(base, {});
      chunkRows.get(base)[Number(m[1])] = row.value;
    } else {
      directRows.push(row);
    }
  }
}

console.log("📊 Inventario:");
console.log(`   ${directRows.length} claves directas`);
console.log(`   ${metaRows.length} sentinels chunked`);
console.log(`   ${chunkRows.size} grupos de chunks\n`);

// Reconstruir claves chunked
console.log("🔧 Reconstruyendo claves chunked...");
const reconstructed = {};
const issues = { missing: [], hashFail: [], parseFail: [], hashOk: 0 };

for (const metaRow of metaRows) {
  const baseKey = metaRow.key.slice(0, -6);
  // Filtrado por flags
  if (skipLegacy && baseKey.startsWith("siso_legacy_")) continue;
  if (skipSnapshot && baseKey.startsWith("siso_snapshot_")) continue;

  const meta = metaRow.value;
  if (!meta || !meta.chunked || !Number.isFinite(meta.count)) {
    console.warn(`   ⚠️  meta inválida para ${baseKey}, ignorando`);
    continue;
  }
  const bag = chunkRows.get(baseKey) || {};
  const parts = [];
  let allOk = true;
  for (let i = 0; i < meta.count; i++) {
    if (typeof bag[i] !== "string") {
      console.warn(`   ❌ chunk ${i}/${meta.count} faltante para ${baseKey}`);
      issues.missing.push(`${baseKey}__c${i}`);
      allOk = false;
      break;
    }
    parts.push(bag[i]);
  }
  if (!allOk) continue;
  const joined = parts.join("");

  // Validación de hash (si meta.hash existe)
  if (meta.hash) {
    const actual = hash64(joined);
    if (actual !== meta.hash) {
      console.warn(`   ❌ HASH MISMATCH ${baseKey} — esperado ${meta.hash}, actual ${actual}`);
      issues.hashFail.push(baseKey);
      continue;
    }
    issues.hashOk++;
  }

  try {
    const parsed = JSON.parse(joined);
    reconstructed[baseKey] = parsed;
    chunkRows.delete(baseKey);  // consumido
  } catch (e) {
    console.warn(`   ❌ JSON.parse falló para ${baseKey}: ${e.message}`);
    issues.parseFail.push(baseKey);
  }
}

// Agregar claves directas (no-chunked, no son piezas de algún chunked)
for (const row of directRows) {
  if (skipLegacy && row.key.startsWith("siso_legacy_")) continue;
  if (skipSnapshot && row.key.startsWith("siso_snapshot_")) continue;
  reconstructed[row.key] = row.value;
}

// Detectar chunks huérfanos (sin meta)
const orphans = [...chunkRows.keys()];
if (orphans.length > 0) {
  console.warn(`\n⚠️  Chunks huérfanos detectados (sin meta — datos posiblemente inrecuperables):`);
  orphans.forEach(k => console.warn(`   ${k}__c*`));
}

const totalBytes = JSON.stringify(reconstructed).length;
console.log(`\n✅ Reconstrucción completa:`);
console.log(`   Claves exportables : ${Object.keys(reconstructed).length}`);
console.log(`   Tamaño JSON        : ${(totalBytes/1024/1024).toFixed(2)} MB`);
console.log(`   Hashes validados OK: ${issues.hashOk}`);
console.log(`   Hash mismatches    : ${issues.hashFail.length}`);
console.log(`   Chunks faltantes   : ${issues.missing.length}`);
console.log(`   Parse failures     : ${issues.parseFail.length}`);

if (verifyOnly) {
  console.log(`\n🔍 --verify-only: NO se escribe archivo.`);
  if (issues.hashFail.length || issues.missing.length || issues.parseFail.length) {
    console.log(`\n⚠️  Hay ${issues.hashFail.length + issues.missing.length + issues.parseFail.length} problemas de integridad.`);
    process.exit(1);
  }
  console.log(`\n✅ Integridad 100% OK — todos los datos son recuperables.`);
  process.exit(0);
}

const output = {
  version: "siso-export-v1",
  createdAt: new Date().toISOString(),
  workerUrl: WORKER,
  totalKeys: Object.keys(reconstructed).length,
  totalBytes,
  hashIntegrityOk: issues.hashOk,
  hashIntegrityFail: issues.hashFail,
  missingChunks: issues.missing,
  parseFailures: issues.parseFail,
  orphanChunks: orphans,
  data: reconstructed,
};

const json = JSON.stringify(output, null, 2);
writeFileSync(outFile, json, "utf-8");
const fileSizeMB = (json.length/1024/1024).toFixed(2);
const fileMd5 = md5(json);
const tookMs = Date.now() - startTs;

console.log(`\n💾 Archivo escrito: ${outFile}`);
console.log(`   Tamaño  : ${fileSizeMB} MB`);
console.log(`   MD5     : ${fileMd5}`);
console.log(`   Duración: ${(tookMs/1000).toFixed(1)} seg`);
console.log(`\nℹ️  Para importar a otra base de datos: cargar 'data' como key-value pairs.`);
console.log(`ℹ️  Para validar el archivo: node scripts/export-safe.mjs --verify-only`);
