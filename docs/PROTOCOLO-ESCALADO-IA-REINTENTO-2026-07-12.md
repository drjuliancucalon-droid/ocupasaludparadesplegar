# 📋 PROTOCOLO DE ESCALADO DE PROFUNDIDAD IA POR REINTENTO
## Análisis Clínico · Recomendaciones · Restricciones

**Fecha:** 2026-07-12 · **Estado:** PROTOCOLO — Sin implementar  
**Alcance:** Solo frontend (App.jsx). Cero cambios en worker/backend/almacenamiento.

---

## 1. AUDITORÍA DEL CÓDIGO ACTUAL — PUNTOS EXACTOS DE INTERVENCIÓN

### 1.1 Contexto del paciente (buildFullContextHC)

| Elemento | Ubicación | Línea exacta |
|---|---|---|
| Función que construye el contexto | `const buildFullContextHC = (d) => {` | **21363** |
| Campos que extrae | `hallazgos`, `antecedentes`, `riesgos`, `maniobras`, `osteo`, `paraclinicosFull`, `agudeza`, `enf`, `examenEspecial` | 21364-21450 |
| Contexto de alturas (énfasis) | `if (enf.includes("ALTURA"))` → incluye audiometría, laboratorios, EKG, espirometría | 21401-21420 |

**Qué devuelve:** Un string largo con todos los hallazgos del paciente. Este string se inyecta en los prompts de IA.

### 1.2 Llamada a IA (callAI)

| Elemento | Ubicación | Línea exacta |
|---|---|---|
| Función `callAI(prompt, jsonMode)` | `text = await callAI(prompt, true)` | **21549**, **21862**, **21900+** |
| Configuración de proveedores | `const AI_PROVIDERS = {` (Gemini, Groq, OpenRouter, Anthropic) | **6620** |
| Temperatura modelos | `temperature: 0.25` (Gemini), variable en otros | 6650 |
| Contador de llamadas IA | `aiCallsCount` (objeto por proveedor) | ~21312 |
| Indicador UI "Contador IA" | `{/* Contador IA */}` | **30013**, **31071** |
| Reconexión automática | `retryPrompt = "Analiza esta HC ocupacional y devuelve JSON: "` → fallback simplificado | **21549** |

### 1.3 Estados de resultado (variables donde se guarda la respuesta IA)

| Botón | Variable en data | Línea definición | Línea donde se setea |
|---|---|---|---|
| Análisis Clínico IA | `data.analisisIA` | **9144** | `setData(prev => ({ ...prev, analisisIA: parsed.analisisClinico }))` |
| Recomendaciones IA | `data.recomendaciones` | **9141** | `setData(prev => ({ ...prev, recomendaciones: text.trim() }))` |
| Restricciones IA | `data.restricciones` (inferido) | ~9145 | `setData(prev => ({ ...prev, restricciones: ... }))` |

### 1.4 Prompts actuales (lo que se envía hoy a la IA)

**Prompt de análisis clínico (primer intento):**
```
"Eres un médico especialista en salud ocupacional. Analiza la siguiente historia clínica 
ocupacional y genera UN INFORME DE ANÁLISIS CLÍNICO OCUPACIONAL estructurado con: 
1) Correlación fisiopatológica de hallazgos con demandas del cargo, 
2) Diagnóstico ocupacional (CIE-10 si aplica), 
3) Pronóstico funcional. 
Devuelve ÚNICAMENTE JSON con { analisisClinico: '...' }. 

DATOS DEL PACIENTE: {contexto}" 
```

**Prompt de recomendaciones (primer intento):**
```
"Eres un médico especialista en salud ocupacional. Con base en la historia clínica 
proporcionada, genera RECOMENDACIONES OCUPACIONALES detalladas. Incluye: 
actividad física, pausas activas, ergonomía, hábitos, seguimiento. Redacta en prosa 
profesional, en español. NO uses JSON. 
DATOS: {contexto}"
```

**Prompt de restricciones (primer intento):**
```
"Eres un médico especialista en salud ocupacional. Genera RESTRICCIONES LABORALES 
específicas basadas en los hallazgos de esta HC ocupacional. Devuelve ÚNICAMENTE JSON 
con { restricciones: [{ area, restriccion, fundamento, norma, plazo }] }. 

DATOS: {contexto}"
```

