// RECUPERACIÓN: re-inyectar _firma y _doctorData en los certificados del portal
// que se subieron sin firma entre marzo y mayo 2026.
//
// Política NO destructiva: solo SET _firma y _doctorData; conserva todo lo demás.

const WORKER_URL = "https://siso-api.dr-juliancucalon.workers.dev";
const WORKER_TOKEN = "gRxbhIfKs9ur86PDXZH7qdwjvnpQUOM2";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function d1Get(k, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${WORKER_URL}/store/${encodeURIComponent(k)}`, {
        headers: { "X-Siso-Token": WORKER_TOKEN },
      });
      if (!r.ok) { await sleep(1500); continue; }
      const t = await r.text();
      if (t.startsWith("<")) { await sleep(1500); continue; }
      const d = JSON.parse(t);
      return d[0]?.value ?? null;
    } catch { await sleep(1500); }
  }
  return null;
}

async function d1Prefix(prefix) {
  const r = await fetch(`${WORKER_URL}/store/prefix/${encodeURIComponent(prefix)}`, {
    headers: { "X-Siso-Token": WORKER_TOKEN },
  });
  return r.json();
}

async function d1Set(k, v, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${WORKER_URL}/store`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Siso-Token": WORKER_TOKEN,
        },
        body: JSON.stringify({ key: k, value: v }),
      });
      if (r.ok) return true;
      await sleep(2000);
    } catch { await sleep(2000); }
  }
  return false;
}

console.log("\n████ RECUPERACIÓN DE FIRMA EN CERTIFICADOS PORTAL ████\n");

// 1. Leer firma + doctor_data
const firma = await d1Get("siso_doctor_signature");
const doc = await d1Get("siso_doctor_data_drcucalon");

if (!firma || firma.length < 100) {
  console.log("❌ Firma no encontrada en D1. Abortando.");
  process.exit(1);
}
if (!doc) {
  console.log("❌ doctor_data no encontrada. Abortando.");
  process.exit(1);
}
console.log(`✅ Firma: ${firma.length} bytes`);
console.log(`✅ Doctor: ${doc.nombre} · Lic ${doc.licencia}`);

const doctorData = {
  nombre: doc.nombre || "MÉDICO OCUPACIONAL",
  titulo: doc.titulo || "Médico Especialista en Salud Ocupacional",
  licencia: doc.licencia || "--",
  ciudad: doc.ciudad || "Popayán",
  email: doc.email || "",
  cel: doc.celular || doc.telefono || "",
  celular: doc.celular || doc.telefono || "",
};

// 2. Listar TODOS los documentos del portal en los 4 prefijos
const PREFIXES = [
  "siso_portal_doc_",
  "siso_portal_SISO",
  "siso_portal_CV",
  "siso_hc_completa_",
];
console.log("\n📡 Cargando documentos del portal...");
const all = [];
for (const p of PREFIXES) {
  const rows = await d1Prefix(p);
  console.log(`   ${p}*: ${rows.length} documentos`);
  for (const r of rows) all.push(r);
}
console.log(`   TOTAL: ${all.length} documentos`);

// 3. Filtrar los que NO tienen firma
const sinFirma = all.filter((r) => {
  const v = r.value;
  if (!v || typeof v !== "object") return false;
  const f = v._firma || "";
  return !f || f.length < 100;
});
const conFirma = all.length - sinFirma.length;
console.log(`   ✅ Con firma:  ${conFirma}`);
console.log(`   ⚠️  Sin firma: ${sinFirma.length}`);

if (sinFirma.length === 0) {
  console.log("\n🎉 Nada que recuperar. Todos los documentos ya tienen firma.\n");
  process.exit(0);
}

// 4. Actualizar cada uno
console.log(`\n🔧 Inyectando firma+doctorData en ${sinFirma.length} certificados...\n`);
let ok = 0, fail = 0;
for (let i = 0; i < sinFirma.length; i++) {
  const row = sinFirma[i];
  const v = row.value;
  const updated = {
    ...v,
    _firma: firma,
    _doctorData: { ...(v._doctorData || {}), ...doctorData },
    medicoNombre: v.medicoNombre || doctorData.nombre,
    _firmaRecuperadaEn: new Date().toISOString(),
  };
  const success = await d1Set(row.key, updated);
  if (success) {
    ok++;
    if ((i + 1) % 20 === 0 || i === sinFirma.length - 1) {
      console.log(`   [${i + 1}/${sinFirma.length}] ✅ ${ok} actualizados, ${fail} fallos`);
    }
  } else {
    fail++;
    console.log(`   ❌ Fallo: ${row.key}`);
  }
  // throttle suave para no saturar el worker
  await sleep(60);
}

console.log("\n████ RESULTADO ████");
console.log(`  ✅ Actualizados: ${ok}`);
console.log(`  ❌ Fallos:       ${fail}`);
console.log(`  Total:           ${sinFirma.length}`);
console.log();
