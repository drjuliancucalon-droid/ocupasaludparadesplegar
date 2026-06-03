// MIGRAR siso_informe_stats_* de Supabase a D1
//
// Por qué: el código guardaba estadísticas de informes solo en Supabase.
// Cuando la empresa accede al portal, no puede leerlas porque el proyecto
// Supabase nuevo no tiene CORS para *.pages.dev. Resultado: APTOS=0,
// CON RESTRICCIONES=0, NO APTOS=0 aunque el médico SÍ generó el informe.
//
// Solución: copiar todos los siso_informe_stats_* a D1 (lectura desde
// Node sí funciona contra Supabase porque no hay CORS server-side).
// Adicionalmente, el fix de código garantiza que futuras escrituras
// vayan también a D1.

const SB_URL = "https://yqrrktrgoijgzccrxnpz.supabase.co";
const SB_KEY = "sb_publishable_K88qYuJ9wsWjQqnIhLVK7Q_NroFvPI7";
const WORKER_URL = "https://siso-api.dr-juliancucalon.workers.dev";
const WORKER_TOKEN = "gRxbhIfKs9ur86PDXZH7qdwjvnpQUOM2";

const sbHeaders = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };

async function sbGet(key) {
  const r = await fetch(`${SB_URL}/rest/v1/siso_store?key=eq.${encodeURIComponent(key)}&select=value`, { headers: sbHeaders });
  if (!r.ok) return null;
  const d = await r.json();
  const v = d[0]?.value;
  return typeof v === "string" ? JSON.parse(v) : v;
}

async function d1Get(key) {
  const r = await fetch(`${WORKER_URL}/store/${encodeURIComponent(key)}`, { headers: { "X-Siso-Token": WORKER_TOKEN } });
  if (!r.ok) return null;
  const d = await r.json();
  return d[0]?.value ?? null;
}

async function d1Set(key, value) {
  const r = await fetch(`${WORKER_URL}/store`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Siso-Token": WORKER_TOKEN },
    body: JSON.stringify({ key, value }),
  });
  return r.ok;
}

console.log("\n████ MIGRAR siso_informe_stats_* SB → D1 ████\n");

// 1. Listar todos los stats en Supabase
const rList = await fetch(`${SB_URL}/rest/v1/siso_store?key=like.siso_informe_stats_%25&select=key`, { headers: sbHeaders });
if (!rList.ok) {
  console.log("❌ Error listando SB:", rList.status);
  process.exit(1);
}
const keys = (await rList.json()).map((r) => r.key);
console.log(`📡 ${keys.length} stats encontradas en Supabase`);

let migrados = 0, ya = 0, fallos = 0;
for (const k of keys) {
  // Si D1 ya tiene la clave (no vacía), saltar
  const existeD1 = await d1Get(k);
  if (existeD1 && typeof existeD1 === "object") {
    ya++;
    console.log(`  ⏭️  ${k} → ya está en D1`);
    continue;
  }
  // Leer de Supabase
  const val = await sbGet(k);
  if (!val) {
    fallos++;
    console.log(`  ❌ ${k} → no se pudo leer de SB`);
    continue;
  }
  // Escribir a D1
  const ok = await d1Set(k, val);
  if (ok) {
    migrados++;
    const stats = val.stats || {};
    const total = val.total || (val.pacientes || []).length;
    console.log(`  ✅ ${k} → total=${total} stats keys=${Object.keys(stats).slice(0, 5).join(",")}`);
  } else {
    fallos++;
    console.log(`  ❌ ${k} → fallo escribir D1`);
  }
}

console.log("\n████ RESULTADO ████");
console.log(`  ✅ Migrados:    ${migrados}`);
console.log(`  ⏭️  Ya estaban: ${ya}`);
console.log(`  ❌ Fallos:      ${fallos}`);
console.log();
