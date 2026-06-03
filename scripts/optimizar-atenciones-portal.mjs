// OPTIMIZAR siso_portal_empresa_atenciones_*: mover _firma y _doctorData
// del cuerpo de cada atención al ROOT del objeto. Esto evita duplicar
// 31KB por cada paciente, reduciendo payloads de ~1.8MB a ~100KB
// y eliminando timeouts/fallos de Service Worker en el portal.
//
// Política NO destructiva:
//   - Conserva todos los campos originales por atención (excepto _firma y _doctorData)
//   - Inyecta _firma y _doctorData en el root del objeto (1 sola vez)
//   - Si una atención venía sin firma, igual el root tendrá la firma global
//   - Marcado con _optimizadoEn para trazabilidad

const WORKER_URL = "https://siso-api.dr-juliancucalon.workers.dev";
const WORKER_TOKEN = "gRxbhIfKs9ur86PDXZH7qdwjvnpQUOM2";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function d1Get(k) {
  const r = await fetch(`${WORKER_URL}/store/${encodeURIComponent(k)}`, {
    headers: { "X-Siso-Token": WORKER_TOKEN },
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d[0]?.value ?? null;
}
async function d1Prefix(prefix) {
  const r = await fetch(`${WORKER_URL}/store/prefix/${encodeURIComponent(prefix)}`, {
    headers: { "X-Siso-Token": WORKER_TOKEN },
  });
  return r.json();
}
async function d1Set(k, v) {
  const r = await fetch(`${WORKER_URL}/store`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Siso-Token": WORKER_TOKEN },
    body: JSON.stringify({ key: k, value: v }),
  });
  return r.ok;
}

console.log("\n████ OPTIMIZAR siso_portal_empresa_atenciones_* ████\n");

const firma = await d1Get("siso_doctor_signature");
const doc = await d1Get("siso_doctor_data_drcucalon");
if (!firma || firma.length < 100) { console.log("❌ Firma no encontrada"); process.exit(1); }
if (!doc) { console.log("❌ doctor_data no encontrada"); process.exit(1); }

const doctorData = {
  nombre: doc.nombre || "MÉDICO OCUPACIONAL",
  titulo: doc.titulo || "Médico Especialista en Salud Ocupacional",
  licencia: doc.licencia || "--",
  ciudad: doc.ciudad || "Popayán",
  email: doc.email || "",
  cel: doc.celular || doc.telefono || "",
  celular: doc.celular || doc.telefono || "",
};

console.log(`✅ Firma global: ${firma.length} bytes`);
console.log(`✅ Doctor: ${doc.nombre}`);

console.log("\n📡 Listando siso_portal_empresa_atenciones_*...");
const all = await d1Prefix("siso_portal_empresa_atenciones_");
console.log(`   ${all.length} archivos encontrados\n`);

let ok = 0, fail = 0, skip = 0;
let bytesAntes = 0, bytesDespues = 0;

for (let i = 0; i < all.length; i++) {
  const row = all[i];
  const v = row.value;
  if (!v || typeof v !== "object" || !Array.isArray(v.atenciones)) {
    skip++;
    continue;
  }
  const beforeBytes = JSON.stringify(v).length;
  bytesAntes += beforeBytes;

  // Limpiar _firma y _doctorData de cada atención
  const cleanAtenciones = v.atenciones.map((a) => {
    const { _firma, _doctorData, ...rest } = a || {};
    return rest;
  });

  const optimized = {
    ...v,
    atenciones: cleanAtenciones,
    // Inyectar 1 sola vez en root
    _firma: firma,
    _doctorData: doctorData,
    _optimizadoEn: new Date().toISOString(),
  };

  const afterBytes = JSON.stringify(optimized).length;
  bytesDespues += afterBytes;

  const success = await d1Set(row.key, optimized);
  if (success) {
    ok++;
    const reducPct = (((beforeBytes - afterBytes) / beforeBytes) * 100).toFixed(1);
    console.log(`  [${i + 1}/${all.length}] ✅ ${row.key.slice(-15).padEnd(15)} ${(beforeBytes / 1024).toFixed(0)}KB → ${(afterBytes / 1024).toFixed(0)}KB (-${reducPct}%)`);
  } else {
    fail++;
    console.log(`  ❌ ${row.key}`);
  }
  await sleep(80);
}

console.log("\n████ RESULTADO ████");
console.log(`  ✅ Optimizados:  ${ok}`);
console.log(`  ⏭️  Saltados:    ${skip}`);
console.log(`  ❌ Fallos:       ${fail}`);
console.log(`  📉 Bytes antes:   ${(bytesAntes / 1024 / 1024).toFixed(2)} MB`);
console.log(`  📉 Bytes después: ${(bytesDespues / 1024 / 1024).toFixed(2)} MB`);
console.log(`  📉 Ahorro:        ${(((bytesAntes - bytesDespues) / bytesAntes) * 100).toFixed(1)}%`);
console.log();
