// src/lib/printService.js — Print service for medical documents
// Sprint 3: Complete print system — HC full, certificates, disability, carnet
// Matches and extends the monolith's print capabilities

import { _sanitize } from '../shared/lib/security';

// ═══ Helpers ═══════════════════════════════════════════════════════════════
const s = (v) => _sanitize(v || '—');
const date = (v) => v ? new Date(v).toLocaleDateString('es-CO') : '—';
const yn = (v) => v ? 'Sí' : 'No';

const conceptoBadge = (concepto) => {
  if (!concepto) return '';
  const map = {
    'Apto': 'badge-green',
    'Apto con restricciones': 'badge-yellow',
    'Apto con recomendaciones': 'badge-yellow',
    'No apto': 'badge-red',
    'Aplazado': 'badge-red',
  };
  const cls = map[concepto] || 'badge-green';
  return `<span class="badge ${cls}">${s(concepto)}</span>`;
};

// ═══ openPrintWindow ═══════════════════════════════════════════════════════
/**
 * Open a print window with formatted content
 * @param {string} title - Document title
 * @param {string} htmlContent - HTML body content
 * @param {object} options - { width, height, landscape }
 */
export function openPrintWindow(title, htmlContent, options = {}) {
  const { width = 800, height = 900, landscape = false } = options;

  const printStyles = `
    @page {
      size: ${landscape ? 'landscape' : 'portrait'};
      margin: 15mm 12mm;
    }
    body {
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 9.5pt;
      line-height: 1.4;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    h1 { font-size: 14pt; margin: 8px 0; color: #059669; }
    h2 { font-size: 11pt; margin: 6px 0; color: #047857; border-bottom: 1px solid #d1fae5; padding-bottom: 3px; }
    h3 { font-size: 10pt; margin: 4px 0; color: #065f46; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    th { background: #ecfdf5; color: #065f46; font-weight: 700; text-align: left; padding: 4px 6px; font-size: 8pt; border: 1px solid #a7f3d0; }
    td { padding: 3px 6px; font-size: 8.5pt; border: 1px solid #e5e7eb; }
    .section { margin: 10px 0; page-break-inside: avoid; }
    .label { font-weight: 700; color: #374151; font-size: 8pt; }
    .value { color: #1f2937; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 7.5pt; font-weight: 700; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .signature-area { border-top: 2px solid #059669; margin-top: 20px; padding-top: 10px; }
    .qr-area { text-align: center; margin-top: 8px; }
    .footer { font-size: 7pt; color: #9ca3af; text-align: center; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 6px; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    .sys-normal { color: #059669; }
    .sys-anormal { color: #dc2626; font-weight: 700; }
    @media print {
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  const w = window.open('', '_blank', `width=${width},height=${height}`);
  if (!w) {
    alert('No se pudo abrir la ventana de impresión. Verifica que el navegador no bloquea popups.');
    return;
  }

  w.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${_sanitize(title)}</title>
  <style>${printStyles}</style>
</head>
<body>
  ${htmlContent}
  <div class="footer">
    SISO OcupaSalud Pro — Documento generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}
    <br>Res. 1843/2025 · Res. 1995/1999 · Ley 1581/2012
  </div>
</body>
</html>`);
  w.document.close();

  setTimeout(() => {
    w.focus();
    w.print();
  }, 500);
}

// ═══ generateHCPrintHTML — COMPLETE with all sections ═════════════════════
/**
 * Generate full HC print HTML — Sprint 3.1
 * Includes: identification, labor, occupational history, risk profile,
 * risk factors, antecedentes, estilos de vida, vital signs, physical exam,
 * musculoskeletal maneuvers, review by systems, paraclinical, analysis,
 * diagnoses, concept, restrictions, recommendations
 */
