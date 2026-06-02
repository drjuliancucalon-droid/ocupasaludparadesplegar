// src/utils/normativa.js - Normativa colombiana (RIPS, FHIR, RDA, etc.)
import { _sanitize, _safeLogoUrl } from './security.js';
import { _ipsDocLeftHtml } from './doctorHelpers.js';

const _generarHashHC = async (data) => {
  try {
    const contenido = JSON.stringify({
      id: data.id,
      nombres: data.nombres,
      docNumero: data.docNumero,
      fechaExamen: data.fechaExamen,
      conceptoAptitud: data.conceptoAptitud,
      tipoExamen: data.tipoExamen,
      diagnosticoPrincipal: data.diagnosticoPrincipal,
      medicoId: data._medicoId,
      estadoHistoria: "Cerrada",
      ts: new Date().toISOString(),
    });
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(contenido)
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "HASH-NO-DISPONIBLE-" + Date.now();
  }
};
// Genera código de verificación QR para la HC firmada
// El código contiene: ID paciente + hash (primeros 16 chars) + fecha
const _generarCodigoQR = (id, hash, fecha) => {
  const short = hash.substring(0, 16).toUpperCase();
  const fechaShort = (fecha || new Date().toISOString())
    .substring(0, 10)
    .replace(/-/g, "");
  return `SISO-${fechaShort}-${id.substring(0, 8).toUpperCase()}-${short}`;
};
// Formatea datos de firma para mostrar en la HC impresa
const _formatFirmaDigital = (firma) => {
  if (!firma) return null;
  return {
    codigo: firma.codigoQR || firma.codigo,
    hash: firma.hash ? firma.hash.substring(0, 32) + "..." : null,
    firmadoPor: firma.firmadoPor,
    fechaFirma: firma.fechaFirma,
    valido: !!(firma.codigoQR && firma.hash && firma.firmadoPor),
  };


// ══════════════════════════════════════════════════════════════════════════
// B-28: HL7 FHIR R4 - Res. 1888/2025 RDA - Generador de recursos FHIR
// Recursos: Patient, Practitioner, Observation, DiagnosticReport
// Deadline de interoperabilidad: 15 de abril de 2026
// ══════════════════════════════════════════════════════════════════════════
const _generarFHIRPatient = (p) => ({
  resourceType: "Patient",
  id:
    "pat-" + (p.docNumero || p.id || Date.now()).toString().replace(/\s/g, ""),
  meta: {
    profile: ["http://hl7.org/fhir/StructureDefinition/Patient"],
    lastUpdated: new Date().toISOString(),
  },
  identifier: [
    {
      system: "https://www.registraduria.gov.co",
      type: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0203",
            code: p.docTipo || "NI",
          },
        ],
      },
      value: p.docNumero || "",
    },
  ],
  name: [
    {
      use: "official",
      text: p.nombres || "",
      family: (p.nombres || "").split(" ").slice(-1)[0],
      given: [(p.nombres || "").split(" ")[0]],
    },
  ],
  gender:
    p.genero === "Masculino"
      ? "male"
      : p.genero === "Femenino"
      ? "female"
      : "unknown",
  birthDate: p.fechaNacimiento || undefined,
  address: p.ciudadResidencia
    ? [{ text: p.ciudadResidencia, country: "CO" }]
    : undefined,
});
const _generarFHIRPractitioner = (d) => ({
  resourceType: "Practitioner",
  id: "prac-" + (d?.cedula || "doc").replace(/\s/g, ""),
  meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Practitioner"] },
  identifier: [
    {
      system: "https://www.colmedicos.com",
      type: { coding: [{ code: "MD" }] },
      value: d?.licencia || d?.cedula || "",
    },
  ],
  name: [
    {
      use: "official",
      text: d?.nombre || "",
      family: (d?.nombre || "").split(" ").slice(-1)[0],
      given: [(d?.nombre || "").split(" ")[0]],
    },
  ],
  qualification: [
    {
      code: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0360",
            code: "MD",
            display: "Doctor of Medicine",
          },
        ],
      },
      issuer: { display: "Ministerio de Salud de Colombia" },
      identifier: [{ value: d?.licencia || "" }],
    },
  ],
});
const _generarFHIRObservation = (p, tipo) => ({
  resourceType: "Observation",
  id: "obs-" + tipo + "-" + (p.id || Date.now()),
  meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Observation"] },
  status: "final",
  category: [
    {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/observation-category",
          code: "exam",
          display: "Exam",
        },
      ],
    },
  ],
  code: {
    coding: [
      {
        system: "http://loinc.org",
        code: "34108-1",
        display: "Outpatient Note",
      },
    ],
    text: tipo,
  },
  subject: {
    reference:
      "Patient/pat-" +
      (p.docNumero || p.id || "").toString().replace(/\s/g, ""),
  },
  effectiveDateTime: p.fechaExamen || new Date().toISOString().split("T")[0],
  valueString: p.conceptoAptitud || "",
  note: p.restricciones ? [{ text: p.restricciones }] : undefined,
});
const _generarFHIRBundle = (paciente, doctor) => {
  const bundle = {
    resourceType: "Bundle",
    id: "bundle-" + Date.now(),
    type: "document",
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ["http://hl7.org/fhir/StructureDefinition/Bundle"],
    },
    identifier: {
      system: "https://siso.ocupasalud.co/fhir",
      value: "SISO-" + (paciente.codigoVerificacion || Date.now()),
    },
    timestamp: new Date().toISOString(),
    entry: [
      {
        fullUrl: "urn:uuid:patient-1",
        resource: _generarFHIRPatient(paciente),
      },
      {
        fullUrl: "urn:uuid:practitioner-1",
        resource: _generarFHIRPractitioner(doctor),
      },
      {
        fullUrl: "urn:uuid:observation-1",
        resource: _generarFHIRObservation(paciente, "Aptitud Laboral"),
      },
    ],
  };
  return bundle;
};

