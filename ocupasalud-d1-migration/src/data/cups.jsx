// src/data/cups.js - CUPS Salud Ocupacional Colombia
import React, { useState, useRef } from 'react';

const CUPS_OCUPACIONAL = [
  {
    code: "890301",
    desc: "Consulta de primera vez por medicina general",
    group: "Consultas",
  },
  {
    code: "890302",
    desc: "Consulta de primera vez por medicina especializada - salud ocupacional",
    group: "Consultas",
  },
  {
    code: "890401",
    desc: "Consulta de control o seguimiento por medicina general",
    group: "Consultas",
  },
  {
    code: "890403",
    desc: "Consulta de control o seguimiento por medicina del trabajo",
    group: "Consultas",
  },
  {
    code: "890701",
    desc: "Interconsulta por medicina general",
    group: "Consultas",
  },
  {
    code: "890702",
    desc: "Interconsulta por medicina especializada - salud ocupacional",
    group: "Consultas",
  },
  {
    code: "890201",
    desc: "Consulta de urgencias por medicina general",
    group: "Consultas",
  },
  {
    code: "903801",
    desc: "Evaluación médica ocupacional de ingreso - Res. 1843/2025",
    group: "Salud Ocupacional",
  },
  {
    code: "903802",
    desc: "Evaluación médica ocupacional periódica - Res. 1843/2025",
    group: "Salud Ocupacional",
  },
  {
    code: "903803",
    desc: "Evaluación médica ocupacional de retiro/egreso",
    group: "Salud Ocupacional",
  },
  {
    code: "903804",
    desc: "Evaluación médica post-incapacidad (>=30 días) - Res. 1843/2025 Art.9",
    group: "Salud Ocupacional",
  },
  {
    code: "903805",
    desc: "Evaluación médica de retorno laboral (>90 días no médica) - Art.13",
    group: "Salud Ocupacional",
  },
  {
    code: "903806",
    desc: "Evaluación médica ocupacional de seguimiento",
    group: "Salud Ocupacional",
  },
  {
    code: "911501",
    desc: "Audiometría tonal liminar vía aérea y ósea - hipoacusia laboral",
    group: "Audiología",
  },
  {
    code: "911502",
    desc: "Audiometría de tamizaje (screening auditivo)",
    group: "Audiología",
  },
  {
    code: "911503",
    desc: "Logoaudiometría - discriminación verbal",
    group: "Audiología",
  },
  {
    code: "911504",
    desc: "Potenciales evocados auditivos del tronco cerebral (PEATC)",
    group: "Audiología",
  },
  {
    code: "911601",
    desc: "Otoscopía - examen del conducto auditivo externo y tímpano",
    group: "Audiología",
  },
  {
    code: "921601",
    desc: "Examen optométrico completo - agudeza visual y refracción",
    group: "Optometría",
  },
  {
    code: "921602",
    desc: "Agudeza visual - tamizaje visual laboral",
    group: "Optometría",
  },
  {
    code: "921603",
    desc: "Campimetría (campo visual) - trabajo en alturas, conductores",
    group: "Optometría",
  },
  {
    code: "921604",
    desc: "Visión de colores (Ishihara) - electrónica y seguridad",
    group: "Optometría",
  },
  {
    code: "921701",
    desc: "Tonometría ocular - detección glaucoma",
    group: "Optometría",
  },
  {
    code: "912701",
    desc: "Espirometría simple (CVF, VEF1) - exposición laboral a polvos",
    group: "Neumología",
  },
  {
    code: "912702",
    desc: "Espirometría con broncodilatador - asma ocupacional",
    group: "Neumología",
  },
  {
    code: "912703",
    desc: "Flujo espiratorio pico (PEF) - monitoreo asma",
    group: "Neumología",
  },
  {
    code: "912704",
    desc: "Oximetría de pulso - saturación O2 laboral",
    group: "Neumología",
  },
  {
    code: "891501",
    desc: "Electroencefalograma (EEG) - epilepsia, alturas",
    group: "Neurología",
  },
  {
    code: "891502",
    desc: "Electromiografía (EMG) - túnel del carpo, neuropatía laboral",
    group: "Neurología",
  },
  {
    code: "891503",
    desc: "Velocidades de conducción nerviosa (VCN) - GATISO-MMSS",
    group: "Neurología",
  },
  {
    code: "891504",
    desc: "Potenciales evocados somatosensoriales (PESS)",
    group: "Neurología",
  },
  {
    code: "903001",
    desc: "Hemograma completo con diferencial - cuadro hemático",
    group: "Laboratorio",
  },
  {
    code: "903002",
    desc: "Glicemia en ayunas - tamizaje diabetes",
    group: "Laboratorio",
  },
  {
    code: "903003",
    desc: "Hemoglobina glicosilada (HbA1c)",
    group: "Laboratorio",
  },
  {
    code: "903004",
    desc: "Perfil lipídico completo - colesterol HDL, LDL, triglicéridos",
    group: "Laboratorio",
  },
  {
    code: "903005",
    desc: "Parcial de orina (uroanálisis)",
    group: "Laboratorio",
  },
  {
    code: "903006",
    desc: "Creatinina sérica - función renal",
    group: "Laboratorio",
  },
  {
    code: "903007",
    desc: "Transaminasas ALT/AST - función hepática, exposición a tóxicos",
    group: "Laboratorio",
  },
  {
    code: "903008",
    desc: "Colinesterasa sérica - exposición a organofosforados",
    group: "Laboratorio",
  },
  {
    code: "903009",
    desc: "Plombemia (plomo en sangre) - exposición laboral a plomo",
    group: "Laboratorio",
  },
  {
    code: "903010",
    desc: "Mercurio en orina 24h - exposición a mercurio laboral",
    group: "Laboratorio",
  },
  {
    code: "903011",
    desc: "Manganeso en sangre - exposición laboral",
    group: "Laboratorio",
  },
  {
    code: "903012",
    desc: "Solventes orgánicos en orina - benceno, tolueno, xileno",
    group: "Laboratorio",
  },
  { code: "903013", desc: "Urocultivo", group: "Laboratorio" },
  {
    code: "903014",
    desc: "Coproscópico directo - parásitos intestinales",
    group: "Laboratorio",
  },
  { code: "903016", desc: "Proteína C reactiva (PCR)", group: "Laboratorio" },
  {
    code: "903017",
    desc: "VSG (velocidad de sedimentación globular)",
    group: "Laboratorio",
  },
  { code: "903018", desc: "Ácido úrico sérico", group: "Laboratorio" },
  {
    code: "903019",
    desc: "TSH (hormona estimulante de tiroides)",
    group: "Laboratorio",
  },
  { code: "903020", desc: "Vitamina D 25-OH", group: "Laboratorio" },
  {
    code: "903021",
    desc: "Antígeno de superficie hepatitis B (HBsAg)",
    group: "Laboratorio",
  },
  {
    code: "903022",
    desc: "Anti-HBs - verificación vacuna hepatitis B",
    group: "Laboratorio",
  },
  { code: "903023", desc: "Prueba de VIH (ELISA)", group: "Laboratorio" },
  { code: "903024", desc: "VDRL - sífilis", group: "Laboratorio" },
  {
    code: "870101",
    desc: "Radiografía de columna lumbosacra AP y lateral",
    group: "Imagenología",
  },
  {
    code: "870102",
    desc: "Radiografía de columna cervical AP y lateral",
    group: "Imagenología",
  },
  {
    code: "870103",
    desc: "Radiografía de columna dorsal AP y lateral",
    group: "Imagenología",
  },
  {
    code: "870201",
    desc: "Radiografía de manos bilateral AP - túnel del carpo",
    group: "Imagenología",
  },
  {
    code: "870202",
    desc: "Radiografía de muñecas bilateral",
    group: "Imagenología",
  },
  {
    code: "870203",
    desc: "Radiografía de hombros bilateral",
    group: "Imagenología",
  },
  {
    code: "870204",
    desc: "Radiografía de rodillas bilateral",
    group: "Imagenología",
  },
  {
    code: "870205",
    desc: "Radiografía de tobillos y pies bilateral",
    group: "Imagenología",
  },
  {
    code: "870301",
    desc: "Ecografía de hombro - manguito rotador, tendinitis",
    group: "Imagenología",
  },
  {
    code: "870302",
    desc: "Ecografía de columna lumbar - hernia discal",
    group: "Imagenología",
  },
  {
    code: "870303",
    desc: "Ecografía de muñeca - síndrome del túnel del carpo",
    group: "Imagenología",
  },
  {
    code: "870304",
    desc: "Ecografía abdominal total - control preventivo",
    group: "Imagenología",
  },
  {
    code: "870401",
    desc: "Resonancia magnética (RMN) de columna lumbosacra",
    group: "Imagenología",
  },
  {
    code: "870402",
    desc: "Resonancia magnética de columna cervical",
    group: "Imagenología",
  },
  {
    code: "870403",
    desc: "Resonancia magnética de hombro",
    group: "Imagenología",
  },
  {
    code: "870501",
    desc: "Tomografía computarizada (TAC) de tórax - neumoconiosis",
    group: "Imagenología",
  },
  {
    code: "870502",
    desc: "Radiografía de tórax PA y lateral - ILO 2011 neumoconiosis",
    group: "Imagenología",
  },
  {
    code: "893001",
    desc: "Electrocardiograma (ECG) 12 derivaciones - riesgo cardiovascular",
    group: "Cardiología",
  },
  {
    code: "893002",
    desc: "Ergometría (prueba de esfuerzo) - alturas, conductores",
    group: "Cardiología",
  },
  {
    code: "893003",
    desc: "Ecocardiograma transtorácico - cardiopatía hipertensiva",
    group: "Cardiología",
  },
  {
    code: "893004",
    desc: "Holter de 24 horas (ECG ambulatorio) - arritmias",
    group: "Cardiología",
  },
  {
    code: "893005",
    desc: "Monitoreo ambulatorio de presión arterial (MAPA 24h)",
    group: "Cardiología",
  },
  {
    code: "950801",
    desc: "Evaluación psicológica de ingreso - factores psicosociales",
    group: "Psicología",
  },
  {
    code: "950803",
    desc: "Evaluación factores de riesgo psicosocial - Batería MinTrabajo",
    group: "Psicología",
  },
  {
    code: "950804",
    desc: "Test de coordinación visomotora - conductores, operadores maquinaria",
    group: "Psicología",
  },
  {
    code: "950901",
    desc: "Valoración psiquiátrica - trastorno mental laboral",
    group: "Psiquiatría",
  },
  {
    code: "951001",
    desc: "Examen toxicológico en orina - sustancias psicoactivas",
    group: "Toxicología",
  },
  {
    code: "951002",
    desc: "Alcoholemia (etanol en sangre)",
    group: "Toxicología",
  },
  {
    code: "951003",
    desc: "Metales pesados en sangre - Hg, Pb, Cd, Cr, Mn",
    group: "Toxicología",
  },
  {
    code: "960101",
    desc: "Valoración por fisioterapia - DME, ergonomía laboral",
    group: "Rehabilitación",
  },
  {
    code: "960102",
    desc: "Terapia física - lesiones osteomusculares laborales",
    group: "Rehabilitación",
  },
  {
    code: "960201",
    desc: "Terapia ocupacional - reintegro laboral",
    group: "Rehabilitación",
  },
];
const _buscarCUPS = (query, maxResults) => {
  const max = maxResults || 10;
  if (!query || query.trim().length < 2) return [];
  const normalize = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const q = normalize(query.trim());
  return CUPS_OCUPACIONAL.filter(
    (item) =>
      normalize(item.code).includes(q) ||
      normalize(item.desc).includes(q) ||
      normalize(item.group).includes(q)
  ).slice(0, max);
};
const CUPSInput = ({ value, onChange, placeholder, className }) => {
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
      const r = _buscarCUPS(v);
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
        value={query}
        onChange={handleInput}
        onFocus={() => {
          if (sugerencias.length > 0) setAbierto(true);
        }}
        placeholder={
          placeholder || "Buscar CUPS - código o nombre del procedimiento..."
        }
        className={
          className ||
          "w-full p-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-teal-400 outline-none border-gray-300"
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
            border: "2px solid #0d9488",
            borderRadius: "0 0 10px 10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {sugerencias.map((item, ixd) => (
            <div
              key={ixd}
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
                (e.currentTarget.style.background = "#f0fdfa")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              <div style={{ flexShrink: 0, textAlign: "center" }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: "900",
                    color: "#134e4a",
                    fontSize: "10px",
                    background: "#ccfbf1",
                    padding: "2px 5px",
                    borderRadius: "4px",
                    display: "block",
                  }}
                >
                  {item.code}
                </span>
                <span
                  style={{
                    fontSize: "8px",
                    color: "#0d9488",
                    fontWeight: "700",
                    display: "block",
                    marginTop: "1px",
                  }}
                >
                  {item.group}
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  color: "#374151",
                  lineHeight: "1.4",
                  flex: 1,
                }}
              >
                {item.desc}
              </span>
            </div>
          ))}
          <div
            style={{
              padding: "3px 10px",
              background: "#f0fdfa",
              fontSize: "9px",
              color: "#6b7280",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            {sugerencias.length} resultado(s) · CUPS Colombia · Res. 2175/2015
            actualizada · MinSalud
          </div>
        </div>
      )}
    </div>
  );
};

export { CUPS_OCUPACIONAL, _buscarCUPS };
export default CUPSInput;
