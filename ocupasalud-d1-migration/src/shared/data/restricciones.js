// CATÁLOGO DE RESTRICCIONES MÉDICO-LABORALES
export const RESTRICCIONES_CATALOG = {
  miembroSuperior: {
    label: "Miembro Superior",
    icon: "🦾",
    color: "blue",
    items: [
      {
        id: "ms_01",
        texto:
          "No cargar, halar o empujar objetos con peso superior a 5 kg con miembro superior afectado",
        normativa: "GATISO-DME 2015",
      },
      {
        id: "ms_02",
        texto:
          "No realizar movimientos repetitivos de muñeca/mano (>30 ciclos/min) con miembro afectado",
        normativa: "GATISO-DME 2015",
      },
      {
        id: "ms_03",
        texto:
          "No mantener postura estática de hombro en elevación superior a 60° por más de 2 horas continuas",
        normativa: "GTC-45 2012",
      },
      {
        id: "ms_04",
        texto:
          "No uso de herramientas vibrátiles (martillos, pulidoras, taladros) con miembro afectado",
        normativa: "GATISO-DME 2015",
      },
      {
        id: "ms_05",
        texto:
          "Rotación de actividades cada 45 minutos para tareas manuales repetitivas",
        normativa: "Res. 1843/2025",
      },
      {
        id: "ms_06",
        texto:
          "No realizar pinza digital fina o prensión de fuerza sostenida por más de 15 minutos continuos",
        normativa: "GATISO-DME 2015",
      },
      {
        id: "ms_07",
        texto:
          "Uso obligatorio de férula o soporte ortopédico durante jornada laboral en actividades de alto riesgo",
        normativa: "Res. 0312/2019",
      },
    ],
  },
  columnaLumbar: {
    label: "Columna Lumbar",
    icon: "🦴",
    color: "orange",
    items: [
      {
        id: "cl_01",
        texto:
          "No levantamiento manual de cargas superiores a 12.5 kg (mujeres) / 25 kg (hombres)",
        normativa: "NTC-4241 / NIOSH",
      },
      {
        id: "cl_02",
        texto:
          "No permanecer en posición de pie estática por más de 2 horas continuas sin descanso postural",
        normativa: "GTC-45 2012",
      },
      {
        id: "cl_03",
        texto:
          "No permanecer en posición sedente por más de 1 hora continua sin cambio postural",
        normativa: "GATISO-DME 2015",
      },
      {
        id: "cl_04",
        texto: "No realizar flexión de tronco mayor a 45° con o sin carga",
        normativa: "GATISO-DME 2015",
      },
      {
        id: "cl_05",
        texto:
          "No realizar movimientos de torsión de columna lumbar bajo carga",
        normativa: "GATISO-DME 2015",
      },
      {
        id: "cl_06",
        texto:
          "Uso obligatorio de cinturón lumbar en tareas de carga/descarga durante período de restricción",
        normativa: "Res. 0312/2019",
      },
      {
        id: "cl_07",
        texto:
          "Adaptar puesto de trabajo con silla ergonómica con soporte lumbar y reposapiés si aplica",
        normativa: "Res. 2400/1979 Art. 381",
      },
    ],
  },
  columnaCervical: {
    label: "Columna Cervical",
    icon: "🔭",
    color: "purple",
    items: [
      {
        id: "cc_01",
        texto:
          "No mantener postura de flexión cervical mayor a 20° por más de 2 horas continuas (uso de pantallas/microscopia)",
        normativa: "GATISO-DME 2015",
      },
      {
        id: "cc_02",
        texto:
          "No realizar tareas con el cuello en rotación máxima sostenida por más de 30 minutos",
        normativa: "GTC-45 2012",
      },
      {
        id: "cc_03",
        texto:
          "Pantalla de computador a nivel de los ojos, distancia mínima 50 cm",
        normativa: "Res. 2400/1979",
      },
      {
        id: "cc_04",
        texto:
          "No cargar objetos sobre cabeza o hombros con peso superior a 3 kg",
        normativa: "GATISO-DME 2015",
      },
      {
        id: "cc_05",
        texto:
          "Pausas activas cervicales obligatorias cada 45 minutos en tareas de trabajo visual prolongado",
        normativa: "Res. 0312/2019",
      },
    ],
  },
  columnaDorsal: {
    label: "Columna Dorsal",
    icon: "🏥",
    color: "teal",
    items: [
      {
        id: "cd_01",
        texto:
          "No permanecer en sedestación prolongada sin soporte dorsal adecuado (>1 hora continua)",
        normativa: "GATISO-DME 2015",
      },
      {
        id: "cd_02",
        texto:
          "No realizar actividades que impliquen elevación de brazos por encima de los hombros de forma repetitiva",
        normativa: "GTC-45 2012",
      },
      {
        id: "cd_03",
        texto:
          "Silla con respaldo que cubra toda la zona dorsal (vértebras T1-T12)",
        normativa: "Res. 2400/1979",
      },
      {
        id: "cd_04",
        texto:
          "No exposición a vibración de cuerpo entero (manejo de vehículos pesados, maquinaria) sin estudio de impacto",
        normativa: "GTC-45 2012",
      },
    ],
  },
  miembroInferior: {
    label: "Miembro Inferior",
    icon: "🦵",
    color: "green",
    items: [
      {
        id: "mi_01",
        texto:
          "No permanecer en bipedestación estática por más de 2 horas continuas",
        normativa: "GTC-45 2012",
      },
      {
        id: "mi_02",
        texto:
          "No subir o bajar escaleras de forma repetitiva (>30 ascensos/día) en período de restricción",
        normativa: "GATISO-DME 2015",
      },
      {
        id: "mi_03",
        texto:
          "No trabajo en superficies irregulares o resbaladizas sin calzado de seguridad con soporte de tobillo",
        normativa: "Res. 2400/1979",
      },
      {
        id: "mi_04",
        texto:
          "Calzado ergonómico con soporte plantar y tacón máximo 3 cm durante jornada laboral",
        normativa: "GATISO-DME 2015",
      },
      {
        id: "mi_05",
        texto:
          "No conducción de vehículos pesados o maquinaria durante período de restricción",
        normativa: "Res. 4100/2004",
      },
    ],
  },
  cardiovascular: {
    label: "Cardiovascular / Metabólico",
    icon: "❤️",
    color: "red",
    items: [
      {
        id: "cv_01",
        texto:
          "No realizar actividades de alta demanda cardiovascular sin evaluación cardiológica previa (FC >85% FCM)",
        normativa: "Res. 1843/2025",
      },
      {
        id: "cv_02",
        texto:
          "No trabajo en alturas hasta control y estabilización de cifras tensionales (TA >140/90 mmHg)",
        normativa: "Res. 4272/2021",
      },
      {
        id: "cv_03",
        texto:
          "Control médico periódico mensual de cifras tensionales mientras dure la restricción",
        normativa: "Res. 1843/2025",
      },
      {
        id: "cv_04",
        texto:
          "No exposición a temperaturas extremas (calor >35°C / frío <10°C) sin protección individual adecuada",
        normativa: "GTC-45 2012",
      },
      {
        id: "cv_05",
        texto:
          "Plan de alimentación supervisado: restricción de sodio, grasas saturadas y azúcares simples en jornada laboral",
        normativa: "Res. 1843/2025",
      },
      {
        id: "cv_06",
        texto:
          "No trabajos en jornadas nocturnas prolongadas (>8 h/noche) sin rotación semestral supervisada",
        normativa: "Dec. 1072/2015",
      },
    ],
  },
  respiratorio: {
    label: "Respiratorio / Pulmonar",
    icon: "🫁",
    color: "sky",
    items: [
      {
        id: "re_01",
        texto:
          "No exposición a polvos orgánicos/inorgánicos sin uso de respirador N95 o superior certificado",
        normativa: "Res. 0773/2021",
      },
      {
        id: "re_02",
        texto:
          "No exposición a humos de soldadura, gases de escape o vapores químicos sin ventilación localizada extracción",
        normativa: "GTC-45 2012",
      },
      {
        id: "re_03",
        texto:
          "Espirometría de control semestral mientras persistan factores de riesgo respiratorio",
        normativa: "GATISO-ND 2012",
      },
      {
        id: "re_04",
        texto:
          "No trabajo en espacios confinados hasta nueva evaluación neumológica con resultado apto",
        normativa: "Res. 0491/2020",
      },
      {
        id: "re_05",
        texto:
          "No exposición a agentes sensibilizantes respiratorios (látex, isocianatos, harinas) sin EPP certificado",
        normativa: "GTC-45 2012",
      },
    ],
  },
  neurologico: {
    label: "Neurológico / Psiquiátrico",
    icon: "🧠",
    color: "violet",
    items: [
      {
        id: "ne_01",
        texto:
          "No operación de maquinaria peligrosa, vehículos o equipos eléctricos de alta tensión hasta concepto neurológico",
        normativa: "Res. 1843/2025",
      },
      {
        id: "ne_02",
        texto:
          "No trabajo en alturas hasta nueva evaluación médica con concepto apto (Res. 4272/2021)",
        normativa: "Res. 4272/2021",
      },
      {
        id: "ne_03",
        texto:
          "No exposición a solventes neurotóxicos (benceno, tolueno, xileno) sin ventilación y EPP certificado",
        normativa: "GTC-45 2012",
      },
      {
        id: "ne_04",
        texto:
          "Jornada laboral máxima de 8 horas/día, sin horas extras durante período de tratamiento psiquiátrico activo",
        normativa: "Dec. 1072/2015",
      },
      {
        id: "ne_05",
        texto:
          "No trabajo en turno nocturno rotativo durante período de tratamiento de trastorno de sueño o ansiedad severa",
        normativa: "Res. 1843/2025",
      },
      {
        id: "ne_06",
        texto:
          "Seguimiento psicológico laboral mensual y reporte a médico SST de evolución clínica",
        normativa: "Res. 2404/2019",
      },
    ],
  },
  exposicionToxicos: {
    label: "Exposición a Tóxicos / Químicos",
    icon: "⚗️",
    color: "yellow",
    items: [
      {
        id: "et_01",
        texto:
          "No manipulación directa de plaguicidas organofosforados sin equipo de protección personal completo (nivel C)",
        normativa: "Res. 0031/1995",
      },
      {
        id: "et_02",
        texto:
          "No exposición a metales pesados (plomo, mercurio, cadmio) sin niveles biológicos de monitoreo vigentes",
        normativa: "GTC-45 2012",
      },
      {
        id: "et_03",
        texto:
          "Perfil toxicológico (colinesterasa/metales) semestral obligatorio mientras persista exposición",
        normativa: "Res. 1843/2025",
      },
      {
        id: "et_04",
        texto:
          "No ingesta de alimentos ni bebidas en áreas de manejo de sustancias químicas",
        normativa: "Res. 2400/1979",
      },
      {
        id: "et_05",
        texto:
          "Ducha de emergencia y lavaojos funcionales en área de trabajo como requisito para laborar con químicos corrosivos",
        normativa: "Res. 2400/1979",
      },
    ],
  },
  visual: {
    label: "Visual / Auditivo",
    icon: "👁️",
    color: "indigo",
    items: [
      {
        id: "va_01",
        texto:
          "Uso obligatorio de corrección óptica (gafas con prescripción) durante jornada laboral en tareas de precisión visual",
        normativa: "Res. 2400/1979",
      },
      {
        id: "va_02",
        texto:
          "No trabajo en conducción nocturna de vehículos con agudeza visual corregida inferior a 20/40",
        normativa: "Res. 4100/2004",
      },
      {
        id: "va_03",
        texto:
          "No exposición a radiación UV/IR sin protección ocular certificada (ANSI Z87.1)",
        normativa: "GTC-45 2012",
      },
      {
        id: "va_04",
        texto:
          "No exposición a ruido >80 dB sin uso de protección auditiva de doble vía (tapón + orejera)",
        normativa: "Res. 1792/1990",
      },
      {
        id: "va_05",
        texto:
          "Audiometría de control semestral con exposición a ruido ocupacional ≥85 dB",
        normativa: "Res. 8321/1983",
      },
    ],
  },
  alturas: {
    label: "Trabajo en Alturas",
    icon: "🏗️",
    color: "amber",
    items: [
      {
        id: "al_01",
        texto:
          "NO APTO para trabajo en alturas ≥1.5 metros hasta nueva evaluación médica con concepto específico",
        normativa: "Res. 4272/2021",
      },
      {
        id: "al_02",
        texto:
          "Requiere evaluación especializada (neurología/otorrinolaringología) antes de autorizar trabajo en alturas",
        normativa: "Res. 4272/2021 Art. 10",
      },
      {
        id: "al_03",
        texto:
          "No trabajo en alturas con medicación que produzca somnolencia, mareo o alteración del equilibrio",
        normativa: "Res. 4272/2021",
      },
      {
        id: "al_04",
        texto:
          "Uso obligatorio de arnés de cuerpo completo certificado y línea de vida en toda tarea >1.5 m",
        normativa: "Res. 4272/2021",
      },
      {
        id: "al_05",
        texto:
          "Acompañamiento permanente de vigía certificado en trabajo en alturas durante período de restricción parcial",
        normativa: "Res. 4272/2021 Art. 14",
      },
    ],
  },
  dermatologico: {
    label: "Dermatológico",
    icon: "🩺",
    color: "rose",
    items: [
      {
        id: "de_01",
        texto:
          "No contacto directo con agentes irritantes/sensibilizantes cutáneos sin guantes de nitrilo/neopreno certificados",
        normativa: "GTC-45 2012",
      },
      {
        id: "de_02",
        texto:
          "No exposición solar directa sin protector solar SPF 50+ durante jornadas extramurales",
        normativa: "Res. 1843/2025",
      },
      {
        id: "de_03",
        texto:
          "No manipulación de alimentos hasta resolución completa de lesión cutánea activa en manos",
        normativa: "Res. 2674/2013",
      },
      {
        id: "de_04",
        texto:
          "Control dermatológico mensual mientras persistan lesiones laborales activas",
        normativa: "Res. 1843/2025",
      },
    ],
  },
};