// ══════════════════════════════════════════════════════════════════════════
// B-25: VALIDACIÓN RIPS - Res. 2275/2023 Schema v2
// ══════════════════════════════════════════════════════════════════════════

const validarRIPSPaciente = (p) => {
  const errs = [];
  if (!p.docNumero || p.docNumero.length < 4) errs.push("docNumero inválido");
  if (!p.fechaExamen) errs.push("fechaExamen requerida");
  if (!p.tipoExamen) errs.push("tipoExamen requerido");
  if (!p.conceptoAptitud) errs.push("conceptoAptitud requerido para RIPS");
  if (!p.eps) errs.push("EPS requerida para RIPS");
  return errs;
};
const validarRIPSLote = (pacientes) => {
  const errores = [];
  pacientes.forEach((p, idx) => {
    const e = validarRIPSPaciente(p);
    if (e.length)
      errores.push(
        `Paciente ${idx + 1} (${p.nombres || "sin nombre"}): ${e.join(", ")}`
      );
  });
  return errores;
};
const _generarRIPSJson = (pacientes, doctorData, periodo) => {
  const now = new Date().toISOString();
  const numFactura = "SISO-" + Date.now();
  // Archivo AF: Datos de afiliación de cada paciente atendido
  const AF = pacientes.map((p) => ({
    tipoDocumentoIdentificacion: p.docTipo || "CC",
    numDocumentoIdentificacion: p.docNumero || "",
    tipoUsuario: "1", // Contributivo
    fechaNacimiento: p.fechaNacimiento || "",
    codSexo:
      p.genero === "Femenino" ? "F" : p.genero === "Masculino" ? "M" : "N",
    codPaisResidencia: "CO",
    codMunicipioResidencia: "19001", // Default Popayán - personalizable
    codZonaTerritorialResidencia: p.zonaResidencia === "Rural" ? "2" : "1",
    incapacidad: p.diasIncapacidad ? "S" : "N",
    codPaisOrigen: "CO",
  }));
  // Archivo AT: Resumen de atención
  const AT = [
    {
      codPrestador: doctorData?.licencia?.substring(0, 12) || "SISO001",
      fechaInicioAtencion: pacientes[0]?.fechaExamen || now.split("T")[0],
      numAutorizacion: "",
      numDocumentoIdentificacion: pacientes[0]?.docNumero || "",
      tipoDocumentoIdentificacion: pacientes[0]?.docTipo || "CC",
      viaIngresoServicioSalud: "1", // Consulta externa
      modalidadGrupoServicioTecSal: "01",
      grupoServicios: "01",
      codServicio: "890201", // Medicina del trabajo
      finalidadTecnologiaSalud: "27", // Medicina laboral
      causaMotivoAtencion: "26", // Evaluación ocupacional
      codDiagnosticoPrincipal:
        pacientes[0]?.diagnosticoPrincipal?.substring(0, 4) || "Z00",
      codDiagnosticoPrincipalE: "",
      condicionSalidaPaciente: "1",
      codComplicacion: "",
      numFEVPagadora: "",
      consecutivo: "1",
    },
  ];
  // Archivo AC: Detalle de consultas
  const AC = pacientes.map((p, i) => ({
    codPrestador: doctorData?.licencia?.substring(0, 12) || "SISO001",
    viaIngresoServicioSalud: "1",
    fechaInicioAtencion: p.fechaExamen || now.split("T")[0],
    horaInicioAtencion: "08:00",
    fechaFinAtencion: p.fechaExamen || now.split("T")[0],
    horaFinAtencion: "08:30",
    tipoDocumentoIdentificacion: p.docTipo || "CC",
    numDocumentoIdentificacion: p.docNumero || "",
    tipoUsuario: "1",
    codConsulta: "890201",
    modalidadGrupoServicioTecSal: "01",
    grupoServicios: "01",
    codServicio: "890201",
    finalidadTecnologiaSalud: "27",
    causaMotivoAtencion: "26",
    codDiagnosticoPrincipal: p.diagnosticoPrincipal?.substring(0, 4) || "Z00",
    tipoDocumentoDX: "D",
    codDiagnosticoRelacionado1: p.diagnosticoSecundario1?.substring(0, 4) || "",
    tipoDX1: p.diagnosticoSecundario1 ? "D" : "",
    vrServicio: 90000,
    numFEVPagadora: "",
    consecutivo: String(i + 1),
  }));
  return {
    version: "1.0",
    generadoEn: now,
    periodo: periodo || now.substring(0, 7),
    norma: "Resolución 2275/2023",
    prestador: {
      nombre: doctorData?.nombre || "",
      nit: doctorData?.rut?.replace("-", "") || "",
      codigoPrestador: doctorData?.licencia?.substring(0, 12) || "SISO001",
    },
    numDocumentoIdObligado: doctorData?.cedula?.replace(/[^0-9]/g, "") || "",
    AF,
    AT,
    AC,
    totalRegistros: { AF: AF.length, AT: AT.length, AC: AC.length },
    advertencia:
      "RIPS generado por SISO v4.0. Para radicación formal ante MinSalud se requiere firma electrónica DIAN certificada y validación en ADRES.",
  };
};
// Descarga RIPS JSON sin createObjectURL (compatible con sandbox/CSP)
const _descargarRIPSJson = (pacientes, doctorData, periodo) => {
  try {
    const rips = _generarRIPSJson(pacientes, doctorData, periodo);
    const jsonStr = JSON.stringify(rips, null, 2);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const a = document.createElement("a");
    a.href = "data:application/json;base64," + b64;
    a.download = `RIPS_SISO_${
      periodo || new Date().toISOString().substring(0, 7)
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (e) {
    console.error("RIPS download error:", e);
    return false;
  }
};

const _generarRDA = (paciente, doctorData, sesionId) => {
  if (!paciente || !paciente.fechaExamen) return null;
  const now = new Date().toISOString();
  return {
    version: "1.0",
    norma: "Resolución 1888/2025 MinSalud",
    fechaGeneracion: now,
    entidadGeneradora: {
      tipoDocumento: "CC",
      numDocumento: (doctorData?.cedula || "").replace(/[^0-9]/g, ""),
      nombreEntidad: doctorData?.nombre || "",
      municipio: doctorData?.ciudad || "Popayán",
    },
    paciente: {
      tipoDocumento: paciente.docTipo || "CC",
      numDocumento: paciente.docNumero || "",
      primerNombre: (paciente.nombres || "").split(" ")[0],
      primerApellido: (paciente.nombres || "").split(" ").slice(-1)[0],
      fechaNacimiento: paciente.fechaNacimiento || "",
      genero:
        paciente.genero === "Masculino"
          ? "M"
          : paciente.genero === "Femenino"
          ? "F"
          : "I",
    },
    atencion: {
      fechaAtencion: paciente.fechaExamen || now.split("T")[0],
      tipoAtencion: "01", // 01 = Consulta externa
      modalidad: "01", // 01 = Presencial
      tipoServicio:
        paciente.type === "ocupacional"
          ? "SALUD_OCUPACIONAL"
          : "MEDICINA_GENERAL",
      tipoExamen: paciente.tipoExamen || "INGRESO",
      codigoVerificacion:
        paciente.codigoVerificacion || paciente.firmaDigital?.codigoQR || "",
      sesionId: sesionId || "",
    },
    diagnosticos: (paciente.diagnosticos || []).slice(0, 4).map((d) => ({
      codigo: d.codigo || d,
      tipo: d.tipo || "IMPRESION_DIAGNOSTICA",
      descripcion: d.descripcion || d,
    })),
    conceptoAptitud: paciente.conceptoAptitud || "",
    restricciones: (paciente.restricciones || []).length,
    rdaGeneradoEn: now,
    _nota:
      "RDA generado por SISO. Para transmisión oficial al IHCE se requiere firma electrónica certificada.",
  };
};
const _descargarRDA = (paciente, doctorData, sesionId) => {
  try {
    const rda = _generarRDA(paciente, doctorData, sesionId);
    if (!rda) return false;
    const jsonStr = JSON.stringify(rda, null, 2);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const a = document.createElement("a");
    a.href = "data:application/json;base64," + b64;
    a.download = `RDA_${paciente.docNumero}_${paciente.fechaExamen}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (e) {
    console.error("RDA error:", e);
    return false;
  }
};

const _generarFacturaDIAN_UBL = (billData, doctorData, numero) => {
  const now = new Date();
  const fecha = now.toISOString().split("T")[0];
  const hora = now.toISOString().split("T")[1].slice(0, 8);
  const cufe = `SISO-${numero}-${fecha}`.replace(/-/g, "");
  const bruto = parseFloat(billData.amount || "0");
  const iva = 0; // Servicios médicos exentos de IVA (Art. 476 E.T. numeral 1)
  const total = bruto;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <!-- DIAN Colombia - UBL 2.1 - Decreto 358/2020 - Generado por SISO OCUPASALUD v4 -->
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>
  <cbc:ID>FE-${String(numero).padStart(6, "0")}</cbc:ID>
  <cbc:UUID schemeName="CUFE-SHA384">${cufe}</cbc:UUID>
  <cbc:IssueDate>${fecha}</cbc:IssueDate>
  <cbc:IssueTime>${hora}-05:00</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:Note>Servicios médicos ocupacionales exentos de IVA - Art. 476 E.T. num. 1</cbc:Note>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>1</cbc:LineCountNumeric>
  <!-- Emisor (médico) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${
          doctorData?.nombre || "MÉDICO OCUPACIONAL"
        }</cbc:RegistrationName>
        <cbc:CompanyID schemeID="13">${(doctorData?.cedula || "").replace(
          /[^0-9]/g,
          ""
        )}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>ZZ</cbc:ID><cbc:Name>No aplica</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:Contact><cbc:ElectronicMail>${
        doctorData?.email || ""
      }</cbc:ElectronicMail></cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <!-- Adquiriente (empresa/paciente) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${
          billData.clientName || "CLIENTE"
        }</cbc:RegistrationName>
        <cbc:CompanyID schemeID="31">${(billData.clientNit || "").replace(
          /[^0-9]/g,
          ""
        )}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>ZZ</cbc:ID><cbc:Name>No aplica</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <!-- Totales -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${bruto.toFixed(
      2
    )}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${bruto.toFixed(
      2
    )}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${total.toFixed(
      2
    )}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <!-- Línea de factura -->
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="94">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${bruto.toFixed(
      2
    )}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="COP">0.00</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="COP">${bruto.toFixed(
          2
        )}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="COP">0.00</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>0.00</cbc:Percent>
          <cbc:TaxExemptionReasonCode>Art. 476 E.T.</cbc:TaxExemptionReasonCode>
          <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description>${
        billData.concept || "EXAMENES MEDICOS OCUPACIONALES"
      }</cbc:Description>
      <cac:SellersItemIdentification><cbc:ID>SVC-OCUP-001</cbc:ID></cac:SellersItemIdentification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">${bruto.toFixed(2)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="94">1</cbc:BaseQuantity>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`;
};

// ══════════════════════════════════════════════════════════════════════════
// B-14: RETENCIÓN CERTIFICADA 20 AÑOS - Res. 1995/1999 Art. 15
// ══════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════
// B-18: 2FA TOTP - RFC 6238 con Web Crypto API (HMAC-SHA1)
// Res. 3100/2019 (habilitación IPS) - Seguridad en sistemas de información
// Compatible con Google Authenticator, Authy, Microsoft Authenticator
// ══════════════════════════════════════════════════════════════════════════

const _generarPaqueteRetencion = async (hcData, medicoData) => {
  const hcLimpio = { ...hcData };
  delete hcLimpio._agendaId;
  const hcJson = JSON.stringify(hcLimpio, null, 2);
  const hashBuf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(hcJson)
  );
  const hashHex = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const ts = new Date().toISOString();
  return {
    _tipo: "SISO_HC_RETENCION_CERTIFICADA",
    metadata: {
      norma:
        "Resolución 1995 de 1999 Art. 15 - Retención Historia Clínica 20 años",
      version: "SISO-OCUPASALUD-v4",
      fechaPreservacion: ts,
      anioVencimientoLegal: new Date().getFullYear() + 20,
      medicoId: medicoData?.cedula || "desconocido",
      medicoNombre: medicoData?.nombre || "Médico Ocupacional",
      paciente: hcData.nombres || "Desconocido",
      docNumero: hcData.docNumero || "--",
      empresa: hcData.empresaNombre || "PARTICULAR",
      tipoExamen: hcData.tipoExamen || "--",
      fechaExamen: hcData.fechaExamen || "--",
      conceptoAptitud: hcData.conceptoAptitud || "--",
      codigoVerificacion: hcData.codigoVerificacion || "--",
      algoritmoHash: "SHA-256",
      hashSHA256: hashHex,
      instruccionVerificacion:
        "Para verificar integridad: recalcule SHA-256 del campo hcData y compare con hashSHA256",
    },
    hashSHA256: hashHex,
    hcData: hcLimpio,
    _generadoEn: ts,
    _versionFormato: "1.0",
  };
};