### 1.5 Estados de carga (loading)

| Variable | Tipo | Uso |
|---|---|---|
| `analisisIALoading` | boolean | Spinner mientras se genera análisis |
| `recomendacionesLoading` | boolean | Spinner mientras se generan recomendaciones |
| `restriccionesLoading` | boolean | Spinner mientras se generan restricciones |

---

## 2. DISEÑO DEL SISTEMA DE ESCALADO

### 2.1 Nuevos estados a crear (3 × 2 variables por botón)

```javascript
// ═══════════════════════════════════════════════════════════════
// ESTADOS DE ESCALADO IA (NUEVOS) — se agregan en AppInner, 
// junto a los useState existentes de analisisIALoading, etc.
// ═══════════════════════════════════════════════════════════════

// Contador de intentos por botón (ligado al paciente activo)
const [aiAttemptAnalisis, setAiAttemptAnalisis]    = useState(0);
const [aiAttemptRecomendaciones, setAiAttemptRecomendaciones] = useState(0);
const [aiAttemptRestricciones, setAiAttemptRestricciones]  = useState(0);

// Resultado de la iteración anterior (para instruir "supera esto")
const [aiPrevAnalisis, setAiPrevAnalisis]          = useState("");
const [aiPrevRecomendaciones, setAiPrevRecomendaciones]     = useState("");
const [aiPrevRestricciones, setAiPrevRestricciones]      = useState("");

// Texto de estado visible ("⏳ Generando versión más profunda (intento 2)...")
const [aiStatusMsg, setAiStatusMsg]                = useState("");
```

### 2.2 Reset de contadores al cambiar de paciente

**Dónde:** En el `useEffect` que se dispara cuando cambia `activePatient` o `data.pacienteId`.

```javascript
// Cuando cambia el paciente activo, resetear TODOS los contadores de IA
useEffect(() => {
  setAiAttemptAnalisis(0);
  setAiAttemptRecomendaciones(0);
  setAiAttemptRestricciones(0);
  setAiPrevAnalisis("");
  setAiPrevRecomendaciones("");
  setAiPrevRestricciones("");
  setAiStatusMsg("");
}, [data.pacienteId]); // o la variable que identifique al paciente actual
```

### 2.3 Los 3 niveles de escalado

| Intento | Comportamiento | Texto de estado |
|---|---|---|
| **1º** | Prompt normal (como hoy, sin cambios) | "⏳ Generando análisis clínico..." |
| **2º** | Prompt enriquecido con bloque "SEGUNDA ITERACIÓN" + resultado anterior | "⏳ Generando versión más profunda (intento 2)..." |
| **3º o más** | Prompt enriquecido con bloque "MÁXIMA PROFUNDIDAD" + resultado anterior | "⏳ Generando versión máxima — nivel pericial (intento {N})..." |

---

## 3. NUEVOS PROMPTS POR NIVEL DE ESCALADO

### 3.1 ANÁLISIS CLÍNICO — Prompts escalados

#### Nivel 2 (SEGUNDA ITERACIÓN)

```
"SEGUNDA ITERACIÓN — El médico tratante exige MAYOR PROFUNDIDAD. 
El siguiente fue tu análisis anterior. DEBES SUPERARLO significativamente, 
no repetirlo ni parafrasearlo:

─────── ANÁLISIS ANTERIOR (DEBES SUPERARLO) ───────
{resultadoAnterior}
─────── FIN ANÁLISIS ANTERIOR ───────

INSTRUCCIONES DE ESCALADO (NIVEL 2 — CORRELACIÓN FISIOPATOLÓGICA DETALLADA):
1. Para CADA hallazgo anormal, explica el mecanismo fisiopatológico completo 
   (no solo mencionarlo — desarrollar la cadena causal: etiología → fisiopatología 
   → manifestación clínica → impacto funcional).
2. Cita la NORMA ESPECÍFICA para cada hallazgo (ej: 'Resolución 2346 de 2007, 
   Art. 10, parágrafo 2' — NO usar frases genéricas como 'según la normativa').
3. CUANTIFICA todo: grados de movilidad, kg de carga, minutos de exposición, 
   frecuencias, percentiles.
4. Agrega DIAGNÓSTICO DIFERENCIAL OCUPACIONAL: para cada hallazgo, indica qué 
   otras patologías ocupacionales podrían cursar con manifestaciones similares 
   y por qué se descartan o confirman.
5. Incluye PRONÓSTICO FUNCIONAL cuantificado (ej: 'Se estima recuperación del 
   80% de la capacidad funcional en 4-6 semanas con las intervenciones propuestas').
6. Estructura el análisis con subtítulos numerados.

Devuelve ÚNICAMENTE JSON con { analisisClinico: '...' }.

DATOS DEL PACIENTE: {contexto}"
```

