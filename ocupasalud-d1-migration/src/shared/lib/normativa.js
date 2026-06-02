// ══════════════════════════════════════════════════════════════════════════
// NORMATIVA COLOMBIANA: RIPS, FHIR R4, RDA, DIAN UBL
// Res. 2275/2023, Res. 1888/2025, Decreto 358/2020
// ══════════════════════════════════════════════════════════════════════════
export const _generarFHIRPatient = (p) => ({
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

export const _generarFHIRPractitioner = (d) => ({
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

export const _generarFHIRObservation = (p, tipo) => ({
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

export const _generarFHIRBundle = (paciente, doctor) => {
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

export const validarRIPSPaciente = (p) => {
  const errs = [];
  if (!p.docNumero || p.docNumero.length < 4) errs.push("docNumero inválido");
  if (!p.fechaExamen) errs.push("fechaExamen requerida");
  if (!p.tipoExamen) errs.push("tipoExamen requerido");
  if (!p.conceptoAptitud) errs.push("conceptoAptitud requerido para RIPS");
  if (!p.eps) errs.push("EPS requerida para RIPS");
  return errs;
};

export const validarRIPSLote = (pacientes) => {
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

export const _generarRIPSJson = (pacientes, doctorData, periodo) => {
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

export const _descargarRIPSJson = (pacientes, doctorData, periodo) => {
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

export const _generarRDA = (paciente, doctorData, sesionId) => {
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

export const _descargarRDA = (paciente, doctorData, sesionId) => {
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

export const _generarFacturaDIAN_UBL = (billData, doctorData, numero) => {
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