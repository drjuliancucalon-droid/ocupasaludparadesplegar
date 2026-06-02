/**
 * sgsstService.js
 * Servicio de datos y lógica de negocio para el módulo SG-SST
 * Implementa: Decreto 1072/2015, Resolución 0312/2019, GTC-45 (2012)
 */

const STORAGE_PREFIX = 'siso_sgsst_';

// ─── Helpers de localStorage ───────────────────────────────────────────────────
const getItem = (key) => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const setItem = (key, value) => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (e) { console.error('Error guardando en localStorage:', e); }
};

// ─── CRUD genérico ─────────────────────────────────────────────────────────────
const createCRUD = (collectionKey) => ({
  getAll: () => getItem(collectionKey) || [],
  getById: (id) => (getItem(collectionKey) || []).find(item => item.id === id),
  create: (item) => {
    const items = getItem(collectionKey) || [];
    const newItem = {
      ...item,
      id: item.id || `${collectionKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.push(newItem);
    setItem(collectionKey, items);
    return newItem;
  },
  update: (id, updates) => {
    const items = getItem(collectionKey) || [];
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    setItem(collectionKey, items);
    return items[idx];
  },
  remove: (id) => {
    const items = (getItem(collectionKey) || []).filter(item => item.id !== id);
    setItem(collectionKey, items);
  },
  count: () => (getItem(collectionKey) || []).length,
});

// ─── Colecciones ───────────────────────────────────────────────────────────────
export const riesgosCRUD = createCRUD('riesgos');
export const planesCRUD = createCRUD('planes');
export const capacitacionesCRUD = createCRUD('capacitaciones');
export const inspeccionesCRUD = createCRUD('inspecciones');
export const documentosCRUD = createCRUD('documentos');
export const accidentesCRUD = createCRUD('accidentes');
export const politicasCRUD = createCRUD('politicas');
export const actividadesCRUD = createCRUD('actividades');
export const empleadosCRUD = createCRUD('empleados');

// ─── Configuración de empresa ──────────────────────────────────────────────────
export const getCompanyConfig = () => getItem('company_config') || {
  nombre: '',
  nit: '',
  sector: '',
  numTrabajadores: 0,
  nivelRiesgo: 'I',
  tipoEmpresa: 'A', // A: ≤10, B: 11-50, C: 51+ o riesgo IV-V
  arl: '',
  direccion: '',
  ciudad: '',
  representanteLegal: '',
  responsableSST: '',
};

export const setCompanyConfig = (config) => {
  const tipo = determinarTipoEmpresa(config.numTrabajadores, config.nivelRiesgo);
  setItem('company_config', { ...config, tipoEmpresa: tipo });
};

export const determinarTipoEmpresa = (numTrabajadores, nivelRiesgo) => {
  if (['IV', 'V'].includes(nivelRiesgo)) return 'C';
  if (numTrabajadores <= 10) return 'A';
  if (numTrabajadores <= 50) return 'B';
  return 'C';
};

// ─── GTC-45: Valoración de riesgos ────────────────────────────────────────────
// Nivel de Deficiencia (ND)
export const NIVEL_DEFICIENCIA = {
  'Muy Alto': { valor: 10, descripcion: 'Se ha(n) detectado peligro(s) que determina(n) como posible la generación de incidentes, o la eficacia del conjunto de medidas preventivas existentes respecto al riesgo es nula o no existe, o ambos.' },
  'Alto': { valor: 6, descripcion: 'Se ha(n) detectado algún(os) peligro(s) que pueden dar lugar a incidentes significativo(s), o la eficacia del conjunto de medidas preventivas existentes es baja, o ambos.' },
  'Medio': { valor: 2, descripcion: 'Se han detectado peligros que pueden dar lugar a incidentes poco significativos o de menor importancia, o la eficacia del conjunto de medidas preventivas existentes es moderada, o ambos.' },
  'Bajo': { valor: 0, descripcion: 'No se ha detectado peligro o la eficacia del conjunto de medidas preventivas existentes es alta. El riesgo está controlado.' },
};

// Nivel de Exposición (NE)
export const NIVEL_EXPOSICION = {
  'Continua': { valor: 4, descripcion: 'La situación de exposición se presenta sin interrupción o varias veces con tiempo prolongado durante la jornada laboral.' },
  'Frecuente': { valor: 3, descripcion: 'La situación de exposición se presenta varias veces durante la jornada laboral por tiempos cortos.' },
  'Ocasional': { valor: 2, descripcion: 'La situación de exposición se presenta alguna vez durante la jornada laboral y por un periodo de tiempo corto.' },
  'Esporádica': { valor: 1, descripcion: 'La situación de exposición se presenta de manera eventual.' },
};

// Nivel de Probabilidad (NP = ND x NE)
export const calcularNivelProbabilidad = (nd, ne) => {
  const ndVal = NIVEL_DEFICIENCIA[nd]?.valor ?? 0;
  const neVal = NIVEL_EXPOSICION[ne]?.valor ?? 1;
  const np = ndVal * neVal;
  if (np >= 24) return { valor: np, nivel: 'Muy Alto', significado: 'Situación deficiente con exposición continua, o muy deficiente con exposición frecuente.' };
  if (np >= 10) return { valor: np, nivel: 'Alto', significado: 'Situación deficiente con exposición frecuente u ocasional, o bien situación muy deficiente con exposición ocasional o esporádica.' };
  if (np >= 6) return { valor: np, nivel: 'Medio', significado: 'Situación deficiente con exposición esporádica, o bien situación mejorable con exposición continuada o frecuente.' };
  return { valor: np, nivel: 'Bajo', significado: 'Situación mejorable con exposición ocasional o esporádica, o situación sin anomalía destacable con cualquier nivel de exposición.' };
};

// Nivel de Consecuencia (NC)
export const NIVEL_CONSECUENCIA = {
  'Mortal o Catastrófico': { valor: 100, descripcion: 'Muerte(s)' },
  'Muy Grave': { valor: 60, descripcion: 'Lesiones o enfermedades graves irreparables (incapacidad permanente parcial o invalidez)' },
  'Grave': { valor: 25, descripcion: 'Lesiones o enfermedades con incapacidad laboral temporal (ILT)' },
  'Leve': { valor: 10, descripcion: 'Lesiones o enfermedades que no requieren incapacidad' },
};

// Nivel de Riesgo (NR = NP x NC)
export const calcularNivelRiesgo = (np, nc) => {
  const npVal = typeof np === 'number' ? np : (calcularNivelProbabilidad(np, 'Continua').valor);
  const ncVal = NIVEL_CONSECUENCIA[nc]?.valor ?? 10;
  const nr = npVal * ncVal;
  if (nr >= 600) return { valor: nr, nivel: 'I', interpretacion: 'No Aceptable', color: '#EF4444', significado: 'Situación crítica. Suspender actividades hasta que el riesgo esté bajo control. Intervención urgente.' };
  if (nr >= 150) return { valor: nr, nivel: 'II', interpretacion: 'No Aceptable o Aceptable con control específico', color: '#F97316', significado: 'Corregir y adoptar medidas de control de inmediato.' };
  if (nr >= 40) return { valor: nr, nivel: 'III', interpretacion: 'Mejorable', color: '#EAB308', significado: 'Mejorar si es posible. Sería conveniente justificar la intervención y su rentabilidad.' };
  return { valor: nr, nivel: 'IV', interpretacion: 'Aceptable', color: '#22C55E', significado: 'Mantener las medidas de control existentes, pero se deberían considerar soluciones o mejoras.' };
};

// Aceptabilidad del riesgo
export const determinarAceptabilidad = (nivelRiesgo) => {
  switch (nivelRiesgo) {
    case 'I': return { aceptable: false, clase: 'No Aceptable', accion: 'Situación crítica. Suspender actividades hasta que el riesgo esté bajo control.', color: 'bg-red-500' };
    case 'II': return { aceptable: false, clase: 'No Aceptable o Aceptable con control específico', accion: 'Corregir y adoptar medidas de control de inmediato.', color: 'bg-orange-500' };
    case 'III': return { aceptable: true, clase: 'Mejorable', accion: 'Mejorar si es posible. Sería conveniente justificar la intervención y su rentabilidad.', color: 'bg-yellow-500' };
    case 'IV': return { aceptable: true, clase: 'Aceptable', accion: 'Mantener las medidas de control existentes.', color: 'bg-green-500' };
    default: return { aceptable: true, clase: 'Sin evaluar', accion: 'Evaluar el riesgo', color: 'bg-gray-400' };
  }
};

// ─── Categorías de peligros (GTC-45) ──────────────────────────────────────────
export const CATEGORIAS_PELIGROS = {
  'Físico': ['Ruido', 'Iluminación', 'Vibración', 'Temperaturas extremas', 'Presión atmosférica', 'Radiaciones ionizantes', 'Radiaciones no ionizantes'],
  'Químico': ['Polvos orgánicos/inorgánicos', 'Fibras', 'Líquidos (nieblas y rocíos)', 'Gases y vapores', 'Humos metálicos/no metálicos', 'Material particulado'],
  'Biológico': ['Virus', 'Bacterias', 'Hongos', 'Ricketsias', 'Parásitos', 'Picaduras', 'Mordeduras', 'Fluidos o excrementos'],
  'Biomecánico': ['Postura prolongada', 'Postura forzada', 'Movimientos repetitivos', 'Esfuerzo', 'Manipulación manual de cargas'],
  'Psicosocial': ['Gestión organizacional', 'Características de la organización del trabajo', 'Características del grupo social de trabajo', 'Condiciones de la tarea', 'Interface persona-tarea', 'Jornada de trabajo'],
  'Condiciones de seguridad': ['Mecánico', 'Eléctrico', 'Locativo', 'Tecnológico', 'Accidentes de tránsito', 'Públicos', 'Trabajo en alturas', 'Espacios confinados'],
  'Fenómenos naturales': ['Sismo/terremoto', 'Vendaval', 'Inundación', 'Derrumbe', 'Precipitaciones'],
};

// Controles sugeridos por categoría
export const CONTROLES_SUGERIDOS = {
  'Físico': {
    eliminacion: ['Automatización de procesos', 'Rediseño de procesos'],
    sustitucion: ['Cambio de equipos por unos menos ruidosos', 'Uso de materiales absorbentes'],
    ingenieria: ['Paneles acústicos', 'Barreras anti-vibración', 'Sistemas de ventilación', 'Iluminación LED regulable'],
    administrativo: ['Rotación de personal', 'Pausas activas', 'Programa de vigilancia epidemiológica', 'Capacitación en riesgos físicos'],
    epp: ['Protectores auditivos', 'Gafas de seguridad', 'Guantes térmicos'],
  },
  'Químico': {
    eliminacion: ['Eliminación de sustancias peligrosas del proceso'],
    sustitucion: ['Sustitución por sustancias menos peligrosas', 'Uso de productos biodegradables'],
    ingenieria: ['Sistemas de extracción localizada', 'Cabinas de seguridad', 'Duchas de emergencia y lavaojos'],
    administrativo: ['Hojas de seguridad (SDS) actualizadas', 'Procedimientos de manejo seguro', 'Programa de vigilancia epidemiológica'],
    epp: ['Respiradores con filtro', 'Guantes de nitrilo', 'Gafas de seguridad', 'Overol'],
  },
  'Biológico': {
    eliminacion: ['Eliminación de fuentes de contaminación biológica'],
    sustitucion: ['Automatización de procesos con riesgo biológico'],
    ingenieria: ['Cabinas de bioseguridad', 'Sistemas de desinfección', 'Contenedores para residuos biológicos'],
    administrativo: ['Protocolos de bioseguridad', 'Esquema de vacunación', 'Programa de vigilancia epidemiológica', 'Capacitación en riesgo biológico'],
    epp: ['Guantes de látex/nitrilo', 'Tapabocas/respiradores', 'Gafas de bioseguridad', 'Bata antifluidos'],
  },
  'Biomecánico': {
    eliminacion: ['Automatización de tareas repetitivas'],
    sustitucion: ['Ayudas mecánicas para manipulación de cargas'],
    ingenieria: ['Mobiliario ergonómico', 'Herramientas ergonómicas', 'Estaciones de trabajo ajustables'],
    administrativo: ['Pausas activas', 'Rotación de tareas', 'Programa de vigilancia epidemiológica osteomuscular', 'Análisis de puestos de trabajo'],
    epp: ['Fajas ergonómicas', 'Muñequeras', 'Coderas'],
  },
  'Psicosocial': {
    eliminacion: ['Rediseño de cargas de trabajo'],
    sustitucion: ['Redistribución de funciones'],
    ingenieria: ['Espacios de descanso adecuados'],
    administrativo: ['Programa de bienestar laboral', 'Aplicación de batería de riesgo psicosocial', 'Comité de Convivencia Laboral', 'Capacitación en manejo del estrés', 'Política de prevención del acoso laboral'],
    epp: [],
  },
  'Condiciones de seguridad': {
    eliminacion: ['Eliminación de condiciones inseguras'],
    sustitucion: ['Reemplazo de equipos obsoletos'],
    ingenieria: ['Guardas de seguridad en máquinas', 'Sistemas de bloqueo/etiquetado', 'Señalización', 'Sistemas de protección contra caídas'],
    administrativo: ['Permisos de trabajo', 'Procedimientos de trabajo seguro', 'Inspecciones de seguridad', 'Programa de mantenimiento preventivo'],
    epp: ['Casco', 'Arnés', 'Botas de seguridad', 'Guantes', 'Gafas'],
  },
  'Fenómenos naturales': {
    eliminacion: [],
    sustitucion: [],
    ingenieria: ['Reforzamiento estructural', 'Sistemas de alerta temprana', 'Rutas de evacuación señalizadas'],
    administrativo: ['Plan de emergencias', 'Simulacros', 'Brigada de emergencias', 'Capacitación en respuesta a emergencias'],
    epp: ['Kit de emergencia personal'],
  },
};

// ─── Indicadores de accidentalidad ────────────────────────────────────────────
/**
 * IF - Índice de Frecuencia: (Nº accidentes con incapacidad × 240.000) / Nº HHT
 * IS - Índice de Severidad: (Nº días perdidos × 240.000) / Nº HHT
 * ILI - Índice de Lesión Incapacitante: (IF × IS) / 1000
 * Tasa de Accidentalidad: (Nº accidentes × 100) / Nº trabajadores promedio
 */
export const calcularIndicadores = (accidentes, numTrabajadores, horasTrabajadas) => {
  const hht = horasTrabajadas || (numTrabajadores * 48 * 50); // 48h/semana × 50 semanas
  const accidentesConIncapacidad = accidentes.filter(a => a.diasPerdidos > 0);
  const totalDiasPerdidos = accidentes.reduce((sum, a) => sum + (a.diasPerdidos || 0), 0);
  const totalAccidentes = accidentes.length;

  const IF_val = hht > 0 ? ((accidentesConIncapacidad.length * 240000) / hht) : 0;
  const IS_val = hht > 0 ? ((totalDiasPerdidos * 240000) / hht) : 0;
  const ILI_val = (IF_val * IS_val) / 1000;
  const tasaAccidentalidad = numTrabajadores > 0 ? ((totalAccidentes * 100) / numTrabajadores) : 0;

  return {
    IF: Math.round(IF_val * 100) / 100,
    IS: Math.round(IS_val * 100) / 100,
    ILI: Math.round(ILI_val * 100) / 100,
    tasaAccidentalidad: Math.round(tasaAccidentalidad * 100) / 100,
    totalAccidentes,
    accidentesConIncapacidad: accidentesConIncapacidad.length,
    totalDiasPerdidos,
    hht,
  };
};

// ─── Cálculo de cumplimiento Res. 0312/2019 ──────────────────────────────────
// Estándares mínimos según tipo de empresa
export const ESTANDARES_MINIMOS = {
  A: { // ≤10 trabajadores, riesgo I-III
    items: [
      { id: 'a1', nombre: 'Asignación de persona que diseña el SG-SST', peso: 0.5, fase: 'Planear' },
      { id: 'a2', nombre: 'Afiliación al SGRL', peso: 0.5, fase: 'Planear' },
      { id: 'a3', nombre: 'Capacitación en SST', peso: 6, fase: 'Hacer' },
      { id: 'a4', nombre: 'Plan anual de trabajo', peso: 6, fase: 'Hacer' },
      { id: 'a5', nombre: 'Evaluaciones médicas ocupacionales', peso: 6, fase: 'Hacer' },
      { id: 'a6', nombre: 'Identificación de peligros, evaluación y valoración de riesgos', peso: 15, fase: 'Hacer' },
      { id: 'a7', nombre: 'Medidas de prevención y control', peso: 15, fase: 'Hacer' },
    ],
    totalPeso: 49,
  },
  B: { // 11-50 trabajadores, riesgo I-III
    items: [
      { id: 'b1', nombre: 'Asignación de persona que diseña el SG-SST', peso: 0.5, fase: 'Planear' },
      { id: 'b2', nombre: 'Afiliación al SGRL', peso: 0.5, fase: 'Planear' },
      { id: 'b3', nombre: 'Política de SST', peso: 1, fase: 'Planear' },
      { id: 'b4', nombre: 'Capacitación en SST', peso: 6, fase: 'Hacer' },
      { id: 'b5', nombre: 'Plan anual de trabajo', peso: 6, fase: 'Hacer' },
      { id: 'b6', nombre: 'Evaluaciones médicas', peso: 6, fase: 'Hacer' },
      { id: 'b7', nombre: 'Identificación de peligros y valoración de riesgos', peso: 15, fase: 'Hacer' },
      { id: 'b8', nombre: 'Medidas de prevención y control', peso: 15, fase: 'Hacer' },
      { id: 'b9', nombre: 'Investigación de accidentes e incidentes', peso: 5, fase: 'Verificar' },
      { id: 'b10', nombre: 'Acciones preventivas y correctivas', peso: 5, fase: 'Actuar' },
    ],
    totalPeso: 60,
  },
  C: { // 51+ trabajadores o riesgo IV-V
    items: [
      { id: 'c1', nombre: 'Responsable del SG-SST (licencia vigente)', peso: 0.5, fase: 'Planear' },
      { id: 'c2', nombre: 'Responsabilidades en SST', peso: 0.5, fase: 'Planear' },
      { id: 'c3', nombre: 'Asignación de recursos para el SG-SST', peso: 0.5, fase: 'Planear' },
      { id: 'c4', nombre: 'Afiliación al SGRL', peso: 0.5, fase: 'Planear' },
      { id: 'c5', nombre: 'Pago de pensión trabajadores alto riesgo', peso: 0.5, fase: 'Planear' },
      { id: 'c6', nombre: 'Conformación COPASST/Vigía', peso: 0.5, fase: 'Planear' },
      { id: 'c7', nombre: 'Comité de Convivencia', peso: 0.5, fase: 'Planear' },
      { id: 'c8', nombre: 'Programa de capacitación', peso: 6, fase: 'Planear' },
      { id: 'c9', nombre: 'Política de SST', peso: 1, fase: 'Planear' },
      { id: 'c10', nombre: 'Objetivos del SG-SST', peso: 1, fase: 'Planear' },
      { id: 'c11', nombre: 'Evaluación inicial del SG-SST', peso: 1, fase: 'Planear' },
      { id: 'c12', nombre: 'Plan anual de trabajo', peso: 2, fase: 'Planear' },
      { id: 'c13', nombre: 'Archivo y retención documental', peso: 2, fase: 'Planear' },
      { id: 'c14', nombre: 'Rendición de cuentas', peso: 1, fase: 'Planear' },
      { id: 'c15', nombre: 'Matriz legal', peso: 2, fase: 'Planear' },
      { id: 'c16', nombre: 'Mecanismos de comunicación', peso: 1, fase: 'Planear' },
      { id: 'c17', nombre: 'Adquisiciones y contratación', peso: 2, fase: 'Planear' },
      { id: 'c18', nombre: 'Gestión del cambio', peso: 1, fase: 'Planear' },
      { id: 'c19', nombre: 'Condiciones de salud', peso: 1, fase: 'Hacer' },
      { id: 'c20', nombre: 'Registro y reporte de AT y EL', peso: 2, fase: 'Hacer' },
      { id: 'c21', nombre: 'Investigación de AT e incidentes', peso: 2, fase: 'Hacer' },
      { id: 'c22', nombre: 'Identificación de peligros y valoración de riesgos', peso: 4, fase: 'Hacer' },
      { id: 'c23', nombre: 'Medidas de prevención y control', peso: 2.5, fase: 'Hacer' },
      { id: 'c24', nombre: 'Aplicación de medidas de prevención', peso: 2.5, fase: 'Hacer' },
      { id: 'c25', nombre: 'Procedimientos e instructivos', peso: 2.5, fase: 'Hacer' },
      { id: 'c26', nombre: 'Inspecciones a instalaciones', peso: 2.5, fase: 'Hacer' },
      { id: 'c27', nombre: 'Vigilancia de condiciones de salud', peso: 2.5, fase: 'Hacer' },
      { id: 'c28', nombre: 'Prevención, preparación y respuesta ante emergencias', peso: 5, fase: 'Hacer' },
      { id: 'c29', nombre: 'Gestión y resultados del SG-SST', peso: 5, fase: 'Verificar' },
      { id: 'c30', nombre: 'Acciones preventivas y correctivas', peso: 10, fase: 'Actuar' },
    ],
    totalPeso: 60,
  },
};

export const calcularCumplimiento = (tipoEmpresa = 'C') => {
  const estandares = ESTANDARES_MINIMOS[tipoEmpresa] || ESTANDARES_MINIMOS.C;
  const cumplidos = getItem('cumplimiento_estandares') || {};
  
  let totalPesoObtenido = 0;
  let totalPesoPosible = 0;
  const fases = { Planear: { obtenido: 0, posible: 0 }, Hacer: { obtenido: 0, posible: 0 }, Verificar: { obtenido: 0, posible: 0 }, Actuar: { obtenido: 0, posible: 0 } };

  estandares.items.forEach(item => {
    totalPesoPosible += item.peso;
    fases[item.fase].posible += item.peso;
    if (cumplidos[item.id]) {
      totalPesoObtenido += item.peso;
      fases[item.fase].obtenido += item.peso;
    }
  });

  const porcentaje = totalPesoPosible > 0 ? Math.round((totalPesoObtenido / totalPesoPosible) * 100) : 0;
  
  const fasesPorcentaje = {};
  Object.entries(fases).forEach(([fase, vals]) => {
    fasesPorcentaje[fase] = vals.posible > 0 ? Math.round((vals.obtenido / vals.posible) * 100) : 0;
  });

  let valoracion;
  if (porcentaje <= 60) valoracion = { nivel: 'Crítico', color: '#EF4444', accion: 'Enviar plan de mejoramiento inmediato a la ARL y seguimiento' };
  else if (porcentaje <= 85) valoracion = { nivel: 'Moderadamente Aceptable', color: '#F97316', accion: 'Enviar plan de mejoramiento a la ARL dentro de los 3 meses' };
  else valoracion = { nivel: 'Aceptable', color: '#22C55E', accion: 'Mantener la calificación y evidencias. Incluir en el plan anual.' };

  return {
    porcentaje,
    totalPesoObtenido,
    totalPesoPosible,
    fases: fasesPorcentaje,
    valoracion,
    estandares: estandares.items.map(item => ({ ...item, cumplido: !!cumplidos[item.id] })),
    tipoEmpresa,
  };
};

export const toggleCumplimientoEstandar = (itemId) => {
  const cumplidos = getItem('cumplimiento_estandares') || {};
  cumplidos[itemId] = !cumplidos[itemId];
  setItem('cumplimiento_estandares', cumplidos);
};

// ─── Documentos obligatorios Res. 0312/2019 ──────────────────────────────────
export const DOCUMENTOS_OBLIGATORIOS = [
  { id: 'doc1', nombre: 'Política de Seguridad y Salud en el Trabajo', categoria: 'Políticas', descripcion: 'Art. 2.2.4.6.5 y 2.2.4.6.6 Decreto 1072/2015' },
  { id: 'doc2', nombre: 'Objetivos del SG-SST', categoria: 'Políticas', descripcion: 'Art. 2.2.4.6.7 Decreto 1072/2015' },
  { id: 'doc3', nombre: 'Responsabilidades en SST', categoria: 'Políticas', descripcion: 'Art. 2.2.4.6.8 Decreto 1072/2015' },
  { id: 'doc4', nombre: 'Matriz de Identificación de Peligros (IPEVR)', categoria: 'Identificación', descripcion: 'Art. 2.2.4.6.15 Decreto 1072/2015, GTC-45' },
  { id: 'doc5', nombre: 'Plan de Trabajo Anual', categoria: 'Planificación', descripcion: 'Art. 2.2.4.6.17 Decreto 1072/2015' },
  { id: 'doc6', nombre: 'Plan de Capacitación Anual', categoria: 'Planificación', descripcion: 'Art. 2.2.4.6.11 Decreto 1072/2015' },
  { id: 'doc7', nombre: 'Programa de Vigilancia Epidemiológica', categoria: 'Salud', descripcion: 'Art. 2.2.4.6.24 Decreto 1072/2015' },
  { id: 'doc8', nombre: 'Reglamento de Higiene y Seguridad Industrial', categoria: 'Políticas', descripcion: 'Art. 349 CST, Ley 9/1979' },
  { id: 'doc9', nombre: 'Actas COPASST / Vigía SST', categoria: 'Comités', descripcion: 'Res. 2013/1986, Decreto 1072/2015' },
  { id: 'doc10', nombre: 'Actas Comité de Convivencia Laboral', categoria: 'Comités', descripcion: 'Res. 652/2012, Res. 1356/2012' },
  { id: 'doc11', nombre: 'Indicadores del SG-SST', categoria: 'Seguimiento', descripcion: 'Art. 2.2.4.6.19-22 Decreto 1072/2015' },
  { id: 'doc12', nombre: 'Plan de Prevención, Preparación y Respuesta ante Emergencias', categoria: 'Emergencias', descripcion: 'Art. 2.2.4.6.25 Decreto 1072/2015' },
  { id: 'doc13', nombre: 'Procedimiento de Reporte e Investigación ATEL', categoria: 'Accidentalidad', descripcion: 'Res. 1401/2007, Decreto 1072/2015' },
  { id: 'doc14', nombre: 'Matriz Legal', categoria: 'Legal', descripcion: 'Art. 2.2.4.6.8 Decreto 1072/2015' },
  { id: 'doc15', nombre: 'Registro de Inspecciones', categoria: 'Seguimiento', descripcion: 'Art. 2.2.4.6.31 Decreto 1072/2015' },
  { id: 'doc16', nombre: 'Registro de Capacitaciones', categoria: 'Seguimiento', descripcion: 'Art. 2.2.4.6.11 Decreto 1072/2015' },
  { id: 'doc17', nombre: 'Profesiogramas', categoria: 'Salud', descripcion: 'Res. 2346/2007' },
  { id: 'doc18', nombre: 'Programas de Gestión del Riesgo', categoria: 'Identificación', descripcion: 'Art. 2.2.4.6.24 Decreto 1072/2015' },
  { id: 'doc19', nombre: 'Evaluación Inicial del SG-SST', categoria: 'Evaluación', descripcion: 'Art. 2.2.4.6.16 Decreto 1072/2015' },
  { id: 'doc20', nombre: 'Auditoría del SG-SST', categoria: 'Evaluación', descripcion: 'Art. 2.2.4.6.29-30 Decreto 1072/2015' },
  { id: 'doc21', nombre: 'Revisión por la Alta Dirección', categoria: 'Evaluación', descripcion: 'Art. 2.2.4.6.31 Decreto 1072/2015' },
];

// ─── Catálogo de capacitaciones ───────────────────────────────────────────────
export const CATALOGO_CAPACITACIONES = [
  { id: 'cap1', nombre: 'Inducción en SST', obligatoria: true, frecuencia: 'Al ingreso', norma: 'Dec. 1072/2015 Art. 2.2.4.6.11', duracionHoras: 2 },
  { id: 'cap2', nombre: 'Reinducción en SST', obligatoria: true, frecuencia: 'Anual', norma: 'Dec. 1072/2015 Art. 2.2.4.6.11', duracionHoras: 2 },
  { id: 'cap3', nombre: 'Política y objetivos del SG-SST', obligatoria: true, frecuencia: 'Anual', norma: 'Dec. 1072/2015', duracionHoras: 1 },
  { id: 'cap4', nombre: 'Trabajo en Alturas (Básico)', obligatoria: true, frecuencia: 'Anual', norma: 'Res. 4272/2021', duracionHoras: 8, requiereRiesgo: ['Condiciones de seguridad'] },
  { id: 'cap5', nombre: 'Trabajo en Alturas (Avanzado)', obligatoria: false, frecuencia: 'Anual', norma: 'Res. 4272/2021', duracionHoras: 40, requiereRiesgo: ['Condiciones de seguridad'] },
  { id: 'cap6', nombre: 'Riesgo Eléctrico', obligatoria: true, frecuencia: 'Anual', norma: 'RETIE', duracionHoras: 4, requiereRiesgo: ['Condiciones de seguridad'] },
  { id: 'cap7', nombre: 'Primeros Auxilios', obligatoria: true, frecuencia: 'Anual', norma: 'Dec. 1072/2015', duracionHoras: 8 },
  { id: 'cap8', nombre: 'Prevención y Control de Incendios', obligatoria: true, frecuencia: 'Anual', norma: 'Dec. 1072/2015', duracionHoras: 4 },
  { id: 'cap9', nombre: 'Evacuación y Simulacros', obligatoria: true, frecuencia: 'Semestral', norma: 'Dec. 1072/2015', duracionHoras: 2 },
  { id: 'cap10', nombre: 'Manejo de Sustancias Químicas', obligatoria: true, frecuencia: 'Anual', norma: 'Dec. 1496/2018, SGA', duracionHoras: 4, requiereRiesgo: ['Químico'] },
  { id: 'cap11', nombre: 'Riesgo Biológico y Bioseguridad', obligatoria: true, frecuencia: 'Anual', norma: 'Dec. 1072/2015', duracionHoras: 4, requiereRiesgo: ['Biológico'] },
  { id: 'cap12', nombre: 'Higiene Postural y Ergonomía', obligatoria: true, frecuencia: 'Semestral', norma: 'Dec. 1072/2015', duracionHoras: 2, requiereRiesgo: ['Biomecánico'] },
  { id: 'cap13', nombre: 'Manejo del Estrés y Riesgo Psicosocial', obligatoria: true, frecuencia: 'Anual', norma: 'Res. 2646/2008', duracionHoras: 4, requiereRiesgo: ['Psicosocial'] },
  { id: 'cap14', nombre: 'COPASST / Vigía SST', obligatoria: true, frecuencia: 'Al elegir', norma: 'Dec. 1072/2015', duracionHoras: 20 },
  { id: 'cap15', nombre: 'Comité de Convivencia Laboral', obligatoria: true, frecuencia: 'Al elegir', norma: 'Res. 652/2012', duracionHoras: 8 },
  { id: 'cap16', nombre: 'Manejo Defensivo / Seguridad Vial', obligatoria: false, frecuencia: 'Anual', norma: 'Ley 1503/2011', duracionHoras: 4 },
  { id: 'cap17', nombre: 'Uso y mantenimiento de EPP', obligatoria: true, frecuencia: 'Semestral', norma: 'Dec. 1072/2015', duracionHoras: 2 },
  { id: 'cap18', nombre: 'Reporte de Actos y Condiciones Inseguras', obligatoria: true, frecuencia: 'Anual', norma: 'Dec. 1072/2015', duracionHoras: 1 },
];

// ─── Plantillas de inspección ─────────────────────────────────────────────────
export const PLANTILLAS_INSPECCION = {
  'Oficinas': [
    { id: 'of1', item: 'Estado de pisos (sin huecos, grietas o superficies resbaladizas)', prioridad: 'Mayor' },
    { id: 'of2', item: 'Iluminación adecuada en todos los puestos de trabajo', prioridad: 'Mayor' },
    { id: 'of3', item: 'Cables eléctricos organizados y sin deterioro', prioridad: 'Crítico' },
    { id: 'of4', item: 'Sillas ergonómicas en buen estado', prioridad: 'Menor' },
    { id: 'of5', item: 'Monitores a distancia y altura adecuada', prioridad: 'Menor' },
    { id: 'of6', item: 'Extintor vigente y señalizado', prioridad: 'Crítico' },
    { id: 'of7', item: 'Rutas de evacuación señalizadas y despejadas', prioridad: 'Crítico' },
    { id: 'of8', item: 'Botiquín de primeros auxilios completo y vigente', prioridad: 'Mayor' },
    { id: 'of9', item: 'Orden y aseo general', prioridad: 'Menor' },
    { id: 'of10', item: 'Ventilación adecuada', prioridad: 'Mayor' },
    { id: 'of11', item: 'Señalización de áreas (baños, cocina, archivo)', prioridad: 'Observación' },
    { id: 'of12', item: 'Escaleras con pasamanos y cinta antideslizante', prioridad: 'Mayor' },
    { id: 'of13', item: 'Tomas eléctricas sin sobrecargas', prioridad: 'Crítico' },
    { id: 'of14', item: 'Áreas de almacenamiento organizadas', prioridad: 'Menor' },
    { id: 'of15', item: 'Detectores de humo funcionales', prioridad: 'Crítico' },
  ],
  'Planta': [
    { id: 'pl1', item: 'Guardas de seguridad en máquinas', prioridad: 'Crítico' },
    { id: 'pl2', item: 'Señalización de áreas de riesgo', prioridad: 'Crítico' },
    { id: 'pl3', item: 'Uso adecuado de EPP por el personal', prioridad: 'Crítico' },
    { id: 'pl4', item: 'Sistemas de bloqueo/etiquetado (LOTO)', prioridad: 'Crítico' },
    { id: 'pl5', item: 'Estado de herramientas manuales y eléctricas', prioridad: 'Mayor' },
    { id: 'pl6', item: 'Orden y limpieza en áreas de trabajo', prioridad: 'Mayor' },
    { id: 'pl7', item: 'Demarcación de áreas de tránsito peatonal', prioridad: 'Mayor' },
    { id: 'pl8', item: 'Sistemas de ventilación y extracción', prioridad: 'Mayor' },
    { id: 'pl9', item: 'Almacenamiento seguro de materiales', prioridad: 'Mayor' },
    { id: 'pl10', item: 'Extintores vigentes y accesibles', prioridad: 'Crítico' },
    { id: 'pl11', item: 'Iluminación industrial adecuada', prioridad: 'Mayor' },
    { id: 'pl12', item: 'Niveles de ruido controlados', prioridad: 'Mayor' },
    { id: 'pl13', item: 'Duchas de emergencia y lavaojos funcionales', prioridad: 'Crítico' },
    { id: 'pl14', item: 'Hojas de seguridad (SDS) disponibles', prioridad: 'Mayor' },
    { id: 'pl15', item: 'Pisos sin derrames ni obstáculos', prioridad: 'Mayor' },
  ],
  'Bodega': [
    { id: 'bo1', item: 'Estanterías fijadas y en buen estado', prioridad: 'Crítico' },
    { id: 'bo2', item: 'Capacidad de carga señalizada en estanterías', prioridad: 'Mayor' },
    { id: 'bo3', item: 'Pasillos despejados y demarcados', prioridad: 'Mayor' },
    { id: 'bo4', item: 'Compatibilidad de almacenamiento de sustancias químicas', prioridad: 'Crítico' },
    { id: 'bo5', item: 'Montacargas/equipos de carga en buen estado', prioridad: 'Crítico' },
    { id: 'bo6', item: 'Iluminación adecuada', prioridad: 'Mayor' },
    { id: 'bo7', item: 'Ventilación adecuada', prioridad: 'Mayor' },
    { id: 'bo8', item: 'Control de plagas actualizado', prioridad: 'Menor' },
    { id: 'bo9', item: 'Extintores vigentes y accesibles', prioridad: 'Crítico' },
    { id: 'bo10', item: 'Pisos en buen estado, sin huecos ni desniveles', prioridad: 'Mayor' },
  ],
  'Laboratorio': [
    { id: 'la1', item: 'Campanas de extracción funcionales', prioridad: 'Crítico' },
    { id: 'la2', item: 'EPP disponible y en buen estado', prioridad: 'Crítico' },
    { id: 'la3', item: 'Hojas de seguridad actualizadas', prioridad: 'Mayor' },
    { id: 'la4', item: 'Clasificación y etiquetado de sustancias (SGA)', prioridad: 'Crítico' },
    { id: 'la5', item: 'Duchas de emergencia y lavaojos', prioridad: 'Crítico' },
    { id: 'la6', item: 'Gestión adecuada de residuos peligrosos', prioridad: 'Crítico' },
    { id: 'la7', item: 'Equipos calibrados y con mantenimiento', prioridad: 'Mayor' },
    { id: 'la8', item: 'Kit de derrames disponible', prioridad: 'Mayor' },
    { id: 'la9', item: 'Protocolo de bioseguridad visible', prioridad: 'Mayor' },
    { id: 'la10', item: 'Contenedores de residuos biológicos señalizados', prioridad: 'Crítico' },
  ],
  'Obra': [
    { id: 'ob1', item: 'Uso de casco, botas, guantes y gafas por todo el personal', prioridad: 'Crítico' },
    { id: 'ob2', item: 'Sistemas de protección contra caídas instalados', prioridad: 'Crítico' },
    { id: 'ob3', item: 'Andamios certificados y en buen estado', prioridad: 'Crítico' },
    { id: 'ob4', item: 'Escaleras en buen estado con antideslizante', prioridad: 'Mayor' },
    { id: 'ob5', item: 'Señalización perimetral de la obra', prioridad: 'Mayor' },
    { id: 'ob6', item: 'Excavaciones con entibado y señalización', prioridad: 'Crítico' },
    { id: 'ob7', item: 'Maquinaria pesada con señalización visual y sonora', prioridad: 'Crítico' },
    { id: 'ob8', item: 'Instalaciones eléctricas provisionales seguras', prioridad: 'Crítico' },
    { id: 'ob9', item: 'Orden y limpieza en el sitio de trabajo', prioridad: 'Mayor' },
    { id: 'ob10', item: 'Permisos de trabajo disponibles (alturas, espacios confinados, caliente)', prioridad: 'Crítico' },
    { id: 'ob11', item: 'Botiquín y camilla de emergencia disponibles', prioridad: 'Mayor' },
    { id: 'ob12', item: 'Extintor vigente en zona de trabajo', prioridad: 'Mayor' },
  ],
};

// ─── Plantillas de política SST ───────────────────────────────────────────────
export const generarPoliticaSST = (companyInfo) => {
  const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  return `POLÍTICA DE SEGURIDAD Y SALUD EN EL TRABAJO

${companyInfo.nombre || '[NOMBRE DE LA EMPRESA]'}, identificada con NIT ${companyInfo.nit || '[NIT]'}, con domicilio en ${companyInfo.ciudad || '[CIUDAD]'}, dedicada a ${companyInfo.sector || '[ACTIVIDAD ECONÓMICA]'}, consciente de su responsabilidad social y legal, se compromete con la implementación, desarrollo y mejoramiento continuo de su Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST), en cumplimiento de lo establecido en el Decreto 1072 de 2015, Libro 2, Parte 2, Título 4, Capítulo 6, y la Resolución 0312 de 2019.

COMPROMISOS:

1. Identificar los peligros, evaluar y valorar los riesgos y establecer los respectivos controles, conforme a la metodología GTC-45 (2012).

2. Proteger la seguridad y salud de todos los trabajadores, mediante la mejora continua del Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST).

3. Cumplir la normatividad nacional vigente aplicable en materia de riesgos laborales.

4. Asignar y comunicar responsabilidades en materia de SST a todos los niveles de la organización.

5. Garantizar los recursos financieros, técnicos y humanos necesarios para la implementación, mantenimiento y mejora continua del SG-SST.

6. Promover la participación activa de todos los trabajadores y contratistas en el SG-SST, incluyendo el COPASST/Vigía SST y el Comité de Convivencia Laboral.

7. Prevenir los accidentes y enfermedades laborales, promoviendo una cultura de prevención y autocuidado.

8. Implementar programas de promoción de la salud y prevención de la enfermedad en el trabajo.

9. Gestionar de manera oportuna los peligros y riesgos priorizados en la matriz IPEVR.

ALCANCE:

Esta política aplica a todos los trabajadores directos e indirectos, contratistas, subcontratistas, proveedores y visitantes de ${companyInfo.nombre || '[NOMBRE DE LA EMPRESA]'}, en todos sus centros de trabajo.

MARCO LEGAL:

• Decreto 1072 de 2015 - Decreto Único Reglamentario del Sector Trabajo
• Resolución 0312 de 2019 - Estándares Mínimos del SG-SST
• Ley 1562 de 2012 - Sistema General de Riesgos Laborales

Esta política será revisada anualmente o cuando ocurra un cambio significativo en la organización, en cumplimiento del Artículo 2.2.4.6.5 y 2.2.4.6.6 del Decreto 1072 de 2015.


Firmado en ${companyInfo.ciudad || '[CIUDAD]'}, a los ${fecha}.


_______________________________
${companyInfo.representanteLegal || '[REPRESENTANTE LEGAL]'}
Representante Legal
${companyInfo.nombre || '[NOMBRE DE LA EMPRESA]'}
NIT: ${companyInfo.nit || '[NIT]'}`;
};

export default {
  riesgosCRUD,
  planesCRUD,
  capacitacionesCRUD,
  inspeccionesCRUD,
  documentosCRUD,
  accidentesCRUD,
  politicasCRUD,
  actividadesCRUD,
  empleadosCRUD,
  getCompanyConfig,
  setCompanyConfig,
  determinarTipoEmpresa,
  calcularNivelProbabilidad,
  calcularNivelRiesgo,
  determinarAceptabilidad,
  calcularIndicadores,
  calcularCumplimiento,
  toggleCumplimientoEstandar,
  generarPoliticaSST,
  CATEGORIAS_PELIGROS,
  CONTROLES_SUGERIDOS,
  NIVEL_DEFICIENCIA,
  NIVEL_EXPOSICION,
  NIVEL_CONSECUENCIA,
  ESTANDARES_MINIMOS,
  DOCUMENTOS_OBLIGATORIOS,
  CATALOGO_CAPACITACIONES,
  PLANTILLAS_INSPECCION,
};