#### Nivel 3+ (MÁXIMA PROFUNDIDAD — JUNTA MÉDICA/PERITO)

```
"MÁXIMA PROFUNDIDAD — NIVEL JUNTA MÉDICA / PERITO OCUPACIONAL.
El siguiente fue tu análisis anterior. DEBES PRODUCIR UN DOCUMENTO DE CALIDAD 
PERICIAL QUE LO SUPERE EN TODOS LOS ASPECTOS:

─────── ANÁLISIS ANTERIOR ───────
{resultadoAnterior}
─────── FIN ANÁLISIS ANTERIOR ───────

ESTRUCTURA OBLIGATORIA DEL INFORME PERICIAL:
Para CADA hallazgo patológico, desarrollar en este orden exacto:
  a) HALLAZGO: descripción objetiva con valores de referencia
  b) MECANISMO FISIOPATOLÓGICO: cadena causal completa (etiología → 
     fisiopatología → manifestación → impacto funcional)
  c) CORRELACIÓN CON DEMANDA DEL CARGO: análisis específico de cómo el 
     hallazgo interactúa con CADA tarea del cargo descrito
  d) DIAGNÓSTICO DIFERENCIAL OCUPACIONAL: mínimo 2 diagnósticos alternativos 
     con criterios de inclusión/exclusión
  e) NORMA EXACTA: resolución, artículo, parágrafo, con cita textual del 
     apartado relevante
  f) PRONÓSTICO FUNCIONAL: escala funcional (leve/moderado/severo), tiempo 
     estimado de recuperación, porcentaje de capacidad funcional esperada
  g) INDICADORES DE SEGUIMIENTO: qué medir, cada cuánto, valores objetivo

ADICIONAL:
- Incluir APTITUD LABORAL con restricciones explícitas
- Incluir RECOMENDACIONES DE REUBICACIÓN si aplica
- Incluir CRITERIOS DE REVERSIBILIDAD

Devuelve ÚNICAMENTE JSON con { analisisClinico: '...' }.

DATOS DEL PACIENTE: {contexto}"
```

### 3.2 RECOMENDACIONES — Prompts escalados

#### Nivel 2 (SEGUNDA ITERACIÓN)

```
"SEGUNDA ITERACIÓN — El médico exige recomendaciones MÁS DETALLADAS Y ACCIONABLES.
Tus recomendaciones anteriores fueron:

─────── RECOMENDACIONES ANTERIORES ───────
{resultadoAnterior}
─────── FIN RECOMENDACIONES ANTERIORES ───────

INSTRUCCIONES DE ESCALADO (NIVEL 2 — RECOMENDACIONES CUANTIFICADAS):
1. CADA recomendación debe incluir: acción específica → frecuencia → 
   duración → intensidad → indicador de cumplimiento.
2. CUANTIFICA TODO: 'caminar 30 minutos' no 'caminar', 'pausa activa 
   cada 45 minutos por 5 minutos' no 'hacer pausas', 'reducir carga 
   a máximo 12 kg' no 'evitar cargas pesadas'.
3. Organiza por CATEGORÍAS con subtítulos: Actividad Física, Ergonomía 
   del Puesto, Hábitos y Estilo de Vida, Seguimiento Médico, 
   Adecuaciones Administrativas.
4. Para cada recomendación, indica el PLAZO DE IMPLEMENTACIÓN (inmediato, 
   1 semana, 1 mes) y el RESPONSABLE (trabajador, empleador, ARL, médico).
5. Cita la NORMA que respalda cada recomendación cuando exista.

Redacta en prosa profesional, en español. NO uses JSON.

DATOS: {contexto}"
```

