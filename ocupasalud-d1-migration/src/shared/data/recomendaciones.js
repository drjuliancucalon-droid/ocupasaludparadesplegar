// CATÁLOGO DE RECOMENDACIONES
export const RECOMENDACIONES_CATALOG = {
  generales: {
    label: "Recomendaciones Generales de Salud",
    icon: "💊",
    color: "emerald",
    items: [
      {
        id: "rg_01",
        texto:
          "Actividad física aeróbica moderada mínimo 150 minutos/semana (caminar, nadar, ciclismo)",
      },
      {
        id: "rg_02",
        texto:
          "Alimentación balanceada: reducir ultraprocesados, azúcares y grasas saturadas. Aumentar frutas, verduras y proteína magra",
      },
      {
        id: "rg_03",
        texto:
          "Control médico anual con laboratorios de seguimiento (glicemia, perfil lipídico, hemograma)",
      },
      {
        id: "rg_04",
        texto:
          "Mantener índice de masa corporal entre 18.5 y 24.9 kg/m² mediante dieta y ejercicio supervisado",
      },
      {
        id: "rg_05",
        texto:
          "Hidratación adecuada: mínimo 2 litros de agua/día, aumentar en jornadas con exposición a calor",
      },
      {
        id: "rg_06",
        texto:
          "Higiene del sueño: dormir entre 7-8 horas/noche en ambiente oscuro y silencioso",
      },
      {
        id: "rg_07",
        texto:
          "Cesación tabáquica inmediata; se recomienda programa de apoyo psicológico y/o farmacológico",
      },
      {
        id: "rg_08",
        texto:
          "Moderación en consumo de alcohol: máximo 1 unidad/día (mujeres) / 2 unidades/día (hombres)",
      },
    ],
  },
  laborales: {
    label: "Recomendaciones Laborales / Ergonómicas",
    icon: "🏢",
    color: "blue",
    items: [
      {
        id: "rl_01",
        texto:
          "Realizar pausas activas cada 45-60 minutos de trabajo continuo: 5 minutos de estiramiento y movimiento articular",
      },
      {
        id: "rl_02",
        texto:
          "Ajustar altura de escritorio/banco de trabajo: codos a 90°, pantalla a nivel de los ojos",
      },
      {
        id: "rl_03",
        texto:
          "Uso de silla ergonómica con soporte lumbar ajustable, altura regulable y apoyabrazos",
      },
      {
        id: "rl_04",
        texto:
          "Técnica correcta de levantamiento de cargas: doblar rodillas, mantener espalda recta, carga pegada al cuerpo",
      },
      {
        id: "rl_05",
        texto:
          "Rotación de actividades laborales para evitar exposición continua a un solo factor de riesgo ergonómico",
      },
      {
        id: "rl_06",
        texto:
          "Uso obligatorio de calzado de seguridad con soporte plantar en áreas de carga y descarga",
      },
      {
        id: "rl_07",
        texto:
          "Adaptar horario laboral para evitar trabajo en jornadas mayores a 10 horas diarias",
      },
      {
        id: "rl_08",
        texto:
          "Participar activamente en el programa de pausas activas implementado por la empresa",
      },
    ],
  },
  seguimiento: {
    label: "Seguimiento Médico y Control",
    icon: "📋",
    color: "purple",
    items: [
      {
        id: "rs_01",
        texto:
          "Control médico ocupacional semestral durante los próximos 2 años",
      },
      {
        id: "rs_02",
        texto:
          "Consulta con médico general/especialista en las próximas 4 semanas para manejo de patología diagnosticada",
      },
      {
        id: "rs_03",
        texto:
          "Continuar o iniciar tratamiento farmacológico indicado por médico tratante. Reportar medicación al médico de empresa",
      },
      {
        id: "rs_04",
        texto:
          "Adherencia a programa de vigilancia epidemiológica de la empresa según riesgo identificado",
      },
      {
        id: "rs_05",
        texto:
          "Informar de inmediato al médico de empresa cualquier cambio en su condición de salud o aparición de nuevos síntomas",
      },
      {
        id: "rs_06",
        texto:
          "Vacunación al día: esquema de adultos según EPS + vacunas de riesgo ocupacional (hepatitis B, tétanos, influenza)",
      },
    ],
  },
  psicosocial: {
    label: "Salud Mental / Psicosocial",
    icon: "🧘",
    color: "teal",
    items: [
      {
        id: "rp_01",
        texto:
          "Participar en programa de manejo del estrés laboral y técnicas de mindfulness ofrecidas por la empresa o EPS",
      },
      {
        id: "rp_02",
        texto:
          "Solicitar apoyo psicológico a través de EPS en caso de síntomas de ansiedad, depresión o burnout",
      },
      {
        id: "rp_03",
        texto:
          "Establecer límites claros entre vida laboral y personal: evitar trabajo fuera de horario habitual",
      },
      {
        id: "rp_04",
        texto:
          "Comunicar al jefe inmediato situaciones de acoso laboral, sobrecarga de trabajo o conflictos interpersonales",
      },
    ],
  },
};

export const DEFAULT_RECOMENDACIONES_SELECTED = {
  rg_01: true, // Actividad física aeróbica
  rg_02: true, // Alimentación balanceada
  rg_03: true, // Control médico anual
  rg_05: true, // Hidratación
  rg_06: true, // Higiene del sueño
  rl_01: true, // Pausas activas
  rl_04: true, // Técnica levantamiento cargas
  rs_01: true, // Control médico ocupacional semestral
  rs_05: true, // Informar cambios de salud
  rs_06: true, // Vacunación al día
};
