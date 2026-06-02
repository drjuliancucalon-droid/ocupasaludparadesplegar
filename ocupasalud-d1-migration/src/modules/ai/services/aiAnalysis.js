// src/modules/ai/services/aiAnalysis.js
// ══════════════════════════════════════════════════════════════════════════════
// Motor de análisis IA — réplica fiel del monolito ocupasalud
// Ref. monolito: App.jsx líneas 14911-15226
// ══════════════════════════════════════════════════════════════════════════════
import { AI_PROVIDERS } from '../../../shared/lib/aiProviders';
import { useUIStore } from '../../../stores/uiStore';

// Helper para setear estado global de IA (B-17)
const _setAILoading = (val, label) => {
  try { useUIStore.getState().setAIGenerating(val, label); } catch {}
};

const DEFAULT_SYSTEM_PROMPT =
  'Eres un médico especialista en Medicina del Trabajo con más de 15 años de experiencia en evaluaciones ' +
  'ocupacionales en Colombia. Conoces la normatividad colombiana: Res. 1843/2025 (deroga Res. 2346/2007), ' +
  'Dec. 1072/2015, Guías GATISO, GTC-45, Dec. 1477/2014. Respondes siempre en español formal y técnico.';

// ── parseAIJSON: extrae JSON de la respuesta del LLM ─────────────────────────
export const parseAIJSON = (text) => {
  if (!text) return {};
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const startIdx = clean.indexOf('{');
  const endIdx = clean.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) return {};
  try {
    return JSON.parse(clean.slice(startIdx, endIdx + 1));
  } catch {
    try {
      return JSON.parse(clean.slice(startIdx, endIdx + 1).replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
    } catch {
      return {};
    }
  }
};