#### Nivel 3+ (MÁXIMA PROFUNDIDAD)

```
"MÁXIMA PROFUNDIDAD — NIVEL PROGRAMA DE VIGILANCIA EPIDEMIOLÓGICA.
Tus recomendaciones anteriores fueron:

─────── RECOMENDACIONES ANTERIORES ───────
{resultadoAnterior}
─────── FIN RECOMENDACIONES ANTERIORES ───────

CADA RECOMENDACIÓN DEBE SEGUIR ESTA ESTRUCTURA OBLIGATORIA:
  a) RECOMENDACIÓN: enunciado claro y accionable
  b) JUSTIFICACIÓN CLÍNICA: por qué esta recomendación — vincular con 
     el hallazgo específico de la HC
  c) MECANISMO DE ACCIÓN: cómo esta intervención modifica el factor de riesgo
  d) PROTOCOLO DE IMPLEMENTACIÓN: frecuencia, duración, intensidad exacta
  e) PLAZO: inmediato / corto (1-4 sem) / mediano (1-3 meses) / largo (>3 meses)
  f) RESPONSABLE: trabajador / empleador / ARL / médico tratante
  g) INDICADOR DE CUMPLIMIENTO: qué evidencia objetiva demostrará que se cumplió
  h) NORMA DE REFERENCIA: resolución, artículo, parágrafo
  i) CONSECUENCIA DE NO CUMPLIMIENTO: riesgo específico si se ignora

Organizar en categorías con tablas resumen al final de cada categoría.

Redacta en prosa profesional, en español. NO uses JSON.

DATOS: {contexto}"
```

### 3.3 RESTRICCIONES — Prompts escalados

#### Nivel 2 (SEGUNDA ITERACIÓN)

```
"SEGUNDA ITERACIÓN — El médico exige restricciones MÁS ESPECÍFICAS Y FUNDAMENTADAS.
Las restricciones anteriores fueron:

─────── RESTRICCIONES ANTERIORES ───────
{resultadoAnterior}
─────── FIN RESTRICCIONES ANTERIORES ───────

INSTRUCCIONES DE ESCALADO (NIVEL 2):
1. Para CADA restricción, desarrolla el FUNDAMENTO FISIOPATOLÓGICO completo: 
   qué estructura anatómica está en riesgo, qué mecanismo lesional se previene, 
   qué evidencia científica respalda la restricción.
2. Cita la NORMA EXACTA: 'Resolución X, Artículo Y, Parágrafo Z'.
3. Especifica el PLAZO: 'por 4 semanas', 'hasta nuevo control en 3 meses'.
4. Agrega el GRADO DE RESTRICCIÓN: absoluta / relativa / condicionada.
5. Incluye INDICADOR DE REVERSIBILIDAD: qué condición debe cumplirse para 
   retirar la restricción.
6. Agrega una sección de 'Restricciones administrativas y organizacionales' 
   además de las físicas.

Devuelve ÚNICAMENTE JSON con { restricciones: [{ area, restriccion, fundamento, 
norma, plazo, grado, indicadorReversibilidad }] }.

DATOS: {contexto}"
```

#### Nivel 3+ (MÁXIMA PROFUNDIDAD)

