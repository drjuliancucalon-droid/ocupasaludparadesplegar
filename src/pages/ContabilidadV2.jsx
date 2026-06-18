// src/pages/ContabilidadV2.jsx
// Módulo de Contabilidad V2 — cuentas de cobro con:
//   - Consecutivo único auto-incremental
//   - Estados: pendiente / pagada / vencida / anulada
//   - Tipo: bloque_periodico (informe+custodia automáticos) | individual
//   - Tarifa editable (auto-rellena desde empresa.tarifa{subtipo})
//   - Panel mensual con totales (pagado / pendiente / vencido)
//   - Pestaña Histórico (cuentas viejas de siso_saved_bills_drcucalon, read-only)
// Solo accesible al admin drcucalon.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  DollarSign, Plus, Calendar, CheckCircle2, Clock, AlertTriangle, X,
  Edit2, Trash2, FileText, Building2, Users, Search, Filter, Download,
  Loader2, ArrowLeft, ChevronDown, ChevronUp
} from "lucide-react";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmtCOP = (n) => {
  const num = Number(n) || 0;
  return "$" + num.toLocaleString("es-CO");
};
const ymLabel = (ym) => {
  if (!ym) return "Sin periodo";
  const [y, m] = ym.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
};
const yearMonth = (date) => {
  if (!date) return null;
  const m = String(date).match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const nitNorm = (n) => (n || "").toString().replace(/[^0-9]/g, "");

// Estructura inicial de billing v2
const EMPTY_BILLING = { version: "v2", consecutivo: 0, cuentas: [], historial: [] };

// Clave única para LS + D1
const BILLING_KEY = "siso_billing_v2";

// Lee desde localStorage de manera segura
const lsRead = () => {
  try {
    const raw = localStorage.getItem(BILLING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.cuentas)) return { ...EMPTY_BILLING, ...parsed };
  } catch {}
  return null;
};
// Escribe a localStorage de manera segura
const lsWrite = (data) => {
  try { localStorage.setItem(BILLING_KEY, JSON.stringify(data)); return true; } catch { return false; }
};

const SUBTIPOS = ["PERIODICO", "INGRESO", "EGRESO", "POSTINCAPACIDAD", "SEGUIMIENTO", "PARTICULAR", "OTRO"];
const SUBTIPO_TARIFA_MAP = {
  "INGRESO":       "tarifaIngreso",
  "PERIODICO":     "tarifaPeriodico",
  "EGRESO":        "tarifaEgreso",
  "PARTICULAR":    "tarifaConsulta",
  "POSTINCAPACIDAD": "tarifaConsulta",
  "SEGUIMIENTO":   "tarifaConsulta",
};

