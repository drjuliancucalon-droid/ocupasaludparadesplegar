// src/components/modals/PortalPublicoTrabajador.jsx
import React from 'react';
import { Search, CheckCircle2, AlertCircle, WifiOff, X } from 'lucide-react';

const PortalPublicoTrabajador = ({ sbUrl, sbKey, onVolver }) => {
  const { useState, useCallback, useRef } = React;
  const [busqueda, setBusqueda] = React.useState("");
  const [tipoBusqueda, setTipoBusqueda] = React.useState("codigo");
  const [resultado, setResultado] = React.useState(null);
  const [error, setError] = React.useState("");
  const [cargando, setCargando] = React.useState(false);
  const [intentos, setIntentos] = React.useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = React.useState(0);
  const MAX_INTENTOS = 6;
  const BLOQUEO_MS = 5 * 60 * 1000; // 5 minutos

  // Fetch con timeout compatible con todos los navegadores (sin AbortSignal.timeout)
  const fetchConTimeout = (url, opts, ms = 10000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() =>
      clearTimeout(timer)
    );
  };

  const buscar = async () => {
    const ahora = Date.now();
    if (ahora < bloqueadoHasta) {
      const restMin = Math.ceil((bloqueadoHasta - ahora) / 60000);
      setError(
        `🔒 Demasiados intentos. Espere ${restMin} minuto(s) antes de intentar.`
      );
      return;
    }
    const q = busqueda.trim();
    if (!q) {
      setError("Ingrese su código de verificación o número de cédula.");
      return;
    }
    if (q.length < 4) {
      setError("El código o cédula debe tener al menos 4 caracteres.");
      return;
    }
    setCargando(true);
    setError("");
    setResultado(null);
    try {
      // ── Construcción de claves de búsqueda ───────────────────────────────────
      // Formatos históricos coexistentes:
      //   ANTIGUO: CV-XXXXXXXXX  (p.ej. CV-I64CIYHE7)  - 71 HCs
      //   NUEVO:   SISO-YYYYMMDD-ID-HASH16              - desde 2026-03
      // El portal busca con el prefijo siso_portal_ en Supabase
      // Para búsqueda por código: intentar la clave exacta
      // Para búsqueda por cédula: intentar siso_portal_doc_CEDULA

      const headers = {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      const fetchKey = async (key) => {
        const url = `${sbUrl}/rest/v1/siso_store?key=eq.${encodeURIComponent(
          key
        )}&select=value`;
        const r = await fetchConTimeout(url, { headers }, 12000);
        if (!r.ok) return { ok: false, status: r.status, text: r.statusText };
        const rows = await r.json();
        const val = rows && rows.length > 0 ? rows[0].value : null;
        return {
          ok: true,
          data: val ? (typeof val === "string" ? JSON.parse(val) : val) : null,
        };
      };

      // Intentar todas las variantes de clave posibles
      let pac = null;
      let firstError = null;
      if (tipoBusqueda === "codigo") {
        const qUp = q.toUpperCase();
        // 1) Clave exacta tal como viene
        const r1 = await fetchKey("siso_portal_" + qUp);
        if (!r1.ok) {
          firstError = r1;
        } else if (r1.data) {
          pac = r1.data;
        }
        // 2) Si el código no tiene prefijo CV- ni SISO-, probar con CV- delante
        if (!pac && !qUp.startsWith("CV-") && !qUp.startsWith("SISO-")) {
          const r2 = await fetchKey("siso_portal_CV-" + qUp);
          if (r2.ok && r2.data) pac = r2.data;
        }
        // 3) Probar código exacto sin normalizar (algunos códigos tienen minúsculas)
        if (!pac && qUp !== q.trim()) {
          const r3 = await fetchKey("siso_portal_" + q.trim());
          if (r3.ok && r3.data) pac = r3.data;
        }
        // 4) Buscar por código directamente en siso_store (formato antiguo no-portal)
        if (!pac) {
          const r4 = await fetchKey(qUp);
          if (r4.ok && r4.data && r4.data.codigoVerificacion) pac = r4.data;
        }
        // 5) Búsqueda por dígito verificador flexible (sin guión, con guión)
        if (!pac) {
          const codeNoDash = qUp.replace(/-/g, "");
          const r5 = await fetchKey("siso_portal_" + codeNoDash);
          if (r5.ok && r5.data) pac = r5.data;
        }
      } else {
        // Búsqueda por cédula
        const docClean = q.replace(/\s/g, "");
        const r1 = await fetchKey("siso_portal_doc_" + docClean);
        if (!r1.ok) {
          firstError = r1;
        } else if (r1.data) pac = r1.data;
      }

      if (firstError && !pac) {
        if (firstError.status === 401 || firstError.status === 403) {
          setError(
            "⚙️ El portal requiere configuración en Supabase.\nEjecute en el SQL Editor de Supabase:\nCREATE POLICY portal_public_read ON siso_store FOR SELECT USING (key LIKE 'siso_portal_%');"
          );
        } else {
          setError(`Error ${firstError.status}: ${firstError.text}`);
        }
        return;
      }
      setIntentos((prev) => {
        const n = prev + 1;
        if (n >= MAX_INTENTOS) setBloqueadoHasta(Date.now() + BLOQUEO_MS);
        return n;
      });
      if (!pac) {
        setError(
          tipoBusqueda === "codigo"
            ? "❌ Código no encontrado. Aceptamos formatos CV-XXXXXXX y SISO-FECHA-ID-HASH. Verifique mayúsculas y que la HC esté cerrada."
            : "❌ Número de cédula no encontrado. Solo aparecen evaluaciones con historia cerrada."
        );
      } else {
        setResultado(pac);
      }
    } catch (e) {
      if (e.name === "AbortError")
        setError(
          "⏱️ Tiempo de espera agotado. Verifique su conexión a internet."
        );
      else setError("Error de conexión: " + (e.message || "desconocido"));
    } finally {
      setCargando(false);
    }
  };

  const colorAptitud = (c = "") => {
    const cl = (c || "").toLowerCase();
    if (cl.includes("no apto"))
      return {
        bg: "bg-red-50",
        text: "text-red-800",
        badge: "bg-red-100 text-red-800 border-red-300",
        dot: "🔴",
      };
    if (
      cl.includes("condicion") ||
      cl.includes("condición") ||
      cl.includes("restricc")
    )
      return {
        bg: "bg-amber-50",
        text: "text-amber-800",
        badge: "bg-amber-100 text-amber-800 border-amber-300",
        dot: "🟡",
      };
    if (cl.includes("apto"))
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-800",
        badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
        dot: "🟢",
      };
    return {
      bg: "bg-gray-50",
      text: "text-gray-700",
      badge: "bg-gray-100 text-gray-700 border-gray-300",
      dot: "⚪",
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 font-sans flex flex-col">
      {/* ── Barra superior ── */}
      <div className="bg-gradient-to-r from-teal-700 to-blue-700 px-5 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
            🧑‍💼
          </div>
          <div>
            <h1 className="text-white font-black text-sm tracking-tight">
              Portal del Trabajador
            </h1>
            <p className="text-teal-200 text-[10px]">
              Servicio Médico Ocupacional · SISO OcupaSalud
            </p>
          </div>
        </div>
        {onVolver && (
          <button
            onClick={onVolver}
            className="text-white/80 text-xs hover:text-white font-bold flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
          >
            ← Volver al sistema
          </button>
        )}
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4 mt-2">
        {/* ── Instrucciones ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-teal-100 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">📋</span>
            <div>
              <h2 className="font-black text-gray-800 text-sm">
                Consulta tu evaluación médica
              </h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Ingresa el código entregado por el médico o tu número de cédula
                para ver el resultado de tu examen de aptitud laboral.
              </p>
            </div>
          </div>
        </div>

        {/* ── Formulario ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          {/* Selector tipo búsqueda */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            {[
              { v: "codigo", label: "🔑 Código", hint: "SISO-2025-XXXX" },
              { v: "cedula", label: "🪪 Cédula", hint: "1234567890" },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => {
                  setTipoBusqueda(opt.v);
                  setBusqueda("");
                  setError("");
                  setResultado(null);
                }}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition ${
                  tipoBusqueda === opt.v
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Input */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">
              {tipoBusqueda === "codigo"
                ? "Código de verificación"
                : "Número de cédula (sin puntos ni espacios)"}
            </label>
            <input
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  tipoBusqueda === "codigo"
                    ? e.target.value.toUpperCase().trim()
                    : e.target.value.trim()
                )
              }
              onKeyDown={(e) => e.key === "Enter" && !cargando && buscar()}
              className="w-full p-3 border-2 border-gray-200 focus:border-teal-400 rounded-xl text-sm font-mono font-bold tracking-widest focus:outline-none transition"
              placeholder={
                tipoBusqueda === "codigo"
                  ? "Ej: SISO-2025-XXXX"
                  : "Ej: 1234567890"
              }
              maxLength={50}
              autoFocus
              autoComplete="off"
            />
          </div>
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
              <pre className="whitespace-pre-wrap font-sans">{error}</pre>
            </div>
          )}
          {/* Botón buscar */}
          <button
            onClick={buscar}
            disabled={
              cargando || !busqueda.trim() || Date.now() < bloqueadoHasta
            }
            className="w-full py-3 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2"
          >
            {cargando ? (
              <>
                <span className="animate-spin">⏳</span> Consultando...
              </>
            ) : (
              "🔍 Consultar resultado"
            )}
          </button>
          <p className="text-[9px] text-gray-400 text-center">
            Consulta segura y confidencial · Solo verás tus propios datos
            {intentos > 0 && ` · Intentos: ${intentos}/${MAX_INTENTOS}`}
          </p>
        </div>

        {/* ── Resultado ── */}
        {resultado &&
          (() => {
            const col = colorAptitud(resultado.conceptoAptitud);
            return (
              <div className="bg-white rounded-2xl shadow-sm border border-teal-100 overflow-hidden">
                {/* Header resultado */}
                <div className={`px-5 py-4 ${col.bg} border-b border-gray-100`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        Resultado de tu evaluación
                      </p>
                      <p className={`font-black text-base mt-0.5 ${col.text}`}>
                        {col.dot}{" "}
                        {resultado.conceptoAptitud || "Pendiente de concepto"}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-black px-3 py-1.5 rounded-full border ${col.badge}`}
                    >
                      {resultado.estadoHistoria || "Cerrada"}
                    </span>
                  </div>
                </div>
                {/* Datos */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["👤 Nombre", resultado.nombres],
                      [
                        "🪪 Documento",
                        `${resultado.docTipo || "CC"} ${resultado.docNumero}`,
                      ],
                      ["🏭 Empresa", resultado.empresaNombre || "--"],
                      ["💼 Cargo", resultado.cargo || "--"],
                      ["🔬 Tipo de examen", resultado.tipoExamen || "--"],
                      ["📅 Fecha evaluación", resultado.fechaExamen || "--"],
                      ["👨‍⚕️ Médico evaluador", resultado.medicoNombre || "--"],
                      [
                        "🔑 Código verificación",
                        resultado.codigoVerificacion || "--",
                      ],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="bg-gray-50 rounded-lg p-2.5 min-w-0"
                      >
                        <p className="text-[9px] font-black text-gray-400 uppercase truncate">
                          {k}
                        </p>
                        <p className="text-xs font-bold text-gray-800 mt-0.5 break-words">
                          {v || "--"}
                        </p>
                      </div>
                    ))}
                  </div>
                  {resultado.restricciones && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-[10px] font-black text-amber-700 uppercase mb-1">
                        ⚠️ Restricciones / Recomendaciones
                      </p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        {resultado.restricciones}
                      </p>
                    </div>
                  )}
                  {/* ── DESCARGAR CERTIFICADO PDF ─────────────────────────── */}
                  <button
                    onClick={() => {
                      const docData = resultado._doctorData || {
                        nombre: resultado.medicoNombre || "MÉDICO OCUPACIONAL",
                        titulo: "Médico Especialista en Salud Ocupacional",
                        licencia: "--",
                        ciudad: "Popayán",
                        email: "",
                      };
                      const firma = resultado._firma || "";
                      const _miIPS0 = currentUser?.empresaId
                        ? companies.find(
                            (c) => c.id === currentUser.empresaId
                          ) || null
                        : null;
                      const html = _generarCertificadoHTMLNormalizado(
                        resultado,
                        docData,
                        firma,
                        _miIPS0
                      );
                      const w = window.open(
                        "",
                        "_blank",
                        "width=920,height=1150"
                      );
                      if (!w) {
                        alert(
                          "El navegador bloqueó la ventana emergente. Permita los popups para descargar el certificado."
                        );
                        return;
                      }
                      // Inyectar botón flotante de descarga
                      const htmlConBtn = html.replace(
                        "</body>",
                        '<div class="np-dl">' +
                          '<button onclick="window.print()">📥 Guardar / Imprimir PDF</button>' +
                          "<p>En el diálogo de impresión,<br/>selecciona <b>Guardar como PDF</b></p>" +
                          "</div></body>"
                      );
                      w.document.write(htmlConBtn);
                      w.document.close();
                      w.focus();
                    }}
                    className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-sm transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 10v6m0 0l-3-3m3 3l3-3M3 17a3 3 0 003 3h12a3 3 0 003-3v-1M3 17V7a3 3 0 013-3h8l5 5v8"
                      />
                    </svg>
                    Descargar Certificado PDF
                  </button>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[10px] text-blue-700 leading-relaxed">
                    <p className="font-black mb-0.5">
                      🔒 Información confidencial - Res. 1995/1999
                    </p>
                    <p>
                      Tu historia clínica completa es custodiada por el médico
                      ocupacional. Para consultas sobre tu resultado, comunícate
                      con el servicio médico.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
      <div className="text-center pb-4 pt-2 text-[9px] text-gray-300">
        SISO OcupaSalud v4 · Res. 2346/2007 · Ley 1581/2012 · Res. 1843/2025
      </div>
    </div>
  );
};

const PrivacyModal = ({ onAccept }) => (
  <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 font-sans">
    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-base uppercase tracking-tight">
              Política de Privacidad y Tratamiento de Datos
            </h2>
            <p className="text-blue-100 text-[11px] font-medium">
              Ley 1581 de 2012 · Decreto 1078 de 2015
            </p>
          </div>
        </div>
      </div>
      <div className="p-5 max-h-72 overflow-y-auto text-xs text-gray-700 space-y-3 leading-relaxed">
        <p>
          <span className="font-black text-gray-900">
            Responsable del tratamiento:
          </span>{" "}
          El profesional médico registrado en esta plataforma es el responsable
          del tratamiento de los datos personales y de salud gestionados en
          OCUPASALUD.
        </p>
        <p>
          <span className="font-black text-gray-900">Datos tratados:</span>{" "}
          Datos de identificación, datos de salud (historia clínica,
          diagnósticos, resultados de exámenes) y datos laborales de los
          trabajadores evaluados.
        </p>
        <p>
          <span className="font-black text-gray-900">Finalidad:</span> Gestión
          de historias clínicas ocupacionales, emisión de certificados de
          aptitud laboral y cumplimiento del Sistema de Gestión de Seguridad y
          Salud en el Trabajo (SG-SST) conforme a la Res. 1843/2025 (deroga Res.
          2346/2007).
        </p>
        <p>
          <span className="font-black text-gray-900">Base legal:</span> El
          tratamiento de datos de salud está autorizado por la Ley 1562/2012
          (riesgos laborales) y la Resolución 1843/2025 (evaluaciones médicas
          ocupacionales - deroga Res. 2346/2007).
        </p>
        <p>
          <span className="font-black text-gray-900">Confidencialidad:</span>{" "}
          Las historias clínicas son documentos privados sometidos a reserva.
          Solo personal médico autorizado puede acceder a ellas (Res. 1995/1999
          Art. 14). Se conservan por un mínimo de 20 años (Res. 1995/1999 Art.
          15 - Archivo de Gestión 5 años + Central 10 años + Histórico 5 años).
        </p>
        <p>
          <span className="font-black text-gray-900">
            Derechos del titular (Habeas Data):
          </span>{" "}
          Conocer, actualizar, rectificar y suprimir sus datos personales. Para
          ejercer estos derechos contacte directamente al médico responsable.
        </p>
        <p className="text-[10px] text-gray-400 border-t pt-2">
          Al continuar usando esta plataforma, el profesional médico declara
          conocer y cumplir las obligaciones del responsable del tratamiento
          establecidas en la Ley 1581 de 2012 y sus decretos reglamentarios.
        </p>
      </div>
      <div className="px-5 pb-5">
        <button
          onClick={onAccept}
          className="w-full bg-gradient-to-r from-blue-700 to-blue-600 text-white py-3 rounded-xl font-black text-sm hover:opacity-90 transition shadow-lg flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" /> He leído y acepto la Política de
          Privacidad
        </button>
        <p className="text-[10px] text-center text-gray-400 mt-2">
          Esta aceptación queda registrada con fecha y hora
        </p>
        <button
          onClick={onAccept}
          className="mt-2 w-full text-[10px] text-blue-500 underline hover:text-blue-700"
        >
          Ya acepté anteriormente - Continuar al sistema
        </button>
      </div>
    </div>
  </div>
);

export default PortalPublicoTrabajador;