export function generateHCPrintHTML(data, doctorData, companyData) {
  // ── Header ──
  const header = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
      <div>
        <h1 style="margin:0;">HISTORIA CLÍNICA OCUPACIONAL</h1>
        <p style="font-size:8pt;color:#6b7280;margin:2px 0;">${s(data.tipoExamen || 'Examen Ocupacional')} — ${date(data.fechaExamen)}</p>
        <p style="font-size:7pt;color:#9ca3af;">Folio: ${s(data.folioHC || 'Auto')} · Versión: ${data.versionDocumento || 1}</p>
      </div>
      <div style="text-align:right;">
        ${doctorData?.nombre ? `<p style="font-size:9pt;font-weight:900;color:#059669;">${s(doctorData.nombre)}</p>` : ''}
        ${doctorData?.titulo ? `<p style="font-size:7.5pt;color:#6b7280;">${s(doctorData.titulo)}</p>` : ''}
        ${doctorData?.licencia ? `<p style="font-size:7.5pt;color:#6b7280;">RM: ${s(doctorData.licencia)}</p>` : ''}
      </div>
    </div>`;

  // ── Identificación ──
  const identification = `
    <div class="section">
      <h2>📋 Identificación del Paciente</h2>
      <table>
        <tr><td class="label" width="25%">Nombre</td><td>${s(data.nombres)}</td><td class="label" width="15%">Documento</td><td>${s(data.docTipo)} ${s(data.docNumero)}</td></tr>
        <tr><td class="label">Fecha Nac.</td><td>${date(data.fechaNacimiento)}</td><td class="label">Edad</td><td>${s(data.edad)} años</td></tr>
        <tr><td class="label">Género</td><td>${s(data.genero)}</td><td class="label">Estado Civil</td><td>${s(data.estadoCivil)}</td></tr>
        <tr><td class="label">Celular</td><td>${s(data.celular)}</td><td class="label">Email</td><td>${s(data.email)}</td></tr>
        <tr><td class="label">Dirección</td><td>${s(data.direccion)}</td><td class="label">Ciudad</td><td>${s(data.ciudad)}</td></tr>
        <tr><td class="label">EPS</td><td>${s(data.eps)}</td><td class="label">ARL</td><td>${s(data.arl)}</td></tr>
        <tr><td class="label">AFP</td><td>${s(data.afp)}</td><td class="label">Escolaridad</td><td>${s(data.escolaridad)}</td></tr>
        <tr><td class="label">Grupo Sang.</td><td>${s(data.grupoSanguineo)}</td><td class="label">Lateralidad</td><td>${s(data.lateralidad)}</td></tr>
      </table>
    </div>`;

  // ── Información Laboral ──
  const labor = `
    <div class="section">
      <h2>🏢 Información Laboral</h2>
      <table>
        <tr><td class="label" width="25%">Empresa</td><td>${s(data.empresaNombre)}</td><td class="label" width="15%">NIT</td><td>${s(data.empresaNit || companyData?.nit)}</td></tr>
        <tr><td class="label">Cargo</td><td>${s(data.cargo)}</td><td class="label">Sección</td><td>${s(data.seccion)}</td></tr>
        <tr><td class="label">Tipo Examen</td><td>${s(data.tipoExamen)}</td><td class="label">Antigüedad</td><td>${s(data.antiguedadCargo)}</td></tr>
        <tr><td class="label">Contrato</td><td>${s(data.tipoContrato)}</td><td class="label">Turno</td><td>${s(data.turno)}</td></tr>
      </table>
    </div>`;

  // ── Perfil del Cargo (Res. 1843/2025 Art. 29) ──
  const hasCargo = data.perfilCargo_funciones || data.perfilCargo_demandasFisicas || data.perfilCargo_factoresRiesgo;
  const cargoProfile = hasCargo ? `
    <div class="section">
      <h2>📑 Perfil del Cargo — Res. 1843/2025 Art. 29</h2>
      <table>
        ${data.perfilCargo_funciones ? `<tr><td class="label" width="25%">Funciones y Tareas</td><td>${s(data.perfilCargo_funciones)}</td></tr>` : ''}
        ${data.perfilCargo_demandasFisicas ? `<tr><td class="label">Demandas Físicas</td><td>${s(data.perfilCargo_demandasFisicas)}</td></tr>` : ''}
        ${data.perfilCargo_demandasMentales ? `<tr><td class="label">Demandas Mentales</td><td>${s(data.perfilCargo_demandasMentales)}</td></tr>` : ''}
        ${data.perfilCargo_factoresRiesgo ? `<tr><td class="label">Factores de Riesgo</td><td>${s(data.perfilCargo_factoresRiesgo)}</td></tr>` : ''}
        ${data.perfilCargo_nivelExposicion ? `<tr><td class="label">Nivel Exposición</td><td>${s(data.perfilCargo_nivelExposicion)}</td></tr>` : ''}
        ${data.perfilCargo_tiempoAcumulado ? `<tr><td class="label">Tiempo Acumulado</td><td>${s(data.perfilCargo_tiempoAcumulado)}</td></tr>` : ''}
        ${data.perfilCargo_medidasControl ? `<tr><td class="label">Medidas de Control</td><td>${s(data.perfilCargo_medidasControl)}</td></tr>` : ''}
      </table>
    </div>` : '';

  // ── Factores de Riesgo ──
  const riesgos = data.riesgos || {};
  const riesgosActivos = Object.entries(riesgos).filter(([, v]) => v).map(([k]) => k);
  const riskFactors = riesgosActivos.length > 0 ? `
    <div class="section">
      <h2>⚠️ Factores de Riesgo del Cargo</h2>
      <p>${riesgosActivos.map((r) => `<span class="badge badge-yellow">${s(r)}</span>`).join(' ')}</p>
    </div>` : '';

  // ── Antecedentes Ocupacionales (exposure history) ──
  const histOcup = data.historialOcupacional || data.antecedentesOcupacionales || [];
  const occupationalHistory = Array.isArray(histOcup) && histOcup.length > 0 ? `
    <div class="section">
      <h2>🏭 Antecedentes Ocupacionales</h2>
      <table>
        <thead><tr><th>Empresa</th><th>Cargo</th><th>Años</th><th>Riesgos</th><th>EPP</th></tr></thead>
        <tbody>
          ${histOcup.map((h) => `
            <tr>
              <td>${s(h.empresa)}</td>
              <td>${s(h.cargo)}</td>
              <td>${s(h.tiempo || h.anos)}</td>
              <td>${s(h.riesgos || h.factoresRiesgo)}</td>
              <td>${s(h.epp)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>` : '';

  // ── Antecedentes Personales ──
  const antAgr = data.antecedentesAgrupados || {};
  const antActivos = Object.entries(antAgr).filter(([, v]) => v?.val);
  const antPersonales = `
    <div class="section">
      <h2>📜 Antecedentes Personales</h2>
      <table>
        ${data.antPatologicos ? `<tr><td class="label" width="25%">Patológicos</td><td>${s(data.antPatologicos)}</td></tr>` : ''}
        ${data.antQuirurgicos ? `<tr><td class="label">Quirúrgicos</td><td>${s(data.antQuirurgicos)}</td></tr>` : ''}
        ${data.antTraumaticos ? `<tr><td class="label">Traumáticos</td><td>${s(data.antTraumaticos)}</td></tr>` : ''}
        ${data.antToxicoAlergicos ? `<tr><td class="label">Tóxico-Alérgicos</td><td>${s(data.antToxicoAlergicos)}</td></tr>` : ''}
        ${data.antFarmacologicos ? `<tr><td class="label">Farmacológicos</td><td>${s(data.antFarmacologicos)}</td></tr>` : ''}
        ${data.antFamiliares ? `<tr><td class="label">Familiares</td><td>${s(data.antFamiliares)}</td></tr>` : ''}
        ${data.antGinecoObstetricos ? `<tr><td class="label">Gineco-Obstétricos</td><td>${s(data.antGinecoObstetricos)}</td></tr>` : ''}
        ${antActivos.map(([key, v]) => `<tr><td class="label">${s(key)}</td><td class="sys-anormal">${s(v.det || 'Positivo')}</td></tr>`).join('')}
      </table>
    </div>`;

  // ── Estilos de Vida ──
  const hasEstilos = data.tabaquismo || data.alcoholismo || data.actividadFisica || data.sustanciasPsicoactivas;
  const estilos = hasEstilos ? `
    <div class="section">
      <h2>🏃 Estilos de Vida</h2>
      <table>
        <tr><td class="label" width="25%">Tabaquismo</td><td>${s(data.tabaquismo)}</td><td class="label" width="25%">Alcoholismo</td><td>${s(data.alcoholismo)}</td></tr>
        <tr><td class="label">Actividad Física</td><td>${s(data.actividadFisica)}</td><td class="label">Sustancias</td><td>${s(data.sustanciasPsicoactivas)}</td></tr>
        ${data.horasSueno ? `<tr><td class="label">Horas sueño</td><td>${s(data.horasSueno)}</td><td class="label">Alimentación</td><td>${s(data.alimentacion)}</td></tr>` : ''}
      </table>
    </div>` : '';

  // ── Signos Vitales ──
  const hasVitals = data.tensionArterial || data.frecuenciaCardiaca || data.peso;
  const vitals = hasVitals ? `
    <div class="section">
      <h2>💓 Signos Vitales y Antropometría</h2>
      <table>
        <tr>
          <td class="label">TA</td><td>${s(data.tensionArterial)}</td>
          <td class="label">FC</td><td>${s(data.frecuenciaCardiaca)}</td>
          <td class="label">FR</td><td>${s(data.frecuenciaRespiratoria)}</td>
          <td class="label">T°</td><td>${s(data.temperatura)}</td>
        </tr>
        <tr>
          <td class="label">Peso</td><td>${s(data.peso)} kg</td>
          <td class="label">Talla</td><td>${s(data.talla)} cm</td>
          <td class="label">IMC</td><td>${s(data.imc)}</td>
          <td class="label">SpO₂</td><td>${s(data.saturacion)}</td>
        </tr>
        ${data.perimetroAbdominal ? `<tr><td class="label">Perímetro Abd.</td><td>${s(data.perimetroAbdominal)} cm</td><td class="label">Agudeza Visual</td><td>OD: ${s(data.agudezaVisualOD)} | OI: ${s(data.agudezaVisualOI)}</td><td colspan="4"></td></tr>` : ''}
      </table>
    </div>` : '';

  // ── Examen Físico por Sistemas ──
  const sistemas = data.examenFisicoSistemas || {};
  const sisteRows = Object.entries(sistemas);
  const physicalExam = sisteRows.length > 0 ? `
    <div class="section">
      <h2>🔍 Examen Físico por Sistemas</h2>
      <table>
        <thead><tr><th width="25%">Sistema</th><th width="15%">Estado</th><th>Hallazgo</th></tr></thead>
        <tbody>
          ${sisteRows.map(([sys, val]) => `
            <tr>
              <td class="label">${s(sys)}</td>
              <td class="${val.estado === 'Anormal' ? 'sys-anormal' : 'sys-normal'}">${s(val.estado)}</td>
              <td>${s(val.hallazgo)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>` : '';

  // ── Maniobras Osteomusculares ──
  const maniobras = data.maniobrasOsteomusculares || {};
  const maniobraRows = Object.entries(maniobras);
  const osteoExam = data.examenOsteomuscular || {};
  const musculoskeletal = (maniobraRows.length > 0 || osteoExam.hallazgos) ? `
    <div class="section">
      <h2>🦴 Evaluación Osteomuscular</h2>
      ${maniobraRows.length > 0 ? `
      <table>
        <thead><tr><th width="35%">Maniobra</th><th width="15%">Resultado</th></tr></thead>
        <tbody>
          ${maniobraRows.map(([key, val]) => `
            <tr>
              <td class="label">${s(key)}</td>
              <td class="${val.estado === 'Positivo' ? 'sys-anormal' : 'sys-normal'}">${s(val.estado)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>` : ''}
      ${osteoExam.hallazgos ? `<p style="margin-top:6px;"><strong>Hallazgos:</strong> ${s(osteoExam.hallazgos)}</p>` : ''}
      ${osteoExam.diagnosticoFuncional ? `<p><strong>Diagnóstico Funcional:</strong> ${s(osteoExam.diagnosticoFuncional)}</p>` : ''}
    </div>` : '';

  // ── Revisión por Sistemas ──
  const revSistemas = data.revisionSistemas || data.revisionPorSistemas;
  const reviewSystems = revSistemas ? `
    <div class="section">
      <h2>📋 Revisión por Sistemas</h2>
      <p>${s(revSistemas)}</p>
    </div>` : '';

  // ── Paraclinical Results ──
  const paraclinicos = data.paraclinicos || data.resultadosParaclinicos;
  const paraclinical = paraclinicos ? `
    <div class="section">
      <h2>🧪 Resultados Paraclínicos</h2>
      <p>${s(typeof paraclinicos === 'string' ? paraclinicos : JSON.stringify(paraclinicos))}</p>
    </div>` : '';

  // ── Análisis ──
  const analysis = data.analisis ? `
    <div class="section">
      <h2>🔬 Análisis Clínico</h2>
      <p>${s(data.analisis)}</p>
    </div>` : '';

  // ── Diagnósticos ──
  const diagnoses = data.diagnostico1 ? `
    <div class="section">
      <h2>🩺 Diagnósticos</h2>
      <table>
        <tr><td class="label" width="15%">Dx 1</td><td>${s(data.diagnostico1)}</td></tr>
        ${data.diagnostico2 ? `<tr><td class="label">Dx 2</td><td>${s(data.diagnostico2)}</td></tr>` : ''}
        ${data.diagnostico3 ? `<tr><td class="label">Dx 3</td><td>${s(data.diagnostico3)}</td></tr>` : ''}
      </table>
    </div>` : '';

  // ── Concepto ──
  const concept = `
    <div class="section">
      <h2>✅ Concepto de Aptitud</h2>
      <p style="font-size:12pt;font-weight:900;">${conceptoBadge(data.conceptoAptitud)}</p>
      ${data.conceptoObservaciones ? `<p style="font-size:8pt;margin-top:4px;">${s(data.conceptoObservaciones)}</p>` : ''}
    </div>`;

  // ── Restricciones ──
  const restrictions = data.restricciones ? `
    <div class="section">
      <h2>⚠️ Restricciones Médico-Laborales</h2>
      <p>${s(data.restricciones)}</p>
    </div>` : '';

  // ── Recomendaciones ──
  const recommendations = data.recomendaciones ? `
    <div class="section">
      <h2>📝 Recomendaciones</h2>
      <p>${s(data.recomendaciones)}</p>
    </div>` : '';

  // ── Programas de Vigilancia ──
  const sve = data.programasSVE || [];
  const sveSection = Array.isArray(sve) && sve.length > 0 ? `
    <div class="section">
      <h2>📊 Inclusión en Programas de Vigilancia Epidemiológica</h2>
      <p>${sve.map((p) => `<span class="badge badge-yellow">${s(p)}</span>`).join(' ')}</p>
    </div>` : '';

  // ── Signature ──
  const signature = `
    <div class="signature-area">
      <div style="display:flex;justify-content:space-between;">
        <div style="width:45%;">
          <div style="border-top:1px solid #333;margin-top:40px;padding-top:4px;">
            <p style="font-size:8pt;font-weight:700;">${s(doctorData?.nombre)}</p>
            <p style="font-size:7pt;color:#6b7280;">${s(doctorData?.titulo || 'Médico Especialista en SST')}</p>
            <p style="font-size:7pt;color:#6b7280;">RM: ${s(doctorData?.licencia)}</p>
          </div>
        </div>
        <div style="width:45%;">
          <div style="border-top:1px solid #333;margin-top:40px;padding-top:4px;">
            <p style="font-size:8pt;font-weight:700;">${s(data.nombres)}</p>
            <p style="font-size:7pt;color:#6b7280;">${s(data.docTipo)} ${s(data.docNumero)}</p>
            <p style="font-size:7pt;color:#6b7280;">Paciente</p>
          </div>
        </div>
      </div>
    </div>`;

  return [
    header, identification, labor, cargoProfile, riskFactors,
    occupationalHistory, antPersonales, estilos, vitals,
    physicalExam, musculoskeletal, reviewSystems, paraclinical,
    analysis, diagnoses, concept, restrictions, recommendations,
    sveSection, signature,
  ].join('\n');
}

// ═══ printHC ══════════════════════════════════════════════════════════════
export function printHC(data, doctorData, companyData) {
  const html = generateHCPrintHTML(data, doctorData, companyData);
  openPrintWindow(
    `HC Ocupacional — ${data.nombres || 'Paciente'} — ${data.fechaExamen || new Date().toISOString().split('T')[0]}`,
    html
  );
}

// ═══ Sprint 3.2: printCertificateBatch ═════════════════════════════════════
/**
 * Print one aptitude certificate per patient in a single print window
 * @param {Array} patients - Array of patient data objects
 * @param {object} doctorData - Doctor information
 */
export function printCertificateBatch(patients, doctorData) {
  if (!patients || patients.length === 0) {
    alert('No hay pacientes seleccionados para imprimir');
    return;
  }

  const pages = patients.map((p, idx) => `
    ${idx > 0 ? '<div class="page-break"></div>' : ''}
    <div style="text-align:center;margin-bottom:16px;">
      <h1 style="margin:0;">CERTIFICADO DE APTITUD OCUPACIONAL</h1>
      <p style="font-size:9pt;color:#6b7280;">Res. 1843/2025 — ${date(p.fechaExamen)}</p>
    </div>
    <div class="section">
      <p style="font-size:10pt;line-height:1.8;">
        El/la suscrito/a médico especialista en Seguridad y Salud en el Trabajo certifica que
        <strong>${s(p.nombres)}</strong>, identificado/a con <strong>${s(p.docTipo)} ${s(p.docNumero)}</strong>,
        de <strong>${s(p.edad)}</strong> años de edad, fue evaluado/a el día <strong>${date(p.fechaExamen)}</strong>
        para el cargo de <strong>${s(p.cargo)}</strong> en la empresa <strong>${s(p.empresaNombre)}</strong>,
        con tipo de evaluación: <strong>${s(p.tipoExamen)}</strong>.
      </p>
    </div>
    <div class="section" style="text-align:center;margin:20px 0;">
      <h2 style="border:none;">Concepto de Aptitud</h2>
      <p style="font-size:16pt;font-weight:900;">${conceptoBadge(p.conceptoAptitud)}</p>
    </div>
    ${p.restricciones ? `<div class="section"><h2>Restricciones</h2><p>${s(p.restricciones)}</p></div>` : ''}
    ${p.recomendaciones ? `<div class="section"><h2>Recomendaciones</h2><p>${s(p.recomendaciones)}</p></div>` : ''}
    <div class="signature-area">
      <div style="width:50%;margin-top:40px;">
        <div style="border-top:1px solid #333;padding-top:4px;">
          <p style="font-size:9pt;font-weight:700;">${s(doctorData?.nombre)}</p>
          <p style="font-size:7pt;color:#6b7280;">${s(doctorData?.titulo || 'Médico SST')} · RM: ${s(doctorData?.licencia)}</p>
        </div>
      </div>
    </div>
  `).join('\n');

  openPrintWindow(`Certificados Batch — ${patients.length} pacientes`, pages);
}

// ═══ Sprint 3.3: printDisability ═══════════════════════════════════════════
/**
 * Print official disability certificate
 * @param {object} disability - Disability data
 * @param {object} patientData - Patient data
 * @param {object} doctorData - Doctor data
 */
export function printDisability(disability, patientData, doctorData) {
  const html = `
    <div style="text-align:center;margin-bottom:20px;">
      <h1 style="margin:0;font-size:16pt;">CERTIFICADO DE INCAPACIDAD MÉDICA</h1>
      <p style="font-size:9pt;color:#6b7280;">Documento oficial — ${new Date().toLocaleDateString('es-CO')}</p>
    </div>

    <div class="section">
      <h2>📋 Datos del Paciente</h2>
      <table>
        <tr><td class="label" width="25%">Nombre completo</td><td>${s(patientData.nombres)}</td></tr>
        <tr><td class="label">Documento</td><td>${s(patientData.docTipo)} ${s(patientData.docNumero)}</td></tr>
        <tr><td class="label">Empresa</td><td>${s(patientData.empresaNombre)}</td></tr>
        <tr><td class="label">Cargo</td><td>${s(patientData.cargo)}</td></tr>
        <tr><td class="label">EPS</td><td>${s(patientData.eps)}</td></tr>
      </table>
    </div>

    <div class="section">
      <h2>🏥 Datos de la Incapacidad</h2>
      <table>
        <tr><td class="label" width="25%">Días de incapacidad</td><td style="font-size:14pt;font-weight:900;color:#059669;">${s(disability.dias)} día(s)</td></tr>
        <tr><td class="label">Tipo</td><td>${s(disability.tipo)}</td></tr>
        <tr><td class="label">Origen</td><td>${s(disability.origen)}</td></tr>
        <tr><td class="label">Fecha inicio</td><td>${s(disability.fechaInicio)}</td></tr>
        <tr><td class="label">Fecha fin</td><td>${s(disability.fechaFin)}</td></tr>
        <tr><td class="label">Diagnóstico CIE-10</td><td><strong>${s(disability.diagnosticoCIE10)}</strong> — ${s(disability.diagnosticoDescripcion)}</td></tr>
        ${disability.esProrroga ? `<tr><td class="label">Prórroga</td><td>Sí — N° ${s(disability.prorrogaNumero)}</td></tr>` : ''}
      </table>
    </div>

    ${disability.observaciones ? `
    <div class="section">
      <h2>📝 Observaciones</h2>
      <p>${s(disability.observaciones)}</p>
    </div>` : ''}

    <div class="signature-area">
      <div style="display:flex;justify-content:space-between;">
        <div style="width:45%;">
          <div style="border-top:2px solid #059669;margin-top:50px;padding-top:6px;">
            <p style="font-size:9pt;font-weight:700;">${s(doctorData?.nombre)}</p>
            <p style="font-size:7.5pt;color:#6b7280;">Médico · RM: ${s(doctorData?.licencia)}</p>
          </div>
        </div>
        <div style="width:45%;">
          <div style="border-top:2px solid #333;margin-top:50px;padding-top:6px;">
            <p style="font-size:9pt;font-weight:700;">${s(patientData.nombres)}</p>
            <p style="font-size:7.5pt;color:#6b7280;">${s(patientData.docTipo)} ${s(patientData.docNumero)}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  openPrintWindow(`Incapacidad — ${patientData.nombres || 'Paciente'} — ${disability.dias} días`, html);
}

// ═══ Sprint 3.4: printCarnet ══════════════════════════════════════════════
/**
 * Print worker ID card (small card format)
 * @param {object} patientData - Patient data
 * @param {object} doctorData - Doctor data
 */
export function printCarnet(patientData, doctorData) {
  const html = `
    <style>
      .carnet {
        width: 85.6mm; height: 54mm; /* ISO/IEC 7810 ID-1 */
        border: 2px solid #059669;
        border-radius: 10px;
        padding: 8px 12px;
        margin: 10px auto;
        position: relative;
        overflow: hidden;
        page-break-inside: avoid;
      }
      .carnet-header {
        background: linear-gradient(135deg, #059669, #0d9488);
        color: white;
        margin: -8px -12px 8px;
        padding: 6px 12px;
        border-radius: 8px 8px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .carnet-body { display: flex; gap: 10px; }
      .carnet-photo {
        width: 25mm; height: 30mm;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 7pt;
        color: #9ca3af;
        background: #f9fafb;
        flex-shrink: 0;
      }
      .carnet-info { font-size: 7.5pt; flex: 1; }
      .carnet-info p { margin: 1px 0; }
      .carnet-info .name { font-size: 9pt; font-weight: 900; color: #065f46; }
      .carnet-concept {
        text-align: center;
        margin-top: 4px;
        font-size: 8pt;
        font-weight: 900;
      }
    </style>

    <div class="carnet">
      <div class="carnet-header">
        <div>
          <p style="font-size:8pt;font-weight:900;margin:0;">${s(patientData.empresaNombre)}</p>
          <p style="font-size:6pt;margin:0;opacity:0.8;">Salud Ocupacional</p>
        </div>
        <p style="font-size:6pt;margin:0;">Vigencia: ${date(patientData.fechaExamen)}</p>
      </div>
      <div class="carnet-body">
        <div class="carnet-photo">FOTO</div>
        <div class="carnet-info">
          <p class="name">${s(patientData.nombres)}</p>
          <p><strong>Doc:</strong> ${s(patientData.docTipo)} ${s(patientData.docNumero)}</p>
          <p><strong>Cargo:</strong> ${s(patientData.cargo)}</p>
          <p><strong>EPS:</strong> ${s(patientData.eps)}</p>
          <p><strong>ARL:</strong> ${s(patientData.arl)}</p>
          <p><strong>RH:</strong> ${s(patientData.grupoSanguineo)}</p>
        </div>
      </div>
      <div class="carnet-concept">
        Concepto: ${conceptoBadge(patientData.conceptoAptitud)}
      </div>
    </div>

    <p style="text-align:center;font-size:7pt;color:#9ca3af;margin-top:6px;">
      Expedido por: ${s(doctorData?.nombre)} · RM: ${s(doctorData?.licencia)}
    </p>
  `;

  openPrintWindow(`Carnet — ${patientData.nombres || 'Trabajador'}`, html, { width: 500, height: 400 });
}

// ═══ _printHCClean — 18 sections HC Ocupacional (from ocupasalud L17519) ════
// silentMode: if true, stores HTML in window._lastHCCleanStyles/Body without opening window
export function _printHCClean(data, doctorData, silentMode = false) {
  const html = generateHCPrintHTML(data, doctorData);
  if (silentMode) {
    if (typeof window !== 'undefined') {
      window._lastHCCleanBody = html;
      window._lastHCCleanStyles = PrintStyles;
    }
    return html;
  }
  openPrintWindow(`HC Ocupacional — ${data.nombres || 'Paciente'}`, html);
}

// ═══ PrintStyles — @media print CSS rules (from ocupasalud L7803) ════════════
export const PrintStyles = `
  @media print {
    *, *::before, *::after { overflow: visible !important; }
    body { margin: 0; padding: 0; font-size: 10pt; }
    .no-print, .no-print * { display: none !important; }
    .ai-label-print-hide { display: none !important; }
    .print\\:block { display: block !important; }
    .print\\:flex { display: flex !important; }
    .print\\:hidden { display: none !important; }
    .print\\:shadow-none { box-shadow: none !important; }
    .print\\:border-black { border-color: #000 !important; }
    .print\\:border-gray-300 { border-color: #d1d5db !important; }
    .print\\:bg-transparent { background: transparent !important; }
    .print\\:border-none { border: none !important; }
    .print\\:mb-1 { margin-bottom: 0.25rem !important; }
    table { page-break-inside: auto; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .carta-visual { width: 100% !important; padding: 0.5cm !important; box-shadow: none !important; }
    .print-section-break { page-break-before: always; }
    .signature-block { page-break-inside: avoid; }
    [data-report-content] { display: grid !important; }
    @page { size: letter; margin: 1cm; }
  }
`;

// ═══ printSection — HC General modular print (from ocupasalud L47460) ════════
// Generates professional HTML for individual sections of HC General
export function printSection(sectionType, data, doctorData) {
  const header = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #3b82f6;padding-bottom:8px;margin-bottom:12px;">
      <div>
        <p style="font-size:11px;font-weight:900;text-transform:uppercase;">${_sanitize(doctorData?.nombre || 'MÉDICO')}</p>
        <p style="font-size:9px;color:#6b7280;">${_sanitize(doctorData?.titulo || 'Medicina General')}</p>
        <p style="font-size:9px;color:#059669;font-weight:700;">RM: ${_sanitize(doctorData?.licencia || '--')}</p>
      </div>
      <div style="text-align:right;">
        <p style="font-size:10px;font-weight:900;">${_sanitize(data.nombres || 'Paciente')}</p>
        <p style="font-size:9px;color:#6b7280;">CC: ${_sanitize(data.docNumero || '--')} · ${_sanitize(data.edad || '--')} años</p>
        <p style="font-size:9px;color:#6b7280;">Fecha: ${date(data.fechaExamen)}</p>
      </div>
    </div>
  `;

  const firma = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:40px;padding-top:12px;">
      <div style="text-align:center;width:40%;border-top:2px solid #1f2937;padding-top:4px;">
        <p style="font-size:10px;font-weight:700;">Firma del Paciente</p>
      </div>
      <div style="text-align:center;width:40%;">
        <div style="border-top:2px solid #1f2937;padding-top:4px;">
          <p style="font-size:10px;font-weight:900;text-transform:uppercase;">${_sanitize(doctorData?.nombre || '')}</p>
          <p style="font-size:9px;color:#6b7280;">${_sanitize(doctorData?.titulo || '')}</p>
          <p style="font-size:9px;color:#059669;font-weight:700;">RM: ${_sanitize(doctorData?.licencia || '--')}</p>
        </div>
      </div>
    </div>
  `;

  let body = '';

  if (sectionType === 'gn-prescripcion') {
    const meds = data.formulaMedicamentos || [];
    body = `
      <h2 style="text-align:center;font-size:13px;font-weight:900;text-transform:uppercase;margin-bottom:12px;">Fórmula Médica</h2>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead><tr style="background:#f3f4f6;">
          <th style="border:1px solid #d1d5db;padding:4px;text-align:left;">Medicamento</th>
          <th style="border:1px solid #d1d5db;padding:4px;">Dosis</th>
          <th style="border:1px solid #d1d5db;padding:4px;">Vía</th>
          <th style="border:1px solid #d1d5db;padding:4px;">Frecuencia</th>
          <th style="border:1px solid #d1d5db;padding:4px;">Duración</th>
        </tr></thead>
        <tbody>
          ${meds.map(m => `<tr>
            <td style="border:1px solid #d1d5db;padding:4px;font-weight:700;">${_sanitize(m.nombre || m.medicamento || '')}</td>
            <td style="border:1px solid #d1d5db;padding:4px;text-align:center;">${_sanitize(m.dosis || '')}</td>
            <td style="border:1px solid #d1d5db;padding:4px;text-align:center;">${_sanitize(m.via || 'Oral')}</td>
            <td style="border:1px solid #d1d5db;padding:4px;text-align:center;">${_sanitize(m.frecuencia || '')}</td>
            <td style="border:1px solid #d1d5db;padding:4px;text-align:center;">${_sanitize(m.duracion || '')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <p style="font-size:9px;color:#6b7280;margin-top:8px;">Diagnóstico: ${_sanitize(data.diagnosticoPrincipal || '--')}</p>
    `;
  } else if (sectionType === 'gn-examenes') {
    body = `
      <h2 style="text-align:center;font-size:13px;font-weight:900;text-transform:uppercase;margin-bottom:12px;">Exámenes y Recomendaciones</h2>
      <div style="font-size:10px;">
        <p><strong>Diagnósticos:</strong> ${_sanitize(data.diagnosticoPrincipal || '--')}</p>
        <p style="margin-top:8px;"><strong>Plan de Manejo:</strong></p>
        <p>${_sanitize(data.plan?.conducta || data.planManejo || '--')}</p>
        <p style="margin-top:8px;"><strong>Recomendaciones:</strong></p>
        <p>${_sanitize(data.plan?.recomendaciones || data.recomendaciones || '--')}</p>
      </div>
    `;
  } else if (sectionType === 'gn-derivaciones') {
    const derivs = data.derivaciones || [];
    body = `
      <h2 style="text-align:center;font-size:13px;font-weight:900;text-transform:uppercase;margin-bottom:12px;">Derivaciones / Interconsultas</h2>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead><tr style="background:#f3f4f6;">
          <th style="border:1px solid #d1d5db;padding:4px;text-align:left;">Especialidad</th>
          <th style="border:1px solid #d1d5db;padding:4px;">Motivo</th>
          <th style="border:1px solid #d1d5db;padding:4px;">Prioridad</th>
        </tr></thead>
        <tbody>
          ${derivs.map(d => `<tr>
            <td style="border:1px solid #d1d5db;padding:4px;font-weight:700;">${_sanitize(d.especialidad || '')}</td>
            <td style="border:1px solid #d1d5db;padding:4px;">${_sanitize(d.motivo || '')}</td>
            <td style="border:1px solid #d1d5db;padding:4px;text-align:center;">${_sanitize(d.prioridad || 'Normal')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  const fullHtml = `${header}${body}${firma}`;
  openPrintWindow(`${sectionType} — ${data.nombres || 'Paciente'}`, fullHtml);
}