```
"MÁXIMA PROFUNDIDAD — NIVEL PERITAJE DE READAPTACIÓN LABORAL.
Las restricciones anteriores fueron:

─────── RESTRICCIONES ANTERIORES ───────
{resultadoAnterior}
─────── FIN RESTRICCIONES ANTERIORES ───────

CADA RESTRICCIÓN DEBE SEGUIR ESTA ESTRUCTURA OBLIGATORIA:
  a) ÁREA AFECTADA: sistema osteomuscular / cardiovascular / respiratorio / 
     neurosensorial / psicosocial / dérmico / otro
  b) RESTRICCIÓN: enunciado preciso y accionable
  c) FUNDAMENTO ANATOMOFISIOPATOLÓGICO: estructura en riesgo → mecanismo 
     lesional → consecuencia si se ignora
  d) CORRELACIÓN CON DEMANDA DEL CARGO: tarea(s) específica(s) del cargo 
     que motivan la restricción
  e) NORMA EXACTA: resolución, artículo, parágrafo, cita textual
  f) GRADO: absoluta / relativa / condicionada
  g) PLAZO DE VIGENCIA: fecha o condición de término
  h) INDICADOR DE REVERSIBILIDAD: criterio objetivo para reevaluar
  i) ALTERNATIVA DE ADECUACIÓN: qué modificación del puesto permitiría 
     levantar la restricción
  j) RESPONSABLE DE VERIFICACIÓN: empleador / ARL / médico

Incluir sección final: 'Resumen de aptitud laboral' con: 
- APTO CON RESTRICCIONES / APTO SIN RESTRICCIONES / NO APTO TEMPORAL / NO APTO DEFINITIVO
- Justificación de la calificación
- Tiempo estimado de reubicación si aplica

Devuelve ÚNICAMENTE JSON con { restricciones: [...], aptitudLaboral: { calificacion, justificacion, tiempoReubicacion } }.

DATOS: {contexto}"
```

---

## 4. LÓGICA DE EJECUCIÓN — PSEUDOCÓDIGO

### 4.1 Función unificada de escalado (para los 3 botones)

```javascript
/**
 * Ejecuta una llamada IA con escalado por reintento.
 * @param {string} type - 'analisis' | 'recomendaciones' | 'restricciones'
 * @param {object} data - datos del paciente
 */
const handleAIWithEscalado = async (type, data) => {
  // ── 1. Determinar intento actual ──────────────────────────
  const attemptMap = {
    analisis:        { get: aiAttemptAnalisis, set: setAiAttemptAnalisis, 
                       prev: aiPrevAnalisis, setPrev: setAiPrevAnalisis,
                       loading: setAnalisisIALoading },
    recomendaciones: { get: aiAttemptRecomendaciones, set: setAiAttemptRecomendaciones,
                       prev: aiPrevRecomendaciones, setPrev: setAiPrevRecomendaciones,
                       loading: setRecomendacionesLoading },
    restricciones:   { get: aiAttemptRestricciones, set: setAiAttemptRestricciones,
                       prev: aiPrevRestricciones, setPrev: setAiPrevRestricciones,
                       loading: setRestriccionesLoading },
  };
  
  const attempt = attemptMap[type];
  const currentAttempt = attempt.get;
  const newAttempt = currentAttempt + 1;
  attempt.set(newAttempt);
  
  // ── 2. Mensaje de estado ──────────────────────────────────
  const levelLabel = newAttempt === 1 ? '' : 
                     newAttempt === 2 ? 'más profunda' : 'máxima — nivel pericial';
  setAiStatusMsg(`⏳ Generando versión ${levelLabel} (intento ${newAttempt})...`);
  attempt.loading(true);
  
  // ── 3. Construir contexto del paciente ────────────────────
  const contexto = buildFullContextHC(data);
  
  // ── 4. Seleccionar prompt según nivel ─────────────────────
  let prompt, jsonMode;
  const resultadoAnterior = attempt.prev;
  
  if (type === 'analisis') {
    jsonMode = true;
    if (newAttempt === 1) {
      prompt = buildPromptAnalisisNivel1(contexto);
    } else if (newAttempt === 2) {
      prompt = buildPromptAnalisisNivel2(contexto, resultadoAnterior);
    } else {
      prompt = buildPromptAnalisisNivel3(contexto, resultadoAnterior);
    }
  } else if (type === 'recomendaciones') {
    jsonMode = false;
    if (newAttempt === 1) {
      prompt = buildPromptRecomendacionesNivel1(contexto);
    } else if (newAttempt === 2) {
      prompt = buildPromptRecomendacionesNivel2(contexto, resultadoAnterior);
    } else {
      prompt = buildPromptRecomendacionesNivel3(contexto, resultadoAnterior);
    }
  } else { // restricciones
    jsonMode = true;
    if (newAttempt === 1) {
      prompt = buildPromptRestriccionesNivel1(contexto);
    } else if (newAttempt === 2) {
      prompt = buildPromptRestriccionesNivel2(contexto, resultadoAnterior);
    } else {
      prompt = buildPromptRestriccionesNivel3(contexto, resultadoAnterior);
    }
  }
  
  // ── 5. Llamar a la IA ─────────────────────────────────────
  try {
    const text = await callAI(prompt, jsonMode);
    
    // ── 6. Guardar resultado ────────────────────────────────
    if (type === 'analisis') {
      const parsed = parseAIJSON(text);
      setData(prev => ({ ...prev, analisisIA: parsed.analisisClinico }));
      attempt.setPrev(parsed.analisisClinico);
    } else if (type === 'recomendaciones') {
      setData(prev => ({ ...prev, recomendaciones: text.trim() }));
      attempt.setPrev(text.trim());
    } else {
      const parsed = parseAIJSON(text);
      setData(prev => ({ ...prev, restricciones: parsed.restricciones }));
      attempt.setPrev(JSON.stringify(parsed));
    }
    
    setAiStatusMsg(`✅ Versión ${newAttempt === 1 ? 'inicial' : newAttempt === 2 ? 'profundizada' : 'pericial'} generada`);
    
  } catch (e) {
    console.error(`[IA ${type}] Error en intento ${newAttempt}:`, e);
    setAiStatusMsg(`❌ Error al generar. Intenta de nuevo.`);
    // NO incrementar el contador si falló — el usuario debe poder reintentar
    attempt.set(currentAttempt); // revertir
  } finally {
    attempt.loading(false);
  }
};
```