const _generarCertificadoHTMLNormalizado = (
  data,
  doctorData,
  signature,
  ipsData
) => {
const _dateRef = data.fechaCierre ? new Date(data.fechaCierre + "T12:00:00") : new Date();
  const fechaHoy = _dateRef.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const nomDoc =
    doctorData && doctorData.nombre ? doctorData.nombre : "MÉDICO OCUPACIONAL";
  const nomTit =
    doctorData && doctorData.titulo
      ? doctorData.titulo
      : "Médico Especialista en Salud Ocupacional";
  const nomLic = doctorData && doctorData.licencia ? doctorData.licencia : "--";
  const nomCiu =
    doctorData && doctorData.ciudad ? doctorData.ciudad : "Popayán";
  const nomCell =
    doctorData && doctorData.celular
      ? doctorData.celular
      : doctorData && doctorData.telefono
      ? doctorData.telefono
      : "";
  const nomMail = doctorData && doctorData.email ? doctorData.email : "";
  const sigImg = signature
    ? '<img src="' +
      signature +
      '" style="max-height:68px;display:block;margin:0 auto 2px;" alt="Firma"/>'
    : '<div style="height:60px;"></div>';
  const tipoExamen = (data.tipoExamen || "").toUpperCase();
  const enfasis = (data.enfasisExamen || "GENERAL").toUpperCase();
  const conceptoRaw = data.conceptoAptitud || "";
  const conceptoDisplay = conceptoRaw || "PENDIENTE DE CONCEPTO";

  /* ── Formato de restricciones / recomendaciones ─────────────────── */
  const fmtBlocks = (txt) => {
    if (!txt) return "";
    const str = Array.isArray(txt) ? txt.join("\n") : String(txt);
    const lines = str
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (
      lines.some(
        (l) => /^[•*\-]/.test(l) || /^\*\*/.test(l) || /^\d+\./.test(l)
      )
    ) {
      return (
        '<ul style="margin:5px 0 0;padding-left:20px;">' +
        lines
          .map(
            (l) =>
              '<li style="margin-bottom:3px;font-size:9.5pt;">' +
              l
                .replace(/^[•*\-]+\s*/, "")
                .replace(/^\d+\.\s*/, "")
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") +
              "</li>"
          )
          .join("") +
        "</ul>"
      );
    }
    return (
      '<p style="font-size:9.5pt;margin-top:5px;line-height:1.5;">' +
      str.replace(/\n/g, "<br/>") +
      "</p>"
    );
  };

  const restriccionesText =
    data.analisisRestricciones || data.restricciones || "";
  const recomendacionesArr = [
    data.recomendacionesOcupacionales,
    data.recomendacionesMedicas,
    data.recomendaciones,
    data.recomendacionesHabitos,
  ].filter(Boolean);
  const recomendacionesText = recomendacionesArr.join("\n");

  const checkItems = (obj) =>
    Object.entries(obj || {})
      .filter(([, v]) => v)
      .map(([k]) => k);
  const restCheck = checkItems(data.restriccionesChecklist);
  const recCheck = checkItems(data.recomendacionesChecklist);

  /* ── Fecha de vigencia ─────────────────────────────────────────── */
  const vigencia = data.vigencia || "1 año";

  /* ── Color concepto ────────────────────────────────────────────── */
  const cLow = conceptoRaw.toLowerCase();
  const aptBg = cLow.includes("no apto")
    ? "#7f1d1d"
    : cLow.includes("condic")
    ? "#78350f"
    : cLow.includes("apto")
    ? "#14532d"
    : "#1e3a5f";

  return (
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>' +
    "<title>Certificado de Aptitud Laboral - " +
    (data.nombres || "") +
    "</title>" +
    "<style>" +
    "*{margin:0;padding:0;box-sizing:border-box;}" +
    'body{font-family:"Segoe UI",Arial,sans-serif;font-size:10.5pt;color:#111;padding:14mm 16mm 10mm;}' +
    ".np-dl{position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:6px;}" +
    ".np-dl button{background:#065f46;color:#fff;border:none;padding:10px 20px;border-radius:10px;font-weight:900;font-size:11pt;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);}" +
    ".np-dl p{font-size:8pt;color:#6b7280;text-align:right;}" +
    "@media print{.np-dl{display:none!important;}body{padding:10mm 14mm;}}" +
    /* ── HEADER ── */
    ".hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #065f46;padding-bottom:10px;margin-bottom:14px;}" +
    ".hdr-brand{display:flex;align-items:center;gap:10px;}" +
    ".hdr-logo{width:44px;height:44px;border-radius:10px;background:#065f46;display:flex;align-items:center;justify-content:center;font-size:20pt;color:#fff;font-weight:900;flex-shrink:0;}" +
    ".hdr-name{font-size:13pt;font-weight:900;color:#065f46;text-transform:uppercase;letter-spacing:1px;}" +
    ".hdr-sub{font-size:8pt;color:#6b7280;margin-top:1px;}" +
    ".hdr-ref{text-align:right;font-size:8pt;color:#6b7280;line-height:1.5;}" +
    /* ── TITLE ── */
    ".title{text-align:center;font-size:16pt;font-weight:900;text-transform:uppercase;letter-spacing:3px;margin:10px 0 4px;}" +
    ".subtitle{text-align:center;font-size:9pt;color:#6b7280;margin-bottom:10px;}" +
    ".intro{font-size:9.5pt;color:#374151;margin-bottom:10px;line-height:1.5;}" +
    /* ── PATIENT BOX ── */
    ".pat-box{border:1.5px solid #d1d5db;border-radius:8px;padding:10px 14px;margin-bottom:10px;display:grid;grid-template-columns:1fr 1fr;gap:5px 20px;}" +
    ".pat-field{display:flex;flex-direction:column;}" +
    ".pat-label{font-size:7.5pt;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;}" +
    ".pat-val{font-size:10.5pt;font-weight:700;color:#111;}" +
    /* ── CONCEPT ── */
    ".concepto-lbl{text-align:center;font-size:8pt;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#6b7280;margin:6px 0 4px;}" +
    ".concepto-box{border:2px solid " +
    aptBg +
    ";border-radius:8px;padding:14px 20px;text-align:center;margin-bottom:10px;background:" +
    aptBg +
    ";}" +
    ".concepto-txt{font-size:16pt;font-weight:900;text-transform:uppercase;color:#fff;line-height:1.3;}" +
    ".concepto-note{font-size:8pt;color:#e5e7eb;margin-top:4px;}" +
    /* ── SECTIONS ── */
    ".sec{margin-bottom:10px;}" +
    ".sec-title{font-size:9pt;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#111;border-bottom:2px solid #d1d5db;padding-bottom:3px;margin-bottom:6px;}" +
    ".pill{display:inline-block;background:#fef9c3;border:1px solid #fde047;color:#78350f;padding:2px 8px;border-radius:4px;font-size:8.5pt;margin:2px;}" +
    ".pill.ok{background:#f0fdf4;border-color:#86efac;color:#14532d;}" +
    /* ── ALERTA ── */
    ".alerta{background:#fef9c3;border:1px solid #fde047;padding:7px 12px;border-radius:6px;font-size:8.5pt;color:#713f12;margin-bottom:10px;}" +
    /* ── FIRMA ROW ── */
    ".firma-row{display:grid;grid-template-columns:1fr auto 1fr;gap:20px;align-items:end;border-top:2px solid #d1d5db;padding-top:12px;margin-top:4px;}" +
    ".firma-col{display:flex;flex-direction:column;align-items:center;text-align:center;}" +
    ".firma-line{width:180px;border-top:1px solid #374151;margin-top:50px;padding-top:5px;}" +
    ".firma-med-box{text-align:center;}" +
    ".firma-med-name{font-size:11pt;font-weight:900;color:#065f46;}" +
    ".firma-med-sub{font-size:8.5pt;color:#6b7280;margin-top:1px;}" +
    ".cv-box{background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:8px 16px;text-align:center;}" +
    ".cv-lbl{font-size:7.5pt;font-weight:900;color:#6b7280;text-transform:uppercase;letter-spacing:1px;}" +
    ".cv-code{font-size:14pt;font-family:monospace;font-weight:900;letter-spacing:3px;color:#065f46;margin-top:2px;}" +
    /* ── FOOTER ── */
    ".footer{margin-top:10px;border-top:1px solid #e5e7eb;padding-top:6px;font-size:7.5pt;color:#9ca3af;display:flex;justify-content:space-between;}" +
    /* ── CONSENT ── */
    ".consent{margin-top:8px;font-size:7pt;color:#9ca3af;line-height:1.4;border-top:1px dashed #e5e7eb;padding-top:6px;}" +
    "</style></head><body>" +
    /* ── HEADER ─────────────────────────────────────────────── */
    '<div class="hdr">' +
    '<div class="hdr-brand">' +
    (ipsData
      ? _safeLogoUrl(ipsData.logo || "") // SEC-FIX-02
        ? `<img src="${_safeLogoUrl(ipsData.logo)}" style="max-height:44px;max-width:100px;object-fit:contain;margin-right:8px;" />`
        : '<div class="hdr-logo">IPS</div>'
      : '<div class="hdr-logo">+</div>') +
    '<div><div class="hdr-name">' +
    (ipsData ? _sanitize(ipsData.nombre || "") : nomDoc) +
    "</div>" +
    '<div class="hdr-sub">' +
    (ipsData
      ? "NIT: " +
        _sanitize(ipsData.nit || "") +
        (ipsData.dv ? "-" + _sanitize(ipsData.dv) : "")
      : nomTit) +
    "</div>" +
    '<div class="hdr-sub">' +
    (ipsData
      ? _sanitize(
          (ipsData.direccion || "") +
            (ipsData.ciudad ? " · " + ipsData.ciudad : "")
        )
      : "Lic. " + nomLic + " · " + nomCiu) +
    "</div>" +
    (ipsData && ipsData.telefono
      ? '<div class="hdr-sub">Tel: ' + _sanitize(ipsData.telefono) + "</div>"
      : "") +
    (ipsData && ipsData.correo
      ? '<div class="hdr-sub">' + _sanitize(ipsData.correo) + "</div>"
      : "") +
    "</div>" +
    "</div>" +
    '<div class="hdr-ref"><p>Res. 1843/2025</p><p>Generado: ' +
    fechaHoy +
    "</p></div>" +
    "</div>" +
    /* ── TITLE ──────────────────────────────────────────────── */
    '<div class="title">Certificado de Aptitud Laboral</div>' +
    '<div class="subtitle">Conforme a la Resolución 1843 de 2025</div>' +
    /* ── INTRO ──────────────────────────────────────────────── */
    '<p class="intro">El suscrito Médico Especialista en Salud Ocupacional, con licencia vigente, certifica que ha realizado la evaluación médica ocupacional de tipo <strong>' +
    tipoExamen +
    "</strong> con énfasis <strong>" +
    enfasis +
    "</strong> a:</p>" +
    /* ── PATIENT BOX ────────────────────────────────────────── */
    '<div class="pat-box">' +
    '<div class="pat-field"><span class="pat-label">Nombre</span><span class="pat-val">' +
    (data.nombres || "--") +
    "</span></div>" +
    '<div class="pat-field"><span class="pat-label">Identificación</span><span class="pat-val">' +
    (data.docTipo || "CC") +
    " " +
    (data.docNumero || "--") +
    "</span></div>" +
    '<div class="pat-field"><span class="pat-label">Cargo</span><span class="pat-val">' +
    (data.cargo || "--") +
    "</span></div>" +
    '<div class="pat-field"><span class="pat-label">Empresa</span><span class="pat-val">' +
    (data.empresaNombre || data.empresa || "PARTICULAR") +
    "</span></div>" +
    '<div class="pat-field"><span class="pat-label">Fecha</span><span class="pat-val">' +
    (data.fechaExamen || "--") +
    "</span></div>" +
    '<div class="pat-field"><span class="pat-label">Vigencia</span><span class="pat-val">' +
    vigencia +
    "</span></div>" +
    "</div>" +
    /* ── CONCEPTO ───────────────────────────────────────────── */
    '<div class="concepto-lbl">Concepto Emitido</div>' +
    '<div class="concepto-box">' +
    '<div class="concepto-txt">' +
    conceptoDisplay +
    "</div>" +
    '<div class="concepto-note">Concepto emitido bajo Res. 1843 de 2025, Art. 20</div>' +
    "</div>" +
    /* ── RECOMENDACIONES ────────────────────────────────────── */
    (recomendacionesText || recCheck.length > 0
      ? '<div class="sec"><div class="sec-title">Recomendaciones</div>' +
        "" +
        fmtBlocks(recomendacionesText) +
        "</div>"
      : "") +
    /* ── RESTRICCIONES ──────────────────────────────────────── */
    (restriccionesText || restCheck.length > 0
      ? '<div class="sec"><div class="sec-title">Restricciones Laborales</div>' +
        "" +
        fmtBlocks(restriccionesText) +
        "</div>"
      : "") +
    /* ── ALERTA CONFIDENCIALIDAD ─────────────────────────────── */
    '<div class="alerta">⚠ <strong>Confidencialidad:</strong> El diagnóstico clínico no es entregado al empleador (Art. 16 Res. 1843/2025). Solo uso para gestión del riesgo ocupacional.</div>' +
    /* ── FIRMA ROW ──────────────────────────────────────────── */
    '<div class="firma-row">' +
    '<div class="firma-col">' +
    '<div class="firma-line">' +
    '<div style="font-size:8.5pt;font-weight:700;">Firma del Trabajador</div>' +
    '<div style="font-size:8pt;color:#6b7280;">' +
    (data.docTipo || "CC") +
    ": " +
    (data.docNumero || "--") +
    "</div>" +
    "</div>" +
    "</div>" +
    '<div class="cv-box">' +
    '<div class="cv-lbl">Código Verificación</div>' +
    '<div class="cv-code">' +
    (data.codigoVerificacion || "--") +
    "</div>" +
    "</div>" +
    '<div class="firma-col firma-med-box">' +
    sigImg +
    '<div style="border-top:1px solid #374151;width:180px;margin:0 auto;padding-top:5px;">' +
    '<div class="firma-med-name">' +
    nomDoc +
    "</div>" +
    '<div class="firma-med-sub">' +
    nomTit +
    "</div>" +
    '<div class="firma-med-sub">Licencia: ' +
    nomLic +
    " (" +
    nomCiu +
    ")</div>" +
    (nomCell ? '<div class="firma-med-sub">Cel: ' + nomCell + "</div>" : "") +
    (nomMail
      ? '<div class="firma-med-sub">Email: ' + nomMail.toUpperCase() + "</div>"
      : "") +
    "</div>" +
    "</div>" +
    "</div>" +
    /* ── FOOTER ─────────────────────────────────────────────── */
    '<div class="footer">' +
    "<span>Res. 1843/2025 · Res. 1995/1999 · Ley 23/1981 · Ley 1581/2012</span>" +
    "<span>SISO OcupaSalud v4.8</span>" +
    "</div>" +
    /* ── CONSENTIMIENTO ─────────────────────────────────────── */
    '<div class="consent">El suscrito Médico Especialista en Salud Ocupacional, con licencia vigente, certifica que realizó el examen médico ocupacional registrado en este documento. ' +
    "El paciente fue informado de las medidas de protección de la confidencialidad de los resultados. " +
    "Las respuestas dadas fueron consideradas verídicas. " +
    "Se autoriza al doctor para suministrar la Historia Clínica a la EPS y a las personas o entidades contempladas en la legislación vigente, para el buen cumplimiento del sistema de seguridad y salud en el trabajo. " +
    "Res. 1843/2025 · Ley 1581/2012 · Ley 23/1981.</div>" +
    "</body></html>"
  );
};

export { _generarRIPSJson, _descargarRIPSJson, _generarRDA, _descargarRDA, _generarFHIRPatient, _generarFHIRPractitioner, _generarFHIRObservation, _generarFHIRBundle, validarRIPSPaciente, validarRIPSLote, _generarCertificadoHTMLNormalizado, _generarHashHC, _generarCodigoQR, _formatFirmaDigital, _generarPaqueteRetencion, _generarFacturaDIAN_UBL };
