// ══════════════════════════════════════════════════════════════════════════════
// SISTEMA DE PLANES - PLAN_CONFIG (única fuente de verdad)
// ══════════════════════════════════════════════════════════════════════════════
export const PLAN_CONFIG = {
  libre: {
    label: "🆓 Libre",
    price: 0,
    priceLabel: "Gratis",
    maxHC: 8, // total, no mensual
    maxEmpresas: 5,
    maxPacientes: 50,
    maxMedicos: 1,
    maxSVEprogramas: 0,
    maxTeleSesiones: 0,
    storageMB: 0,
    trialDays: 0,
    color: "gray",
    features: [
      "hc_ocupacional",
      "hc_general",
      "firma_digital",
      "cierre_hc",
      "antecedentes_memoria",
      "concepto_aptitud",
      "consentimiento",
      "verificacion_externa",
      "habeas_data",
      "portal_trabajador",
      "backup_restore",
      "offline",
      "sync_supabase",
    ],
  },
  starter: {
    label: "🌱 Starter",
    price: 45000,
    priceLabel: "$45.000/mes",
    maxHC: 200,
    maxEmpresas: 30,
    maxPacientes: 9999,
    maxMedicos: 1,
    maxSVEprogramas: 2,
    maxTeleSesiones: 10,
    storageMB: 512,
    trialDays: 15,
    color: "teal",
    features: [
      "hc_ocupacional",
      "hc_general",
      "firma_digital",
      "cierre_hc",
      "antecedentes_memoria",
      "concepto_aptitud",
      "consentimiento",
      "verificacion_externa",
      "habeas_data",
      "portal_trabajador",
      "backup_restore",
      "offline",
      "sync_supabase",
      "agenda",
      "propuestas",
      "factura_basica",
      "solicitud_examenes",
      "incapacidad",
      "reportes_basicos",
      "rips_validacion",
      "sve_starter",
      "telemedicina_starter",
    ],
  },
  pro: {
    label: "⭐ Pro",
    price: 79000,
    priceLabel: "$79.000/mes",
    maxHC: 9999,
    maxEmpresas: 9999,
    maxPacientes: 9999,
    maxMedicos: 1,
    maxSVEprogramas: 7,
    maxTeleSesiones: 9999,
    storageMB: 3072,
    trialDays: 15,
    color: "blue",
    features: [
      "hc_ocupacional",
      "hc_general",
      "firma_digital",
      "cierre_hc",
      "antecedentes_memoria",
      "concepto_aptitud",
      "consentimiento",
      "verificacion_externa",
      "habeas_data",
      "portal_trabajador",
      "backup_restore",
      "offline",
      "sync_supabase",
      "agenda",
      "propuestas",
      "factura_basica",
      "solicitud_examenes",
      "incapacidad",
      "reportes_basicos",
      "rips_validacion",
      "sve_starter",
      "telemedicina_starter",
      "arl",
      "ia_analisis",
      "ia_resumen",
      "ia_reporte",
      "fhir_export",
      "rips_export",
      "dian_xml",
      "adjuntos",
      "auditoria",
      "2fa",
      "multi_usuario",
      "telemedicina_ilimitada",
      "sve_pro",
      "reportes_ia",
      "analytics_avanzado",
    ],
  },
  clinica: {
    label: "🏢 Clínica",
    price: 159000,
    priceLabel: "$159.000/mes",
    maxHC: 9999,
    maxEmpresas: 9999,
    maxPacientes: 9999,
    maxMedicos: 3,
    maxMedicosBase: 3,
    precioPorMedicoExtra: 45000,
    maxSVEprogramas: 7,
    maxTeleSesiones: 9999,
    storageMB: 10240,
    trialDays: 30,
    color: "purple",
    features: ["todo"],
  },
};

export const ORG_DEFAULT_ID = "org_cucalon_2026";

export const ORG_CONFIG_DEFAULT = {
  orgId: ORG_DEFAULT_ID,
  orgName: "OcupaSalud Popayán",
  orgNit: "",
  plan: "clinica",
  createdAt: "2026-01-01",
  adminUser: "drcucalon",
};

export const _genOrgId = (name) =>
  "org_" +
  name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20) +
  "_" +
  Date.now().toString(36);

export const SECRETARIA_PERMISOS_DEFAULT = {
  agenda: false, // Ver y gestionar agenda de citas
  bill: false, // Generar cuentas de cobro
  propuestas: false, // Generar propuestas económicas
  telemedicina: false, // Acceder al módulo de telemedicina
  empresas: false, // Ver y editar empresas clientes
  pacientes_lista: false, // Ver listado de pacientes (solo lectura)
  reporte: false, // Ver reportes epidemiológicos
  sve: false, // Ver SVE
  caja: false, // Acceder al módulo financiero/caja
  adjuntos: false, // Subir adjuntos a HC
  cuentas_cobro: false, // Ver estado de cuentas por cobrar
  pacientes_crear: false, // Crear nuevos pacientes (solo datos demográficos)
};

export const MEDICO_SIEMPRE_PUEDE = new Set([
  "agenda",
  "bill",
  "propuestas",
  "empresas",
  "pacientes_lista",
  "reporte",
  "sve",
  "caja",
  "adjuntos",
  "cuentas_cobro",
  "pacientes_crear",
  "telemedicina",
]);

// Helper: ¿el usuario actual tiene esta feature?
export const _canUse = (feature, user) => {
  if (user?.role === 'super_admin') return true;
  const plan = user?.license || "libre";
  const cfg = PLAN_CONFIG[plan] || PLAN_CONFIG.libre;
  if (cfg.price > 0 && user?.licenseExpiry) {
    const exp = new Date(user.licenseExpiry);
    if (exp < new Date()) return false;
  }
  return cfg.features.includes("todo") || cfg.features.includes(feature);
};

// Helper: ¿cuántas HC totales tiene el usuario?
export const _contarHC = (lista, userId) =>
  lista.filter((p) => p._medicoId === userId && p.fechaExamen && !p._archivado).length;

// Helper: ¿el rol tiene privilegios de administrador?
export const _isAdmin = (role) => role === "administrador" || role === "super_admin";
export const _isAdminEmpresa = (role) => role === "admin_empresa";
export const _isEmpresaUser = (user) => !!user?.empresaId;
export const _isAdminOrEmpresa = (role) => _isAdmin(role) || _isAdminEmpresa(role);

// Helper principal: ¿puede la secretaria hacer X?
export const _secretariaPuede = (feature, currentUser, usersList) => {
  if (!currentUser) return false;
  if (_isAdmin(currentUser.role)) return true;
  if (_isAdminEmpresa(currentUser.role)) return true;
  if (currentUser.role === "medico") return MEDICO_SIEMPRE_PUEDE.has(feature) || true;
  if (currentUser.role === "secretaria") {
    const userObj = usersList?.find((u) => u.user === currentUser.user);
    const permisos = userObj?.secretariaPermisos || currentUser?.secretariaPermisos || SECRETARIA_PERMISOS_DEFAULT;
    return permisos[feature] === true;
  }
  return false;
};

export const _secretariaMedicoAsignado = (currentUser, medicoId, usersList) => {
  if (!currentUser) return false;
  if (currentUser.role !== "secretaria") return true;
  const userObj = usersList?.find((u) => u.user === currentUser.user);
  const asignados = userObj?.medicosAsignados || [];
  if (asignados.length === 0) return true;
  return asignados.includes(medicoId);
};