### 4.2 Modificación de los 3 onClick

```javascript
// ── Botón ANÁLISIS CLÍNICO IA ───────────────────────────────
// ANTES:
onClick={async () => {
  setAnalisisIALoading(true);
  const contexto = buildFullContextHC(data);
  const prompt = `Eres un médico... ${contexto}`;
  const text = await callAI(prompt, true);
  const parsed = parseAIJSON(text);
  setData(prev => ({ ...prev, analisisIA: parsed.analisisClinico }));
  setAnalisisIALoading(false);
}}

// DESPUÉS:
onClick={() => handleAIWithEscalado('analisis', data)}

// ── Botón RECOMENDACIONES IA ────────────────────────────────
// DESPUÉS:
onClick={() => handleAIWithEscalado('recomendaciones', data)}

// ── Botón RESTRICCIONES IA ──────────────────────────────────
// DESPUÉS:
onClick={() => handleAIWithEscalado('restricciones', data)}
```

### 4.3 Indicador visual de nivel

```jsx
{/* Indicador de profundidad IA — Mostrar debajo del botón mientras carga */}
{aiStatusMsg && (
  <span className={`text-xs ml-2 ${
    aiStatusMsg.startsWith('✅') ? 'text-emerald-600' : 
    aiStatusMsg.startsWith('❌') ? 'text-red-500' : 
    'text-amber-500 animate-pulse'
  }`}>
    {aiStatusMsg}
  </span>
)}

{/* Badge de nivel de profundidad — Mostrar al lado del título del resultado */}
{data.analisisIA && aiAttemptAnalisis > 1 && (
  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
    {aiAttemptAnalisis === 2 ? '🔬 Nivel 2 — Correlación detallada' : '⚖️ Nivel 3 — Pericial'}
  </span>
)}
```

---

## 5. RESUMEN DE CAMBIOS EXACTOS

### 5.1 Variables nuevas a declarar (6 useState)

| Variable | Tipo | Valor inicial | Dónde agregar |
|---|---|---|---|
| `aiAttemptAnalisis` | number | `0` | Junto a `analisisIALoading` |
| `aiAttemptRecomendaciones` | number | `0` | Junto a `recomendacionesLoading` |
| `aiAttemptRestricciones` | number | `0` | Junto a `restriccionesLoading` |
| `aiPrevAnalisis` | string | `""` | Junto a los anteriores |
| `aiPrevRecomendaciones` | string | `""` | Junto a los anteriores |
| `aiPrevRestricciones` | string | `""` | Junto a los anteriores |
| `aiStatusMsg` | string | `""` | Junto a los anteriores |