// ── callAIWithFailover: multi-proveedor con failover automático ───────────────
export const callAIWithFailover = async (prompt, systemPrompt, aiConfig) => {
  const providers = ['gemini', 'groq', 'together', 'openrouter'];
  const ordered = [
    aiConfig?.activeProvider,
    ...providers.filter((p) => p !== aiConfig?.activeProvider),
  ].filter(Boolean);

  let lastError = null;
  for (const providerKey of ordered) {
    const key = aiConfig?.keys?.[providerKey];
    if (!key?.trim()) continue;
    const provider = AI_PROVIDERS[providerKey];
    if (!provider) continue;
    try {
      const result = await provider.call(
        prompt,
        systemPrompt || DEFAULT_SYSTEM_PROMPT,
        key.trim()
      );
      if (result && result.length > 0) return result;
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  throw lastError || new Error('No hay proveedores de IA configurados o disponibles');
};

// ── _buildContextoTipo: 5 ramas según tipo de examen ─────────────────────────
// Ref. monolito: App.jsx líneas 14939-14960
const _buildContextoTipo = (tipoExamen = '') => {
  const t = tipoExamen.toUpperCase();
  if (t.includes('INGRESO'))
    return 'EXAMEN DE INGRESO: Evalúa la aptitud INICIAL para el cargo. Las recomendaciones deben incluir: ' +
      '(A) Medidas preventivas desde el inicio de la relación laboral, ' +
      '(B) Identificación de factores de riesgo preexistentes vs laborales, ' +
      '(C) Línea de base para seguimiento futuro, ' +
      '(D) Programa de inducción en SST, ' +
      '(E) Exámenes paraclínicos de ingreso recomendados según riesgos.';
  if (t.includes('PERI\u00D3DICO') || t.includes('PERIODICO'))
    return 'EXAMEN PERIÓDICO: Evalúa cambios en el estado de salud respecto al examen anterior. Las recomendaciones deben incluir: ' +
      '(A) Comparación con hallazgos previos y tendencias, ' +
      '(B) Seguimiento de patologías crónicas ya identificadas, ' +
      '(C) Adherencia a PVE (Programas de Vigilancia Epidemiológica) activos, ' +
      '(D) Refuerzo de medidas de control de riesgos laborales, ' +
      '(E) Indicadores de salud ocupacional: ausentismo, accidentes recientes.';
  if (t.includes('EGRESO') || t.includes('RETIRO'))
    return 'EXAMEN DE EGRESO: Evalúa el estado de salud AL FINALIZAR el vínculo laboral. Las recomendaciones deben incluir: ' +
      '(A) Detección de enfermedades o secuelas de origen laboral (Decreto 1477/2014), ' +
      '(B) Determinación de origen laboral o común de hallazgos, ' +
      '(C) Indicar si el trabajador requiere seguimiento médico post-retiro, ' +
      '(D) Documentación de condiciones para eventual reporte a ARL, ' +
      '(E) Concepto sobre relación de causalidad con el cargo/empresa.';
  if (t.includes('POST') || t.includes('INCAPACIDAD') || t.includes('REINTEGRO'))
    return 'EXAMEN POST-INCAPACIDAD / REINTEGRO LABORAL: Evalúa aptitud para retornar al trabajo tras incapacidad. Las recomendaciones deben incluir: ' +
      '(A) Condiciones específicas para el reintegro (gradual, modificado, pleno), ' +
      '(B) Restricciones temporales o permanentes con plazos y seguimiento, ' +
      '(C) Adaptaciones del puesto de trabajo necesarias, ' +
      '(D) Plan de rehabilitación laboral si aplica, ' +
      '(E) Criterios de seguimiento médico post-reintegro, ' +
      '(F) Articular con ARL para plan de reincorporación.';
  if (t.includes('SEGUIMIENTO'))
    return 'EXAMEN DE SEGUIMIENTO: Evalúa la evolución de condiciones ya identificadas. Las recomendaciones deben incluir: ' +
      '(A) Respuesta al tratamiento o intervención previa, ' +
      '(B) Actualización del concepto de aptitud si hay cambios clínicos, ' +
      '(C) Ajuste de restricciones según evolución, ' +
      '(D) Próxima cita de seguimiento, ' +
      '(E) Indicadores de mejora o deterioro documentados.';
  return 'Evalúa la aptitud del trabajador según los hallazgos clínicos actuales. Las recomendaciones deben ser específicas para el cargo, la empresa y los riesgos identificados.';
};

// ── _buildHallazgos: construye strings clínicos desde datos estructurados ─────
const _buildHallazgos = (data) => {
  const hallazgos = Object.entries(data.examenFisicoSistemas || {})
    .filter(([, v]) => v?.estado === 'Anormal')
    .map(([k, v]) => `${k}: ${v.hallazgo}`)
    .join('; ') || 'Sin hallazgos patológicos';

  const antecedentes = Object.entries(data.antecedentesAgrupados || {})
    .filter(([, v]) => v?.val)
    .map(([k, v]) => `${k}: ${v.det}`)
    .join(' | ') || 'Niega';

  const riesgos = Object.entries(data.riesgos || {})
    .filter(([, v]) => v === true)
    .map(([k]) => k)
    .join(', ') || 'No reportados';

  return { hallazgos, antecedentes, riesgos };
};

// ══════════════════════════════════════════════════════════════════════════════
// B-01: analyzeHC — Análisis IA completo con 5 contextos de tipo de examen
// Ref. monolito: App.jsx líneas 14911-15144
// Retorna objeto parsed con todos los campos para auto-aplicar al state de HC
// ══════════════════════════════════════════════════════════════════════════════
export const analyzeHC = async (hcData, aiConfig) => {
  const { hallazgos, antecedentes, riesgos } = _buildHallazgos(hcData);
  const _contextoTipo = _buildContextoTipo(hcData.tipoExamen);

  const prompt =
    `Eres médico especialista en Medicina del Trabajo con más de 15 años de experiencia en evaluaciones ` +
    `ocupacionales en Colombia (ingresos, egresos, periódicos, reintegros, post-incapacidad). Analiza con ` +
    `criterio clínico-ocupacional experto la siguiente historia y genera el concepto médico ocupacional ` +
    `conforme a Res. 1843/2025 (norma vigente - deroga Res. 2346/2007). Devuelve ÚNICAMENTE JSON.\n` +
    `DATOS DEL TRABAJADOR: Cargo: ${hcData.cargo || 'N/E'} | Empresa: ${hcData.empresaNombre || 'N/E'} ` +
    `(${hcData.actividadEconomica || 'N/E'}) | Tipo examen: ${hcData.tipoExamen || 'N/E'} | ` +
    `Énfasis: ${hcData.enfasisExamen || 'GENERAL'}\n` +
    `Edad: ${hcData.edad || 'N/E'}a | Género: ${hcData.genero || 'N/E'} | ` +
    `Escolaridad: ${hcData.escolaridad || 'N/E'} | ARL: ${hcData.arl || 'N/R'}\n` +
    `Signos vitales: TA ${hcData.ta || 'N/R'} | FC ${hcData.fc || 'N/R'} | IMC ${hcData.imc || 'N/R'} | ` +
    `Talla ${hcData.talla || 'N/R'}cm | Peso ${hcData.peso || 'N/R'}kg\n` +
    `Hallazgos físicos patológicos: ${hallazgos}\n` +
    `Antecedentes personales relevantes: ${antecedentes}\n` +
    `Riesgos ocupacionales identificados: ${riesgos}\n` +
    `Hábitos: Tabaquismo ${hcData.habitos?.fuma || 'No'} | Alcohol ${hcData.habitos?.alcohol || 'No'} | ` +
    `Actividad física ${hcData.habitos?.deporte || 'No'}\n` +
    `CONTEXTO ESPECÍFICO DEL TIPO DE EXAMEN: ${_contextoTipo}\n` +
    `CRITERIOS OBLIGATORIOS: 1) El concepto de aptitud debe citar el artículo de la Res. 1843/2025 ` +
    `correspondiente (norma vigente desde 29 abril 2025). 2) Si es egreso o post-incapacidad, incluir ` +
    `análisis de reintegro laboral. 3) Las restricciones deben ser operativas, cuantificables y con base ` +
    `normativa (GTC-45, GATISO). 4) Las recomendaciones deben responder al contexto del tipo de examen.\n` +
    `JSON REQUERIDO (sin markdown, sin texto adicional):\n` +
    `{"diagnosticoPrincipal":"Z10.0 - EXAMEN MÉDICO OCUPACIONAL","diagnosticoSecundario1":"CIE-10 o vacío",` +
    `"diagnosticoSecundario2":"CIE-10 o vacío","conceptoAptitud":"APTO/APTO CON RESTRICCIONES/NO APTO ` +
    `con justificación. Conforme Res. 1843/2025 Art. 20","vigencia":"X meses justificados",` +
    `"recomendaciones":"Mínimo 10 recomendaciones específicas para cargo y riesgos",` +
    `"restriccionesTexto":"Restricciones operativas cuantificables, formato [TIPO](Segmento) desc — norma",` +
    `"derivaciones":[{"especialidad":"","motivo":"","urgencia":"Electiva"}],` +
    `"examenesSugeridos":["examen 1"],"interconsultaResumen":"",` +
    `"incapacidadSugerida":{"aplica":false,"dias":0,"motivo":"","diagnosticoCIE":""},` +
    `"analisisClinico":"Análisis técnico-formal >=200 palabras con normativa colombiana",` +
    `"sveRecomendado":["SVE Osteomuscular","SVE Psicosocial"]}`;

  // Retry doble — Ref. monolito líneas 14983-14991
  let text;
  _setAILoading(true, 'Analizando HC con IA...');
  try {
    text = await callAIWithFailover(prompt, DEFAULT_SYSTEM_PROMPT, aiConfig);
  } catch (e1) {
    try {
      const retryPrompt =
        'Analiza esta HC ocupacional y devuelve JSON: ' +
        JSON.stringify({ cargo: hcData.cargo, hallazgos, antecedentes, riesgos, edad: hcData.edad, tipoExamen: hcData.tipoExamen });
      text = await callAIWithFailover(retryPrompt, DEFAULT_SYSTEM_PROMPT, aiConfig);
    } catch {
      _setAILoading(false);
      throw e1;
    }
  } finally {
    _setAILoading(false);
  }

  const parsed = parseAIJSON(text);

  // Z10.0 forzado para exámenes ocupacionales — Ref. monolito líneas 14994-15022
  const TIPOS_OCUP = ['INGRESO', 'PERIODICO', 'PERI\u00D3DICO', 'EGRESO', 'RETIRO', 'POST-INCAPACIDAD', 'REINTEGRO', 'SEGUIMIENTO'];
  const isOcupacional =
    (hcData.enfasisExamen || 'GENERAL').toUpperCase() !== 'GENERAL' ||
    TIPOS_OCUP.some((t) => (hcData.tipoExamen || '').toUpperCase().includes(t));

  const dxPrincipalFinal = 'Z10.0 - EXAMEN MÉDICO OCUPACIONAL';
  const aiDxPrincipal = parsed.diagnosticoPrincipal || '';
  const dxSec1Final = isOcupacional
    ? (aiDxPrincipal && !aiDxPrincipal.includes('Z10') ? aiDxPrincipal : parsed.diagnosticoSecundario1 || '')
    : (parsed.diagnosticoSecundario1 || '');
  const dxSec2Final = isOcupacional
    ? (aiDxPrincipal && !aiDxPrincipal.includes('Z10') && parsed.diagnosticoSecundario1
      ? parsed.diagnosticoSecundario1
      : parsed.diagnosticoSecundario2 || '')
    : (parsed.diagnosticoSecundario2 || '');

  // SVE: filtrar placeholders genéricos
  const sveRecomendadoFinal = (parsed.sveRecomendado || []).filter(
    (s) => s && !s.toLowerCase().includes('si aplica') && !s.toLowerCase().includes('seg\u00FAn hallazgos')
  );

  return {
    diagnosticoPrincipal: isOcupacional ? dxPrincipalFinal : (parsed.diagnosticoPrincipal || dxPrincipalFinal),
    diagnosticoSecundario1: dxSec1Final,
    diagnosticoSecundario2: dxSec2Final,
    conceptoAptitud: parsed.conceptoAptitud || '',
    vigencia: parsed.vigencia || '',
    recomendaciones: parsed.recomendaciones || '',
    analisisRestricciones: parsed.restriccionesTexto || '',
    derivaciones: (parsed.derivaciones || []).map((d, i) => ({
      id: Date.now() + i,
      especialidad: d.especialidad || '',
      motivo: d.motivo || '',
      urgencia: d.urgencia || 'Electiva',
      _fromAI: true,
    })),
    examenesSugeridos: parsed.examenesSugeridos || [],
    incapacidadSugerida: parsed.incapacidadSugerida || { aplica: false, dias: 0, motivo: '', diagnosticoCIE: '' },
    analisisIA: parsed.analisisClinico || '',
    sveRecomendado: sveRecomendadoFinal,
  };
};

// ══════════════════════════════════════════════════════════════════════════════
// B-05: generateRestrictions — Con maniobras osteomusculares estructuradas
// Ref. monolito: App.jsx líneas 15146-15194
// ══════════════════════════════════════════════════════════════════════════════
export const generateRestrictions = async (hcData, aiConfig) => {
  const hallazgos = Object.entries(hcData.examenFisicoSistemas || {})
    .filter(([, v]) => v?.estado === 'Anormal')
    .map(([k, v]) => `${k}: ${v.hallazgo}`)
    .join('; ') || 'Sin hallazgos';

  const osteo = Object.entries(hcData.maniobrasOsteomusculares || {})
    .filter(([, v]) => v?.estado === 'Anormal')
    .map(([k, v]) => `${k}: ${v.hallazgo || v.nombre || k}`)
    .join('; ') || 'Ninguna positiva';

  const riesgos = Object.entries(hcData.riesgos || {})
    .filter(([, v]) => v === true)
    .map(([k]) => k)
    .join(', ') || 'No reportados';

  const prompt =
    `Eres médico especialista en Medicina del Trabajo con más de 15 años de experiencia en Colombia, ` +
    `experto en restricciones médico-laborales y vigilancia epidemiológica. ` +
    `Con base en los hallazgos clínicos, genera restricciones médico-laborales. Devuelve ÚNICAMENTE JSON.\n` +
    `DATOS: Cargo: ${hcData.cargo || 'N/E'} | Empresa: ${hcData.empresaNombre || 'N/E'} | ` +
    `Tipo examen: ${hcData.tipoExamen || 'N/E'}\n` +
    `Riesgos ocupacionales: ${riesgos}\n` +
    `Hallazgos físicos patológicos: ${hallazgos}\n` +
    `Maniobras osteomusculares positivas: ${osteo}\n` +
    `IMC: ${hcData.imc || 'N/R'} | TA: ${hcData.ta || 'N/R'} | ` +
    `Diagnóstico principal: ${hcData.diagnosticoPrincipal || 'N/R'}\n` +
    `INSTRUCCIÓN: Restricciones operativas, cuantificables (kg/min/grados/frecuencias), ` +
    `segmento anatómico, tipo TEMPORAL/PERMANENTE/PREVENTIVA, duración, base normativa. ` +
    `Si es post-incapacidad o reintegro (Res. 1843/2025 Art. 13), incluir reintegro progresivo.\n` +
    `JSON REQUERIDO (sin markdown):\n` +
    `{"restricciones":[{"segmento":"Lumbar/Miembro Superior/Cervical/Postural/General",` +
    `"tipo":"TEMPORAL/PERMANENTE/PREVENTIVA","duracion":"X semanas o N/A",` +
    `"texto":"Restricción específica cuantificable",` +
    `"normativa":"GTC-45:2012 / GATISO-DME / Res. 1843/2025"}]}`;

  const text = await callAIWithFailover(prompt, DEFAULT_SYSTEM_PROMPT, aiConfig);
  const parsed = parseAIJSON(text);

  if (parsed.restricciones?.length > 0) {
    return parsed.restricciones
      .map(
        (r, i) =>
          `${i + 1}. [${(r.tipo || 'TEMPORAL').toUpperCase()}${r.duracion && r.duracion !== 'N/A' ? ' - ' + r.duracion : ''}] ` +
          `(${r.segmento || 'General'}) ${r.texto || r.descripcion || ''} — ${r.normativa || 'Res. 1843/2025'}`
      )
      .join('\n');
  }
  return text; // fallback a texto plano
};

// ══════════════════════════════════════════════════════════════════════════════
// B-06: generateRecommendations — 4 categorías, mínimo 12
// Ref. monolito: App.jsx líneas 15196-15225
// ══════════════════════════════════════════════════════════════════════════════
export const generateRecommendations = async (hcData, aiConfig) => {
  const riesgos = Object.entries(hcData.riesgos || {})
    .filter(([, v]) => v === true)
    .map(([k]) => k)
    .join(', ') || 'N/R';

  const prompt =
    `Eres médico especialista en Medicina del Trabajo con más de 15 años de experiencia en Colombia. ` +
    `Genera recomendaciones médico-laborales ESPECÍFICAS para el trabajador evaluado. ` +
    `No uses recomendaciones genéricas. Texto plano numerado, sin JSON, español formal.\n` +
    `DATOS: Cargo: ${hcData.cargo || 'N/E'} | Empresa: ${hcData.empresaNombre || 'N/E'} | ` +
    `Actividad económica: ${hcData.actividadEconomica || 'N/E'}\n` +
    `Riesgos laborales: ${riesgos}\n` +
    `IMC: ${hcData.imc || 'N/R'} | TA: ${hcData.ta || 'N/R'} | ` +
    `Tabaquismo: ${hcData.habitos?.fuma || 'No'} | Alcohol: ${hcData.habitos?.alcohol || 'No'} | ` +
    `Actividad física: ${hcData.habitos?.deporte || 'No'}\n` +
    `Diagnóstico principal: ${hcData.diagnosticoPrincipal || 'N/R'}\n` +
    `Tipo de examen: ${hcData.tipoExamen || 'N/E'}\n` +
    `INSTRUCCIÓN: Genera mínimo 12 recomendaciones numeradas en 4 secciones:\n` +
    `(A) Recomendaciones médicas y de estilo de vida\n` +
    `(B) Recomendaciones ergonómicas específicas para el cargo\n` +
    `(C) Vigilancia epidemiológica y seguimiento médico\n` +
    `(D) Recomendaciones al empleador — Res. 1843/2025 y Dec. 1072/2015`;

  return callAIWithFailover(prompt, DEFAULT_SYSTEM_PROMPT, aiConfig);
};

// ══════════════════════════════════════════════════════════════════════════════
// analyzeGeneralHC — HC medicina general
// Ref. monolito: generateAIGeneral() App.jsx líneas 15227+
// ══════════════════════════════════════════════════════════════════════════════
export const analyzeGeneralHC = async (hcData, aiConfig) => {
  const systemPrompt =
    'Eres un médico general colombiano experto. Respondes siempre en español. ' +
    'Genera análisis clínicos estructurados con diagnósticos CIE-10 y planes basados en evidencia.';

  const prompt =
    `Eres médico general con más de 15 años de experiencia en Colombia. Analiza la consulta y elabora ` +
    `plan de manejo completo. Devuelve ÚNICAMENTE JSON.\n` +
    `DATOS: ${hcData.nombres || 'N/E'} | Edad: ${hcData.edad || 'N/E'}a | Género: ${hcData.genero || 'N/E'}\n` +
    `Motivo: ${hcData.motivoConsulta || 'N/E'}\n` +
    `Enfermedad actual: ${hcData.enfermedadActual || 'No detallada'}\n` +
    `TA: ${hcData.examenFisico?.ta || 'N/R'} | FC: ${hcData.examenFisico?.fc || 'N/R'} | IMC: ${hcData.examenFisico?.imc || 'N/R'}\n` +
    `Hallazgos: ${hcData.examenFisico?.hallazgos || 'Ninguno'}\n` +
    `JSON REQUERIDO:\n` +
    `{"diagnosticos":[{"cie10":"","descripcion":"","tipo":"Principal"}],"plan":{"conducta":"","medicamentos":"",` +
    `"formulaMedicamentos":[{"nombre":"","presentacion":"","dosis":"","frecuencia":"","duracion":"","indicaciones":""}],` +
    `"paraclinicosSolicitados":"","remisiones":"","recomendaciones":"","controlEn":""},` +
    `"analisis":"Razonamiento clínico 4-5 líneas"}`;

  const text = await callAIWithFailover(prompt, systemPrompt, aiConfig);
  return parseAIJSON(text);
};

// ══════════════════════════════════════════════════════════════════════════════
// suggestDiagnosis — Sugerencia CIE-10
// ══════════════════════════════════════════════════════════════════════════════
export const suggestDiagnosis = async (hcData, aiConfig) => {
  const prompt =
    `Basándote en los hallazgos clínicos, sugiere los 3 diagnósticos CIE-10 más probables.\n` +
    `Paciente: ${hcData.edad || 'N/A'} años, ${hcData.genero || 'N/A'}, cargo: ${hcData.cargo || 'N/A'}\n` +
    `Hallazgos: ${Object.entries(hcData.examenFisicoSistemas || {}).filter(([, v]) => v?.estado === 'Anormal').map(([k, v]) => `${k}: ${v.hallazgo}`).join('; ') || 'N/R'}\n` +
    `Responde EXACTAMENTE: [{"code": "Z10.0", "description": "..."}]`;

  const systemPrompt = 'Eres médico colombiano experto en CIE-10. Responde SOLO el array JSON.';
  const result = await callAIWithFailover(prompt, systemPrompt, aiConfig);
  try {
    const m = result.match(/\[[\s\S]*?\]/);
    if (m) return JSON.parse(m[0]);
  } catch { /* fallback */ }
  return result;
};

// ══════════════════════════════════════════════════════════════════════════════
// suggestExams — Sugerencia paraclínicos CUPS
// ══════════════════════════════════════════════════════════════════════════════
export const suggestExams = async (hcData, aiConfig) => {
  const prompt =
    `Sugiere exámenes paraclínicos para este trabajador.\n` +
    `Cargo: ${hcData.cargo || 'N/A'}, edad ${hcData.edad || 'N/A'}a, tipo: ${hcData.tipoExamen || 'N/A'}\n` +
    `Riesgos: ${Object.entries(hcData.riesgos || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || 'N/E'}\n` +
    `Responde EXACTAMENTE: [{"cups": "903801", "description": "...", "justification": "..."}]`;

  const systemPrompt = 'Eres médico ocupacional colombiano. Responde SOLO el array JSON con códigos CUPS válidos.';
  const result = await callAIWithFailover(prompt, systemPrompt, aiConfig);
  try {
    const m = result.match(/\[[\s\S]*?\]/);
    if (m) return JSON.parse(m[0]);
  } catch { /* fallback */ }
  return result;
};

// ══════════════════════════════════════════════════════════════════════════════
// analyzeEpidemiologicalData — Para SVE por programa
// ══════════════════════════════════════════════════════════════════════════════
export const analyzeEpidemiologicalData = async (patients, aiConfig, programa = '') => {
  const totalPats = patients.length;
  const dxCounts = {};
  patients.forEach((p) => {
    [p.diagnosticoPrincipal, p.diagnosticoSecundario1, p.diagnosticoSecundario2]
      .filter(Boolean)
      .forEach((d) => { dxCounts[d] = (dxCounts[d] || 0) + 1; });
  });
  const topDx = Object.entries(dxCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const prompt =
    `Analiza datos epidemiológicos${programa ? ` del programa ${programa}` : ''}:\n` +
    `- Total trabajadores: ${totalPats}\n` +
    `- Diagnósticos frecuentes:\n${topDx.map(([d, n]) => `  ${d}: ${n} casos`).join('\n')}\n\n` +
    `Genera:\n1. Análisis de morbilidad ocupacional\n2. Factores de riesgo predominantes\n` +
    `3. Programas de vigilancia recomendados\n4. Acciones inmediatas\n5. Indicadores del grupo`;

  return callAIWithFailover(prompt, DEFAULT_SYSTEM_PROMPT, aiConfig);
};
