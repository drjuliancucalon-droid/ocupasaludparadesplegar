// src/data/cie10.jsx - CIE-10 Diagnósticos Salud Ocupacional
import React, { useState, useRef } from 'react';

const CIE10_OCUPACIONAL = [
  // Z: FACTORES DE RIESGO OCUPACIONAL
  {
    code: "Z10.0",
    desc: "Examen médico ocupacional - evaluación ingreso/periódica/retiro",
  },
  { code: "Z10.1", desc: "Examen de salud de las fuerzas armadas" },
  { code: "Z13.1", desc: "Pesquisa especial de diabetes mellitus" },
  {
    code: "Z13.5",
    desc: "Pesquisa especial de trastornos visuales y de la visión",
  },
  { code: "Z13.6", desc: "Pesquisa especial de trastornos cardiovasculares" },
  { code: "Z56.0", desc: "Desempleo - problema relacionado con el empleo" },
  { code: "Z56.1", desc: "Cambio de empleo" },
  { code: "Z56.2", desc: "Amenaza de pérdida del empleo" },
  { code: "Z56.3", desc: "Ritmo de trabajo penoso - carga laboral excesiva" },
  { code: "Z56.4", desc: "Desacuerdo con el jefe y compañeros de trabajo" },
  {
    code: "Z56.5",
    desc: "Trabajo desagradable - condiciones laborales adversas",
  },
  {
    code: "Z56.6",
    desc: "Otras dificultades físicas relacionadas con el trabajo",
  },
  {
    code: "Z56.7",
    desc: "Otros problemas no especificados relacionados con el empleo",
  },
  {
    code: "Z57.0",
    desc: "Exposición ocupacional al ruido - hipoacusia laboral",
  },
  {
    code: "Z57.1",
    desc: "Exposición ocupacional a radiación ionizante y no ionizante",
  },
  {
    code: "Z57.2",
    desc: "Exposición ocupacional al polvo - silicosis, neumoconiosis",
  },
  {
    code: "Z57.3",
    desc: "Exposición ocupacional a otros contaminantes del aire",
  },
  {
    code: "Z57.4",
    desc: "Exposición ocupacional a agentes tóxicos en agricultura",
  },
  {
    code: "Z57.5",
    desc: "Exposición ocupacional a agentes tóxicos en otras industrias",
  },
  { code: "Z57.6", desc: "Exposición ocupacional a temperaturas extremas" },
  { code: "Z57.7", desc: "Exposición ocupacional a vibración" },
  { code: "Z57.8", desc: "Exposición ocupacional a otros factores de riesgo" },
  {
    code: "Z57.9",
    desc: "Exposición ocupacional a factor de riesgo no especificado",
  },
  { code: "Z73.0", desc: "Síndrome de agotamiento - Burnout laboral" },
  { code: "Z73.1", desc: "Acentuación de rasgos de la personalidad" },
  {
    code: "Z73.2",
    desc: "Falta de relajación y descanso - fatiga laboral crónica",
  },
  {
    code: "Z73.3",
    desc: "Estrés no clasificado en otra parte - estrés laboral",
  },
  {
    code: "Z73.4",
    desc: "Habilidades sociales inadecuadas no clasificadas en otra parte",
  },
  {
    code: "Z73.5",
    desc: "Conflicto de rol - dificultad de conciliación laboral/personal",
  },
  { code: "Z73.6", desc: "Limitación de actividades debida a incapacidad" },
  {
    code: "Z76.5",
    desc: "Persona que simula enfermedad (simulador consciente)",
  },
  { code: "Z77.0", desc: "Contacto y exposición a metales y metaloides" },
  {
    code: "Z77.1",
    desc: "Contacto y exposición a materiales tóxicos y contaminantes",
  },
  // M: SISTEMA OSTEOMUSCULAR - GATISO-DME, GATISO-TME
  {
    code: "M47.8",
    desc: "Espondiloartrosis cervical - cervicoartrosis laboral",
  },
  { code: "M47.81", desc: "Espondiloartrosis cervical con mielopatía" },
  { code: "M48.0", desc: "Estenosis espinal cervical o lumbar" },
  { code: "M50.0", desc: "Enfermedad del disco cervical con mielopatía" },
  {
    code: "M50.1",
    desc: "Enfermedad del disco cervical con radiculopatía - hernia cervical",
  },
  {
    code: "M50.2",
    desc: "Desplazamiento de disco cervical - hernia sin mielopatía",
  },
  {
    code: "M51.1",
    desc: "Enfermedad del disco lumbar con radiculopatía - lumbociática laboral",
  },
  {
    code: "M51.2",
    desc: "Desplazamiento de disco lumbar - hernia de disco lumbar",
  },
  { code: "M51.3", desc: "Degeneración del disco intervertebral lumbar" },
  { code: "M54.2", desc: "Cervicalgia - dolor cervical laboral" },
  { code: "M54.3", desc: "Ciática - radiculopatía lumbosacra" },
  { code: "M54.4", desc: "Lumbago con ciática" },
  {
    code: "M54.5",
    desc: "Lumbago no especificado - lumbalgia laboral crónica",
  },
  { code: "M54.6", desc: "Dolor en columna dorsal" },
  { code: "M60.0", desc: "Miositis infecciosa" },
  { code: "M62.4", desc: "Contractura muscular - espasmo muscular laboral" },
  { code: "M65.0", desc: "Tenosinovitis por absceso" },
  {
    code: "M65.3",
    desc: "Dedo en gatillo - tenosinovitis estenosante digital",
  },
  {
    code: "M65.4",
    desc: "Tenosinovitis de De Quervain - estiloides radial laboral",
  },
  {
    code: "M65.8",
    desc: "Otras sinovitis y tenosinovitis - tendinitis laboral",
  },
  { code: "M65.9", desc: "Sinovitis y tenosinovitis no especificada" },
  {
    code: "M70.0",
    desc: "Sinovitis crepitante crónica de mano y muñeca laboral",
  },
  { code: "M70.1", desc: "Bursitis de mano" },
  { code: "M70.2", desc: "Bursitis olecraniana - trabajo manual prolongado" },
  { code: "M70.3", desc: "Otras bursitis del codo" },
  { code: "M70.4", desc: "Bursitis prepatelar" },
  { code: "M70.5", desc: "Otras bursitis de rodilla - trabajo en cuclillas" },
  {
    code: "M70.6",
    desc: "Bursitis trocantérica - trabajo en bipedestación prolongada",
  },
  {
    code: "M70.9",
    desc: "Trastorno de tejidos blandos relacionado con el uso, sin especificar",
  },
  {
    code: "M75.0",
    desc: "Síndrome del manguito rotador - hombro doloroso laboral",
  },
  { code: "M75.1", desc: "Síndrome del bíceps - tendinitis bicipital laboral" },
  { code: "M75.2", desc: "Tendinitis calcificante de hombro" },
  { code: "M75.3", desc: "Tendinitis del hombro - síndrome de impingement" },
  { code: "M75.4", desc: "Síndrome de roce del hombro" },
  { code: "M75.5", desc: "Bursitis del hombro laboral" },
  { code: "M75.8", desc: "Otras lesiones del hombro laboral" },
  { code: "M77.0", desc: "Epicondilitis medial - codo de golfista laboral" },
  { code: "M77.1", desc: "Epicondilitis lateral - codo de tenista laboral" },
  { code: "M79.1", desc: "Mialgia - dolor muscular difuso" },
  { code: "M79.2", desc: "Neuralgia y neuritis no especificadas" },
  { code: "M79.3", desc: "Paniculitis - dolor en tejido adiposo" },
  // G: NEUROLÓGICOS - GATISO-MMSS
  { code: "G50.0", desc: "Neuralgia del trigémino paroxística" },
  {
    code: "G54.0",
    desc: "Trastornos de la raíz nerviosa cervical - radiculopatía cervical",
  },
  { code: "G54.1", desc: "Trastornos de la raíz nerviosa torácica" },
  {
    code: "G54.2",
    desc: "Trastornos de la raíz nerviosa lumbosacra - radiculopatía lumbar",
  },
  {
    code: "G56.0",
    desc: "Síndrome del túnel del carpo - compresión nervio mediano laboral",
  },
  { code: "G56.1", desc: "Otras lesiones del nervio mediano laboral" },
  {
    code: "G56.2",
    desc: "Lesión del nervio cubital - parálisis cubital laboral",
  },
  { code: "G56.3", desc: "Lesión del nervio radial" },
  {
    code: "G57.1",
    desc: "Meralgia parestésica - compresión nervio femorocutáneo",
  },
  { code: "G57.2", desc: "Lesión del nervio femoral" },
  { code: "G57.3", desc: "Lesión del nervio ciático poplíteo externo" },
  { code: "G57.5", desc: "Síndrome del túnel del tarso" },
  {
    code: "G57.6",
    desc: "Lesión del nervio plantar - trabajo en bipedestación",
  },
  { code: "G62.2", desc: "Polineuropatía debida a agentes tóxicos laborales" },
  // F: TRASTORNOS MENTALES - Psicosocial, Res. 2646/2008
  {
    code: "F10.1",
    desc: "Trastornos mentales debidos al alcohol - uso nocivo",
  },
  { code: "F17.1", desc: "Trastornos debidos al tabaco - uso nocivo" },
  { code: "F32.0", desc: "Episodio depresivo leve - laboral" },
  { code: "F32.1", desc: "Episodio depresivo moderado" },
  { code: "F32.2", desc: "Episodio depresivo grave sin síntomas psicóticos" },
  {
    code: "F41.0",
    desc: "Trastorno de pánico - ansiedad paroxística episódica",
  },
  {
    code: "F41.1",
    desc: "Trastorno de ansiedad generalizada - estrés laboral",
  },
  {
    code: "F41.2",
    desc: "Trastorno mixto ansioso-depresivo - síndrome laboral",
  },
  { code: "F43.0", desc: "Reacción aguda al estrés - accidente laboral" },
  { code: "F43.1", desc: "Trastorno de estrés postraumático - TEPT laboral" },
  { code: "F43.2", desc: "Trastorno de adaptación - cambio laboral" },
  { code: "F48.0", desc: "Neurastenia - agotamiento nervioso laboral" },
  { code: "F51.0", desc: "Insomnio no orgánico - trastorno del sueño laboral" },
  // H: AUDITIVOS Y VISUALES - Higiene industrial
  {
    code: "H83.3",
    desc: "Efectos del ruido sobre el oído interno - NIHL laboral",
  },
  { code: "H90.0", desc: "Hipoacusia conductiva bilateral" },
  { code: "H90.3", desc: "Hipoacusia neurosensorial bilateral - laboral" },
  { code: "H90.4", desc: "Hipoacusia neurosensorial unilateral" },
  { code: "H91.0", desc: "Hipoacusia ototóxica - medicamentos y disolventes" },
  {
    code: "H91.9",
    desc: "Hipoacusia no especificada - pérdida auditiva laboral",
  },
  { code: "H52.1", desc: "Miopía" },
  { code: "H52.2", desc: "Astigmatismo" },
  { code: "H52.4", desc: "Presbicia - visión afectada por edad" },
  {
    code: "H53.1",
    desc: "Alteraciones visuales subjetivas - fatiga visual por pantallas",
  },
  // J: RESPIRATORIOS - Decreto 1477/2014
  { code: "J45.0", desc: "Asma predominantemente alérgica - asma ocupacional" },
  { code: "J45.1", desc: "Asma no alérgica - asma irritativa laboral" },
  { code: "J60", desc: "Neumoconiosis de los mineros del carbón" },
  { code: "J61", desc: "Neumoconiosis debida a amianto - asbestosis" },
  { code: "J62.0", desc: "Neumoconiosis debida al talco - talcosis" },
  {
    code: "J62.8",
    desc: "Neumoconiosis debida a polvos con sílice - silicosis",
  },
  { code: "J63.0", desc: "Aluminosis pulmonar" },
  { code: "J63.2", desc: "Beriliosis pulmonar" },
  { code: "J63.4", desc: "Siderosis - polvo de hierro y óxidos" },
  { code: "J64", desc: "Neumoconiosis no especificada" },
  { code: "J66.0", desc: "Bisinosis - polvo de algodón, tabaco, lino" },
  {
    code: "J67.0",
    desc: "Pulmón del granjero - esporas de actinomicetos termófilos",
  },
  {
    code: "J68.0",
    desc: "Bronquitis y neumonitis por inhalación de gases, humos",
  },
  { code: "J00", desc: "Rinofaringitis aguda (Resfriado común)" },
  {
    code: "J06.9",
    desc: "Infección aguda de vías respiratorias superiores no especificada",
  },
  { code: "J18.9", desc: "Neumonía no especificada" },
  { code: "J30.4", desc: "Rinitis alérgica no especificada - rinitis laboral" },
  // I: CARDIOVASCULARES
  { code: "I10", desc: "Hipertensión esencial (primaria)" },
  {
    code: "I11.9",
    desc: "Cardiopatía hipertensiva sin insuficiencia cardíaca",
  },
  { code: "I20.0", desc: "Angina de pecho inestable" },
  { code: "I21.0", desc: "Infarto agudo de miocardio de la pared anterior" },
  {
    code: "I25.1",
    desc: "Enfermedad aterosclerótica del corazón - cardiopatía isquémica",
  },
  { code: "I50.0", desc: "Insuficiencia cardíaca congestiva" },
  { code: "I63.9", desc: "Infarto cerebral no especificado - ACV isquémico" },
  {
    code: "I83.0",
    desc: "Várices de los miembros inferiores - trabajo prolongado de pie",
  },
  // L: DERMATOLÓGICOS - exposición ocupacional
  {
    code: "L23.0",
    desc: "Dermatitis alérgica de contacto debida a metales - níquel, cromo",
  },
  {
    code: "L23.1",
    desc: "Dermatitis alérgica de contacto por adhesivos laborales",
  },
  {
    code: "L23.5",
    desc: "Dermatitis alérgica de contacto por otros productos químicos",
  },
  {
    code: "L24.2",
    desc: "Dermatitis irritativa de contacto debida a disolventes",
  },
  { code: "L24.5", desc: "Dermatitis irritativa de contacto debida a plantas" },
  {
    code: "L57.0",
    desc: "Queratosis actínica - exposición solar laboral crónica",
  },
  // S/T: ACCIDENTES DE TRABAJO Y LESIONES
  {
    code: "S13.4",
    desc: "Esguince o torcedura de columna cervical - accidente laboral",
  },
  { code: "S22.0", desc: "Fractura de vértebra torácica" },
  { code: "S32.0", desc: "Fractura de vértebra lumbar" },
  { code: "S40.0", desc: "Contusión del hombro y del brazo" },
  { code: "S42.0", desc: "Fractura de clavícula - accidente laboral" },
  { code: "S43.0", desc: "Luxación de articulación del hombro" },
  {
    code: "S52.5",
    desc: "Fractura de extremidad distal del radio - caída laboral",
  },
  { code: "S60.0", desc: "Contusión del dedo de la mano - trabajo manual" },
  { code: "S72.0", desc: "Fractura del cuello del fémur" },
  { code: "S80.0", desc: "Contusión de rodilla" },
  { code: "S83.0", desc: "Luxación de rótula" },
  {
    code: "T14.0",
    desc: "Herida de lugar de cuerpo no especificado - laceración laboral",
  },
  {
    code: "T56.0",
    desc: "Efecto tóxico del plomo y sus compuestos - saturnismo laboral",
  },
  {
    code: "T56.1",
    desc: "Efecto tóxico del mercurio - intoxicación por mercurio",
  },
  { code: "T56.2", desc: "Efecto tóxico del manganeso y sus compuestos" },
  { code: "T56.4", desc: "Efecto tóxico del cromo y sus compuestos" },
  { code: "T57.0", desc: "Efecto tóxico del arsénico y sus compuestos" },
  {
    code: "T65.3",
    desc: "Efecto tóxico de nitroderivados del benceno - laboral",
  },
  // C: CÁNCER LABORAL - Decreto 1477/2014
  {
    code: "C34.0",
    desc: "Tumor maligno del bronquio principal - cáncer de pulmón laboral",
  },
  {
    code: "C34.1",
    desc: "Tumor maligno del lóbulo superior - exposición asbesto/sílice",
  },
  { code: "C45.0", desc: "Mesotelioma de pleura - asbestosis mesotelial" },
  { code: "C45.1", desc: "Mesotelioma de peritoneo - asbesto" },
  {
    code: "C67.9",
    desc: "Tumor maligno de la vejiga urinaria - aminas aromáticas",
  },
  {
    code: "C91.0",
    desc: "Leucemia linfoblástica aguda - exposición a benceno",
  },
  {
    code: "C92.0",
    desc: "Leucemia mieloide aguda - benceno, radiaciones ionizantes",
  },
  // MEDICINA GENERAL FRECUENTE
  { code: "A09.9", desc: "Gastroenteritis no especificada" },
  { code: "B02.9", desc: "Herpes zóster sin complicaciones" },
  { code: "E11.9", desc: "Diabetes mellitus tipo 2 sin complicaciones" },
  { code: "E66.0", desc: "Obesidad debida a exceso de calorías" },
  { code: "E78.0", desc: "Hipercolesterolemia pura" },
  { code: "E78.5", desc: "Hiperlipidemia no especificada" },
  {
    code: "K21.0",
    desc: "Enfermedad por reflujo gastroesofágico con esofagitis",
  },
  { code: "K29.7", desc: "Gastritis no especificada" },
  {
    code: "N39.0",
    desc: "Infección de las vías urinarias, sitio no especificado",
  },
  { code: "R51", desc: "Cefalea - cefalea tensional laboral" },
  {
    code: "R53",
    desc: "Malestar y fatiga - síndrome de fatiga crónica laboral",
  },
  { code: "R55", desc: "Síncope y colapso - vagal laboral" },
];
// Buscador CIE-10 con filtrado en tiempo real (insensible a tildes y mayúsculas)
const _buscarCIE10 = (query, maxResults) => {
  const max = maxResults || 12;
  if (!query || query.trim().length < 2) return [];
  const normalize = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const q = normalize(query.trim());
  return CIE10_OCUPACIONAL.filter((item) => {
    return normalize(item.code).includes(q) || normalize(item.desc).includes(q);
  }).slice(0, max);
};
// Componente CIE10Input: autocomplete en tiempo real al escribir
const CIE10Input = ({ value, onChange, placeholder, className, name }) => {
  const [query, setQuery] = React.useState(value || "");
  const [sugerencias, setSugerencias] = React.useState([]);
  const [abierto, setAbierto] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    setQuery(value || "");
  }, [value]);
  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    onChange && onChange(v);
    if (v.trim().length >= 2) {
      const r = _buscarCIE10(v);
      setSugerencias(r);
      setAbierto(r.length > 0);
    } else {
      setSugerencias([]);
      setAbierto(false);
    }
  };
  const seleccionar = (item) => {
    const completo = item.code + " - " + item.desc;
    setQuery(completo);
    onChange && onChange(completo);
    setSugerencias([]);
    setAbierto(false);
  };
  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <input
        name={name}
        value={query}
        onChange={handleInput}
        onFocus={() => {
          if (sugerencias.length > 0) setAbierto(true);
        }}
        placeholder={placeholder || "Buscar CIE-10 - código o descripción..."}
        className={
          className ||
          "w-full p-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-400 outline-none border-gray-300"
        }
        autoComplete="off"
        spellCheck="false"
      />
      {abierto && sugerencias.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "white",
            border: "2px solid #10b981",
            borderRadius: "0 0 10px 10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {sugerencias.map((item, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => {
                e.preventDefault();
                seleccionar(item);
              }}
              style={{
                padding: "5px 10px",
                cursor: "pointer",
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#ecfdf5")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: "900",
                  color: "#065f46",
                  fontSize: "11px",
                  minWidth: "54px",
                  background: "#d1fae5",
                  padding: "2px 5px",
                  borderRadius: "4px",
                  flexShrink: 0,
                }}
              >
                {item.code}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "#374151",
                  lineHeight: "1.4",
                }}
              >
                {item.desc}
              </span>
            </div>
          ))}
          <div
            style={{
              padding: "3px 10px",
              background: "#f0fdf4",
              fontSize: "9px",
              color: "#6b7280",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            {sugerencias.length} resultado(s) · CIE-10 Salud Ocupacional ·
            Decreto 1477/2014 · Res. 1843/2025
          </div>
        </div>
      )}
    </div>
  );
};

export { CIE10_OCUPACIONAL, _buscarCIE10 };
export default CIE10Input;