### 5.2 useEffect nuevo (reset al cambiar paciente)

```javascript
// 1 bloque useEffect nuevo (~15 líneas)
useEffect(() => {
  setAiAttemptAnalisis(0);
  setAiAttemptRecomendaciones(0);
  setAiAttemptRestricciones(0);
  setAiPrevAnalisis("");
  setAiPrevRecomendaciones("");
  setAiPrevRestricciones("");
  setAiStatusMsg("");
}, [data.pacienteId]);
```

### 5.3 Funciones nuevas (prompts escalados)

- `buildPromptAnalisisNivel1(contexto)` — ~15 líneas (el prompt actual, extraído a función)
- `buildPromptAnalisisNivel2(contexto, resultadoAnterior)` — ~30 líneas
- `buildPromptAnalisisNivel3(contexto, resultadoAnterior)` — ~40 líneas
- `buildPromptRecomendacionesNivel1(contexto)` — ~15 líneas
- `buildPromptRecomendacionesNivel2(contexto, resultadoAnterior)` — ~30 líneas
- `buildPromptRecomendacionesNivel3(contexto, resultadoAnterior)` — ~35 líneas
- `buildPromptRestriccionesNivel1(contexto)` — ~15 líneas
- `buildPromptRestriccionesNivel2(contexto, resultadoAnterior)` — ~30 líneas
- `buildPromptRestriccionesNivel3(contexto, resultadoAnterior)` — ~40 líneas
- `handleAIWithEscalado(type, data)` — ~80 líneas (función maestra)

**Total líneas nuevas estimadas:** ~350 líneas (en un archivo de ~21,000 líneas — 1.7% de delta)

### 5.4 Modificaciones a código existente

| Qué | Dónde | Cambio |
|---|---|---|
| onClick de botón "Análisis Clínico IA" | ~L21549 | Reemplazar todo el bloque async por `() => handleAIWithEscalado('analisis', data)` |
| onClick de botón "Recomendaciones IA" | ~L21862 | Reemplazar por `() => handleAIWithEscalado('recomendaciones', data)` |
| onClick de botón "Restricciones IA" | ~L21900 | Reemplazar por `() => handleAIWithEscalado('restricciones', data)` |
| Indicador de carga | Junto a cada botón | Añadir `<span>{aiStatusMsg}</span>` condicional |
| Badge de nivel | Junto al título de cada resultado | Añadir badge condicional según `aiAttemptX > 1` |

---

## 6. IMPACTO Y RIESGOS

| Aspecto | Evaluación |
|---|---|
| **Backend/Worker** | CERO cambios. Solo frontend. |
| **Almacenamiento de datos** | CERO riesgo. No toca localStorage, IndexedDB, D1 ni Supabase. |
| **Costo de IA** | Cada reintento consume 1 llamada API adicional. Con 3 botones × 3 niveles máx = 9 llamadas extra en el peor caso. Mismo proveedor, misma API key. |
| **Tiempo de respuesta** | Nivel 2 y 3 tienen prompts más largos (~2× y ~3× tokens) → pueden tardar 1.5-2× más que el nivel 1. |
| **Compatibilidad** | 100% retrocompatible. El nivel 1 es idéntico al prompt actual. Si el usuario presiona 1 vez, la experiencia es EXACTAMENTE igual que hoy. |

---

## FIRMA DEL DOCUMENTO

**Protocolo elaborado por:** Sistema de análisis y arquitectura automatizado  
**Fecha:** 2026-07-12 21:30 UTC-4  
**Archivo a modificar:** `src/App.jsx` (solo frontend, ~350 líneas nuevas)  
**Archivos SIN modificar:** `siso-worker/`, `src/utils/`, `public/` — cero cambios  
**Riesgo para datos:** NINGUNO  
**Tiempo estimado de implementación:** 3-4 horas  

---

*Este documento es un protocolo detallado. No contiene modificaciones al código fuente. Las instrucciones aquí descritas deben ser implementadas manualmente.*