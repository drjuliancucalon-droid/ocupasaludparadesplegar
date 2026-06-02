import React from 'react';
import {
  ClipboardList,
  Sparkles,
  Loader2,
  History,
  ShieldAlert,
  X,
} from 'lucide-react';
import InputGroup from '../components/ui/InputGroup';
import SelectGroup from '../components/ui/SelectGroup';
import TextAreaGroup from '../components/ui/TextAreaGroup';
import SectionTitle from '../components/ui/SectionTitle';
import CIE10Input from '../components/ui/CIE10Input';
import { CIE11Badge } from '../shared/components/CIE11Badge';
import DoctorSignature from '../components/ui/DoctorSignature';
import BrandLogo from '../components/ui/BrandLogo';
import ConsentimientoModal from '../components/modals/ConsentimientoModal';
import { TURNO_LIST, NORMAL_DESCRIPTIONS_SYSTEMS } from '../shared/data/catalogs';
import { DEFAULT_RECOMENDACIONES_SELECTED } from '../shared/data/recomendaciones';

export default function HistoriaOcupacional({ ctx }) {
  const {
    AFP_LIST,
    ARL_LIST,
    CONTRATO_LIST,
    EPS_LIST,
    activeDoctorData,
    activeSignature,
    companies,
    data,
    generateAIAnalysis,
    handleChange,
    handleCompanySelect,
    handleNameChange,
    handleOpenHistoryModal,
    historyNotification,
    isGenerating,
    isGeneratingReco,
    isGeneratingRestr,
    p,
    patientSuggestions,
    selectPatientSuggestion,
    setData,
    setShowConsentModal,
    setShowRestriccionesPanel,
    showConsentModal,
    tipoExamen,
  } = ctx;

  return (
    <div
      className="bg-white mx-auto shadow-2xl print:shadow-none carta-visual"
      style={{
        width: "21.59cm",
        minHeight: "auto",
        padding: "1.2cm",
        boxSizing: "border-box",
      }}
    >
      {/* Header: BrandLogo visible solo en impresión (en pantalla ya aparece en la nav) */}
      <div className="flex justify-between items-center border-b-2 border-emerald-500 pb-3 mb-3 print:border-black">
        <div className="w-1/3 hidden print:block">
          <BrandLogo data={activeDoctorData} />
        </div>
        <div className="w-1/3 text-center">
          <h1 className="text-sm font-black text-gray-800 uppercase">
            Historia Clínica Ocupacional
          </h1>
          <p className="text-[9px] text-gray-500 font-medium">
            SEGURIDAD Y SALUD EN EL TRABAJO
          </p>
        </div>
        <div className="w-1/3 text-right text-[9px] font-bold text-gray-400">
          <p>FOR-SST-001 v4.0</p>
          <p>Res. 1843/2025</p>
          <p className="text-[8px] text-gray-500">
            Folio: {data.folioHC || "Auto"} · v{data.versionDocumento || 1}
          </p>
        </div>
      </div>
      {historyNotification && (
        <div className="mb-3 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-xl flex justify-between items-center no-print">
          <div>
            <p className="text-xs font-black text-emerald-800">
              📚 Antecedentes cargados automáticamente desde HC anterior
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5">
              {historyNotification} atención(es) previa(s) · Antecedentesábitos y riesgos prellenos · Puede editarlos libremente
            </p>
          </div>
          <button
            onClick={() => handleOpenHistoryModal(data.docNumero)}
            className="bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"
          >
            <History className="w-3 h-3" /> Ver historial
          </button>
        </div>
      )}
      {/* ── B-19: Consentimiento Informado Digital - Ley 23/1981 · Res.8430/1993 · Ley 1581/2012 · Res.1843/2025 Art.12 ── */}
      {showConsentModal && (
        <ConsentimientoModal
          data={data}
          estadoCerrada={data.estadoHistoria === "Cerrada"}
          onCerrar={() => setShowConsentModal(false)}
          onConfirmar={(campos) => {
            setData((prev) => ({ ...prev, ...campos }));
            setShowConsentModal(false);
          }}
        />
      )}
      <div
        className={`mb-3 p-3 rounded-xl border-2 no-print:border ${
          data.consentimientoInformado
            ? "bg-emerald-50 border-emerald-400"
            : "bg-amber-50 border-amber-400"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[11px] font-black uppercase tracking-wide ${
                data.consentimientoInformado
                  ? "text-emerald-800"
                  : "text-amber-800"
              }`}
            >
              {data.consentimientoInformado
                ? "✅ Consentimiento Informado Registrado"
                : "⚠️ Consentimiento Informado Pendiente"}
            </span>
            <span className="text-[9px] text-gray-400 font-bold">
              Res. 1843/2025 Art.12 · Ley 1581/2012
            </span>
          </div>
          {!data.consentimientoInformado &&
            data.estadoHistoria !== "Cerrada" && (
              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                className="px-3 py-1 text-[11px] font-black text-white bg-amber-600 hover:bg-amber-700 rounded-lg no-print"
              >
                📋 Registrar consentimiento
              </button>
            )}
          {data.consentimientoInformado &&
            data.estadoHistoria !== "Cerrada" && (
              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg no-print"
              >
                👁 Ver / Editar
              </button>
            )}
        </div>
        {data.consentimientoInformado && (
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-emerald-700">
            <span>
              👤{" "}
              <strong>
                {data.consentimientoNombrePaciente ||
                  data.nombres ||
                  "Paciente"}
              </strong>
            </span>
            <span>📅 {data.fechaConsentimiento}</span>
            {data.consentimientoTimestamp && (
              <span>
                🕐{" "}
                {new Date(data.consentimientoTimestamp).toLocaleTimeString(
                  "es-CO",
                  { hour: "2-digit", minute: "2-digit" }
                )}
              </span>
            )}
            <span className="text-[9px] text-gray-400">
              🔖 {data.consentimientoVersion}
            </span>
          </div>
        )}
      </div>
      <fieldset
        disabled={data.estadoHistoria === "Cerrada"}
        className="disabled:opacity-75"
      >
        {/* Empresa y tipo */}
        <div className="grid grid-cols-2 gap-3 mb-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100 print:bg-transparent print:border-gray-300">
          <div>
            <label className="block text-[10px] font-black text-emerald-800 mb-1">
              EMPRESA
            </label>
            <select
              className="w-full p-1.5 border border-emerald-300 rounded text-xs font-bold bg-white print:border-none"
              value={data.empresaId}
              onChange={handleCompanySelect}
            >
              <option value="particular">PARTICULAR / INDEPENDIENTE</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-emerald-800 mb-1">
              ÉNFASIS
            </label>
            <select
              name="enfasisExamen"
              value={data.enfasisExamen}
              onChange={handleChange}
              className="w-full p-1.5 border border-emerald-300 rounded text-xs font-bold bg-white print:border-none"
            >
              <option value="GENERAL">General</option>
              <option value="OSTEOMUSCULAR">Osteomuscular</option>
              <option value="CORAZON">Cardiovascular / Corazón</option>
              <option value="ALTURAS">Trabajo en Alturas</option>
              <option value="ALIMENTOS">Manipulación de Alimentos</option>
              <option value="CONFINADOS">Espacios Confinados</option>
            </select>
          </div>
        </div>
        {/* Tipo de examen */}
        <div className="bg-gray-50 p-2 rounded-lg mb-2 border border-gray-200 print:bg-transparent print:border-gray-300">
          <label className="block text-[10px] font-black text-gray-700 mb-1 uppercase">
            Tipo de Evaluación
          </label>
          <div className="flex flex-wrap gap-3">
            {/* NORMATIVO: Res. 1843/2025 - Tipos de evaluación actualizados */}
            {[
              "INGRESO",
              "PERIODICO",
              "RETIRO",
              "POST-INCAPACIDAD",
              "RETORNO-LABORAL",
              "SEGUIMIENTO",
            ].map((opt) => (
              <label
                key={opt}
                className="flex items-center text-[10px] font-bold cursor-pointer text-gray-700 hover:text-emerald-600"
              >
                <input
                  type="radio"
                  name="tipoExamen"
                  value={opt}
                  checked={data.tipoExamen === opt}
                  onChange={handleChange}
                  className="mr-1 w-3 h-3 text-emerald-600"
                />
                {opt === "RETORNO-LABORAL" ? (
                  <span className="text-purple-700">
                    RETORNO LABORAL{" "}
                    <span className="text-[8px] font-normal text-purple-500">
                      (Res.1843/2025 Art.13 - Ausencia &gt;90 días)
                    </span>
                  </span>
                ) : (
                  opt
                )}
              </label>
            ))}
            {data.tipoExamen === "SEGUIMIENTO" && (
              <select
                name="frecuenciaSeguimiento"
                value={data.frecuenciaSeguimiento}
                onChange={handleChange}
                className="p-0.5 text-[10px] border rounded border-emerald-300 bg-white ml-2"
              >
                <option value="">Frecuencia...</option>
                {["Bimestral", "Trimestral", "Semestral", "Anual"].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <SectionTitle title="Datos Sociodemográficos y Laborales" icon={User} />
        <div className="relative">
          {patientSuggestions.length > 0 && (
            <div className="absolute z-50 top-16 left-0 w-full bg-white border border-emerald-200 shadow-xl rounded-lg max-h-52 overflow-y-auto no-print">
              {patientSuggestions.map((p) => (
                <div
                  key={p.id}
                  onClick={() => selectPatientSuggestion(p)}
                  className="p-2 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-xs text-gray-800">
                      {p.nombres}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      CC: {p.docNumero} -- {p.cargo}
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    {p.historyCount} hist.
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap -mx-1.5">
            {/* Fila 1: Identificación */}
            <InputGroup
              label="Nombres Completos"
              name="nombres"
              value={data.nombres}
              onChange={handleNameChange}
              width="w-1/2"
              placeholder="Nombres y apellidos..."
            />
            <SelectGroup
              label="Tipo Doc."
              name="docTipo"
              value={data.docTipo || "CC"}
              onChange={handleChange}
              options={["CC", "CE", "TI", "Pasaporte", "PEP", "NIT"]}
              width="w-1/8 min-w-[80px]"
            />
            <InputGroup
              label="Documento ID"
              name="docNumero"
              value={data.docNumero}
              onChange={handleChange}
              width="w-1/4"
            />
            <InputGroup
              label="F. Nacimiento"
              name="fechaNacimiento"
              type="date"
              value={data.fechaNacimiento}
              onChange={(e) => {
                handleChange(e);
                if (e.target.value) {
                  const d = new Date(e.target.value);
                  const age = Math.floor((new Date() - d) / 31557600000);
                  setData((p) => ({
                    ...p,
                    fechaNacimiento: e.target.value,
                    edad: String(age),
                  }));
                }
              }}
              width="w-1/4"
            />
            <InputGroup
              label="Edad"
              name="edad"
              value={data.edad}
              onChange={handleChange}
              width="w-1/8 min-w-[70px]"
            />
            <SelectGroup
              label="Género"
              name="genero"
              value={data.genero}
              onChange={handleChange}
              options={[
                "Masculino",
                "Femenino",
                "No binario",
                "Prefiere no decir",
              ]}
              width="w-1/4"
            />
            {/* Fila 2: Afiliaciones */}
            <InputGroup
              label="EPS"
              name="eps"
              value={data.eps}
              onChange={handleChange}
              width="w-1/4"
              list="eps-list"
            />
            <InputGroup
              label="ARL"
              name="arl"
              value={data.arl}
              onChange={handleChange}
              width="w-1/4"
              list="arl-list"
            />
            <SelectGroup
              label="Nivel Riesgo ARL"
              name="nivelRiesgoARL"
              value={data.nivelRiesgoARL || ""}
              onChange={handleChange}
              options={["I", "II", "III", "IV", "V"]}
              width="w-1/8 min-w-[90px]"
            />
            <InputGroup
              label="AFP"
              name="afp"
              value={data.afp}
              onChange={handleChange}
              width="w-1/4"
              list="afp-list"
            />
            <SelectGroup
              label="Escolaridad"
              name="escolaridad"
              value={data.escolaridad}
              onChange={handleChange}
              options={[
                "Primaria Incompleta",
                "Primaria Completa",
                "Secundaria Incompleta",
                "Secundaria Completa",
                "Técnico",
                "Tecnólogo",
                "Universitario",
                "Postgrado",
                "Ninguna",
              ]}
              width="w-1/4"
            />
            <SelectGroup
              label="Estado Civil"
              name="estadoCivil"
              value={data.estadoCivil}
              onChange={handleChange}
              options={[
                "Soltero/a",
                "Casado/a",
                "Unión Libre",
                "Separado/a",
                "Divorciado/a",
                "Viudo/a",
              ]}
              width="w-1/4"
            />
            {/* Fila 3: Datos laborales */}
            <InputGroup
              label="Dependencia / Área"
              name="dependencia"
              value={data.dependencia}
              onChange={handleChange}
              width="w-1/3"
            />
            <InputGroup
              label="Cargo Actual"
              name="cargo"
              value={data.cargo}
              onChange={handleChange}
              width="w-1/3"
            />
            <InputGroup
              label="Antigüedad en Cargo"
              name="antiguedadEmpresa"
              value={data.antiguedadEmpresa}
              onChange={handleChange}
              width="w-1/4"
              placeholder="Ej: 2 años"
            />
            <SelectGroup
              label="Turno de Trabajo"
              name="turnoTrabajo"
              value={data.turnoTrabajo}
              onChange={handleChange}
              options={["Diurno", "Nocturno", "Mixto", "Rotativo", "Flexible"]}
              width="w-1/4"
              list="turno-list"
            />
            <SelectGroup
              label="Tipo de Contrato"
              name="tipoContrato"
              value={data.tipoContrato}
              onChange={handleChange}
              options={[
                "Término Indefinido",
                "Término Fijo",
                "Obra o Labor",
                "Prestación de Servicios",
                "Aprendizaje",
                "Ocasional o Transitorio",
              ]}
              width="w-1/3"
              list="contrato-list"
            />
            {/* Fila 4: Contacto y residencia */}
            <InputGroup
              label="Teléfono Fijo"
              name="telefono"
              value={data.telefono}
              onChange={handleChange}
              width="w-1/4"
            />
            <InputGroup
              label="Celular"
              name="celular"
              value={data.celular}
              onChange={handleChange}
              width="w-1/4"
            />
            <InputGroup
              label="Email"
              name="email"
              type="email"
              value={data.email}
              onChange={handleChange}
              width="w-1/3"
            />
            <InputGroup
              label="Dirección Residencia"
              name="residencia"
              value={data.residencia}
              onChange={handleChange}
              width="w-1/2"
            />
            <SelectGroup
              label="Zona Residencia"
              name="zonaResidencia"
              value={data.zonaResidencia}
              onChange={handleChange}
              options={["Urbana", "Rural", "Periurbana"]}
              width="w-1/4"
            />
            <SelectGroup
              label="Estrato"
              name="estrato"
              value={data.estrato}
              onChange={handleChange}
              options={["1", "2", "3", "4", "5", "6", "N/R"]}
              width="w-1/8 min-w-[80px]"
            />
            {/* Fila 5: Datos adicionales */}
            <SelectGroup
              label="Tipo Vivienda"
              name="tipoVivienda"
              value={data.tipoVivienda}
              onChange={handleChange}
              options={["Propia", "Arrendada", "Familiar", "Otro"]}
              width="w-1/4"
            />
            <InputGroup
              label="Personas a Cargo"
              name="numPersonasCargo"
              value={data.numPersonasCargo}
              onChange={handleChange}
              width="w-1/8 min-w-[90px]"
            />
            <InputGroup
              label="Grupo Sanguíneo"
              name="grupoSanguineo"
              value={data.grupoSanguineo}
              onChange={handleChange}
              width="w-1/8 min-w-[90px]"
              placeholder="Ej: O+"
            />
            <SelectGroup
              label="Grupo Étnico"
              name="grupoEtnico"
              value={data.grupoEtnico}
              onChange={handleChange}
              options={[
                "Mestizo",
                "Afrocolombiano",
                "Indígena",
                "Raizal",
                "Palenquero",
                "Gitano/Rrom",
                "Ninguno",
              ]}
              width="w-1/4"
            />
            <SelectGroup
              label="Identidad Género"
              name="identidadGenero"
              value={data.identidadGenero}
              onChange={handleChange}
              options={[
                "Cisgénero",
                "Transgénero",
                "No binario",
                "Prefiere no decir",
              ]}
              width="w-1/4"
            />
            {/* ══ B-10 Res. 1843/2025: Advertencia pruebas prohibidas como requisito laboral ══ */}
            {(data.tipoExamen === "INGRESO" ||
              data.tipoExamen === "PERIODICO") && (
              <div className="w-full mb-1 bg-amber-50 border border-amber-300 rounded-lg p-2 text-[10px] text-amber-800 print:hidden">
                <span className="font-black">⚠️ Res. 1843/2025 Art. 10:</span>{" "}
                Está <strong>prohibido</strong> ordenar prueba de embarazo, VIH
                o serología como requisito de ingreso o permanencia laboral. Si
                hay indicación clínica, documente justificación en el campo
                correspondiente.
              </div>
            )}
            <TextAreaGroup
              label="Motivo de Consulta *"
              name="motivoConsulta"
              value={data.motivoConsulta}
              onChange={handleChange}
              rows={2}
            />
            {/* NORMATIVO: Res. 1843/2025 Art. 9 y 13 - campos de incapacidad y ausencia */}
            {(data.tipoExamen === "POST-INCAPACIDAD" ||
              data.tipoExamen === "RETORNO-LABORAL") && (
              <div className="flex gap-2 flex-wrap">
                <InputGroup
                  label="Días de Incapacidad / Ausencia"
                  name="diasIncapacidad"
                  value={data.diasIncapacidad}
                  onChange={handleChange}
                  width="w-1/3 min-w-[120px]"
                  placeholder="Ej: 35"
                  type="number"
                />
                {data.tipoExamen === "RETORNO-LABORAL" && (
                  <InputGroup
                    label="Días Ausencia No Médica (Res.1843 Art.13)"
                    name="diasAusenciaNoMedica"
                    value={data.diasAusenciaNoMedica}
                    onChange={handleChange}
                    width="w-1/2 min-w-[200px]"
                    placeholder="Días ausencia por causas no médicas"
                  />
                )}
              </div>
            )}
            {/* ══ B-10 Res. 1843/2025 Art. 25 y 26 ══ */}
            <div className="w-full flex flex-wrap gap-2 mt-1 bg-green-50 border border-green-200 rounded-lg p-2">
              <div className="w-full text-[9px] font-black text-green-800 uppercase mb-1">
                ⚕️ Res. 1843/2025 - Campos obligatorios adicionales
              </div>
              <InputGroup
                label="Plazo implem. recomend. (días) Art.25"
                name="plazoImplementacionRecomendaciones"
                value={data.plazoImplementacionRecomendaciones || "20"}
                onChange={handleChange}
                width="w-1/4"
                placeholder="20"
              />
              <div className="flex flex-col justify-end w-1/2">
                <label className="text-[10px] font-black text-gray-700 uppercase mb-0.5">
                  Pausas Activas - Art.26
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                    <input
                      type="checkbox"
                      name="pausasActivasPrograma"
                      checked={!!data.pausasActivasPrograma}
                      onChange={handleChange}
                      className="accent-emerald-600"
                    />
                    Empresa tiene programa
                  </label>
                  <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                    <input
                      type="checkbox"
                      name="pausasActivasParticipa"
                      checked={!!data.pausasActivasParticipa}
                      onChange={handleChange}
                      className="accent-emerald-600"
                    />
                    Trabajador participa
                  </label>
                </div>
              </div>
            </div>
          </div>
          {/* ══ B-F1-01: FOTO DEL PACIENTE ══ */}
          <div className="w-full mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-[10px] font-black text-blue-800 uppercase mb-2">
              📷 Foto del Paciente (Opcional)
            </p>
            <div className="flex items-center gap-4">
              {data.fotoPaciente ? (
                <div className="relative">
                  <img
                    src={data.fotoPaciente}
                    alt="Foto paciente"
                    className="w-20 h-20 rounded-xl object-cover border-2 border-blue-300 shadow"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setData((p) => ({ ...p, fotoPaciente: null }))
                    }
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-blue-300 flex items-center justify-center bg-white">
                  <span className="text-2xl">📷</span>
                </div>
              )}
              <div>
                <label className="cursor-pointer">
                  <span className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-lg flex items-center gap-1 w-fit">
                    📁 {data.fotoPaciente ? "Cambiar foto" : "Subir foto"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        // Comprimir con canvas a max 200x200
                        const img = new window.Image();
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          const maxSize = 200;
                          const ratio = Math.min(
                            maxSize / img.width,
                            maxSize / img.height,
                            1
                          );
                          canvas.width = Math.round(img.width * ratio);
                          canvas.height = Math.round(img.height * ratio);
                          canvas
                            .getContext("2d")
                            .drawImage(img, 0, 0, canvas.width, canvas.height);
                          setData((p) => ({
                            ...p,
                            fotoPaciente: canvas.toDataURL("image/jpeg", 0.75),
                          }));
                        };
                        img.src = ev.target.result;
                      };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="text-[9px] text-blue-600 mt-1">
                  JPG/PNG · Se comprime a 200×200px · Se guarda en la HC
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* ── NORMATIVO: Res. 1843/2025 Art. 29 - PERFIL DEL CARGO (reemplaza profesiograma) ── */}
        <SectionTitle
          title="Perfil del Cargo - Res. 1843/2025 Art. 29"
          icon={Stethoscope}
          color="purple"
        />
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-2 print:bg-transparent print:border-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <TextAreaGroup
              label="Funciones y Tareas del Cargo *"
              name="perfilCargo_funciones"
              value={data.perfilCargo_funciones}
              onChange={handleChange}
              rows={2}
              placeholder="Describa las funciones principales del cargo..."
            />
            <TextAreaGroup
              label="Demandas Físicas del Cargo"
              name="perfilCargo_demandasFisicas"
              value={data.perfilCargo_demandasFisicas}
              onChange={handleChange}
              rows={2}
              placeholder="Ej: Trabajo en alturas, manejo de cargas >25kg, postura prolongada..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <TextAreaGroup
              label="Demandas Mentales / Psicosociales"
              name="perfilCargo_demandasMentales"
              value={data.perfilCargo_demandasMentales}
              onChange={handleChange}
              rows={2}
              placeholder="Ej: Alta concentración, atención al público, turnos nocturnos..."
            />
            <TextAreaGroup
              label="Factores de Riesgo Específicos del Cargo"
              name="perfilCargo_factoresRiesgo"
              value={data.perfilCargo_factoresRiesgo}
              onChange={handleChange}
              rows={2}
              placeholder="Ej: Ruido >85dB, exposición a químicos, radiación..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <InputGroup
              label="Nivel de Exposición"
              name="perfilCargo_nivelExposicion"
              value={data.perfilCargo_nivelExposicion}
              onChange={handleChange}
              placeholder="Ej: Alto, Medio, Bajo"
            />
            <InputGroup
              label="Tiempo Acumulado Exposición"
              name="perfilCargo_tiempoAcumulado"
              value={data.perfilCargo_tiempoAcumulado}
              onChange={handleChange}
              placeholder="Ej: 8h/día, 5 años"
            />
            <TextAreaGroup
              label="Medidas de Control Existentes"
              name="perfilCargo_medidasControl"
              value={data.perfilCargo_medidasControl}
              onChange={handleChange}
              rows={2}
              placeholder="EPP, controles ingenieriles, administrativos..."
            />
          </div>
          <p className="text-[9px] text-purple-500 mt-1 font-bold">
            ⚖️ Campo obligatorio Res. 1843/2025 Art. 29 - Reemplaza el
            profesiograma tradicional
          </p>
        </div>
        <SectionTitle
          title="Factores de Riesgo del Cargo"
          icon={ShieldCheck}
          color="orange"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-orange-50 p-2 rounded-lg border border-orange-100 mb-2 print:bg-transparent print:border-gray-300">
          {Object.keys(data.riesgos || {}).map((r) => (
            <label key={r} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={data.riesgos[r]}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    riesgos: { ...p.riesgos, [r]: e.target.checked },
                  }))
                }
                className="w-3 h-3 text-orange-600 rounded"
              />
              <span className="text-[10px] font-bold uppercase text-gray-700">
                {r}
              </span>
            </label>
          ))}
        </div>
        <div className="print-section-break" />
        <SectionTitle title="Antecedentes Personales" icon={History} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
          {Object.entries(data.antecedentesAgrupados || {}).map(
            ([key, value]) => (
              <div
                key={key}
                className={`p-1.5 border rounded text-[10px] ${
                  value.val
                    ? "bg-red-50 border-red-200"
                    : "bg-gray-50 border-gray-200"
                } print:bg-transparent print:border-gray-300`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-bold uppercase text-gray-700">
                    {key}
                  </span>
                  <div className="flex gap-2">
                    <label className="cursor-pointer flex items-center">
                      <input
                        type="radio"
                        checked={!value.val}
                        onChange={() =>
                          setData((p) => ({
                            ...p,
                            antecedentesAgrupados: {
                              ...p.antecedentesAgrupados,
                              [key]: {
                                ...p.antecedentesAgrupados[key],
                                val: false,
                              },
                            },
                          }))
                        }
                        className="mr-1 h-3 w-3"
                      />{" "}
                      No
                    </label>
                    <label className="cursor-pointer flex items-center text-red-600">
                      <input
                        type="radio"
                        checked={value.val}
                        onChange={() =>
                          setData((p) => ({
                            ...p,
                            antecedentesAgrupados: {
                              ...p.antecedentesAgrupados,
                              [key]: {
                                ...p.antecedentesAgrupados[key],
                                val: true,
                              },
                            },
                          }))
                        }
                        className="mr-1 h-3 w-3"
                      />{" "}
                      Sí
                    </label>
                  </div>
                </div>
                {value.val && (
                  <input
                    className="w-full p-0.5 border-b border-red-300 bg-transparent outline-none text-[9px]"
                    placeholder="Detalle..."
                    value={value.det}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        antecedentesAgrupados: {
                          ...p.antecedentesAgrupados,
                          [key]: {
                            ...p.antecedentesAgrupados[key],
                            det: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                )}
              </div>
            )
          )}
        </div>
        <SectionTitle title="Estilos de Vida" icon={Activity} />
        <div className="grid grid-cols-4 gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 mb-2 print:bg-transparent">
          {[
            { k: "fuma", l: "Cigarrillo" },
            { k: "alcohol", l: "Alcohol" },
            { k: "psicoactivas", l: "Psicoactivas" },
            { k: "deporte", l: "Ejercicio" },
          ].map((h) => (
            <div key={h.k}>
              <label className="text-[10px] font-bold mb-0.5 block">
                {h.l}
              </label>
              <select
                value={data.habitos?.[h.k] || "No"}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    habitos: { ...p.habitos, [h.k]: e.target.value },
                  }))
                }
                className="p-1 text-[10px] border rounded w-full print:border-none"
              >
                <option value="No">No</option>
                <option value="Si">Sí</option>
                {h.k !== "psicoactivas" && (
                  <option value="Ocasional">Ocasional</option>
                )}
              </select>
            </div>
          ))}
        </div>
        <div className="print-section-break" />
        <SectionTitle
          title="Signos Vitales y Antropometría"
          icon={Activity}
          color="blue"
        />
        <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 mb-2 print:bg-transparent">
          <div className="grid grid-cols-4 gap-1 mb-2">
            <InputGroup
              label="FC (lpm)"
              name="fc"
              value={data.fc}
              onChange={handleChange}
              alertInfo={analyzeHR(data.fc)}
            />
            <InputGroup
              label="FR (rpm)"
              name="fr"
              value={data.fr}
              onChange={handleChange}
            />
            <InputGroup
              label="T/A"
              name="ta"
              value={data.ta}
              onChange={handleChange}
              alertInfo={analyzeBP(data.ta)}
            />
            <InputGroup
              label="Temp. (°C)"
              name="temp"
              value={data.temp}
              onChange={handleChange}
            />
            <InputGroup
              label="Peso (kg)"
              name="peso"
              value={data.peso}
              onChange={handleChange}
              type="number"
            />
            <InputGroup
              label="Talla (cm)"
              name="talla"
              value={data.talla}
              onChange={handleChange}
              type="number"
            />
            <div className="mb-2 px-1.5 print:mb-1">
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">
                IMC
              </label>
              <div
                className={`w-full p-1.5 border rounded text-xs font-bold ${
                  analyzeBMI(data.imc)?.color || "text-gray-600 bg-gray-100"
                } print:bg-transparent print:border-none`}
              >
                {data.imc || "--"}
                {data.imc && analyzeBMI(data.imc) && (
                  <span className="ml-1 text-[9px]">
                    ({analyzeBMI(data.imc).text})
                  </span>
                )}
              </div>
            </div>
            <SelectGroup
              label="Lateralidad"
              name="lateralidad"
              value={data.lateralidad}
              onChange={handleChange}
              options={["Diestro", "Zurdo", "Ambidextro"]}
            />
          </div>
          <div className="flex gap-2 flex-wrap border-t border-blue-200 pt-2">
            <InputGroup
              label="Visión OD"
              name="av_od"
              value={data.agudezaVisual?.lejanaOD}
              onChange={(e) =>
                setData((p) => ({
                  ...p,
                  agudezaVisual: {
                    ...p.agudezaVisual,
                    lejanaOD: e.target.value,
                  },
                }))
              }
              width="w-1/5 min-w-[90px]"
            />
            <InputGroup
              label="Visión OI"
              name="av_oi"
              value={data.agudezaVisual?.lejanaOI}
              onChange={(e) =>
                setData((p) => ({
                  ...p,
                  agudezaVisual: {
                    ...p.agudezaVisual,
                    lejanaOI: e.target.value,
                  },
                }))
              }
              width="w-1/5 min-w-[90px]"
            />
            <div className="mb-2 flex items-end px-1.5 pb-1.5">
              <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.agudezaVisual?.correccion || false}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      agudezaVisual: {
                        ...p.agudezaVisual,
                        correccion: e.target.checked,
                      },
                    }))
                  }
                  className="w-3 h-3"
                />{" "}
                Usa Corrección
              </label>
            </div>
          </div>
        </div>
        <div className="print-section-break" />
        <SectionTitle title="Examen Físico por Sistemas" icon={Activity} />
        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 mb-2 print:bg-transparent">
          <div className="flex justify-end mb-2 no-print">
            <button
              type="button"
              onClick={() =>
                setData((p) => ({
                  ...p,
                  examenFisicoSistemas: Object.fromEntries(
                    Object.keys(p.examenFisicoSistemas || {}).map((sys) => [
                      sys,
                      {
                        estado: "Normal",
                        hallazgo: NORMAL_DESCRIPTIONS_SYSTEMS[sys] || "",
                      },
                    ])
                  ),
                }))
              }
              className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-1"
            >
              ✅ Todos Normal
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {Object.keys(data.examenFisicoSistemas || {}).map((sys) => (
              <div
                key={sys}
                className={`border-b border-gray-200 pb-1.5 print:border-gray-300 ${
                  data.examenFisicoSistemas[sys].estado === "Anormal"
                    ? "bg-red-50 rounded p-1"
                    : ""
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-700 uppercase">
                    {sys}
                  </span>
                  <div className="flex gap-3">
                    <label className="text-[10px] cursor-pointer flex items-center gap-1">
                      <input
                        type="radio"
                        checked={
                          data.examenFisicoSistemas[sys].estado === "Normal"
                        }
                        onChange={() =>
                          setData((p) => ({
                            ...p,
                            examenFisicoSistemas: {
                              ...p.examenFisicoSistemas,
                              [sys]: {
                                ...p.examenFisicoSistemas[sys],
                                estado: "Normal",
                                hallazgo:
                                  NORMAL_DESCRIPTIONS_SYSTEMS[sys] || "",
                              },
                            },
                          }))
                        }
                        className="text-emerald-600"
                      />
                      <span className="text-emerald-700 font-bold">Normal</span>
                    </label>
                    <label className="text-[10px] cursor-pointer flex items-center gap-1">
                      <input
                        type="radio"
                        checked={
                          data.examenFisicoSistemas[sys].estado === "Anormal"
                        }
                        onChange={() =>
                          setData((p) => ({
                            ...p,
                            examenFisicoSistemas: {
                              ...p.examenFisicoSistemas,
                              [sys]: {
                                ...p.examenFisicoSistemas[sys],
                                estado: "Anormal",
                                hallazgo: "",
                              },
                            },
                          }))
                        }
                        className="text-red-600"
                      />
                      <span className="text-red-600 font-bold">Anormal</span>
                    </label>
                  </div>
                </div>
                <p
                  className={`text-[9px] leading-relaxed ${
                    data.examenFisicoSistemas[sys].estado === "Anormal"
                      ? "hidden"
                      : ""
                  } text-gray-400 italic`}
                >
                  {NORMAL_DESCRIPTIONS_SYSTEMS[sys]}
                </p>
                {data.examenFisicoSistemas[sys].estado === "Anormal" && (
                  <textarea
                    rows={2}
                    className="w-full text-[10px] p-1 border border-red-300 rounded bg-white resize-none"
                    placeholder="Describa el hallazgo patológico..."
                    value={data.examenFisicoSistemas[sys].hallazgo}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        examenFisicoSistemas: {
                          ...p.examenFisicoSistemas,
                          [sys]: {
                            ...p.examenFisicoSistemas[sys],
                            hallazgo: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        {/* ══ BLOQUES ÉNFASIS ESPECIALIZADOS ══ */}
        {/* Énfasis Alturas */}
        {data.enfasisExamen === "ALTURAS" && (
          <div className="mt-2 border-2 border-sky-400 p-2 rounded-xl animate-fade-in mb-2">
            <h3 className="font-black text-sky-800 text-xs mb-2 uppercase text-center">
              Énfasis: Trabajo en Alturas (Res. 4272/2021)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {[
                { k: "romberg", l: "Romberg", opts: ["Normal", "Alterado"] },
                { k: "vertigo", l: "Vértigo", opts: ["Negativo", "Positivo"] },
                {
                  k: "coordinacion",
                  l: "Coordinación",
                  opts: ["Normal", "Alterada"],
                },
                {
                  k: "marcha",
                  l: "Marcha Tandem",
                  opts: ["Normal", "Alterada"],
                },
                {
                  k: "nistagmus",
                  l: "Nistagmus",
                  opts: ["Ausente", "Presente"],
                },
                {
                  k: "testMiedo",
                  l: "Test Miedo Alturas",
                  opts: ["Negativo", "Positivo"],
                },
              ].map((f) => (
                <div
                  key={f.k}
                  className="bg-white p-2 rounded border border-sky-100"
                >
                  <p className="font-bold text-[10px] mb-1">{f.l}</p>
                  <div className="flex gap-2">
                    {f.opts.map((o) => (
                      <label
                        key={o}
                        className={`cursor-pointer text-[10px] ${
                          o === "Positivo" ||
                          o === "Alterado" ||
                          o === "Alterada" ||
                          o === "Presente"
                            ? "text-red-600"
                            : "text-gray-700"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={data.examenAlturas?.[f.k] === o}
                          onChange={() =>
                            setData((p) => ({
                              ...p,
                              examenAlturas: { ...p.examenAlturas, [f.k]: o },
                            }))
                          }
                          className="mr-1"
                        />{" "}
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <input
              className="w-full text-xs p-1 border border-sky-300 rounded mt-2 outline-none"
              placeholder="Observaciones alturas..."
              value={data.examenAlturas?.observaciones || ""}
              onChange={(e) =>
                setData((p) => ({
                  ...p,
                  examenAlturas: {
                    ...p.examenAlturas,
                    observaciones: e.target.value,
                  },
                }))
              }
            />
          </div>
        )}
        {/* Énfasis Alimentos */}
        {data.enfasisExamen === "ALIMENTOS" && (
          <div className="mt-2 border-2 border-yellow-400 p-2 rounded-xl animate-fade-in mb-2">
            <h3 className="font-black text-yellow-800 text-xs mb-2 uppercase text-center">
              Énfasis: Manipulación de Alimentos (Res. 2674/2013)
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                {
                  k: "pielFaneras",
                  l: "Piel/Faneras",
                  opts: ["Normal", "Anormal"],
                },
                { k: "orl", l: "ORL", opts: ["Normal", "Anormal"] },
                {
                  k: "gastrointestinal",
                  l: "Gastrointestinal",
                  opts: ["Normal", "Anormal"],
                },
              ].map((f) => (
                <div
                  key={f.k}
                  className="bg-white p-2 rounded border border-yellow-100"
                >
                  <p className="font-bold text-[10px] mb-1">{f.l}</p>
                  <div className="flex gap-2">
                    {f.opts.map((o) => (
                      <label
                        key={o}
                        className={`cursor-pointer text-[10px] ${
                          o === "Anormal" ? "text-red-600" : "text-gray-700"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={data.examenAlimentos?.[f.k] === o}
                          onChange={() =>
                            setData((p) => ({
                              ...p,
                              examenAlimentos: {
                                ...p.examenAlimentos,
                                [f.k]: o,
                              },
                            }))
                          }
                          className="mr-1"
                        />{" "}
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Énfasis Espacios Confinados */}
        {data.enfasisExamen === "CONFINADOS" && (
          <div className="mt-2 border-2 border-orange-400 p-2 rounded-xl animate-fade-in mb-2">
            <h3 className="font-black text-orange-800 text-xs mb-1 uppercase text-center">
              Énfasis: Espacios Confinados (Res. 0491/2020 · NTC 5679)
            </h3>
            <p className="text-[9px] text-orange-600 text-center mb-2">
              Evaluación médica para ingreso y trabajo en espacios con riesgo de
              hipoxia, explosión o atrapamiento
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {[
                {
                  k: "cardiovascular",
                  l: "Sistema Cardiovascular",
                  desc: "FC, PA, ritmo. Descartar arritmias, HTA no controlada, cardiopatía isquémica.",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "respiratorio",
                  l: "Sistema Respiratorio",
                  desc: "FR, SpO2, auscultación pulmonar. Descartar EPOC, asma, restricción ventilatoria.",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "neurologico",
                  l: "Sistema Neurológico",
                  desc: "Nivel de conciencia, equilibrio, coordinación. Descartar epilepsia, vértigo crónico.",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "psicologico",
                  l: "Evaluación Psicológica",
                  desc: "Claustrofobia, manejo del estrés, reacciones ante confinamiento.",
                  opts: ["Apto", "No Apto"],
                },
                {
                  k: "otorrino",
                  l: "ORL / Oído",
                  desc: "Tímpanos íntegros, no sinusitis activa. Presión en espacios cerrados.",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "usoEpp",
                  l: "Capacidad uso EPP",
                  desc: "Tolerancia a equipo de respiración autónoma (SCBA), máscaras de aire.",
                  opts: ["Apto", "No Apto"],
                },
              ].map((f) => (
                <div
                  key={f.k}
                  className="bg-white p-2 rounded border border-orange-100"
                >
                  <p className="font-bold text-[10px] mb-0.5">{f.l}</p>
                  <p className="text-[9px] text-gray-400 mb-1 leading-tight">
                    {f.desc}
                  </p>
                  <div className="flex gap-2">
                    {f.opts.map((o) => (
                      <label
                        key={o}
                        className={
                          "cursor-pointer text-[10px] " +
                          (o === "Anormal" || o === "No Apto"
                            ? "text-red-600"
                            : "text-gray-700")
                        }
                      >
                        <input
                          type="radio"
                          checked={
                            (data.examenConfinados?.[f.k] || f.opts[0]) === o
                          }
                          onChange={() =>
                            setData((p) => ({
                              ...p,
                              examenConfinados: {
                                ...p.examenConfinados,
                                [f.k]: o,
                              },
                            }))
                          }
                          className="mr-1"
                        />{" "}
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] font-black text-orange-700 mb-1">
                  HALLAZGOS CARDIOPULMONARES
                </p>
                <textarea
                  rows={2}
                  value={data.examenConfinados?.hallazgosCardio || ""}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      examenConfinados: {
                        ...p.examenConfinados,
                        hallazgosCardio: e.target.value,
                      },
                    }))
                  }
                  className="w-full text-xs p-1 border border-orange-200 rounded outline-none resize-none"
                  placeholder="FC: __/min  PA: __/__mmHg  SpO2: __%  FR: __/min  Auscultación: ..."
                />
              </div>
              <div>
                <p className="text-[9px] font-black text-orange-700 mb-1">
                  OBSERVACIONES / RESTRICCIONES
                </p>
                <textarea
                  rows={2}
                  value={data.examenConfinados?.observaciones || ""}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      examenConfinados: {
                        ...p.examenConfinados,
                        observaciones: e.target.value,
                      },
                    }))
                  }
                  className="w-full text-xs p-1 border border-orange-200 rounded outline-none resize-none"
                  placeholder="Observaciones, restricciones específicas..."
                />
              </div>
            </div>
          </div>
        )}
        {/* Énfasis Osteomuscular */}
        {data.enfasisExamen === "OSTEOMUSCULAR" && (
          <div className="mt-2 border-2 border-violet-400 p-2 rounded-xl animate-fade-in mb-2">
            <h3 className="font-black text-violet-800 text-xs mb-1 uppercase text-center">
              Énfasis: Osteomuscular (Res. 1843/2025 · Res. 2404/2019)
            </h3>
            <p className="text-[9px] text-violet-600 text-center mb-2">
              Evaluación de riesgo biomecánico y desórdenes músculo-esqueléticos
              relacionados con el trabajo (DME)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mb-2">
              {[
                {
                  k: "columna",
                  l: "Columna Vertebral",
                  desc: "Inspección, palpación, movilidad cervical/lumbar/dorsal. Escoliosis, cifosis, lordosis patológica.",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "miembrosSup",
                  l: "Miembros Superiores",
                  desc: "Hombros, codos, muñecas, manos. Rangos de movimiento, trofismo, fuerza prensil.",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "miembrosInf",
                  l: "Miembros Inferiores",
                  desc: "Caderas, rodillas, tobillos, pies. Marcha, apoyo, alineación, varices.",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "muscular",
                  l: "Sistema Muscular",
                  desc: "Tono, trofismo, puntos gatillo, contracturas. Fuerza muscular segmentaria.",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "articular",
                  l: "Sistema Articular",
                  desc: "Tumefacción, calor, dolor articular. Signos inflamatorios activos.",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "postural",
                  l: "Evaluación Postural",
                  desc: "Postura estática y dinámica, compensaciones, dismetrías de miembros.",
                  opts: ["Normal", "Anormal"],
                },
              ].map((f) => (
                <div
                  key={f.k}
                  className="bg-white p-2 rounded border border-violet-100"
                >
                  <p className="font-bold text-[10px] mb-0.5">{f.l}</p>
                  <p className="text-[9px] text-gray-400 mb-1 leading-tight">
                    {f.desc}
                  </p>
                  <div className="flex gap-2">
                    {f.opts.map((o) => (
                      <label
                        key={o}
                        className={
                          "cursor-pointer text-[10px] " +
                          (o === "Anormal" ? "text-red-600" : "text-gray-700")
                        }
                      >
                        <input
                          type="radio"
                          checked={
                            (data.examenOsteomuscular?.[f.k] || "Normal") === o
                          }
                          onChange={() =>
                            setData((p) => ({
                              ...p,
                              examenOsteomuscular: {
                                ...p.examenOsteomuscular,
                                [f.k]: o,
                              },
                            }))
                          }
                          className="mr-1"
                        />{" "}
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] font-black text-violet-700 mb-1">
              MANIOBRAS ESPECIALES (Res. 2404/2019)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
              {[
                {
                  k: "phalen",
                  l: "Phalen",
                  desc: "STC muñeca",
                  pos: "Positivo",
                },
                {
                  k: "tinel",
                  l: "Tinel",
                  desc: "STC/cubital",
                  pos: "Positivo",
                },
                {
                  k: "finkelstein",
                  l: "Finkelstein",
                  desc: "De Quervain",
                  pos: "Positivo",
                },
                {
                  k: "jobe",
                  l: "Jobe / Arco doloroso",
                  desc: "Manguito rotador",
                  pos: "Positivo",
                },
                {
                  k: "lasegue",
                  l: "Lasègue",
                  desc: "Ciática L4-S1",
                  pos: "Positivo",
                },
                {
                  k: "adams",
                  l: "Adams",
                  desc: "Escoliosis funcional",
                  pos: "Positivo",
                },
                {
                  k: "schober",
                  l: "Schober",
                  desc: "Movilidad lumbar",
                  pos: "Positivo",
                },
                {
                  k: "wells",
                  l: "Wells",
                  desc: "TVP miembro inf.",
                  pos: "Positivo",
                },
              ].map((f) => (
                <div
                  key={f.k}
                  className="bg-white p-1.5 rounded border border-violet-100 flex items-center gap-2"
                >
                  <div className="flex-1">
                    <p className="font-bold text-[10px]">{f.l}</p>
                    <p className="text-[9px] text-gray-400">{f.desc}</p>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {["Negativo", "Positivo"].map((o) => (
                      <label
                        key={o}
                        className={
                          "cursor-pointer text-[9px] " +
                          (o === "Positivo" ? "text-red-600" : "text-gray-600")
                        }
                      >
                        <input
                          type="radio"
                          checked={
                            (data.maniobrasOsteomusculares?.[f.k]?.estado ||
                              "Negativo") === o
                          }
                          onChange={() =>
                            setData((p) => ({
                              ...p,
                              maniobrasOsteomusculares: {
                                ...p.maniobrasOsteomusculares,
                                [f.k]: {
                                  ...p.maniobrasOsteomusculares?.[f.k],
                                  estado: o,
                                },
                              },
                            }))
                          }
                          className="mr-0.5"
                        />{" "}
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] font-black text-violet-700 mb-1">
                  HALLAZGOS PRINCIPALES
                </p>
                <textarea
                  rows={2}
                  value={data.examenOsteomuscular?.hallazgos || ""}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      examenOsteomuscular: {
                        ...p.examenOsteomuscular,
                        hallazgos: e.target.value,
                      },
                    }))
                  }
                  className="w-full text-xs p-1 border border-violet-200 rounded outline-none resize-none"
                  placeholder="Describir hallazgos patológicos, localización, intensidad..."
                />
              </div>
              <div>
                <p className="text-[9px] font-black text-violet-700 mb-1">
                  DIAGNÓSTICO FUNCIONAL / RESTRICCIONES
                </p>
                <textarea
                  rows={2}
                  value={data.examenOsteomuscular?.diagnosticoFuncional || ""}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      examenOsteomuscular: {
                        ...p.examenOsteomuscular,
                        diagnosticoFuncional: e.target.value,
                      },
                    }))
                  }
                  className="w-full text-xs p-1 border border-violet-200 rounded outline-none resize-none"
                  placeholder="Ej: Síndrome del túnel carpiano bilateral. Restricción para vibración..."
                />
              </div>
            </div>
          </div>
        )}
        {/* Énfasis Corazón / Cardiovascular */}
        {data.enfasisExamen === "CORAZON" && (
          <div className="mt-2 border-2 border-rose-400 p-2 rounded-xl animate-fade-in mb-2">
            <h3 className="font-black text-rose-800 text-xs mb-1 uppercase text-center">
              Énfasis: Cardiovascular (Res. 1843/2025 · Res. 1843/2025)
            </h3>
            <p className="text-[9px] text-rose-600 text-center mb-2">
              Evaluación cardiovascular y metabólica para puestos de trabajo con
              demanda física o riesgo cardiovascular
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mb-2">
              {[
                {
                  k: "frecuenciaCardiaca",
                  l: "Frecuencia Cardiaca",
                  desc: "FC en reposo. Normal: 60-100 lpm. Taquicardia, bradicardia, arritmia.",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "presionArterial",
                  l: "Presión Arterial",
                  desc: "PA sistólica/diastólica. Normal: <130/80. HTA grado I/II/III (JNC-8).",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "ritmoyTonos",
                  l: "Ritmo y Tonos Cardiacos",
                  desc: "Ruidos cardiacos, soplos, S3, S4, frotes pericárdicos, thrill.",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "pulsos",
                  l: "Pulsos Periféricos",
                  desc: "Pulsos carotídeos, radiales, femorales, poplíteos, pedios. Simetría y amplitud.",
                  opts: ["Normal", "Anormal"],
                },
                {
                  k: "edemas",
                  l: "Edemas / Ingurgitación",
                  desc: "Edema de miembros, ingurgitación yugular, reflujo hepatoyugular.",
                  opts: ["Ausente", "Presente"],
                },
                {
                  k: "perfusionPeriferica",
                  l: "Perfusión Periférica",
                  desc: "Llenado capilar <2seg, temperatura distal, coloración, pulso capilar.",
                  opts: ["Normal", "Anormal"],
                },
              ].map((f) => (
                <div
                  key={f.k}
                  className="bg-white p-2 rounded border border-rose-100"
                >
                  <p className="font-bold text-[10px] mb-0.5">{f.l}</p>
                  <p className="text-[9px] text-gray-400 mb-1 leading-tight">
                    {f.desc}
                  </p>
                  <div className="flex gap-2">
                    {f.opts.map((o) => (
                      <label
                        key={o}
                        className={
                          "cursor-pointer text-[10px] " +
                          (o === "Anormal" || o === "Presente"
                            ? "text-red-600"
                            : "text-gray-700")
                        }
                      >
                        <input
                          type="radio"
                          checked={
                            (data.examenCorazon?.[f.k] || f.opts[0]) === o
                          }
                          onChange={() =>
                            setData((p) => ({
                              ...p,
                              examenCorazon: { ...p.examenCorazon, [f.k]: o },
                            }))
                          }
                          className="mr-1"
                        />{" "}
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
              <div className="bg-white p-2 rounded border border-rose-100">
                <p className="font-bold text-[10px] mb-1">
                  Signos Vitales Completos
                </p>
                <input
                  value={data.examenCorazon?.signosVitales || ""}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      examenCorazon: {
                        ...p.examenCorazon,
                        signosVitales: e.target.value,
                      },
                    }))
                  }
                  className="w-full text-[10px] p-1 border border-rose-200 rounded outline-none"
                  placeholder="FC:__ PA:__/__ SpO2:__% FR:__ T:__°C"
                />
              </div>
              <div className="bg-white p-2 rounded border border-rose-100">
                <p className="font-bold text-[10px] mb-1">
                  Índice de Masa Corporal
                </p>
                <input
                  value={data.examenCorazon?.imc || ""}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      examenCorazon: {
                        ...p.examenCorazon,
                        imc: e.target.value,
                      },
                    }))
                  }
                  className="w-full text-[10px] p-1 border border-rose-200 rounded outline-none"
                  placeholder="Peso:__kg Talla:__m IMC:__kg/m²"
                />
              </div>
              <div className="bg-white p-2 rounded border border-rose-100">
                <p className="font-bold text-[10px] mb-1">
                  Riesgo Cardiovascular
                </p>
                <select
                  value={data.examenCorazon?.riesgoCV || ""}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      examenCorazon: {
                        ...p.examenCorazon,
                        riesgoCV: e.target.value,
                      },
                    }))
                  }
                  className="w-full text-[10px] p-1 border border-rose-200 rounded outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  <option value="Bajo">Bajo (&lt;10% Framingham)</option>
                  <option value="Moderado">Moderado (10-20%)</option>
                  <option value="Alto">Alto (20-30%)</option>
                  <option value="Muy alto">Muy alto (&gt;30%)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] font-black text-rose-700 mb-1">
                  HALLAZGOS / SÍNTOMAS CARDIOVASCULARES
                </p>
                <textarea
                  rows={2}
                  value={data.examenCorazon?.hallazgos || ""}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      examenCorazon: {
                        ...p.examenCorazon,
                        hallazgos: e.target.value,
                      },
                    }))
                  }
                  className="w-full text-xs p-1 border border-rose-200 rounded outline-none resize-none"
                  placeholder="Ej: HTA grado I. Soplo sistólico I/VI en foco mitral. ECG: RS sin alteraciones..."
                />
              </div>
              <div>
                <p className="text-[9px] font-black text-rose-700 mb-1">
                  RESTRICCIONES / RECOMENDACIONES
                </p>
                <textarea
                  rows={2}
                  value={data.examenCorazon?.restricciones || ""}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      examenCorazon: {
                        ...p.examenCorazon,
                        restricciones: e.target.value,
                      },
                    }))
                  }
                  className="w-full text-xs p-1 border border-rose-200 rounded outline-none resize-none"
                  placeholder="Ej: No esfuerzo físico mayor >6 METs. Control cardiológico en 3 meses..."
                />
              </div>
            </div>
          </div>
        )}
        {/* Concepto y Recomendaciones */}
        <div className="print-section-break" />
        <SectionTitle
          title="Concepto Médico y Recomendaciones"
          icon={FileCheck}
        />
        <div className="bg-gradient-to-r from-emerald-50 to-white p-2 rounded-xl border border-emerald-200 shadow-sm">
          {/* Botones IA */}
          <div className="flex flex-wrap gap-2 mb-2 no-print">
            <button
              onClick={generateAIAnalysis}
              disabled={isGenerating}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}{" "}
              Análisis IA Completo
            </button>
            <button
              onClick={() => {
                // Pre-select default recommendations if none selected
                setData((p) => {
                  const existing = p.recomendacionesChecklist || {};
                  const hasAny = Object.values(existing).some(Boolean);
                  return hasAny
                    ? p
                    : {
                        ...p,
                        recomendacionesChecklist: {
                          ...DEFAULT_RECOMENDACIONES_SELECTED,
                        },
                      };
                });
                setShowRecomendacionesPanel(true);
              }}
              disabled={isGeneratingReco}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
            >
              {isGeneratingReco ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ClipboardList className="w-3.5 h-3.5" />
              )}{" "}
              Recomendaciones
            </button>
            <button
              onClick={() => {
                setShowRestriccionesPanel(true);
              }}
              disabled={isGeneratingRestr}
              className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-red-700 disabled:opacity-50 shadow-sm"
            >
              {isGeneratingRestr ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5" />
              )}{" "}
              Restricciones
            </button>
          </div>
          {/* NORMATIVO: CIE-10 activo + CIE-11 en transición - Res. 1442/2024 */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-black text-gray-700 uppercase">
                Diagnósticos CIE-10 - Escriba código o nombre para buscar
              </label>
              <span
                style={{
                  fontSize: "8px",
                  background: "#fef9c3",
                  border: "1px solid #f59e0b",
                  borderRadius: "4px",
                  padding: "1px 6px",
                  color: "#92400e",
                  fontWeight: "700",
                }}
              >
                CIE-11 en transición · Res. 1442/2024
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-emerald-700 mb-0.5 uppercase">
                  Principal *
                </label>
                <CIE10Input
                  name="diagnosticoPrincipal"
                  value={data.diagnosticoPrincipal}
                  onChange={(v) =>
                    setData((p) => ({ ...p, diagnosticoPrincipal: v }))
                  }
                  placeholder="Buscar: Z10.0, lumbalgia, túnel carpo..."
                  className="w-full p-1.5 border-2 border-emerald-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-400 outline-none bg-emerald-50"
                />
                {/* CIE-11 equivalencia automática - Res. 1442/2024 */}
                <CIE11Badge cie10value={data.diagnosticoPrincipal} />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-blue-600 mb-0.5 uppercase">
                  Secundario 1
                </label>
                <CIE10Input
                  name="diagnosticoSecundario1"
                  value={data.diagnosticoSecundario1}
                  onChange={(v) =>
                    setData((p) => ({ ...p, diagnosticoSecundario1: v }))
                  }
                  placeholder="Buscar diagnóstico secundario..."
                  className="w-full p-1.5 border border-blue-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-purple-600 mb-0.5 uppercase">
                  Secundario 2
                </label>
                <CIE10Input
                  name="diagnosticoSecundario2"
                  value={data.diagnosticoSecundario2}
                  onChange={(v) =>
                    setData((p) => ({ ...p, diagnosticoSecundario2: v }))
                  }
                  placeholder="Buscar diagnóstico secundario..."
                  className="w-full p-1.5 border border-purple-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 outline-none"
                />
              </div>
            </div>
          </div>
          <SelectGroup
            label="Concepto de Aptitud"
            name="conceptoAptitud"
            value={data.conceptoAptitud}
            onChange={handleChange}
            options={[
              "Sin restricciones de salud para que el trabajador continúe desempeñando la labor.",
              "Hallazgos clínicos que no interfieren para que el trabajador continúe desempeñando la labor.",
              "Con recomendaciones médico-laborales para que el trabajador continúe desempeñando la labor.",
              "Con restricciones laborales para que el trabajador continúe desempeñando la labor.",
              "Requiere reubicación laboral.",
              "Aplazado",
              "Egreso satisfactorio",
              "Egreso con hallazgos",
              "Periódico satisfactorio",
              "Periódico con hallazgos",
            ]}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <TextAreaGroup
              label="Recomendaciones"
              name="recomendaciones"
              value={data.recomendaciones}
              onChange={handleChange}
              rows={4}
            />
            <TextAreaGroup
              label="Restricciones Médico-Laborales"
              name="analisisRestricciones"
              value={data.analisisRestricciones}
              onChange={handleChange}
              rows={4}
            />
          </div>
          {/* ── ANÁLISIS CLÍNICO IA (campo independiente - Punto 10) ── */}
          {data.analisisIA && (
            <div className="mt-3">
              <label className="block text-[10px] font-black text-indigo-700 uppercase mb-1">
                🧠 Análisis Clínico <span className="ai-label-print-hide">(generado por IA — campo independiente)</span>
              </label>
              <textarea
                value={data.analisisIA || ""}
                onChange={(e) => setData(p => ({ ...p, analisisIA: e.target.value }))}
                rows={6}
                className="w-full p-3 border-2 border-indigo-200 rounded-xl text-xs bg-indigo-50/50 focus:border-indigo-400 focus:outline-none"
                placeholder="El análisis clínico se genera automáticamente al usar la IA. Puede editarlo manualmente."
                style={{ resize: "vertical" }}
              />
              <p className="text-[9px] text-indigo-400 mt-1">
                Este campo es independiente de Recomendaciones y Restricciones. Redactado con lenguaje técnico-formal de medicina laboral.
              </p>
            </div>
          )}
          {!data.analisisIA && (
            <div className="mt-3">
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                🧠 Análisis Clínico
              </label>
              <textarea
                value={data.analisisIA || ""}
                onChange={(e) => setData(p => ({ ...p, analisisIA: e.target.value }))}
                rows={3}
                className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:outline-none"
                placeholder="Se generará automáticamente con el análisis de IA, o puede escribirlo manualmente."
                style={{ resize: "vertical" }}
              />
            </div>
          )}
          {/* ── SVE - Sistema de Vigilancia Epidemiológica (Punto 9) ── */}
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <label className="block text-[10px] font-black text-amber-800 uppercase mb-2">
              🛡️ Sistema de Vigilancia Epidemiológica (SVE) <span className="ai-label-print-hide">— Sugerido por IA</span>
            </label>
            {(data.sveRecomendado || []).length > 0 ? (
              <div className="space-y-1.5">
                {(data.sveRecomendado || []).map((sve, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white border border-amber-100 rounded-lg px-3 py-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="flex-1 text-xs font-semibold text-gray-800">{sve}</span>
                    <button onClick={() => setData(p => ({ ...p, sveRecomendado: (p.sveRecomendado || []).filter((_, i) => i !== idx) }))} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-600 italic">Sin SVE sugerido. Se generará al ejecutar el análisis con IA.</p>
            )}
            <div className="flex gap-2 mt-2">
              <select
                id="sve-manual-select"
                className="flex-1 p-1.5 border border-amber-300 rounded-lg text-xs bg-white"
                defaultValue=""
              >
                <option value="" disabled>Agregar SVE manualmente...</option>
                <option>SVE Osteomuscular (Res. 2844/2007 — GATISO DME)</option>
                <option>SVE Dermatológico</option>
                <option>SVE Neurológico (riesgo por ruido — hipoacusia)</option>
                <option>SVE Psicosocial (Res. 2764/2022 — Batería riesgo psicosocial)</option>
                <option>SVE Visual</option>
                <option>SVE Respiratorio</option>
                <option>SVE Cardiovascular</option>
                <option>SVE Biológico</option>
                <option>SVE Químico</option>
              </select>
              <button
                onClick={() => {
                  const sel = document.getElementById("sve-manual-select");
                  if (sel && sel.value) {
                    setData(p => ({ ...p, sveRecomendado: [...(p.sveRecomendado || []), sel.value] }));
                    sel.value = "";
                  }
                }}
                className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-700"
              >
                + Agregar
              </button>
            </div>
          </div>
          <InputGroup
            label="Vigencia del Concepto ★"
            name="vigencia"
            value={data.vigencia}
            onChange={handleChange}
            width="w-1/3"
            required={true}
            placeholder="Ej: 1 año, 6 meses"
          />
        </div>
        {/* Firma impresión */}
        <div className="hidden print:flex mt-8 justify-between items-end px-4">
          <div className="text-center w-1/3">
            <div className="border-t border-gray-800 pt-1 text-[10px] font-bold">
              Firma del Trabajador
            </div>
          </div>
          <div className="text-center w-1/3">
            <DoctorSignature
              signature={activeSignature}
              data={activeDoctorData}
              showData={true}
            />
          </div>
        </div>
      </fieldset>
      {/* Datalists */}
      <datalist id="eps-list">
        {EPS_LIST.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="arl-list">
        {ARL_LIST.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="afp-list">
        {AFP_LIST.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="turno-list">
        {TURNO_LIST.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="contrato-list">
        {CONTRATO_LIST.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}
