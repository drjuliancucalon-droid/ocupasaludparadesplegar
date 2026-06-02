// src/components/forms/TabFormulaDerivacion.jsx
import React from 'react';
import { DERIVACIONES_CATALOG } from '../../data/catalogos.js';
import MedicamentoAutocomplete from '../ui/MedicamentoAutocomplete.jsx';
import { _generarCertificadoHTMLNormalizado } from '../../utils/normativa.js';
import { Pill, Share2, Printer, Plus, Trash2, Search } from 'lucide-react';

const TabFormulaDerivacion = ({
  data,
  setData,
  activeDoctorData,
  activeSignature,
  forceTab,
}) => {
  const [activeSubTab, setActiveSubTab] = React.useState(forceTab || "formula");
  // When forceTab changes (switching between separate tabs), update active sub-tab
  React.useEffect(() => {
    if (forceTab) setActiveSubTab(forceTab);
  }, [forceTab]);
  const [newMed, setNewMed] = React.useState({
    nombre: "",
    presentacion: "",
    dosis: "",
    frecuencia: "",
    duracion: "",
    indicaciones: "",
  });
  const [newDeriv, setNewDeriv] = React.useState({
    especialidad: "",
    motivo: "",
    urgencia: "Electiva",
    observaciones: "",
  });
  const [derivSearch, setDerivSearch] = React.useState("");
  const [showDerivSugg, setShowDerivSugg] = React.useState(false);
  const derivRef = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => {
      if (derivRef.current && !derivRef.current.contains(e.target))
        setShowDerivSugg(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const addMedicamento = () => {
    if (!newMed.nombre) return;
    setData((p) => ({
      ...p,
      formulaMedicamentos: [
        ...(p.formulaMedicamentos || []),
        { ...newMed, id: Date.now() },
      ],
    }));
    setNewMed({
      nombre: "",
      presentacion: "",
      dosis: "",
      frecuencia: "",
      duracion: "",
      indicaciones: "",
    });
  };
  const removeMed = (id) =>
    setData((p) => ({
      ...p,
      formulaMedicamentos: (p.formulaMedicamentos || []).filter(
        (m) => m.id !== id
      ),
    }));
  const addDerivacion = () => {
    if (!newDeriv.especialidad) return;
    setData((p) => ({
      ...p,
      derivaciones: [
        ...(p.derivaciones || []),
        { ...newDeriv, id: Date.now() },
      ],
    }));
    setNewDeriv({
      especialidad: "",
      motivo: "",
      urgencia: "Electiva",
      observaciones: "",
    });
    setDerivSearch("");
  };
  const removeDerivacion = (id) =>
    setData((p) => ({
      ...p,
      derivaciones: (p.derivaciones || []).filter((d) => d.id !== id),
    }));
  const filteredDeriv =
    derivSearch.length >= 1
      ? DERIVACIONES_CATALOG.filter(
          (d) =>
            d.esp.toLowerCase().includes(derivSearch.toLowerCase()) ||
            d.motivo.toLowerCase().includes(derivSearch.toLowerCase())
        ).slice(0, 15)
      : [];
  const today = new Date().toISOString().split("T")[0];
  // ── Genera ventana de impresión premium con HTML nativo ──────────────────
  // No captura innerHTML (pierde íconos). Genera HTML directamente del state.
  const buildPrintHeader = (titleDoc, accentColor) => {
    const fechaDoc =
      data.fechaExamen ||
      data.fechaConsulta ||
      new Date().toLocaleDateString("es-CO");
    // FIX M-04: sanitizar TODOS los campos de usuario para document.write
    const docName = _sanitize(activeDoctorData?.nombre || "");
    const docTitulo = _sanitize(activeDoctorData?.titulo || "");
    const docLic = _sanitize(activeDoctorData?.licencia || "");
    const docCiudad = _sanitize(activeDoctorData?.ciudad || "");
    const docCel = _sanitize(activeDoctorData?.celular || "");
    const docEmail = _sanitize(activeDoctorData?.email || "");
    const pNombre = _sanitize(data.nombres || "---");
    const pDocTipo = _sanitize(data.docTipo || "CC");
    const pDocNum = _sanitize(data.docNumero || "---");
    const pEdad = _sanitize(String(data.edad || "--"));
    const pGenero = _sanitize(data.genero || "---");
    const pEps = _sanitize(data.eps || "---");
    const pArl = _sanitize(data.arl || "---");
    const pAfp = _sanitize(data.afp || "---");
    const pEmpresa = _sanitize(data.empresaNombre || "---");
    const pCargo = _sanitize(data.cargo || "---");
    const pTipo = _sanitize(data.tipoExamen || data.motivoConsulta || "---");
    const pId = _sanitize((data.id || "").toString().slice(-6) || "------");
    const accentSafe = /^#[0-9a-fA-F]{3,6}$/.test(accentColor)
      ? accentColor
      : "#059669";

    // ── PASO 2: Cabecera IPS — columna izquierda muestra empresa si hay empresaId ──
    const miIPS = currentUser?.empresaId
      ? companies.find((c) => c.id === currentUser.empresaId)
      : null;
    const leftColumn = miIPS
      ? (() => {
          const ipsNombre = _sanitize(miIPS.nombre || "");
          const ipsNit = _sanitize(miIPS.nit || "");
          const ipsDv = _sanitize(miIPS.dv || "");
          const ipsDir = _sanitize(miIPS.direccion || "");
          const ipsCiudad = _sanitize(miIPS.ciudad || "");
          const ipsTel = _sanitize(miIPS.telefono || "");
          const ipsEmail = _sanitize(miIPS.correo || "");
          const ipsLema = _sanitize(miIPS.lema || "");
          const ipsLogo = _safeLogoUrl(miIPS.logo || ""); // SEC-FIX-02
          const logoHtml = ipsLogo
            ? `<img src="${ipsLogo}" style="max-height:40px;max-width:90px;object-fit:contain;display:block;margin-bottom:4px;" />`
            : "";
          return `<div style="width:32%;padding-right:8px;">
            ${logoHtml}
            <p style="font-size:10pt;font-weight:900;color:${accentSafe};text-transform:uppercase;margin:0 0 2px 0;">${ipsNombre}</p>
            ${
              ipsNit
                ? `<p style="font-size:7.5pt;color:#555;margin:1px 0;">NIT: ${ipsNit}${
                    ipsDv ? "-" + ipsDv : ""
                  }</p>`
                : ""
            }
            ${
              ipsDir
                ? `<p style="font-size:7.5pt;color:#555;margin:1px 0;">${ipsDir}${
                    ipsCiudad ? " · " + ipsCiudad : ""
                  }</p>`
                : ""
            }
            ${
              ipsTel
                ? `<p style="font-size:7.5pt;color:#555;margin:1px 0;">Tel: ${ipsTel}</p>`
                : ""
            }
            ${
              ipsEmail
                ? `<p style="font-size:7.5pt;color:#555;margin:1px 0;">${ipsEmail}</p>`
                : ""
            }
            ${
              ipsLema
                ? `<p style="font-size:7pt;color:#888;font-style:italic;margin:2px 0;">${ipsLema}</p>`
                : ""
            }
          </div>`;
        })()
      : `<div style="width:32%;padding-right:8px;">
          <p style="font-size:10.5pt;font-weight:900;color:${accentSafe};text-transform:uppercase;margin:0 0 3px 0;">${docName}</p>
          <p style="font-size:7.5pt;color:#555;margin:1px 0;">${docTitulo}</p>
          <p style="font-size:7.5pt;color:#555;margin:1px 0;">Lic. Med.: ${docLic}</p>
          <p style="font-size:7.5pt;color:#555;margin:1px 0;">${docCiudad} | Cel: ${docCel}</p>
          <p style="font-size:7.5pt;color:#555;margin:1px 0;">${docEmail}</p>
        </div>`;

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${accentSafe};padding-bottom:10px;margin-bottom:14px;">
        ${leftColumn}
        <div style="width:34%;text-align:center;border-left:1px solid #ddd;border-right:1px solid #ddd;padding:0 10px;">
          <p style="font-size:13pt;font-weight:900;color:${accentSafe};text-transform:uppercase;margin:2px 0;">${_sanitize(
      titleDoc
    )}</p>
          <p style="font-size:7pt;color:#888;margin:2px 0;">Res. 1995&#x2F;1999 · Res. 1843&#x2F;2025</p>
          <p style="font-size:8pt;font-weight:700;color:#333;margin:5px 0 2px 0;">Fecha: ${_sanitize(
            fechaDoc
          )}</p>
          <p style="font-size:7.5pt;color:#666;margin:1px 0;">Reg. # ${pId}</p>
        </div>
        <div style="width:32%;text-align:right;padding-left:8px;">
          <p style="font-size:10.5pt;font-weight:900;color:${accentSafe};text-transform:uppercase;margin:0 0 3px 0;">${pNombre}</p>
          <p style="font-size:7.5pt;color:#444;margin:1px 0;">${pDocTipo}: <b>${pDocNum}</b> &nbsp;|&nbsp; Edad: <b>${pEdad} años</b></p>
          <p style="font-size:7.5pt;color:#444;margin:1px 0;">Sexo: ${pGenero} &nbsp;|&nbsp; EPS: <b>${pEps}</b></p>
          <p style="font-size:7.5pt;color:#444;margin:1px 0;">ARL: <b>${pArl}</b> &nbsp;|&nbsp; AFP: ${pAfp}</p>
          <p style="font-size:7.5pt;color:#444;margin:1px 0;">Empresa: <b>${pEmpresa}</b></p>
          <p style="font-size:7.5pt;color:#444;margin:1px 0;">Cargo: <b>${pCargo}</b> | Tipo: ${pTipo}</p>
        </div>
      </div>`;
  };
  const baseWindowStyle = `
    @page{size:letter portrait;margin:1.1cm 1.3cm 1.3cm 1.3cm;}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
    body{font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;color:#111;margin:0;padding:0;line-height:1.45;}
    .badge{display:inline-block;padding:1px 7px;border-radius:50px;font-size:7.5pt;font-weight:700;}
    .section-title{font-size:8.5pt;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid currentColor;padding-bottom:3px;margin:12px 0 6px 0;}
    .med-card{border:1px solid #d1fae5;border-left:4px solid #059669;border-radius:4px;padding:6px 10px;margin-bottom:6px;page-break-inside:avoid;background:#f0fdf4;}
    .med-num{background:#059669;color:white;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:8pt;font-weight:900;flex-shrink:0;}
    .deriv-card{border:1px solid #bfdbfe;border-left:4px solid #2563eb;border-radius:4px;padding:8px 10px;margin-bottom:7px;page-break-inside:avoid;background:#eff6ff;}
    .urgente{background:#fee2e2;color:#dc2626;} .prioritaria{background:#fef3c7;color:#92400e;} .electiva{background:#dcfce7;color:#166534;}
    .sig-block{display:flex;justify-content:space-between;align-items:flex-end;margin-top:18mm;padding-top:0;}
    .sig-line{text-align:center;width:42%;}
    .sig-line-top{border-top:2px solid #222;padding-top:4px;font-size:7.5pt;font-weight:700;}
    @media print{body{font-size:9pt;} .no-print{display:none!important;}}
  `;
  const openSingleMedWindow = (med, idx) => {
    const w = window.open("", "_blank", "width=600,height=700");
    if (!w) return;
    const accent = "#059669";
    const header = buildPrintHeader("Prescripción Individual", accent);
    const singleMedHtml = `
      <div class="med-card" style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;">
        <span class="med-num">${idx + 1}</span>
        <div style="flex:1;">
          <p style="font-size:12pt;font-weight:900;color:#065f46;margin:0 0 4px 0;">${_sanitize(
            med.nombre || ""
          )} <span style="font-size:9pt;font-weight:400;color:#555;">(${_sanitize(
      med.presentacion || ""
    )})</span></p>
          <p style="font-size:9.5pt;color:#374151;margin:2px 0;"><b>Dosis:</b> ${_sanitize(
            med.dosis || "--"
          )} &nbsp;·&nbsp; <b>Frecuencia:</b> ${_sanitize(
      med.frecuencia || "--"
    )} &nbsp;·&nbsp; <b>Duración:</b> ${_sanitize(med.duracion || "--")}</p>
          ${
            med.indicaciones
              ? `<p style="font-size:9pt;color:#92400e;font-style:italic;margin:4px 0;">⚠ ${_sanitize(
                  med.indicaciones
                )}</p>`
              : ""
          }
        </div>
      </div>
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:4px;padding:8px 12px;margin-top:8px;">
        <p style="font-size:8.5pt;"><b>Diagnóstico:</b> ${_sanitize(
          data.diagnosticoPrincipal ||
            (data.diagnosticos || [])[0]?.descripcion ||
            "--"
        )}</p>
        <p style="font-size:8.5pt;"><b>Control en:</b> ${_sanitize(
          data.frecuenciaSeguimiento || data.plan?.controlEn || "--"
        )}</p>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:16mm;padding-top:0;">
        <div style="text-align:center;width:42%;">
          <div style="border-top:2px solid #222;padding-top:4px;font-size:7.5pt;font-weight:700;">Firma del Paciente / Responsable</div>
          <p style="font-size:7.5pt;color:#6b7280;margin:2px 0;">Nombre: _______________________</p>
          <p style="font-size:7.5pt;color:#6b7280;margin:2px 0;">Documento: ____________________</p>
        </div>
        <div style="text-align:center;width:42%;">
          ${
            activeSignature
              ? `<img src="${activeSignature}" style="max-height:50px;max-width:130px;object-fit:contain;display:block;margin:0 auto 4px;"/>`
              : '<div style="height:50px;"></div>'
          }
          <div style="border-top:2px solid #222;padding-top:4px;">
            <p style="font-size:8.5pt;font-weight:900;margin:2px 0;">${_sanitize(
              activeDoctorData?.nombre || ""
            )}</p>
            <p style="font-size:7.5pt;color:#555;margin:1px 0;">${_sanitize(
              activeDoctorData?.titulo || ""
            )}</p>
            <p style="font-size:7.5pt;color:#555;margin:1px 0;">Lic: ${_sanitize(
              activeDoctorData?.licencia || ""
            )}</p>
          </div>
        </div>
      </div>`;
    w.document
      .write(`<!DOCTYPE html><html lang="es"><head><title>Receta - ${_sanitize(
      med.nombre
    )}</title><meta charset="UTF-8"/><style>
${baseWindowStyle}
.print-toolbar{position:fixed;top:0;left:0;right:0;background:#065f46;color:white;padding:8px 14px;display:flex;align-items:center;gap:10px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.25);}
.print-toolbar .ptitle{flex:1;font-size:9.5pt;font-weight:700;}
.print-toolbar button{border:none;padding:6px 14px;border-radius:6px;font-weight:900;cursor:pointer;font-size:9pt;}
.print-toolbar button.btn-print{background:#10b981;color:white;}
.print-toolbar button.btn-close{background:#ef4444;color:white;}
.print-toolbar .hint{font-size:7.5pt;color:#6ee7b7;}
[contenteditable]{outline:1.5px dashed #6ee7b7;border-radius:3px;padding:1px 3px;cursor:text;}
[contenteditable]:focus{outline:2px solid #10b981;background:#ecfdf5;}
body{padding-top:52px;}
@media print{.print-toolbar{display:none!important;}[contenteditable]{outline:none!important;background:transparent!important;}}
</style></head><body>
<div class="print-toolbar">
  <span class="ptitle">💊 Receta - ${_sanitize(med.nombre)}</span>
  <span class="hint">Edita el texto antes de imprimir</span>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir receta</button>
  <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
</div>
<div contenteditable="false">${header}</div>
<div contenteditable="true" spellcheck="false">${singleMedHtml}</div>
</body></html>`);
    w.document.close();
    w.focus();
  };

  const openPrintWindow = (section, titleDoc) => {
    const w = window.open("", "_blank", "width=870,height=1100");
    if (!w) return;
    const accentFormula = "#059669";
    const accentDeriv = "#2563eb";
    const accent = section === "formula" ? accentFormula : accentDeriv;
    const header = buildPrintHeader(titleDoc, accent);
    let bodyHtml = "";
    if (section === "formula") {
      const meds = data.formulaMedicamentos || [];
      const medsHtml =
        meds.length > 0
          ? meds
              .map(
                (m, i) => `
        <div class="med-card" style="display:flex;gap:10px;align-items:flex-start;">
          <span class="med-num">${i + 1}</span>
          <div style="flex:1;">
            <p style="font-size:10pt;font-weight:900;color:#065f46;margin:0 0 2px 0;">${_sanitize(
              m.nombre || ""
            )} <span style="font-size:8pt;font-weight:400;color:#6b7280;">${_sanitize(
                  m.presentacion || ""
                )}</span></p>
            <p style="font-size:8.5pt;color:#374151;margin:1px 0;"><b>Dosis:</b> ${_sanitize(
              m.dosis || "--"
            )} &nbsp;·&nbsp; <b>Frec.:</b> ${_sanitize(
                  m.frecuencia || "--"
                )} &nbsp;·&nbsp; <b>Duración:</b> ${_sanitize(
                  m.duracion || "--"
                )}</p>
            ${
              m.indicaciones
                ? `<p style="font-size:8pt;color:#92400e;font-style:italic;margin:2px 0;">&#9888; ${_sanitize(
                    m.indicaciones
                  )}</p>`
                : ""
            }
          </div>
        </div>`
              )
              .join("")
          : '<p style="color:#9ca3af;font-style:italic;text-align:center;padding:12px 0;">Sin medicamentos prescritos.</p>';
      const dx = _sanitize(
        data.diagnosticoPrincipal ||
          (data.diagnosticos || [])[0]?.descripcion ||
          data.diagnosticos?.[0]?.cie10 ||
          "--"
      );
      const control = _sanitize(
        data.frecuenciaSeguimiento || data.plan?.controlEn || "--"
      );
      const planMeds =
        !meds.length && data.plan?.medicamentos
          ? `<div style="margin-top:10px;"><p style="font-weight:700;font-size:8.5pt;color:#374151;border-bottom:1px solid #d1d5db;padding-bottom:3px;margin-bottom:5px;">PRESCRIPCIÓN</p><p style="font-size:8.5pt;white-space:pre-wrap;">${_sanitize(
              data.plan.medicamentos
            )}</p></div>`
          : "";
      bodyHtml = `
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:4px;padding:10px 12px;margin-bottom:12px;">
          <p class="section-title" style="color:#065f46;">&#128138; Prescripción Médica</p>
          ${medsHtml}${planMeds}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;border-top:1px solid #a7f3d0;padding-top:8px;">
            <p style="font-size:8.5pt;"><b>Diagnóstico:</b> ${dx}</p>
            <p style="font-size:8.5pt;"><b>Control en:</b> ${control}</p>
          </div>
        </div>
        <div class="sig-block">
          <div class="sig-line">
            <div class="sig-line-top">Firma del Paciente / Responsable</div>
            <p style="font-size:7.5pt;color:#6b7280;margin:2px 0;">Nombre: _______________________</p>
            <p style="font-size:7.5pt;color:#6b7280;margin:2px 0;">Documento: ____________________</p>
          </div>
          <div class="sig-line" style="text-align:center;">
            ${
              activeSignature
                ? `<img src="${activeSignature}" style="max-height:55px;max-width:150px;object-fit:contain;" alt="Firma"/>`
                : '<div style="height:55px;border-bottom:2px solid #222;"></div>'
            }
            <p style="font-size:8.5pt;font-weight:900;margin:3px 0;">${_sanitize(
              activeDoctorData?.nombre || ""
            )}</p>
            <p style="font-size:7.5pt;color:#555;margin:1px 0;">${_sanitize(
              activeDoctorData?.titulo || ""
            )}</p>
            <p style="font-size:7.5pt;color:#555;margin:1px 0;">Lic: ${_sanitize(
              activeDoctorData?.licencia || ""
            )}</p>
          </div>
        </div>`;
    } else if (section === "derivacion") {
      const derivs = data.derivaciones || [];
      const derivHtml =
        derivs.length > 0
          ? derivs
              .map((d, i) => {
                const urgClass =
                  d.urgencia === "Urgente"
                    ? "urgente"
                    : d.urgencia === "Prioritaria"
                    ? "prioritaria"
                    : "electiva";
                return `
          <div class="deriv-card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
              <span style="background:#2563eb;color:white;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:8pt;font-weight:900;">${
                i + 1
              }</span>
              <span style="font-size:10.5pt;font-weight:900;color:#1e3a8a;">${_sanitize(
                d.especialidad || "--"
              )}</span>
              <span class="badge ${urgClass}">${_sanitize(
                  d.urgencia || "Electiva"
                )}</span>
            </div>
            <p style="font-size:8.5pt;color:#374151;margin:3px 0;"><b>Motivo:</b> ${_sanitize(
              d.motivo || "--"
            )}</p>
            ${
              d.observaciones
                ? `<p style="font-size:8pt;color:#6b7280;font-style:italic;margin:2px 0;">${_sanitize(
                    d.observaciones
                  )}</p>`
                : ""
            }
          </div>`;
              })
              .join("")
          : '<p style="color:#9ca3af;font-style:italic;text-align:center;padding:12px 0;">Sin derivaciones registradas.</p>';
      bodyHtml = `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;padding:10px 12px;margin-bottom:12px;">
          <p class="section-title" style="color:#1e3a8a;">&#127973; Derivaciones / Interconsultas</p>
          ${derivHtml}
        </div>
        <div class="sig-block">
          <div class="sig-line">
            <div class="sig-line-top">Firma del Paciente / Responsable</div>
            <p style="font-size:7.5pt;color:#6b7280;margin:2px 0;">Nombre: _______________________</p>
          </div>
          <div class="sig-line" style="text-align:center;">
            ${
              activeSignature
                ? `<img src="${activeSignature}" style="max-height:55px;max-width:150px;object-fit:contain;" alt="Firma"/>`
                : '<div style="height:55px;border-bottom:2px solid #222;"></div>'
            }
            <p style="font-size:8.5pt;font-weight:900;margin:3px 0;">${
              activeDoctorData?.nombre || ""
            }</p>
            <p style="font-size:7.5pt;color:#555;margin:1px 0;">${
              activeDoctorData?.titulo || ""
            }</p>
          </div>
        </div>`;
    }
    w.document.write(`<!DOCTYPE html><html lang="es"><head><title>${_sanitize(
      titleDoc
    )} - ${_sanitize(data.nombres)}</title><meta charset="UTF-8"/><style>
${baseWindowStyle}
.print-toolbar{position:fixed;top:0;left:0;right:0;background:#1e3a5f;color:white;padding:8px 14px;display:flex;align-items:center;gap:10px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.25);}
.print-toolbar .ptitle{flex:1;font-size:9.5pt;font-weight:700;letter-spacing:.2px;}
.print-toolbar button{background:white;color:#1e3a5f;border:none;padding:6px 14px;border-radius:6px;font-weight:900;cursor:pointer;font-size:9pt;margin:0;}
.print-toolbar button.btn-print{background:#10b981;color:white;}
.print-toolbar button.btn-close{background:#ef4444;color:white;}
.print-toolbar .hint{font-size:7.5pt;color:#93c5fd;margin-left:4px;}
[contenteditable]{outline:1.5px dashed #93c5fd;border-radius:3px;padding:1px 3px;cursor:text;}
[contenteditable]:focus{outline:2px solid #3b82f6;background:#eff6ff;}
[contenteditable]:hover{outline:1.5px solid #60a5fa;}
body{padding-top:52px;}
@media print{.print-toolbar{display:none!important;}[contenteditable]{outline:none!important;background:transparent!important;}}
</style></head><body>
<div class="print-toolbar">
  <span class="ptitle">✏️ ${_sanitize(titleDoc)} - ${_sanitize(
      data.nombres
    )}</span>
  <span class="hint">Haz clic en cualquier texto para editar antes de imprimir</span>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir ahora</button>
  <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
</div>
<div contenteditable="false">${header}</div><div contenteditable="true" spellcheck="false">${bodyHtml}</div></body></html>`);
    w.document.close();
    w.focus();
    // No auto-print - el usuario edita y luego hace clic en "Imprimir ahora"
  };
  return (
    <div
      className="bg-white mx-auto shadow-2xl print:shadow-none carta-visual"
      style={{
        width: "21.59cm",
        minHeight: "auto",
        padding: "1.2cm",
        boxSizing: "border-box",
      }}
    >
      {/* Cabecera */}
      <div className="flex justify-between items-center border-b-2 border-emerald-500 pb-3 mb-3 print:border-black">
        <div className="w-1/3">
          <BrandLogo data={activeDoctorData} />
        </div>
        <div className="w-1/3 text-center">
          <h1 className="text-sm font-black text-gray-800 uppercase">
            {activeSubTab === "formula"
              ? "Fórmula Médica"
              : "Derivación / Interconsulta"}
          </h1>
          <p className="text-[9px] text-gray-500">
            Res. 1995/1999 · Res. 1843/2025
          </p>
        </div>
        <div className="w-1/3 text-right text-[9px] text-gray-500">
          <p className="font-black text-gray-800 text-[10px]">{data.nombres}</p>
          <p>
            {data.docTipo || "CC"}: {data.docNumero} · {data.edad} años
          </p>
          <p>Empresa: {data.empresaNombre || "--"}</p>
          <p>Cargo: {data.cargo || "--"}</p>
          <p>
            EPS: {data.eps || "--"} · ARL: {data.arl || "--"}
          </p>
          <p>Fecha: {data.fechaExamen || today}</p>
        </div>
      </div>
      {/* Tabs + botones de impresión individual */}
      <div className="flex gap-2 mb-4 no-print flex-wrap items-center justify-between">
        <div className="flex gap-2">
          {[
            { k: "formula", l: "💊 Fórmula Médica" },
            { k: "derivacion", l: "🏥 Derivaciones" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setActiveSubTab(t.k)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === t.k
                  ? "bg-emerald-600 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {activeSubTab === "formula" && (
            <button
              onClick={() => openPrintWindow("formula", "Fórmula Médica")}
              className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700"
            >
              <Printer className="w-3 h-3" /> Imprimir Fórmula
            </button>
          )}
          {activeSubTab === "derivacion" && (
            <button
              onClick={() =>
                openPrintWindow("derivacion", "Derivación / Interconsulta")
              }
              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700"
            >
              <Printer className="w-3 h-3" /> Imprimir Derivación
            </button>
          )}
        </div>
      </div>
      {/* ══ FÓRMULA ══ */}
      <div
        id="print-formula-sec"
        className={activeSubTab !== "formula" ? "hidden print:block" : ""}
      >
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 print:bg-transparent print:border-gray-300">
          <h3 className="font-black text-emerald-900 text-xs uppercase mb-3 flex items-center gap-2">
            <Pill className="w-4 h-4" /> Prescripción Médica
          </h3>
          {/* Input nuevo medicamento */}
          <div className="no-print mb-3 bg-white p-3 rounded-lg border border-emerald-100 space-y-2">
            <p className="text-[10px] font-bold text-gray-600 uppercase">
              Agregar Medicamento a la Fórmula
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  Medicamento
                </label>
                <MedicamentoAutocomplete
                  value={newMed.nombre}
                  onChange={(v) => setNewMed((p) => ({ ...p, nombre: v }))}
                  onSelectMed={(s) =>
                    setNewMed((p) => ({
                      ...p,
                      nombre: s.label,
                      presentacion:
                        p.presentacion || s.presentaciones?.[0] || "",
                      dosis: p.dosis || s.dosis || "",
                    }))
                  }
                  placeholder="Buscar por nombre genérico o comercial..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  Presentación
                </label>
                <input
                  value={newMed.presentacion}
                  onChange={(e) =>
                    setNewMed((p) => ({ ...p, presentacion: e.target.value }))
                  }
                  placeholder="Ej: 500mg tab"
                  className="w-full p-1.5 border rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  Dosis
                </label>
                <input
                  value={newMed.dosis}
                  onChange={(e) =>
                    setNewMed((p) => ({ ...p, dosis: e.target.value }))
                  }
                  placeholder="Ej: 1 tableta"
                  className="w-full p-1.5 border rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  Frecuencia
                </label>
                <input
                  value={newMed.frecuencia}
                  onChange={(e) =>
                    setNewMed((p) => ({ ...p, frecuencia: e.target.value }))
                  }
                  placeholder="Ej: c/8 horas"
                  className="w-full p-1.5 border rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  Duración
                </label>
                <input
                  value={newMed.duracion}
                  onChange={(e) =>
                    setNewMed((p) => ({ ...p, duracion: e.target.value }))
                  }
                  placeholder="Ej: 7 días"
                  className="w-full p-1.5 border rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  Indicaciones especiales
                </label>
                <input
                  value={newMed.indicaciones}
                  onChange={(e) =>
                    setNewMed((p) => ({ ...p, indicaciones: e.target.value }))
                  }
                  placeholder="Ej: con comida"
                  className="w-full p-1.5 border rounded text-xs"
                />
              </div>
            </div>
            <button
              onClick={addMedicamento}
              type="button"
              className="w-full bg-emerald-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" /> Agregar a la Fórmula
            </button>
          </div>
          {/* Lista */}
          {(data.formulaMedicamentos || []).length > 0 ? (
            <div className="space-y-2">
              {(data.formulaMedicamentos || []).map((med, idx) => (
                <div
                  key={med.id || idx}
                  className="bg-white border border-emerald-200 rounded-lg p-2 flex gap-3 items-start print:border-gray-300 print-break-avoid"
                >
                  <div className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-black text-xs flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm text-gray-900">
                      {med.nombre}{" "}
                      <span className="font-normal text-gray-500 text-xs">
                        {med.presentacion}
                      </span>
                    </p>
                    <p className="text-xs text-gray-700 mt-0.5">
                      <b>Dosis:</b> {med.dosis}&nbsp;·&nbsp;<b>Frec:</b>{" "}
                      {med.frecuencia}&nbsp;·&nbsp;<b>Dur:</b> {med.duracion}
                    </p>
                    {med.indicaciones && (
                      <p className="text-[10px] text-amber-700 mt-0.5 italic">
                        ⚠ {med.indicaciones}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 no-print">
                    <button
                      onClick={() => openSingleMedWindow(med, idx)}
                      title="Imprimir esta receta individual"
                      className="flex items-center gap-0.5 bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 rounded-lg px-2 py-1 text-[10px] font-bold transition"
                    >
                      <Printer className="w-3 h-3" /> Imprimir
                    </button>
                    <button
                      onClick={() => removeMed(med.id || idx)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-xs italic py-3">
              Sin medicamentos en la fórmula.
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">
                Diagnóstico
              </label>
              <input
                value={data.diagnosticoPrincipal || ""}
                readOnly
                className="w-full p-1.5 border-b border-gray-300 text-xs bg-transparent font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">
                Control en
              </label>
              <input
                value={data.frecuenciaSeguimiento || ""}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    frecuenciaSeguimiento: e.target.value,
                  }))
                }
                placeholder="Ej: 15 días"
                className="w-full p-1.5 border-b border-gray-300 text-xs outline-none"
              />
            </div>
          </div>
        </div>
        {/* Firma fórmula - solo impresión */}
        <div className="hidden print:flex mt-8 justify-between items-end px-2 signature-block">
          <div className="text-center w-2/5 pt-8 border-t-2 border-gray-800">
            <p className="text-[10px] font-bold">
              Firma del Paciente / Responsable
            </p>
            <p className="text-[9px] text-gray-500">
              Nombre: ____________________________
            </p>
          </div>
          <div className="text-center w-2/5">
            <DoctorSignature
              signature={activeSignature}
              data={activeDoctorData}
              showData={true}
            />
          </div>
        </div>
      </div>
      {/* ══ DERIVACIONES ══ */}
      <div
        id="print-deriv-sec"
        className={activeSubTab !== "derivacion" ? "hidden print:block" : ""}
      >
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 print:bg-transparent print:border-gray-300">
          <h3 className="font-black text-blue-900 text-xs uppercase mb-3 flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Derivaciones / Interconsultas
          </h3>
          {/* Formulario agregar derivación */}
          <div
            className="no-print mb-3 bg-white p-3 rounded-lg border border-blue-100"
            ref={derivRef}
          >
            <p className="text-[10px] font-bold text-gray-600 uppercase mb-2">
              Agregar Derivación
            </p>
            {/* Barra de búsqueda interactiva de especialidades */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-blue-400 pointer-events-none" />
              <input
                value={derivSearch}
                onChange={(e) => {
                  setDerivSearch(e.target.value);
                  setShowDerivSugg(true);
                }}
                onFocus={() => setShowDerivSugg(true)}
                placeholder="Filtrar especialidad por nombre o motivo..."
                className="w-full pl-8 p-1.5 border border-blue-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-300 outline-none"
              />
              {showDerivSugg && filteredDeriv.length > 0 && (
                <div className="absolute z-50 bg-white border border-blue-200 rounded-xl shadow-xl mt-0.5 w-full max-h-48 overflow-y-auto">
                  {filteredDeriv.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setNewDeriv((p) => ({
                          ...p,
                          especialidad: d.esp,
                          motivo: d.motivo,
                        }));
                        setDerivSearch(d.esp);
                        setShowDerivSugg(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 border-b border-gray-50 last:border-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-800 text-xs">
                          {d.esp}
                        </span>
                        {d.tipo && (
                          <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 rounded">
                            {d.tipo}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        {d.motivo}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Chips de especialidades frecuentes */}
            <div className="flex flex-wrap gap-1 mb-2">
              {SPECIALTIES_LIST.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() =>
                    setNewDeriv((p) => ({ ...p, especialidad: sp }))
                  }
                  className={`text-[9px] px-2 py-0.5 rounded-full border font-bold transition-all ${
                    newDeriv.especialidad === sp
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  Especialidad seleccionada
                </label>
                <input
                  value={newDeriv.especialidad}
                  onChange={(e) =>
                    setNewDeriv((p) => ({ ...p, especialidad: e.target.value }))
                  }
                  placeholder="Especialidad..."
                  className="w-full p-1.5 border rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  Urgencia
                </label>
                <select
                  value={newDeriv.urgencia}
                  onChange={(e) =>
                    setNewDeriv((p) => ({ ...p, urgencia: e.target.value }))
                  }
                  className="w-full p-1.5 border rounded text-xs"
                >
                  <option>Electiva</option>
                  <option>Prioritaria</option>
                  <option>Urgente</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  Motivo de la derivación{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={newDeriv.motivo}
                  onChange={(e) =>
                    setNewDeriv((p) => ({ ...p, motivo: e.target.value }))
                  }
                  placeholder="Describa el motivo clínico de la derivación..."
                  className="w-full p-1.5 border rounded text-xs resize-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  Observaciones
                </label>
                <input
                  value={newDeriv.observaciones}
                  onChange={(e) =>
                    setNewDeriv((p) => ({
                      ...p,
                      observaciones: e.target.value,
                    }))
                  }
                  placeholder="Antecedentes relevantes, información adicional..."
                  className="w-full p-1.5 border rounded text-xs"
                />
              </div>
            </div>
            <button
              onClick={addDerivacion}
              type="button"
              className="w-full bg-blue-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1 mt-2"
            >
              <Plus className="w-3 h-3" /> Agregar Derivación
            </button>
          </div>
          {/* Lista derivaciones */}
          {(data.derivaciones || []).length > 0 ? (
            <div className="space-y-2">
              {(data.derivaciones || []).map((der, idx) => (
                <div
                  key={der.id || idx}
                  className="bg-white border border-blue-200 rounded-lg p-2.5 print:border-gray-300 print-break-avoid"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-black text-sm text-blue-900">
                          {der.especialidad}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            der.urgencia === "Urgente"
                              ? "bg-red-100 text-red-700"
                              : der.urgencia === "Prioritaria"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {der.urgencia}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700">
                        <b>Motivo:</b> {der.motivo}
                      </p>
                      {der.observaciones && (
                        <p className="text-[10px] text-gray-500 mt-0.5 italic">
                          {der.observaciones}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeDerivacion(der.id || idx)}
                      className="text-red-400 hover:text-red-600 no-print ml-2 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-xs italic py-3">
              No hay derivaciones registradas.
            </p>
          )}
        </div>
        {/* Firma derivación - solo impresión */}
        <div className="hidden print:flex mt-8 justify-between items-end px-2 signature-block">
          <div className="text-center w-2/5 pt-8 border-t-2 border-gray-800">
            <p className="text-[10px] font-bold">
              Firma del Paciente / Responsable
            </p>
            <p className="text-[9px] text-gray-500">
              Nombre: ____________________________
            </p>
          </div>
          <div className="text-center w-2/5">
            <DoctorSignature
              signature={activeSignature}
              data={activeDoctorData}
              showData={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabFormulaDerivacion;