const estadoVisuales = {
  pendiente: { label: "Pendiente",  bg: "bg-amber-100",  text: "text-amber-800",  border: "border-amber-300",  icon: Clock },
  pagada:    { label: "Pagada",      bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300", icon: CheckCircle2 },
  vencida:   { label: "Vencida",    bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300",    icon: AlertTriangle },
  anulada:   { label: "Anulada",    bg: "bg-gray-100",   text: "text-gray-500",   border: "border-gray-300",   icon: X },
};

const tipoVisual = (tipo) => tipo === "bloque_periodico"
  ? { label: "Bloque periódico", color: "bg-purple-100 text-purple-800 border-purple-300" }
  : { label: "Individual",        color: "bg-blue-100 text-blue-800 border-blue-300" };

// ─── Impresión de cuenta de cobro V2 ─────────────────────────────────────
// Abre ventana con HTML imprimible — replica visual del documento V1.
function imprimirCuenta(cuenta, doctorData, firma) {
  const w = window.open("", "_blank", "width=920,height=1150");
  if (!w) { alert("Permite ventanas emergentes para imprimir."); return; }
  const dd = doctorData || {};
  const trabajadoresHtml = (cuenta.trabajadores || []).map((t, i) =>
    `<tr><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${i+1}</td>
         <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${(t.nombres || "")}</td>
         <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${(t.docNumero || "")}</td>
     </tr>`
  ).join("");
  const tienetrabajadores = (cuenta.trabajadores || []).length > 0;
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Cuenta de Cobro #${String(cuenta.consecutivo).padStart(3,"0")}</title>
<style>
  @page { size: letter portrait; margin: 14mm; }
  * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color:#111; margin:0; padding:20px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #065f46; padding-bottom:12px; margin-bottom:20px; }
  .doctor-info { font-size:9pt; line-height:1.4; }
  .titulo { text-align:center; font-size:22pt; font-weight:900; letter-spacing:-1px; margin:20px 0; text-transform:uppercase; color:#065f46; }
  .info-row { display:flex; justify-content:space-between; margin-bottom:8px; font-size:11pt; }
  .info-label { font-weight:bold; color:#374151; }
  .bloque { border:1px solid #d1d5db; border-radius:8px; padding:14px; margin:14px 0; }
  .bloque-header { background:#065f46; color:white; padding:6px 12px; font-weight:bold; text-transform:uppercase; font-size:10pt; border-radius:6px 6px 0 0; display:flex; justify-content:space-between; }
  .bloque-body { border:1px solid #065f46; border-top:none; padding:14px; border-radius:0 0 6px 6px; }
  .monto-grande { font-size:24pt; font-weight:900; text-align:right; color:#111; }
  .letras { font-style:italic; color:#6b7280; font-size:10pt; margin-top:6px; }
  .banco-box { background:#eff6ff; border:1px solid #93c5fd; border-radius:8px; padding:12px; margin:14px 0; font-size:10pt; }
  table { width:100%; border-collapse:collapse; margin:10px 0; }
  th { background:#f3f4f6; padding:6px 8px; text-align:left; font-size:10pt; border-bottom:2px solid #d1d5db; }
  .firma-zone { margin-top:50px; border-top:1px solid #374151; padding-top:8px; text-align:center; font-size:10pt; }
  .footer { margin-top:30px; padding-top:10px; border-top:1px solid #d1d5db; font-size:8pt; color:#6b7280; text-align:center; }
  .btn-print { position:fixed; top:10px; right:10px; background:#065f46; color:white; border:none; padding:10px 24px; border-radius:10px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,.2); }
  @media print { .btn-print { display:none!important; } }
</style></head><body>
<button class="btn-print" onclick="window.print()">📥 Imprimir / PDF</button>
<div class="header">
  <div>
    <p style="font-weight:900;font-size:14pt;margin:0;">${(dd.nombre || "DR. JULIAN CUCALON").toUpperCase()}</p>
    <p style="font-size:8.5pt;margin:2px 0;color:#374151;">${(dd.titulo || "MEDICO ESPECIALISTA EN SST").toUpperCase()}</p>
    <p style="font-size:8.5pt;margin:0;color:#374151;">RM: ${dd.licencia || "—"}</p>
  </div>
  <div class="doctor-info" style="text-align:right;">
    <p style="margin:0;">${(dd.ciudad || "Popayán").toUpperCase()}</p>
    <p style="margin:0;">Cel: ${dd.cel || dd.celular || "—"}</p>
    <p style="margin:0;">Email: ${(dd.email || "").toLowerCase()}</p>
  </div>
</div>

<p class="titulo">Cuenta de Cobro</p>

<div class="info-row">
  <span><span class="info-label">No.</span> ${String(cuenta.consecutivo).padStart(3,"0")}</span>
  <span><span class="info-label">Fecha:</span> ${cuenta.fechaEmision || "—"}</span>
</div>
<div class="info-row">
  <span><span class="info-label">Cliente:</span> ${cuenta.empresa?.nombre || "—"}</span>
  <span><span class="info-label">NIT/CC:</span> ${cuenta.empresa?.nit || "—"}</span>
</div>

<div class="bloque-header">
  <span>Concepto del Servicio</span>
  <span>Valor</span>
</div>
<div class="bloque-body" style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
  <div style="flex:1;">
    <p style="margin:0;font-weight:bold;line-height:1.5;">${(cuenta.concepto || "EXAMENES MEDICOS OCUPACIONALES").toUpperCase()}</p>
    ${cuenta.subtipoExamen ? `<p style="margin:4px 0 0;font-size:9pt;color:#6b7280;">Subtipo: ${cuenta.subtipoExamen}</p>` : ""}
    ${cuenta.periodo ? `<p style="margin:2px 0 0;font-size:9pt;color:#6b7280;">Periodo: ${cuenta.periodo}</p>` : ""}
    ${cuenta.cantidad > 1 ? `<p style="margin:2px 0 0;font-size:9pt;color:#6b7280;">${cuenta.cantidad} servicios × $${(cuenta.precioUnidad || 0).toLocaleString("es-CO")}</p>` : ""}
  </div>
  <div style="text-align:right;min-width:180px;">
    <p class="monto-grande">$${(cuenta.monto || 0).toLocaleString("es-CO")}</p>
    <p class="letras">Son: ${cuenta.amountWords || "—"}</p>
  </div>
</div>

${tienetrabajadores ? `
<div style="margin:20px 0;">
  <p style="font-weight:bold;font-size:10pt;color:#374151;margin-bottom:6px;">TRABAJADORES INCLUIDOS (${cuenta.trabajadores.length}):</p>
  <table>
    <thead><tr><th>#</th><th>Nombre</th><th>Documento</th></tr></thead>
    <tbody>${trabajadoresHtml}</tbody>
  </table>
</div>` : ""}

<div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
  <div class="banco-box">
    <p style="margin:0;font-weight:bold;text-transform:uppercase;color:#374151;font-size:9pt;">Información de Pago</p>
    <p style="margin:6px 0 0;"><b>${(cuenta.datosBancarios?.banco || "—").toUpperCase()}</b></p>
    <p style="margin:2px 0;">Tipo: ${cuenta.datosBancarios?.tipoCuenta || "Ahorros"}</p>
    <p style="margin:2px 0;font-family:monospace;font-size:11pt;">${cuenta.datosBancarios?.numeroCuenta || "—"}</p>
    <p style="margin:6px 0 0;font-size:9pt;">Titular: ${(dd.nombre || "—")}</p>
  </div>
  <div class="banco-box" style="background:#fef3c7;border-color:#fbbf24;">
    <p style="margin:0;font-weight:bold;text-transform:uppercase;color:#374151;font-size:9pt;">Estado del cobro</p>
    <p style="margin:6px 0 0;font-weight:bold;text-transform:uppercase;">${(cuenta.estado || "pendiente").toUpperCase()}</p>
    ${cuenta.fechaPago ? `<p style="margin:2px 0;font-size:9pt;">Pagada: ${cuenta.fechaPago}</p>` : ""}
    ${cuenta.metodoPago ? `<p style="margin:2px 0;font-size:9pt;">Método: ${cuenta.metodoPago}</p>` : ""}
    ${cuenta.fechaVencimiento ? `<p style="margin:2px 0;font-size:9pt;">Vencimiento: ${cuenta.fechaVencimiento}</p>` : ""}
  </div>
</div>

${cuenta.notas ? `<div style="margin-top:14px;padding:10px;background:#f9fafb;border-left:3px solid #6b7280;font-size:10pt;"><b>Notas:</b> ${cuenta.notas}</div>` : ""}

<div class="firma-zone">
  ${firma ? `<img src="${firma}" style="max-height:60px;display:block;margin:0 auto 8px;" />` : ""}
  <p style="margin:0;font-weight:bold;">${(dd.nombre || "—").toUpperCase()}</p>
  <p style="margin:2px 0;font-size:9pt;">CC ${dd.cc || dd.identificacion || "—"}</p>
  <p style="margin:0;font-size:9pt;">${(dd.titulo || "Médico").toUpperCase()}</p>
</div>

<div class="footer">
  Generado por SISO OcupaSalud · ${new Date().toLocaleString("es-CO")} · Consecutivo único · No modificable después de emitido
</div>
</body></html>`;
  w.document.write(html);
  w.document.close();
}

export default function ContabilidadV2({
  currentUser,
  companies,
  savedBillsLegacy,    // siso_saved_bills_drcucalon — solo lectura
  cajaMovimientos,     // V1 cajaMov — para pestaña "Por facturar"
  marcarCajaMovCobrado, // (movId) → void — cuando se factura desde cajaMov
  vincularCajaMovCuenta, // (movId, cuentaV2Id) → void
  prefilledFromHc,     // { paciente, empresa, monto, cajaMovId, subtipo } al venir desde cierre HC
  clearPrefilled,      // () → void
  activeDoctorData,    // datos del médico activo (banco, cuenta, firma, etc.)
  activeSignature,     // base64 firma
  numeroALetras,       // helper desde App para convertir monto a texto
  goBack,
  showAlert,
  // funciones de I/O del Worker D1 expuestas desde App
  workerGet,         // async (key) → value | null
  workerSet,         // async (key, value) → boolean
}) {
  // ─── Gate de permisos ────────────────────────────────────────────────────
  if (!currentUser || currentUser.user !== "drcucalon") {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 space-y-3">
            <div className="text-5xl">🔐</div>
            <p className="font-black text-amber-800 text-xl">Módulo restringido</p>
            <p className="text-amber-600 text-xs leading-relaxed">
              Solo el administrador <strong>drcucalon</strong> puede acceder a Contabilidad V2.
            </p>
            <button onClick={goBack} className="mt-3 bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-bold">← Volver</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Estado ──────────────────────────────────────────────────────────────
  const [billing, setBilling] = useState(EMPTY_BILLING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("activas");  // "activas" | "historico"

  const [filterMes, setFilterMes] = useState(todayISO().slice(0, 7));
  const [filterTipo, setFilterTipo] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState("");

  const [showCrear, setShowCrear] = useState(false);
  const [showDetalle, setShowDetalle] = useState(null); // cuenta seleccionada
  const [selectedMovIds, setSelectedMovIds] = useState(new Set()); // por facturar — selección múltiple

  // Auto-abrir modal crear si llegamos con prefilled desde cierre HC
  useEffect(() => {
    if (prefilledFromHc && !loading) {
      setShowCrear(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledFromHc, loading]);

  // ─── Cargar billing — OFFLINE-FIRST: LS primero, D1 después ─────────────
  // Estrategia: leer LS inmediato para mostrar UI sin esperar red.
  // En paralelo leer D1; si D1 tiene versión más reciente (mayor consecutivo
  // o updatedAt), reemplazar LS con D1.
  const cargarBilling = useCallback(async () => {
    // 1) LS instantáneo
    const fromLS = lsRead();
    if (fromLS) {
      setBilling(fromLS);
      setLoading(false);
    }
    // 2) D1 en background — fuente de verdad cuando hay red
    if (workerGet) {
      try {
        const fromD1 = await workerGet(BILLING_KEY);
        if (fromD1 && typeof fromD1 === "object" && Array.isArray(fromD1.cuentas)) {
          const merged = { ...EMPTY_BILLING, ...fromD1 };
          // Solo reemplazar si D1 tiene MÁS consecutivo o LS no existe
          if (!fromLS || (merged.consecutivo || 0) >= (fromLS.consecutivo || 0)) {
            setBilling(merged);
            lsWrite(merged); // sincronizar LS con D1
          }
        } else if (!fromLS) {
          setBilling(EMPTY_BILLING);
        }
      } catch (e) {
        console.warn("[ContabilidadV2] D1 load failed (LS still works):", e?.message);
        if (!fromLS) setBilling(EMPTY_BILLING);
      }
    } else if (!fromLS) {
      setBilling(EMPTY_BILLING);
    }
    setLoading(false);
  }, [workerGet]);

  useEffect(() => { cargarBilling(); }, [cargarBilling]);

  // ─── Persistir — LS PRIMERO (síncrono), D1 fire-and-forget ──────────────
  // Garantía: el dato queda guardado en LS antes de retornar.
  // Si D1 falla por red, el dato sobrevive y se sincronizará después.
  const persistir = async (nuevoBilling) => {
    setSaving(true);
    try {
      // 1) LS sync — esto NUNCA debe fallar
      const lsOk = lsWrite(nuevoBilling);
      if (!lsOk) {
        showAlert?.("⚠️ No se pudo guardar localmente (LS lleno?). Reintenta.");
        return false;
      }
      // 2) Actualizar state inmediatamente — UI responde sin esperar D1
      setBilling(nuevoBilling);
      // 3) D1 en background — best-effort, NO bloquea UI
      if (workerSet) {
        workerSet(BILLING_KEY, nuevoBilling).then(ok => {
          if (!ok) console.warn("[ContabilidadV2] D1 sync diferido falló (LS OK)");
        }).catch(e => console.warn("[ContabilidadV2] D1 error:", e?.message));
      }
      return true;
    } finally {
      setSaving(false);
    }
  };

  // ─── Crear nueva cuenta ─────────────────────────────────────────────────
  const crearCuenta = async (datos) => {
    const consec = (billing.consecutivo || 0) + 1;
    const cuenta = {
      id: "ccv2_" + Date.now(),
      consecutivo: consec,
      fechaEmision: datos.fechaEmision || todayISO(),
      fechaVencimiento: datos.fechaVencimiento || null,
      tipo: datos.tipo,                   // bloque_periodico | individual
      subtipoExamen: datos.subtipoExamen, // PERIODICO / INGRESO / ...
      empresa: datos.empresa,             // { nit, nombre, id }
      trabajadores: datos.trabajadores || [],
      periodo: datos.periodo || yearMonth(datos.fechaEmision || todayISO()),
      precioUnidad: Number(datos.precioUnidad) || 0,
      cantidad: Number(datos.cantidad) || (datos.trabajadores?.length || 1),
      descuento: Number(datos.descuento) || 0,
      monto: 0,                            // recalculado abajo
      concepto: datos.concepto || "",
      estado: "pendiente",
      fechaPago: null,
      metodoPago: null,
      comprobantePago: null,
      notas: datos.notas || "",
      vinculaInforme: datos.vinculaInforme || null,
      vinculaCustodia: datos.vinculaCustodia || null,
      // VINCULACIÓN bidireccional con cajaMovimientos (V1)
      vinculaCajaMovIds: datos.vinculaCajaMovIds || [],
      portalPublicado: false,
      // DATOS BANCARIOS auto-fill desde médico (para impresión)
      datosBancarios: {
        banco: activeDoctorData?.banco || datos.banco || "",
        tipoCuenta: activeDoctorData?.tipoCuenta || datos.tipoCuenta || "Ahorros",
        numeroCuenta: activeDoctorData?.numeroCuenta || datos.numeroCuenta || "",
      },
      emitidaPor: datos.emitidaPor || "organizacion",  // organizacion | medico_independiente
      emitidaPorDoctorId: currentUser?.user || "drcucalon",
      amountWords: "",  // se calcula abajo
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.user || "drcucalon",
      updatedAt: new Date().toISOString(),
    };
    cuenta.monto = Math.max(0, (cuenta.precioUnidad * cuenta.cantidad) - cuenta.descuento);
    // Calcular monto en letras (auto)
    try {
      if (typeof numeroALetras === "function") {
        cuenta.amountWords = (numeroALetras(cuenta.monto) || "").toLowerCase() + " pesos mcte";
      }
    } catch {}

    const nuevo = {
      ...billing,
      consecutivo: consec,
      cuentas: [...(billing.cuentas || []), cuenta],
      historial: [...(billing.historial || []), {
        tipo: "creacion", cuentaId: cuenta.id,
        consecutivo: consec, fecha: cuenta.createdAt,
        por: cuenta.createdBy, monto: cuenta.monto,
      }],
    };
    const ok = await persistir(nuevo);
    if (ok) {
      // VINCULAR cajaMovs (V1) a esta cuenta V2
      if (vincularCajaMovCuenta && cuenta.vinculaCajaMovIds.length > 0) {
        for (const movId of cuenta.vinculaCajaMovIds) {
          try { vincularCajaMovCuenta(movId, cuenta.id); } catch {}
        }
      }
      // Limpiar selección y prefilled
      setSelectedMovIds(new Set());
      if (clearPrefilled) clearPrefilled();
      setShowCrear(false);
      showAlert?.(`✅ Cuenta #${String(consec).padStart(3, "0")} creada por ${fmtCOP(cuenta.monto)}.`);
    }
  };

  // ─── Cambiar estado de cuenta ───────────────────────────────────────────
  const cambiarEstado = async (cuentaId, nuevoEstado, extras = {}) => {
    const nuevaCuentas = (billing.cuentas || []).map(c => {
      if (c.id !== cuentaId) return c;
      const upd = { ...c, estado: nuevoEstado, updatedAt: new Date().toISOString() };
      if (nuevoEstado === "pagada") {
        upd.fechaPago = extras.fechaPago || todayISO();
        upd.metodoPago = extras.metodoPago || null;
        upd.comprobantePago = extras.comprobantePago || null;
      }
      if (nuevoEstado === "anulada") {
        upd.fechaAnulacion = todayISO();
        upd.motivoAnulacion = extras.motivoAnulacion || "Sin motivo";
      }
      return upd;
    });
    const cuenta = nuevaCuentas.find(c => c.id === cuentaId);
    const nuevo = {
      ...billing,
      cuentas: nuevaCuentas,
      historial: [...(billing.historial || []), {
        tipo: nuevoEstado, cuentaId,
        consecutivo: cuenta?.consecutivo,
        fecha: new Date().toISOString(),
        por: currentUser?.user || "drcucalon",
        ...extras,
      }],
    };
    const ok = await persistir(nuevo);
    if (ok) {
      // PROPAGACIÓN: si la cuenta se marca pagada, cobrar los cajaMovs vinculados
      if (nuevoEstado === "pagada" && marcarCajaMovCobrado && Array.isArray(cuenta?.vinculaCajaMovIds)) {
        for (const movId of cuenta.vinculaCajaMovIds) {
          try { marcarCajaMovCobrado(movId, cuenta.monto, extras.metodoPago || "transferencia"); } catch {}
        }
      }
      setShowDetalle(null);
      showAlert?.(`✅ Cuenta #${String(cuenta?.consecutivo).padStart(3, "0")} → ${estadoVisuales[nuevoEstado]?.label || nuevoEstado}`);
    }
  };

  // ─── Computed: cuentas filtradas + totales del mes ─────────────────────
  const cuentasFiltradas = useMemo(() => {
    const arr = billing.cuentas || [];
    return arr.filter(c => {
      if (filterMes && yearMonth(c.fechaEmision) !== filterMes) return false;
      if (filterTipo && c.tipo !== filterTipo) return false;
      if (filterEstado && c.estado !== filterEstado) return false;
      if (filterEmpresa) {
        const q = filterEmpresa.toLowerCase();
        if (!(c.empresa?.nombre || "").toLowerCase().includes(q) &&
            !(c.empresa?.nit || "").includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.consecutivo - a.consecutivo);
  }, [billing, filterMes, filterTipo, filterEstado, filterEmpresa]);

  const totalesMes = useMemo(() => {
    const todas = (billing.cuentas || []).filter(c => yearMonth(c.fechaEmision) === filterMes);
    let pagado = 0, pendiente = 0, vencido = 0, anulado = 0;
    let cntPagado = 0, cntPendiente = 0, cntVencido = 0;
    const hoy = todayISO();
    for (const c of todas) {
      if (c.estado === "anulada") { anulado += c.monto; continue; }
      if (c.estado === "pagada")     { pagado += c.monto; cntPagado++; continue; }
      // vencida = pendiente con fechaVencimiento < hoy
      if (c.fechaVencimiento && c.fechaVencimiento < hoy && c.estado === "pendiente") {
        vencido += c.monto; cntVencido++; continue;
      }
      pendiente += c.monto; cntPendiente++;
    }
    return {
      pagado, pendiente, vencido, anulado,
      cntPagado, cntPendiente, cntVencido,
      totalEmitido: pagado + pendiente + vencido,
      totalCuentas: todas.length,
    };
  }, [billing, filterMes]);

  // ─── Export CSV ──────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = cuentasFiltradas;
    if (rows.length === 0) { showAlert?.("No hay cuentas para exportar con los filtros actuales."); return; }
    const header = ["Consec", "Fecha", "Empresa", "NIT", "Tipo", "Subtipo", "Periodo", "Cantidad", "Precio Unit", "Descuento", "Monto", "Estado", "Fecha Pago", "Concepto"];
    const csv = [
      header.join(","),
      ...rows.map(c => [
        c.consecutivo, c.fechaEmision, `"${c.empresa?.nombre || ""}"`, c.empresa?.nit || "",
        c.tipo, c.subtipoExamen, c.periodo, c.cantidad, c.precioUnidad, c.descuento, c.monto,
        c.estado, c.fechaPago || "", `"${(c.concepto || "").replace(/"/g, '""')}"`
      ].join(",")),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `contabilidad-${filterMes || "todo"}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Cargando contabilidad…</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-black text-emerald-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6" /> Contabilidad V2
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCrear(true)}
              className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-emerald-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nueva cuenta
            </button>
            <button onClick={goBack} className="text-gray-500 font-bold text-sm flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200 flex-wrap">
          <button onClick={() => setTab("activas")}
            className={`px-4 py-2 text-sm font-black border-b-2 transition ${tab === "activas" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            📋 Cuentas ({billing.cuentas?.length || 0})
          </button>
          <button onClick={() => setTab("porfacturar")}
            className={`px-4 py-2 text-sm font-black border-b-2 transition relative ${tab === "porfacturar" ? "border-orange-600 text-orange-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            💸 Por facturar ({(() => {
              return (cajaMovimientos || []).filter(m => m._autoGenerated && m.estado === "pendiente" && !m.vinculaCuentaV2Id).length;
            })()})
          </button>
          <button onClick={() => setTab("movimientos")}
            className={`px-4 py-2 text-sm font-black border-b-2 transition ${tab === "movimientos" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            📅 Movimientos diarios
          </button>
          <button onClick={() => setTab("historico")}
            className={`px-4 py-2 text-sm font-black border-b-2 transition ${tab === "historico" ? "border-amber-600 text-amber-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            📜 Histórico ({savedBillsLegacy?.length || 0})
          </button>
        </div>

        {tab === "activas" && (
          <>
            {/* Resumen del mes */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <p className="text-sm font-black text-emerald-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Resumen: {ymLabel(filterMes)}
                </p>
                <input type="month" value={filterMes} onChange={e => setFilterMes(e.target.value)}
                  className="border border-emerald-300 rounded-lg px-2 py-1 text-xs font-bold bg-white"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-3 border border-emerald-200">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">✅ Pagado</p>
                  <p className="text-lg font-black text-emerald-700">{fmtCOP(totalesMes.pagado)}</p>
                  <p className="text-[10px] text-gray-500">{totalesMes.cntPagado} cuentas</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-amber-200">
                  <p className="text-[10px] font-bold text-amber-700 uppercase">⏳ Pendiente</p>
                  <p className="text-lg font-black text-amber-700">{fmtCOP(totalesMes.pendiente)}</p>
                  <p className="text-[10px] text-gray-500">{totalesMes.cntPendiente} cuentas</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-red-200">
                  <p className="text-[10px] font-bold text-red-700 uppercase">🔴 Vencido</p>
                  <p className="text-lg font-black text-red-700">{fmtCOP(totalesMes.vencido)}</p>
                  <p className="text-[10px] text-gray-500">{totalesMes.cntVencido} cuentas</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-700 uppercase">📋 Total emitido</p>
                  <p className="text-lg font-black text-gray-700">{fmtCOP(totalesMes.totalEmitido)}</p>
                  <p className="text-[10px] text-gray-500">{totalesMes.totalCuentas} cuentas</p>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 grid md:grid-cols-4 gap-2">
              <input value={filterEmpresa} onChange={e => setFilterEmpresa(e.target.value)}
                placeholder="🔍 Buscar empresa o NIT..."
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
              />
              <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
              >
                <option value="">Todos los tipos</option>
                <option value="bloque_periodico">Bloque periódico</option>
                <option value="individual">Individual</option>
              </select>
              <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagada">Pagada</option>
                <option value="vencida">Vencida</option>
                <option value="anulada">Anulada</option>
              </select>
              <button onClick={exportCSV}
                className="bg-gray-100 text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-gray-200 flex items-center justify-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </button>
            </div>

            {/* Tabla de cuentas */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {cuentasFiltradas.length === 0 ? (
                <div className="p-10 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-black text-gray-700">No hay cuentas con estos filtros</p>
                  <p className="text-xs text-gray-500 mt-1">Crea una nueva cuenta o ajusta los filtros.</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-gray-700">#</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-700">Fecha</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-700">Empresa</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-700">Tipo</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-700">Periodo</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-700">Monto</th>
                      <th className="px-3 py-2 text-center font-bold text-gray-700">Estado</th>
                      <th className="px-3 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuentasFiltradas.map(c => {
                      const est = estadoVisuales[c.estado] || estadoVisuales.pendiente;
                      const tip = tipoVisual(c.tipo);
                      const Icon = est.icon;
                      return (
                        <tr key={c.id} className="border-b border-gray-100 hover:bg-emerald-50/30 cursor-pointer" onClick={() => setShowDetalle(c)}>
                          <td className="px-3 py-2 font-mono font-black text-emerald-700">#{String(c.consecutivo).padStart(3, "0")}</td>
                          <td className="px-3 py-2 text-gray-600">{c.fechaEmision}</td>
                          <td className="px-3 py-2">
                            <p className="font-bold text-gray-800">{c.empresa?.nombre || "—"}</p>
                            <p className="text-[9px] text-gray-400 font-mono">{c.empresa?.nit || ""}</p>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${tip.color}`}>{tip.label}</span>
                            <p className="text-[9px] text-gray-400 mt-0.5">{c.subtipoExamen}</p>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{ymLabel(c.periodo)}</td>
                          <td className="px-3 py-2 text-right font-black text-gray-800">{fmtCOP(c.monto)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-black border ${est.bg} ${est.text} ${est.border}`}>
                              <Icon className="w-3 h-3" /> {est.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={(e) => { e.stopPropagation(); setShowDetalle(c); }} className="text-emerald-600 hover:text-emerald-800">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Por facturar tab */}
        {tab === "porfacturar" && (
          <PorFacturarTab
            cajaMovimientos={cajaMovimientos || []}
            companies={companies}
            selectedMovIds={selectedMovIds}
            setSelectedMovIds={setSelectedMovIds}
            onFacturarIndividual={(mov) => {
              // Pre-fill data y abrir modal crear
              const empresa = companies.find(c => c.id === mov.empresaClienteId || c.nombre === mov.empresaClienteNombre);
              const subtipo = (mov.tipoConsulta || "").toUpperCase().includes("PERIOD") ? "PERIODICO" :
                (mov.tipoConsulta || "").toUpperCase().includes("INGRESO") ? "INGRESO" :
                (mov.tipoConsulta || "").toUpperCase().includes("EGRESO") ? "EGRESO" : "OTRO";
              // Configurar prefill simulado
              setShowCrear({
                __prefill: {
                  tipo: "individual",
                  subtipo,
                  empresaId: empresa?.id || "",
                  precioUnidad: mov.monto || "",
                  cantidad: 1,
                  trabajadores: [{ docNumero: mov.pacienteDoc, nombres: mov.pacienteNombre }],
                  vinculaCajaMovIds: [mov.id],
                  concepto: mov.concepto || "",
                }
              });
            }}
            onFacturarBloque={() => {
              const movs = (cajaMovimientos || []).filter(m => selectedMovIds.has(m.id));
              if (movs.length < 2) { showAlert?.("Selecciona al menos 2 movimientos para agrupar en bloque."); return; }
              // Verificar misma empresa
              const empresaIds = new Set(movs.map(m => m.empresaClienteId).filter(Boolean));
              if (empresaIds.size > 1) { showAlert?.("Todos los movimientos deben ser de la MISMA empresa para agrupar."); return; }
              const empresa = companies.find(c => c.id === movs[0].empresaClienteId);
              const total = movs.reduce((s, m) => s + Number(m.monto || 0), 0);
              const precioU = movs.length > 0 ? Math.floor(total / movs.length) : 0;
              const subtipo = "PERIODICO"; // bloques son normalmente periódicos
              setShowCrear({
                __prefill: {
                  tipo: "bloque_periodico",
                  subtipo,
                  empresaId: empresa?.id || "",
                  precioUnidad: precioU,
                  cantidad: movs.length,
                  trabajadores: movs.map(m => ({ docNumero: m.pacienteDoc, nombres: m.pacienteNombre })),
                  vinculaCajaMovIds: movs.map(m => m.id),
                  concepto: `Examen ${subtipo} × ${movs.length} trabajadores · ${empresa?.nombre || ""}`,
                }
              });
            }}
          />
        )}

        {/* Movimientos diarios tab */}
        {tab === "movimientos" && (
          <MovimientosTab cajaMovimientos={cajaMovimientos || []} />
        )}

        {/* Histórico tab */}
        {tab === "historico" && (
          <HistoricoTab cuentas={savedBillsLegacy || []} />
        )}

        {saving && (
          <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-black flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Guardando…
          </div>
        )}
      </div>

      {/* Modal crear cuenta */}
      {showCrear && (
        <CrearCuentaModal
          onClose={() => { setShowCrear(false); if (clearPrefilled) clearPrefilled(); }}
          onCreate={crearCuenta}
          companies={companies}
          consecutivoSiguiente={(billing.consecutivo || 0) + 1}
          prefill={showCrear?.__prefill || (prefilledFromHc ? {
            tipo: "individual",
            subtipo: (prefilledFromHc.subtipo || "OTRO").toUpperCase(),
            empresaId: prefilledFromHc.empresa?.id || "",
            precioUnidad: prefilledFromHc.monto || "",
            cantidad: 1,
            trabajadores: prefilledFromHc.paciente ? [{ docNumero: prefilledFromHc.paciente.docNumero, nombres: prefilledFromHc.paciente.nombres }] : [],
            vinculaCajaMovIds: prefilledFromHc.cajaMovId ? [prefilledFromHc.cajaMovId] : [],
            concepto: `Examen ${(prefilledFromHc.subtipo || "OTRO").toUpperCase()} · ${prefilledFromHc.paciente?.nombres || "Particular"}`,
          } : null)}
        />
      )}

      {/* Modal detalle cuenta */}
      {showDetalle && (
        <DetalleCuentaModal
          cuenta={showDetalle}
          onClose={() => setShowDetalle(null)}
          onCambiarEstado={cambiarEstado}
          onImprimir={() => imprimirCuenta(showDetalle, activeDoctorData, activeSignature)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL CREAR CUENTA
// ════════════════════════════════════════════════════════════════════════════
function CrearCuentaModal({ onClose, onCreate, companies, consecutivoSiguiente, prefill }) {
  const [tipo, setTipo] = useState(prefill?.tipo || "individual");
  const [subtipo, setSubtipo] = useState(prefill?.subtipo || "INGRESO");
  const [empresaId, setEmpresaId] = useState(prefill?.empresaId || "");
  const [fechaEmision, setFechaEmision] = useState(todayISO());
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [precioUnidad, setPrecioUnidad] = useState(prefill?.precioUnidad ? String(prefill.precioUnidad) : "");
  const [cantidad, setCantidad] = useState(prefill?.cantidad || 1);
  const [descuento, setDescuento] = useState(0);
  const [concepto, setConcepto] = useState(prefill?.concepto || "");
  const [notas, setNotas] = useState("");
  // Datos pre-cargados que se incluyen al crear (no editables aquí)
  const trabajadoresPrefill = prefill?.trabajadores || [];
  const vinculaCajaMovIds   = prefill?.vinculaCajaMovIds || [];

  const empresa = companies.find(c => c.id === empresaId);
  const periodo = yearMonth(fechaEmision);

  // Auto-rellenar tarifa según empresa+subtipo
  useEffect(() => {
    if (!empresa) return;
    const campo = SUBTIPO_TARIFA_MAP[subtipo];
    if (campo && empresa[campo]) setPrecioUnidad(String(empresa[campo]));
  }, [empresa, subtipo]);

  const monto = Math.max(0, (Number(precioUnidad) || 0) * (Number(cantidad) || 0) - (Number(descuento) || 0));

  const submit = (e) => {
    e.preventDefault();
    if (!empresa && subtipo !== "PARTICULAR") { alert("Selecciona empresa o usa PARTICULAR."); return; }
    if (!precioUnidad || Number(precioUnidad) <= 0) { alert("Precio unitario inválido."); return; }
    const datos = {
      tipo, subtipoExamen: subtipo,
      empresa: empresa ? { nit: empresa.nit, nombre: empresa.nombre, id: empresa.id } : { nit: "1", nombre: "PARTICULAR", id: "particular" },
      fechaEmision, fechaVencimiento: fechaVencimiento || null,
      precioUnidad: Number(precioUnidad), cantidad: Number(cantidad), descuento: Number(descuento) || 0,
      concepto: concepto || `${subtipo} ${cantidad > 1 ? `× ${cantidad}` : ""}`.trim(),
      notas, periodo,
      trabajadores: trabajadoresPrefill,
      vinculaCajaMovIds,
    };
    onCreate(datos);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-4 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
          <p className="font-black text-lg text-emerald-800">Nueva cuenta de cobro</p>
          <p className="text-xs font-mono text-gray-400">Consecutivo: #{String(consecutivoSiguiente).padStart(3, "0")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-700 uppercase block mb-1">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="individual">Individual</option>
              <option value="bloque_periodico">Bloque periódico ({'>'}3 trabajadores)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-700 uppercase block mb-1">Subtipo de examen</label>
            <select value={subtipo} onChange={e => setSubtipo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {SUBTIPOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-700 uppercase block mb-1">Empresa</label>
          <select value={empresaId} onChange={e => setEmpresaId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">— Seleccionar —</option>
            {(companies || []).map(c => (
              <option key={c.id} value={c.id}>{c.nombre} ({c.nit})</option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-700 uppercase block mb-1">Fecha emisión</label>
            <input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-700 uppercase block mb-1">Fecha vencimiento</label>
            <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 bg-gray-50 rounded-xl p-3">
          <div>
            <label className="text-[10px] font-bold text-gray-700 uppercase block mb-1">Precio unidad</label>
            <input type="number" value={precioUnidad} onChange={e => setPrecioUnidad(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" placeholder="35000" />
            <p className="text-[9px] text-gray-400 mt-0.5">{empresa ? `Auto desde ${SUBTIPO_TARIFA_MAP[subtipo] || "tarifa"}` : "Tarifa manual"}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-700 uppercase block mb-1">Cantidad</label>
            <input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-700 uppercase block mb-1">Descuento</label>
            <input type="number" value={descuento} onChange={e => setDescuento(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
          <p className="text-xs font-bold text-emerald-700">Total a cobrar:</p>
          <p className="text-2xl font-black text-emerald-800">{fmtCOP(monto)}</p>
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-700 uppercase block mb-1">Concepto</label>
          <input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder={`Ej: Exámenes ${subtipo}`} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-700 uppercase block mb-1">Notas</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm resize-none" />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600">Cancelar</button>
          <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-black hover:bg-emerald-700">Crear cuenta</button>
        </div>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL DETALLE / CAMBIAR ESTADO
// ════════════════════════════════════════════════════════════════════════════
function DetalleCuentaModal({ cuenta, onClose, onCambiarEstado, onImprimir }) {
  const [showPagar, setShowPagar] = useState(false);
  const [showAnular, setShowAnular] = useState(false);
  const [fechaPago, setFechaPago] = useState(todayISO());
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [comprobante, setComprobante] = useState("");
  const [motivoAnulacion, setMotivoAnulacion] = useState("");

  const est = estadoVisuales[cuenta.estado] || estadoVisuales.pendiente;
  const tip = tipoVisual(cuenta.tipo);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 my-4 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-start pb-3 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-500">Cuenta de cobro</p>
            <p className="font-black text-2xl text-emerald-800 font-mono">#{String(cuenta.consecutivo).padStart(3, "0")}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Estado</p>
            <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full font-black border ${est.bg} ${est.text} ${est.border}`}>
              {est.label}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Tipo</p>
            <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full font-bold border ${tip.color}`}>{tip.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-3 text-xs">
          <div><p className="text-[10px] text-gray-500 uppercase">Empresa</p><p className="font-black">{cuenta.empresa?.nombre || "—"}</p></div>
          <div><p className="text-[10px] text-gray-500 uppercase">NIT</p><p className="font-mono">{cuenta.empresa?.nit || "—"}</p></div>
          <div><p className="text-[10px] text-gray-500 uppercase">Subtipo</p><p className="font-bold">{cuenta.subtipoExamen}</p></div>
          <div><p className="text-[10px] text-gray-500 uppercase">Periodo</p><p className="font-bold">{ymLabel(cuenta.periodo)}</p></div>
          <div><p className="text-[10px] text-gray-500 uppercase">Emisión</p><p>{cuenta.fechaEmision}</p></div>
          <div><p className="text-[10px] text-gray-500 uppercase">Vencimiento</p><p>{cuenta.fechaVencimiento || "—"}</p></div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div className="flex justify-between text-xs"><span>Precio unidad:</span><span className="font-bold">{fmtCOP(cuenta.precioUnidad)}</span></div>
          <div className="flex justify-between text-xs"><span>Cantidad:</span><span className="font-bold">×{cuenta.cantidad}</span></div>
          {cuenta.descuento > 0 && <div className="flex justify-between text-xs text-red-600"><span>Descuento:</span><span className="font-bold">-{fmtCOP(cuenta.descuento)}</span></div>}
          <div className="flex justify-between mt-2 pt-2 border-t border-emerald-300">
            <span className="font-black text-emerald-800">TOTAL:</span>
            <span className="font-black text-2xl text-emerald-800">{fmtCOP(cuenta.monto)}</span>
          </div>
        </div>

        {cuenta.concepto && (
          <div><p className="text-[10px] text-gray-500 uppercase font-bold">Concepto</p><p className="text-xs">{cuenta.concepto}</p></div>
        )}
        {cuenta.estado === "pagada" && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs">
            <p className="font-black text-emerald-800 mb-1">✅ Pagada</p>
            <p><b>Fecha:</b> {cuenta.fechaPago}</p>
            <p><b>Método:</b> {cuenta.metodoPago || "—"}</p>
            {cuenta.comprobantePago && <p><b>Comprobante:</b> {cuenta.comprobantePago}</p>}
          </div>
        )}
        {cuenta.estado === "anulada" && (
          <div className="bg-gray-100 border border-gray-300 rounded-xl p-3 text-xs">
            <p className="font-black text-gray-700 mb-1">❌ Anulada</p>
            <p><b>Fecha:</b> {cuenta.fechaAnulacion}</p>
            <p><b>Motivo:</b> {cuenta.motivoAnulacion}</p>
          </div>
        )}

        {/* Datos bancarios visibles (si los tiene) */}
        {cuenta.datosBancarios?.banco && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs">
            <p className="font-black text-blue-800 mb-1">💳 Información de pago</p>
            <p><b>Banco:</b> {cuenta.datosBancarios.banco}</p>
            <p><b>Tipo cuenta:</b> {cuenta.datosBancarios.tipoCuenta}</p>
            <p><b>Nº cuenta:</b> <span className="font-mono">{cuenta.datosBancarios.numeroCuenta}</span></p>
          </div>
        )}

        {/* Botón imprimir disponible siempre */}
        {onImprimir && (
          <button onClick={onImprimir}
            className="w-full py-2 bg-gray-700 text-white rounded-lg text-xs font-black hover:bg-gray-800 transition flex items-center justify-center gap-2"
          >
            🖨️ Imprimir / Descargar PDF
          </button>
        )}

        {/* Acciones según estado */}
        {cuenta.estado === "pendiente" && !showPagar && !showAnular && (
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowPagar(true)} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-xs font-black hover:bg-emerald-700">
              ✅ Marcar como PAGADA
            </button>
            <button onClick={() => setShowAnular(true)} className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-bold hover:bg-gray-200">
              Anular
            </button>
          </div>
        )}

        {showPagar && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 space-y-2">
            <p className="text-xs font-black text-emerald-800">Registrar pago</p>
            <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} className="w-full border border-emerald-300 rounded-lg px-3 py-1.5 text-xs" />
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className="w-full border border-emerald-300 rounded-lg px-3 py-1.5 text-xs">
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
              <option value="otro">Otro</option>
            </select>
            <input value={comprobante} onChange={e => setComprobante(e.target.value)} placeholder="Nº comprobante / referencia (opcional)" className="w-full border border-emerald-300 rounded-lg px-3 py-1.5 text-xs" />
            <div className="flex gap-2">
              <button onClick={() => onCambiarEstado(cuenta.id, "pagada", { fechaPago, metodoPago, comprobantePago: comprobante })}
                className="flex-1 bg-emerald-600 text-white py-1.5 rounded-lg text-xs font-black"
              >
                Confirmar pago
              </button>
              <button onClick={() => setShowPagar(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
            </div>
          </div>
        )}

        {showAnular && (
          <div className="bg-gray-50 border border-gray-300 rounded-xl p-3 space-y-2">
            <p className="text-xs font-black text-gray-700">Motivo de anulación</p>
            <textarea value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)} rows="2"
              placeholder="Razón..." className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
            />
            <div className="flex gap-2">
              <button onClick={() => onCambiarEstado(cuenta.id, "anulada", { motivoAnulacion })}
                disabled={!motivoAnulacion.trim()}
                className="flex-1 bg-red-600 text-white py-1.5 rounded-lg text-xs font-black disabled:opacity-50"
              >
                Anular cuenta
              </button>
              <button onClick={() => setShowAnular(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB POR FACTURAR — cajaMovs pendientes (V1) listos para facturar a V2
// ════════════════════════════════════════════════════════════════════════════
function PorFacturarTab({ cajaMovimientos, companies, selectedMovIds, setSelectedMovIds, onFacturarIndividual, onFacturarBloque }) {
  const [filterEmpresa, setFilterEmpresa] = useState("");
  const [filterMes, setFilterMes] = useState(""); // vacío = todos
  const pendientes = useMemo(() => {
    return (cajaMovimientos || [])
      .filter(m => m._autoGenerated && m.estado === "pendiente" && !m.vinculaCuentaV2Id)
      .filter(m => {
        if (filterMes && yearMonth(m.fecha) !== filterMes) return false;
        if (filterEmpresa) {
          const q = filterEmpresa.toLowerCase();
          if (!(m.empresaClienteNombre || "").toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  }, [cajaMovimientos, filterMes, filterEmpresa]);

  const total = pendientes.reduce((s, m) => s + Number(m.monto || 0), 0);
  const selected = pendientes.filter(m => selectedMovIds.has(m.id));
  const totalSelected = selected.reduce((s, m) => s + Number(m.monto || 0), 0);
  // Agrupar por empresa
  const byEmpresa = useMemo(() => {
    const map = new Map();
    for (const m of pendientes) {
      const k = m.empresaClienteId || m.empresaClienteNombre || "particular";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(m);
    }
    return [...map.entries()].map(([k, movs]) => ({
      empresaKey: k,
      empresaNombre: movs[0].empresaClienteNombre || "PARTICULAR",
      movs,
      total: movs.reduce((s, m) => s + Number(m.monto || 0), 0),
    })).sort((a, b) => b.total - a.total);
  }, [pendientes]);

  const toggleSelect = (id) => {
    const next = new Set(selectedMovIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMovIds(next);
  };
  const toggleAllOfEmpresa = (grupoMovs) => {
    const next = new Set(selectedMovIds);
    const allSelected = grupoMovs.every(m => next.has(m.id));
    for (const m of grupoMovs) {
      if (allSelected) next.delete(m.id);
      else next.add(m.id);
    }
    setSelectedMovIds(next);
  };

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-orange-700" />
          <p className="font-black text-orange-900">Movimientos pendientes de facturar</p>
        </div>
        <p className="text-xs text-orange-800">
          Estos son los movimientos generados automáticamente al cerrar HC (V1) que aún no se han convertido
          en cuentas de cobro V2. Selecciona uno o varios y conviértelos en cuentas con consecutivo único.
        </p>
        <div className="mt-3 grid md:grid-cols-3 gap-2 text-xs">
          <div className="bg-white border border-orange-200 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase">Total pendiente</p>
            <p className="text-lg font-black text-orange-700">{fmtCOP(total)}</p>
            <p className="text-[10px] text-gray-500">{pendientes.length} movimientos</p>
          </div>
          <div className="bg-white border border-orange-200 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase">Empresas distintas</p>
            <p className="text-lg font-black text-orange-700">{byEmpresa.length}</p>
            <p className="text-[10px] text-gray-500">grupos</p>
          </div>
          <div className="bg-white border border-orange-200 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase">Seleccionados</p>
            <p className="text-lg font-black text-emerald-700">{fmtCOP(totalSelected)}</p>
            <p className="text-[10px] text-gray-500">{selected.length} movs</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-3 grid md:grid-cols-3 gap-2">
        <input value={filterEmpresa} onChange={e => setFilterEmpresa(e.target.value)}
          placeholder="🔍 Buscar empresa..."
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
        />
        <input type="month" value={filterMes} onChange={e => setFilterMes(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
        />
        <button
          onClick={onFacturarBloque}
          disabled={selected.length < 2}
          className="bg-purple-600 text-white rounded-lg px-3 py-1.5 text-xs font-black hover:bg-purple-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🧾 Facturar como bloque ({selected.length})
        </button>
      </div>

      {byEmpresa.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
          <p className="font-black text-gray-700">No hay movimientos pendientes</p>
          <p className="text-xs text-gray-500 mt-1">Todos los pacientes vistos ya tienen cuenta de cobro o están en otro estado.</p>
        </div>
      ) : (
        byEmpresa.map(grupo => {
          const allSel = grupo.movs.every(m => selectedMovIds.has(m.id));
          return (
            <div key={grupo.empresaKey} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input type="checkbox" checked={allSel} onChange={() => toggleAllOfEmpresa(grupo.movs)} className="w-4 h-4" />
                  <p className="font-black text-sm text-gray-800 truncate">{grupo.empresaNombre}</p>
                  <span className="text-[10px] text-gray-500 flex-shrink-0">· {grupo.movs.length} movs · {fmtCOP(grupo.total)}</span>
                </div>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="w-10"></th>
                    <th className="px-2 py-1 text-left font-bold text-gray-700">Fecha</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-700">Paciente</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-700">Tipo</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-700">Monto</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.movs.map(m => (
                    <tr key={m.id} className={`border-b border-gray-50 ${selectedMovIds.has(m.id) ? "bg-emerald-50/40" : "hover:bg-gray-50"}`}>
                      <td className="px-2 py-1.5 text-center">
                        <input type="checkbox" checked={selectedMovIds.has(m.id)} onChange={() => toggleSelect(m.id)} className="w-3.5 h-3.5" />
                      </td>
                      <td className="px-2 py-1.5 text-gray-600">{m.fecha}</td>
                      <td className="px-2 py-1.5">
                        <p className="font-bold text-gray-800">{m.pacienteNombre || "?"}</p>
                        <p className="text-[9px] text-gray-400 font-mono">CC {m.pacienteDoc || "?"}</p>
                      </td>
                      <td className="px-2 py-1.5 text-gray-600">{(m.tipoConsulta || "?").toUpperCase()}</td>
                      <td className="px-2 py-1.5 text-right font-black">{fmtCOP(m.monto)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <button onClick={() => onFacturarIndividual(m)} className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-lg font-black hover:bg-emerald-700">
                          Facturar →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB MOVIMIENTOS DIARIOS — vista de cajaMovimientos con filtros temporales
// ════════════════════════════════════════════════════════════════════════════
function MovimientosTab({ cajaMovimientos }) {
  const [periodo, setPeriodo] = useState("hoy"); // hoy | semana | mes | anio | rango
  const [rangoDesde, setRangoDesde] = useState(todayISO());
  const [rangoHasta, setRangoHasta] = useState(todayISO());
  const [tipoFiltro, setTipoFiltro] = useState(""); // "" | ingreso | egreso
  const [estadoFiltro, setEstadoFiltro] = useState(""); // "" | pendiente | cobrado

  const rango = useMemo(() => {
    const hoy = todayISO();
    if (periodo === "hoy") return { desde: hoy, hasta: hoy };
    if (periodo === "semana") {
      const d = new Date();
      const dow = d.getDay();
      const diff = d.getDate() - (dow === 0 ? 6 : dow - 1);
      const lun = new Date(d.setDate(diff));
      const dom = new Date(new Date(lun).setDate(lun.getDate() + 6));
      return { desde: lun.toISOString().slice(0, 10), hasta: dom.toISOString().slice(0, 10) };
    }
    if (periodo === "mes") return { desde: hoy.slice(0, 7) + "-01", hasta: hoy };
    if (periodo === "anio") return { desde: hoy.slice(0, 4) + "-01-01", hasta: hoy };
    if (periodo === "rango") return { desde: rangoDesde, hasta: rangoHasta };
    return { desde: hoy, hasta: hoy };
  }, [periodo, rangoDesde, rangoHasta]);

  const movsFiltrados = useMemo(() => {
    return (cajaMovimientos || [])
      .filter(m => (m.fecha || "") >= rango.desde && (m.fecha || "") <= rango.hasta)
      .filter(m => !tipoFiltro || m.tipo === tipoFiltro)
      .filter(m => !estadoFiltro || (m.estado || "pendiente") === estadoFiltro)
      .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  }, [cajaMovimientos, rango, tipoFiltro, estadoFiltro]);

  const totales = useMemo(() => {
    let ingresos = 0, egresos = 0, porCobrar = 0, cobrado = 0;
    for (const m of movsFiltrados) {
      const monto = Number(m.monto || 0);
      if (m.tipo === "ingreso") {
        ingresos += monto;
        if (m._autoGenerated && m.estado === "pendiente") porCobrar += monto;
        if (m.estado === "cobrado") cobrado += Number(m.montoCobrado || monto);
      } else if (m.tipo === "egreso") {
        egresos += monto;
      }
    }
    return { ingresos, egresos, porCobrar, cobrado, saldo: ingresos - egresos };
  }, [movsFiltrados]);

  return (
    <div className="space-y-4">
      {/* Filtros temporales */}
      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { v: "hoy", l: "Hoy" },
            { v: "semana", l: "Semana" },
            { v: "mes", l: "Mes" },
            { v: "anio", l: "Año" },
            { v: "rango", l: "Rango" },
          ].map(b => (
            <button key={b.v} onClick={() => setPeriodo(b.v)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${periodo === b.v ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >{b.l}</button>
          ))}
          {periodo === "rango" && (
            <>
              <input type="date" value={rangoDesde} onChange={e => setRangoDesde(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-xs" />
              <input type="date" value={rangoHasta} onChange={e => setRangoHasta(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-xs" />
            </>
          )}
          <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-xs ml-auto">
            <option value="">Todos los tipos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
          </select>
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-xs">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="cobrado">Cobrado</option>
          </select>
        </div>
      </div>

      {/* Resumen del periodo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Ingresos</p>
          <p className="text-base font-black text-emerald-700">{fmtCOP(totales.ingresos)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-red-700 uppercase">Egresos</p>
          <p className="text-base font-black text-red-700">{fmtCOP(totales.egresos)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-blue-700 uppercase">Saldo</p>
          <p className="text-base font-black text-blue-700">{fmtCOP(totales.saldo)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-amber-700 uppercase">Por cobrar</p>
          <p className="text-base font-black text-amber-700">{fmtCOP(totales.porCobrar)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Cobrado</p>
          <p className="text-base font-black text-emerald-700">{fmtCOP(totales.cobrado)}</p>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {movsFiltrados.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-black text-gray-700">No hay movimientos en este periodo</p>
            <p className="text-xs text-gray-500 mt-1">{rango.desde} → {rango.hasta}</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-bold text-gray-700">Fecha</th>
                <th className="px-3 py-2 text-left font-bold text-gray-700">Concepto</th>
                <th className="px-3 py-2 text-left font-bold text-gray-700">Paciente</th>
                <th className="px-3 py-2 text-left font-bold text-gray-700">Empresa</th>
                <th className="px-3 py-2 text-center font-bold text-gray-700">Tipo</th>
                <th className="px-3 py-2 text-right font-bold text-gray-700">Monto</th>
                <th className="px-3 py-2 text-center font-bold text-gray-700">Estado</th>
                <th className="px-3 py-2 text-center font-bold text-gray-700">→V2</th>
              </tr>
            </thead>
            <tbody>
              {movsFiltrados.map(m => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-1.5 text-gray-600">{m.fecha}</td>
                  <td className="px-3 py-1.5 text-gray-700">{(m.concepto || "").slice(0, 50)}</td>
                  <td className="px-3 py-1.5">
                    {m.pacienteNombre && (
                      <>
                        <p className="font-bold text-gray-800">{m.pacienteNombre}</p>
                        <p className="text-[9px] text-gray-400 font-mono">CC {m.pacienteDoc}</p>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">{m.empresaClienteNombre || "—"}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.tipo === "ingreso" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {m.tipo === "ingreso" ? "+" : "-"} {m.tipo}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-black">{fmtCOP(m.monto)}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.estado === "cobrado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {m.estado || "pendiente"}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {m.vinculaCuentaV2Id ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" title="Vinculado a cuenta V2" />
                    ) : (
                      <span className="text-[9px] text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB HISTÓRICO (cuentas viejas siso_saved_bills_drcucalon)
// ════════════════════════════════════════════════════════════════════════════
function HistoricoTab({ cuentas }) {
  const total = cuentas.reduce((a, c) => a + (parseFloat(c.amount) || 0), 0);
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-700" />
        <p className="font-black text-amber-900">Cuentas históricas (solo lectura)</p>
      </div>
      <p className="text-xs text-amber-800 mb-4">
        Estas {cuentas.length} cuentas fueron creadas con el sistema anterior (siso_saved_bills_drcucalon).
        No suman al total mensual de Contabilidad V2. Total histórico: <b>{fmtCOP(total)}</b>.
      </p>
      <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-amber-100">
            <tr>
              <th className="px-3 py-2 text-left font-bold">Núm</th>
              <th className="px-3 py-2 text-left font-bold">Fecha</th>
              <th className="px-3 py-2 text-left font-bold">Cliente</th>
              <th className="px-3 py-2 text-left font-bold">NIT</th>
              <th className="px-3 py-2 text-right font-bold">Monto</th>
              <th className="px-3 py-2 text-left font-bold">Concepto</th>
            </tr>
          </thead>
          <tbody>
            {cuentas.map((c, i) => (
              <tr key={i} className="border-b border-amber-50">
                <td className="px-3 py-2 font-mono">{c.number || "?"}</td>
                <td className="px-3 py-2">{c.date || c.savedAt?.slice(0, 10) || "—"}</td>
                <td className="px-3 py-2 font-bold">{c.clientName || "—"}</td>
                <td className="px-3 py-2 font-mono text-gray-500">{c.clientNit || "—"}</td>
                <td className="px-3 py-2 text-right font-black">{fmtCOP(c.amount)}</td>
                <td className="px-3 py-2 text-gray-600">{(c.concept || "").slice(0, 50)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
