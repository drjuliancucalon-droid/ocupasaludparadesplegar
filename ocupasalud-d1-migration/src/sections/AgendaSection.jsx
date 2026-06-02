import React from 'react';
import {
  LogOut,
  UserCheck,
} from 'lucide-react';
import PlanGate from '../components/ui/PlanGate';
import { _canUse, _secretariaPuede } from '../shared/data/planConfig';
import { getSpanishDate } from '../shared/lib/formatters';
import { initialOccupPatientState, initialGeneralPatientState } from '../shared/data/initialStates';
import { _sbSet } from '../shared/lib/supabase';

export default function AgendaSection({ ctx }) {
  const {
    _isAdmin,
    _sync,
    AgendaFieldF,
    agendaForm,
    agendaMesOffset,
    agendaRecurrenciaPeriodo,
    agendaRecurrente,
    agendaSemanaOffset,
    agendaSuggs,
    agendaTab,
    agendados,
    alertMsg,
    atencionesCerradas,
    companies,
    currentUser,
    goBack,
    goTo,
    p,
    parts,
    patientsList,
    setActiveTab,
    setAgendaForm,
    setAgendaMesOffset,
    setAgendaRecurrenciaPeriodo,
    setAgendaRecurrente,
    setAgendaSemanaOffset,
    setAgendaSuggs,
    setAgendaTab,
    setAgendados,
    setData,
    setDataType,
    setHcChoiceAgenda,
    setView,
    showAlert,
    showConfirm,
    tel,
    u,
    usersList,
  } = ctx;

    if (!_canUse("agenda", currentUser))
      return (
        <div className="min-h-screen bg-gray-50 font-sans">
          {/* navbar rendered by App.jsx */}
          <div className="max-w-2xl mx-auto px-4 py-12">
            <PlanGate
              feature="agenda"
              requiredPlan="starter"
              currentUser={currentUser}
            />
            <div className="mt-4 text-center">
              <button
                onClick={() => goBack()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Volver
              </button>
            </div>
          </div>
        </div>
      );
    // ── SECRETARIA GATE: "Agenda del Día" requiere autorización del admin ──
    if (
      currentUser?.role === "secretaria" &&
      !_secretariaPuede("agenda", currentUser, usersList)
    )
      return (
        <div className="min-h-screen bg-gray-50 font-sans">
          {/* navbar rendered by App.jsx */}
          <div className="max-w-xl mx-auto px-4 py-16 text-center">
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 space-y-3">
              <div className="text-5xl">🔐</div>
              <p className="font-black text-amber-800 text-xl">
                Módulo restringido
              </p>
              <p className="text-amber-700 text-sm font-bold">Agenda del Día</p>
              <p className="text-amber-600 text-xs leading-relaxed">
                Este módulo requiere autorización explícita del administrador.
                <br />
                Solicita que habilite el permiso{" "}
                <strong>"Agenda del Día"</strong> en tu perfil.
                <br />
                (Usuarios → tu nombre → 🔐 Permisos de secretaria)
              </p>
              <button
                onClick={() => goBack()}
                className="mt-3 bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 transition"
              >
                ← Volver al panel
              </button>
            </div>
          </div>
        </div>
      );
    const isAdminOrSec = [
      "administrador",
      "secretaria",
      "admin_empresa",
    ].includes(currentUser?.role);
    const today = new Date().toISOString().split("T")[0];
    // ── IPS: scope agenda to empresa if applicable ──
    const _agendaEmpresaId = currentUser?.empresaId || null;
    // ── Duración por tipo de consulta ──────────────────────────────
    const DURACION = {
      ingreso: 20,
      egreso: 20,
      periodico: 20,
      seguimiento: 40,
      post_incapacidad: 40,
    };
    const TIPOS_CONSULTA = [
      { v: "ingreso", l: "Ingreso", mins: 20 },
      { v: "egreso", l: "Egreso", mins: 20 },
      { v: "periodico", l: "Periódico", mins: 20 },
      { v: "seguimiento", l: "Seguimiento", mins: 40 },
      { v: "post_incapacidad", l: "Post-Incapacidad", mins: 40 },
    ];
    // ── Helpers de hora ────────────────────────────────────────────
    const addMins = (hhmm, mins) => {
      const [m] = hhmm.split(":").map(Number);
      const total = h * 60 + m + mins;
      return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(
        total % 60
      ).padStart(2, "0")}`;
    };
    const horaActual = () =>
      new Date()
        .toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(".", ":");
    const nowISO = () => new Date().toISOString();
    // ── Filtrar agenda por fecha y usuario ─────────────────────────
    const filterAgenda = (fecha) =>
      agendados
        .filter((a) => {
          if (a.fecha !== fecha) return false;
          // IPS: si el usuario pertenece a empresa, filtrar por empresa
          if (_agendaEmpresaId)
            return (
              a.empresaId === _agendaEmpresaId ||
              a.medicoEmpresaId === _agendaEmpresaId
            );
          if (isAdminOrSec) return true;
          return a.medicoId === currentUser?.user;
        })
        .sort(
          (a, b) =>
            a.horaCita?.localeCompare(b.horaCita) ||
            a.hora?.localeCompare(b.hora)
        );
    const miAgendaHoy = filterAgenda(today);
    const enEspera = miAgendaHoy.filter((a) => a.estado === "espera");
    const atendiendo = miAgendaHoy.filter((a) => a.estado === "atendiendo");
    const atendidos = miAgendaHoy.filter((a) => a.estado === "atendido");
    // Próximas citas (fechas futuras)
    const proximas = agendados
      .filter((a) => {
        if (a.fecha <= today) return false;
        // IPS: scope by empresa
        if (_agendaEmpresaId)
          return (
            a.empresaId === _agendaEmpresaId ||
            a.medicoEmpresaId === _agendaEmpresaId
          );
        if (isAdminOrSec) return true;
        return a.medicoId === currentUser?.user;
      })
      .sort(
        (a, b) =>
          a.fecha.localeCompare(b.fecha) ||
          a.horaCita?.localeCompare(b.horaCita)
      );
    // ── Guardar agendados ──────────────────────────────────────────
    const saveAgendados = (upd) => {
      setAgendados(upd);
      // PASO 6: clave aislada por empresa/usuario
      const _agSuf = currentUser?.empresaId
        ? "empresa_" + currentUser.empresaId
        : currentUser?.user || "shared";
      _sync(`siso_agendados_${_agSuf}`, JSON.stringify(upd));
      _sbSet(`siso_agendados_${_agSuf}`, upd);
    };
    // ── Autocompletar desde pacientes existentes ───────────────────
    const handleBusqueda = (val) => {
      setAgendaForm((p) => ({ ...p, nombre: val, _busquedaQuery: val }));
      if (val.length < 2) {
        setAgendaSuggs([]);
        return;
      }
      const q = val.toLowerCase();
      let _agendaSearchBase = patientsList;
      // IPS: scope patient search to empresa
      if (_agendaEmpresaId) {
        const _asEmp = companies.find((c) => c.id === _agendaEmpresaId);
        _agendaSearchBase = patientsList.filter(
          (p) =>
            p.empresaId === _agendaEmpresaId ||
            (_asEmp && p.empresaNit === _asEmp.nit)
        );
      }
      // SECRETARIA: busca en pacientes de TODOS los médicos asignados
      if (currentUser?.role === "secretaria") {
        const secU = usersList.find(u => u.user === currentUser.user);
        const asig = secU?.medicosAsignados || [];
        if (asig.length > 0) {
          _agendaSearchBase = patientsList.filter(p => !p._medicoId || asig.includes(p._medicoId));
        } else {
          _agendaSearchBase = patientsList;
        }
      }
      const found = _agendaSearchBase
        .filter(
          (p) =>
            p.nombres?.toLowerCase().includes(q) ||
            p.docNumero?.toLowerCase().includes(q) ||
            p.celular?.toLowerCase().includes(q)
        )
        .slice(0, 8);
      setAgendaSuggs(found);
    };
    const seleccionarPaciente = (p) => {
      setAgendaForm((prev) => ({
        ...prev,
        nombre: p.nombres || "",
        docTipo: p.docTipo || "CC",
        docNumero: p.docNumero || "",
        fechaNacimiento: p.fechaNacimiento || "",
        edad: p.edad || "",
        genero: p.genero || "",
        estadoCivil: p.estadoCivil || "",
        escolaridad: p.escolaridad || "",
        grupoSanguineo: p.grupoSanguineo || "",
        grupoEtnico: p.grupoEtnico || "",
        identidadGenero: p.identidadGenero || "",
        celular: p.celular || "",
        telefono: p.telefono || "",
        email: p.email || "",
        residencia: p.residencia || "",
        zonaResidencia: p.zonaResidencia || "",
        estrato: p.estrato || "",
        tipoVivienda: p.tipoVivienda || "",
        numPersonasCargo: p.numPersonasCargo || "",
        eps: p.eps || "",
        arl: p.arl || "",
        afp: p.afp || "",
        nivelRiesgoARL: p.nivelRiesgoARL || "",
        empresa:
          p.empresa ||
          companies.find((c) => c.id === p.companyId)?.nombre ||
          "",
        cargo: p.cargo || "",
        dependencia: p.dependencia || "",
        tipoContrato: p.tipoContrato || "",
        turnoTrabajo: p.turnoTrabajo || "",
        antiguedadEmpresa: p.antiguedadEmpresa || "",
        _busquedaQuery: p.nombres || "",
      }));
      setAgendaSuggs([]);
    };
    // ── Calcular edad automática (FIX: timezone-safe) ─────────────
    const calcEdad = (fNac) => {
      if (!fNac) return "";
      // Parsear como fecha local para evitar desfase UTC
      const parts = String(fNac).split("-");
      if (parts.length !== 3) return "";
      const nacY = parseInt(parts[0], 10);
      const nacM = parseInt(parts[1], 10) - 1;
      const nacD = parseInt(parts[2], 10);
      if (isNaN(nacY) || isNaN(nacM) || isNaN(nacD)) return "";
      const hoy = new Date();
      let edad = hoy.getFullYear() - nacY;
      const mDiff = hoy.getMonth() - nacM;
      if (mDiff < 0 || (mDiff === 0 && hoy.getDate() < nacD)) edad--;
      if (edad < 0) edad = 0;
      return String(edad);
    };
    // ── Registrar / Agendar paciente ───────────────────────────────
    const registrarPaciente = () => {
      if (!agendaForm.nombre.trim()) {
        showAlert("Ingrese el nombre del paciente.");
        return;
      }
      if (!agendaForm.medicoId) {
        showAlert("Seleccione el médico asignado.");
        return;
      }
      const fechaCita = agendaForm.fechaCita || today;
      const horaCita = agendaForm.horaCita || horaActual();
      const duracion = DURACION[agendaForm.tipoConsulta] || 20;
      const horaFin = addMins(horaCita, duracion);
      // ── Bloqueo de horarios superpuestos ──
      const overlap = agendados.some(function (a) {
        return a.medicoId === agendaForm.medicoId && a.fecha === fechaCita && a.horaCita === horaCita && a.estado !== "atendido";
      });
      if (overlap) {
        showAlert("⚠️ Ya existe una cita para este médico a las " + horaCita + ". Elija otro horario.");
        return;
      }
      const esHoy = fechaCita === today;
      const nuevo = {
        id: "ag_" + Date.now(),
        // Identificación
        nombre: agendaForm.nombre.trim(),
        docTipo: agendaForm.docTipo,
        docNumero: agendaForm.docNumero.trim(),
        // Sociodemográficos
        fechaNacimiento: agendaForm.fechaNacimiento,
        edad: agendaForm.edad || calcEdad(agendaForm.fechaNacimiento),
        genero: agendaForm.genero,
        estadoCivil: agendaForm.estadoCivil,
        escolaridad: agendaForm.escolaridad,
        grupoSanguineo: agendaForm.grupoSanguineo,
        grupoEtnico: agendaForm.grupoEtnico,
        identidadGenero: agendaForm.identidadGenero,
        // Contacto
        celular: agendaForm.celular,
        telefono: agendaForm.telefono,
        email: agendaForm.email,
        residencia: agendaForm.residencia,
        zonaResidencia: agendaForm.zonaResidencia,
        estrato: agendaForm.estrato,
        tipoVivienda: agendaForm.tipoVivienda,
        numPersonasCargo: agendaForm.numPersonasCargo,
        // Afiliaciones
        eps: agendaForm.eps,
        arl: agendaForm.arl,
        afp: agendaForm.afp,
        nivelRiesgoARL: agendaForm.nivelRiesgoARL,
        // Laboral
        empresa: agendaForm.empresa,
        cargo: agendaForm.cargo,
        dependencia: agendaForm.dependencia,
        tipoContrato: agendaForm.tipoContrato,
        turnoTrabajo: agendaForm.turnoTrabajo,
        antiguedadEmpresa: agendaForm.antiguedadEmpresa,
        // Agenda
        medicoId: agendaForm.medicoId,
        medicoNombre:
          usersList.find((u) => u.user === agendaForm.medicoId)?.name ||
          agendaForm.medicoId,
        tipoConsulta: agendaForm.tipoConsulta,
        fecha: fechaCita,
        horaCita,
        horaFinCita: horaFin,
        duracion,
        hora: horaCita,
        observacion: agendaForm.observacion,
        estado: esHoy ? "espera" : "programado",
        registradoPor: currentUser?.user,
        registradoEn: nowISO(),
        // ── IPS: auto-tag con empresaId ──
        ...(currentUser?.empresaId
          ? {
              empresaId: currentUser.empresaId,
              medicoEmpresaId: currentUser.empresaId,
            }
          : {}),
      };
      // ── Citas recurrentes ──
      var allNew = [nuevo];
      if (agendaRecurrente) {
        var mesesAdd = agendaRecurrenciaPeriodo === "3m" ? 3 : agendaRecurrenciaPeriodo === "6m" ? 6 : 12;
        var fechaFutura = new Date(fechaCita + "T12:00:00");
        fechaFutura.setMonth(fechaFutura.getMonth() + mesesAdd);
        var fechaFuturaStr = fechaFutura.toISOString().split("T")[0];
        var recurrenteNuevo = Object.assign({}, nuevo, {
          id: "ag_" + (Date.now() + 1),
          fecha: fechaFuturaStr,
          estado: "programado",
          observacion: (nuevo.observacion ? nuevo.observacion + " | " : "") + "Control periodico (" + (mesesAdd === 3 ? "3 meses" : mesesAdd === 6 ? "6 meses" : "1 año") + ")",
          registradoEn: nowISO(),
        });
        allNew.push(recurrenteNuevo);
      }
      saveAgendados(agendados.concat(allNew));
      setAgendaRecurrente(false);
      setAgendaRecurrenciaPeriodo("3m");
      setAgendaForm((p) => ({
        ...p,
        nombre: "",
        docTipo: "CC",
        docNumero: "",
        fechaNacimiento: "",
        edad: "",
        genero: "",
        estadoCivil: "",
        escolaridad: "",
        grupoSanguineo: "",
        grupoEtnico: "",
        identidadGenero: "",
        celular: "",
        telefono: "",
        email: "",
        residencia: "",
        zonaResidencia: "",
        estrato: "",
        tipoVivienda: "",
        numPersonasCargo: "",
        eps: "",
        arl: "",
        afp: "",
        nivelRiesgoARL: "",
        empresa: "",
        cargo: "",
        dependencia: "",
        tipoContrato: "",
        turnoTrabajo: "",
        antiguedadEmpresa: "",
        fechaCita: "",
        horaCita: "",
        observacion: "",
        _busquedaQuery: "",
      }));
      setAgendaSuggs([]);
      setAgendaTab("hoy");
      var alertMsg = esHoy ? "Paciente en sala de espera" : "Cita programada para " + fechaCita + " a las " + horaCita;
      alertMsg += ".\nMédico: " + nuevo.medicoNombre + " · Duración: " + duracion + " min";
      if (agendaRecurrente) {
        var mesesLabel = agendaRecurrenciaPeriodo === "3m" ? "3 meses" : agendaRecurrenciaPeriodo === "6m" ? "6 meses" : "1 año";
        alertMsg += "\n🔄 Control periódico programado en " + mesesLabel;
      }
      showAlert("✅ " + alertMsg);
    };
    // ── Iniciar atención ───────────────────────────────────────────
    const iniciarAtencion = (ag) => {
      const upd = agendados.map((a) =>
        a.id === ag.id
          ? { ...a, estado: "atendiendo", horaInicio: horaActual() }
          : a
      );
      saveAgendados(upd);
      // Mostrar modal de elección de tipo de HC
      setHcChoiceAgenda(ag);
    };
    const abrirHCDesdeAgenda = (ag, tipo) => {
      const newId = "pac_" + Date.now();
      if (tipo === "ocupacional") {
        setData({
          ...initialOccupPatientState,
          id: newId,
          _medicoId: ag.medicoId,
          nombres: ag.nombre,
          docTipo: ag.docTipo,
          docNumero: ag.docNumero,
          fechaNacimiento: ag.fechaNacimiento,
          edad: ag.edad,
          genero: ag.genero,
          estadoCivil: ag.estadoCivil,
          escolaridad: ag.escolaridad,
          celular: ag.celular,
          telefono: ag.telefono,
          email: ag.email,
          residencia: ag.residencia,
          zonaResidencia: ag.zonaResidencia,
          estrato: ag.estrato,
          eps: ag.eps,
          arl: ag.arl,
          afp: ag.afp,
          nivelRiesgoARL: ag.nivelRiesgoARL,
          cargo: ag.cargo,
          dependencia: ag.dependencia,
          tipoContrato: ag.tipoContrato,
          turnoTrabajo: ag.turnoTrabajo,
          antiguedadEmpresa: ag.antiguedadEmpresa,
          grupoSanguineo: ag.grupoSanguineo,
          motivoConsulta: ag.tipoConsulta || "",
          _agendaId: ag.id,
        });
        setDataType("ocupacional");
        setActiveTab("form");
      } else {
        setData({
          ...initialGeneralPatientState,
          id: newId,
          _medicoId: ag.medicoId,
          nombres: ag.nombre,
          docTipo: ag.docTipo,
          docNumero: ag.docNumero,
          fechaNacimiento: ag.fechaNacimiento,
          edad: ag.edad,
          genero: ag.genero,
          celular: ag.celular,
          telefono: ag.telefono,
          email: ag.email,
          residencia: ag.residencia,
          eps: ag.eps,
          arl: ag.arl,
          cargo: ag.cargo,
          _agendaId: ag.id,
        });
        setDataType("general");
        setActiveTab("formGeneral");
      }
      setHcChoiceAgenda(null);
      setView("historia");
    };
    const marcarAtendido = (agId) => {
      const upd = agendados.map((a) =>
        a.id === agId ? { ...a, estado: "atendido", horaFin: horaActual() } : a
      );
      saveAgendados(upd);
    };
    const eliminarCita = (agId) => {
      showConfirm("¿Eliminar esta cita programada?", () =>
        saveAgendados(agendados.filter((a) => a.id !== agId))
      );
    };
    const medicosDisp = usersList.filter(
      (u) =>
        ["medico", "administrador", "super_admin", "admin_empresa"].includes(
          u.role
        ) &&
        u.activo !== false &&
        // IPS: scope doctor list to empresa
        (_agendaEmpresaId
          ? u.empresaId === _agendaEmpresaId ||
            (u.role === "admin_empresa" && u.empresaId === _agendaEmpresaId)
          : true)
    );
    // ── Input helper: AgendaFieldF definida a nivel módulo ──
    // ── Badge estado ──────────────────────────────────────────────
    const EstadoBadge = ({ ag }) => {
      const map = {
        espera: "bg-yellow-100 text-yellow-800 border-yellow-300",
        atendiendo: "bg-blue-100 text-blue-800 border-blue-300",
        atendido: "bg-emerald-100 text-emerald-800 border-emerald-300",
        programado: "bg-purple-100 text-purple-800 border-purple-300",
      };
      const icons = {
        espera: "⏳",
        atendiendo: "🔵",
        atendido: "✅",
        programado: "📅",
      };
      const labels = {
        espera: "En espera",
        atendiendo: "Atendiendo",
        atendido: "Visto ✓",
        programado: "Programado",
      };
      return (
        <span
          className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
            map[ag.estado] || map.espera
          }`}
        >
          {icons[ag.estado]} {labels[ag.estado]}
          {ag.estado === "atendido" && ag.horaFin ? " · " + ag.horaFin : ""}
        </span>
      );
    };
    const TipoConsultaBadge = ({ tipo }) => {
      const duracion = DURACION[tipo] || 20;
      const colors = {
        ingreso: "blue",
        egreso: "orange",
        periodico: "teal",
        seguimiento: "purple",
        post_incapacidad: "red",
      };
      const c = colors[tipo] || "gray";
      return (
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-${c}-50 text-${c}-700 border border-${c}-200`}
        >
          {tipo?.replace("_", " ")} · {duracion}min
        </span>
      );
    };
    // ── Tarjeta de paciente agendado ──────────────────────────────
    const CardPaciente = ({ ag, idx, showFecha = false }) => (
      <div
        className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition ${
          ag.estado === "atendido" ? "bg-emerald-50/40" : ""
        }`}
      >
        {ag.estado === "espera" && (
          <div className="w-7 h-7 bg-yellow-100 rounded-full flex items-center justify-center font-black text-yellow-700 text-sm flex-shrink-0 mt-0.5">
            {idx + 1}
          </div>
        )}
        {ag.estado === "atendiendo" && (
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse flex-shrink-0 mt-2" />
        )}
        {ag.estado === "atendido" && (
          <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ring-2 ring-emerald-400">
            <span className="text-sm">✅</span>
          </div>
        )}
        {ag.estado === "programado" && (
          <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs">📅</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={`font-bold text-sm ${
                ag.estado === "atendido"
                  ? "line-through text-gray-400"
                  : "text-gray-800"
              }`}
            >
              {ag.nombre}
            </p>
            <TipoConsultaBadge tipo={ag.tipoConsulta} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            <p className="text-[10px] text-gray-400">
              {ag.docTipo}: {ag.docNumero || "-"}
            </p>
            {ag.edad && (
              <p className="text-[10px] text-gray-400">
                {ag.edad} años · {ag.genero || "-"}
              </p>
            )}
            {ag.eps && (
              <p className="text-[10px] text-gray-400">EPS: {ag.eps}</p>
            )}
            {ag.cargo && (
              <p className="text-[10px] text-gray-400">Cargo: {ag.cargo}</p>
            )}
            {showFecha ? (
              <p className="text-[10px] font-bold text-purple-600">
                📅 {ag.fecha} {ag.horaCita} - {ag.horaFinCita}
              </p>
            ) : (
              <p className="text-[10px] text-gray-400">
                🕐 {ag.horaCita || ag.hora} - {ag.horaFinCita || "-"}
              </p>
            )}
            {isAdminOrSec && ag.medicoNombre && (
              <p className="text-[10px] text-blue-500">👨‍⚕️ {ag.medicoNombre}</p>
            )}
            {ag.estado === "atendido" && ag.horaFin && (
              <p className="text-[10px] font-bold text-emerald-600">
                ✔ Visto a las {ag.horaFin}
              </p>
            )}
          </div>
          {ag.observacion && (
            <p className="text-[10px] text-indigo-500 italic mt-0.5">
              {ag.observacion}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {ag.estado === "espera" &&
            (currentUser?.user === ag.medicoId ||
              _isAdmin(currentUser?.role)) && (
              <button
                onClick={() => iniciarAtencion(ag)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-blue-700 whitespace-nowrap"
              >
                ▶ Iniciar
              </button>
            )}
          {ag.estado === "atendiendo" && isAdminOrSec && (
            <button
              onClick={() => marcarAtendido(ag.id)}
              className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-emerald-700"
            >
              ✅ Atendido
            </button>
          )}
          {ag.estado === "programado" && isAdminOrSec && (
            <button
              onClick={() => eliminarCita(ag.id)}
              className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-red-100"
            >
              {"🗑"}
            </button>
          )}
          {(ag.estado === "programado" || ag.estado === "espera") && ag.celular && (
            <a
              href={"https://wa.me/" + (ag.celular || "").replace(/\D/g, "") + "?text=" + encodeURIComponent("Recordatorio: Tiene cita medica ocupacional el " + ag.fecha + " a las " + ag.horaCita + " con el Dr. " + ag.medicoNombre + ". Por favor llegue 10 minutos antes.")}
              target="_blank"
              rel="noreferrer"
              className="text-green-600 hover:text-green-700 text-[10px] font-bold bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg transition"
            >
              {"📱 WhatsApp"}
            </a>
          )}
          <EstadoBadge ag={ag} />
        </div>
      </div>
    );
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* navbar rendered by App.jsx */}
        <div className="max-w-7xl mx-auto p-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-black text-gray-800">🗓️ Agenda</h2>
              <p className="text-sm text-gray-500">{getSpanishDate(null)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goTo("asistencia")}
                className="text-blue-700 border border-blue-300 bg-blue-50 hover:bg-blue-100 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                📊 Reporte asistencia
              </button>
              <button
                onClick={() => goTo("dashboard")}
                className="text-gray-500 font-bold text-sm flex items-center gap-1 hover:text-gray-700"
              >
                <LogOut className="rotate-180 w-4 h-4" /> Volver
              </button>
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { l: "En espera", v: enEspera.length, c: "yellow", e: "⏳" },
              { l: "Atendiendo", v: atendiendo.length, c: "blue", e: "🔵" },
              { l: "Atendidos", v: atendidos.length, c: "emerald", e: "✅" },
              { l: "Programadas", v: proximas.length, c: "purple", e: "📅" },
            ].map((s) => (
              <div
                key={s.l}
                className={`bg-white rounded-xl p-3 shadow-sm border border-${s.c}-100 flex items-center gap-3`}
              >
                <span className="text-xl">{s.e}</span>
                <div>
                  <p className={`text-2xl font-black text-${s.c}-700`}>{s.v}</p>
                  <p className="text-[10px] text-gray-500 font-bold">{s.l}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-white rounded-xl shadow-sm border border-gray-100 p-1 w-fit flex-wrap">
            {[
              { k: "hoy", l: "📋 Hoy (" + miAgendaHoy.length + ")" },
              { k: "proximas", l: "📅 Próximas (" + proximas.length + ")" },
              { k: "semanal", l: "📅 Semanal" },
              { k: "mensual", l: "📊 Mensual" },
            ].concat(isAdminOrSec ? [{ k: "nueva", l: "➕ Nueva Cita" }] : []).map(function (t) {
              return (
                <button
                  key={t.k}
                  onClick={function () { setAgendaTab(t.k); }}
                  className={"px-4 py-2 rounded-lg text-xs font-black transition " + (agendaTab === t.k ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100")}
                >
                  {t.l}
                </button>
              );
            })}
          </div>
          <div
            className={`grid gap-6 ${
              isAdminOrSec && agendaTab === "nueva"
                ? "grid-cols-1"
                : "grid-cols-1"
            }`}
          >
            {/* ─── TAB: HOY ─────────────────────────────────────── */}
            {agendaTab === "hoy" && (
              <div className="space-y-4">
                {enEspera.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 overflow-hidden">
                    <div className="bg-yellow-50 px-5 py-2.5 border-b border-yellow-100">
                      <p className="text-sm font-black text-yellow-800">
                        ⏳ En Espera ({enEspera.length})
                      </p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {enEspera.map((ag, i) => (
                        <CardPaciente key={ag.id} ag={ag} idx={i} />
                      ))}
                    </div>
                  </div>
                )}
                {atendiendo.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                    <div className="bg-blue-50 px-5 py-2.5 border-b border-blue-100">
                      <p className="text-sm font-black text-blue-800">
                        🔵 En Atención ({atendiendo.length})
                      </p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {atendiendo.map((ag, i) => (
                        <CardPaciente key={ag.id} ag={ag} idx={i} />
                      ))}
                    </div>
                  </div>
                )}
                {atendidos.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                    <div className="bg-emerald-50 px-5 py-2.5 border-b border-emerald-100">
                      <p className="text-sm font-black text-emerald-800">
                        ✅ Atendidos hoy ({atendidos.length})
                      </p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {atendidos.map((ag, i) => (
                        <CardPaciente key={ag.id} ag={ag} idx={i} />
                      ))}
                    </div>
                  </div>
                )}
                {/* ── ATENCIONES RECIENTES (desde agenda) ───────────── */}
                {(() => {
                  const misAtenciones = atencionesCerradas
                    .filter((ac) =>
                      isAdminOrSec ? true : ac.medicoId === currentUser?.user
                    )
                    .slice(0, 20);
                  if (misAtenciones.length === 0) return null;
                  return (
                    <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
                      <div className="bg-violet-50 px-5 py-2.5 border-b border-violet-100 flex justify-between items-center">
                        <p className="text-sm font-black text-violet-800">
                          🕐 Atenciones Recientes ({misAtenciones.length})
                        </p>
                        <span className="text-[9px] text-violet-500 font-bold">
                          Guardadas en la nube ☁️
                        </span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {misAtenciones.map((ac) => (
                          <div
                            key={ac.id}
                            className="px-4 py-3 flex items-start gap-3 hover:bg-violet-50/30 transition"
                          >
                            <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ring-2 ring-violet-300">
                              <span className="text-sm">✅</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-sm text-gray-700">
                                  {ac.nombre}
                                </p>
                                {ac.tipoConsulta && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                                    {ac.tipoConsulta.replace("_", " ")}
                                  </span>
                                )}
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                    ac.tipo === "general"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {ac.tipo === "general"
                                    ? "General"
                                    : "Ocupacional"}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                <p className="text-[10px] text-gray-400">
                                  {ac.docNumero || "-"}
                                </p>
                                {ac.empresa && (
                                  <p className="text-[10px] text-gray-400">
                                    🏢 {ac.empresa}
                                  </p>
                                )}
                                {ac.cargo && (
                                  <p className="text-[10px] text-gray-400">
                                    💼 {ac.cargo}
                                  </p>
                                )}
                                <p className="text-[10px] text-gray-400">
                                  📅 {ac.fechaAtencion}
                                </p>
                                {ac.horaInicio && ac.horaFin && (
                                  <p className="text-[10px] text-emerald-600 font-bold">
                                    🕐 {ac.horaInicio} → {ac.horaFin}
                                  </p>
                                )}
                                {isAdminOrSec && ac.medicoNombre && (
                                  <p className="text-[10px] text-blue-500">
                                    👨‍⚕️ {ac.medicoNombre}
                                  </p>
                                )}
                              </div>
                              {ac.conceptoAptitud && (
                                <p className="text-[10px] text-violet-600 font-bold mt-0.5">
                                  📋 {ac.conceptoAptitud}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300">
                                ✅ Visto ✓
                              </span>
                              {ac.codigoVerificacion && (
                                <span className="text-[8px] text-gray-400 font-mono">
                                  {ac.codigoVerificacion}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {miAgendaHoy.length === 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center">
                    <p className="text-4xl mb-3">🗓️</p>
                    <p className="font-black text-gray-400">
                      Sin pacientes para hoy
                    </p>
                    {isAdminOrSec && (
                      <button
                        onClick={() => setAgendaTab("nueva")}
                        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-700"
                      >
                        ➕ Registrar paciente
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* ─── TAB: PRÓXIMAS ────────────────────────────────── */}
            {agendaTab === "proximas" && (
              <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
                <div className="bg-purple-50 px-5 py-2.5 border-b border-purple-100">
                  <p className="text-sm font-black text-purple-800">
                    📅 Citas Programadas Futuras ({proximas.length})
                  </p>
                </div>
                {proximas.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <p className="text-3xl mb-2">📅</p>
                    <p className="text-sm font-bold">Sin citas programadas</p>
                  </div>
                ) : (
                  <div>
                    {/* Agrupar por fecha */}
                    {[...new Set(proximas.map((a) => a.fecha))].map((fecha) => (
                      <div key={fecha}>
                        <div className="bg-purple-100 px-5 py-1.5 border-b border-purple-200">
                          <p className="text-xs font-black text-purple-700">
                            {new Date(fecha + "T12:00:00").toLocaleDateString(
                              "es-CO",
                              {
                                weekday: "long",
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {proximas
                            .filter((a) => a.fecha === fecha)
                            .map((ag, i) => (
                              <CardPaciente
                                key={ag.id}
                                ag={ag}
                                idx={i}
                                showFecha={false}
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* ─── TAB: NUEVA CITA ──────────────────────────────── */}
            {agendaTab === "nueva" && isAdminOrSec && (
              <div className="grid grid-cols-5 gap-6">
                {/* Formulario */}
                <div className="col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-500" /> Registrar /
                    Agendar Paciente
                  </h3>
                  {/* Búsqueda paciente existente */}
                  <div className="relative mb-4">
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">
                      🔍 Buscar paciente existente
                    </label>
                    <input
                      value={agendaForm._busquedaQuery || agendaForm.nombre}
                      onChange={(e) => handleBusqueda(e.target.value)}
                      placeholder="Nombre o número de documento..."
                      className="w-full p-2 border-2 border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                    />
                    {agendaSuggs.length > 0 && (
                      <div className="absolute z-50 top-full left-0 w-full bg-white border-2 border-blue-200 shadow-2xl rounded-xl mt-1 max-h-72 overflow-y-auto">
                        <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                          <span className="text-[9px] font-black text-blue-600 uppercase">{agendaSuggs.length} paciente{agendaSuggs.length!==1?"s":""} encontrado{agendaSuggs.length!==1?"s":""}</span>
                          <button onClick={() => setAgendaSuggs([])} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                        </div>
                        {agendaSuggs.map((p) => {
                          const medNombre = usersList.find(u => u.user === p._medicoId)?.name || p._medicoId || "";
                          return (
                            <div key={p.id} onClick={() => seleccionarPaciente(p)} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-sm text-gray-800 truncate">{p.nombres}</p>
                                  <div className="flex flex-wrap gap-2 mt-0.5">
                                    <span className="text-[9px] text-gray-500">{p.docTipo||"CC"}: <strong>{p.docNumero}</strong></span>
                                    {p.edad && <span className="text-[9px] text-gray-400">{p.edad} años</span>}
                                    {p.celular && <span className="text-[9px] text-gray-400">📱 {p.celular}</span>}
                                    {p.eps && <span className="text-[9px] text-gray-400">EPS: {p.eps}</span>}
                                  </div>
                                  <div className="flex flex-wrap gap-2 mt-0.5">
                                    {p.cargo && <span className="text-[9px] font-bold text-indigo-600">💼 {p.cargo}</span>}
                                    {p.empresaNombre && <span className="text-[9px] text-gray-400 truncate max-w-[140px]">🏢 {p.empresaNombre}</span>}
                                    {medNombre && <span className="text-[9px] text-emerald-600 font-bold">👨‍⚕️ {medNombre}</span>}
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  {p.estadoHistoria === "Cerrada" && p.conceptoAptitud && (
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${p.conceptoAptitud.toLowerCase().includes("no apto")?"bg-red-100 text-red-700":"bg-emerald-100 text-emerald-700"}`}>
                                      {p.conceptoAptitud.length > 20 ? p.conceptoAptitud.substring(0,20)+"…" : p.conceptoAptitud}
                                    </span>
                                  )}
                                  <p className="text-[8px] text-gray-300 mt-0.5">{p.fechaExamen || ""}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Sección: Agenda */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
                    <p className="text-[10px] font-black text-blue-700 uppercase mb-2">
                      📅 Datos de la Cita
                    </p>
                    <div className="flex flex-wrap -mx-1">
                      <AgendaFieldF
                        label="Tipo de Consulta *"
                        name="tc"
                        value={agendaForm.tipoConsulta}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, tipoConsulta: v }))
                        }
                        opts={TIPOS_CONSULTA.map((t) => ({
                          v: t.v,
                          l: `${t.l} (${t.mins}min)`,
                        }))}
                        width="w-1/2"
                        req
                      />
                      <AgendaFieldF
                        label="Médico Asignado *"
                        name="med"
                        value={agendaForm.medicoId}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, medicoId: v }))
                        }
                        opts={medicosDisp.map((m) => ({
                          v: m.user,
                          l: m.name,
                        }))}
                        width="w-1/2"
                        req
                      />
                      <AgendaFieldF
                        label="Fecha Cita"
                        type="date"
                        name="fc"
                        value={agendaForm.fechaCita}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, fechaCita: v }))
                        }
                        width="w-1/2"
                      />
                      <AgendaFieldF
                        label="Hora Cita"
                        type="time"
                        name="hc"
                        value={agendaForm.horaCita}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, horaCita: v }))
                        }
                        width="w-1/2"
                      />
                      {agendaForm.horaCita && (
                        <div className="w-full px-1 mb-1">
                          <span className="text-[10px] text-blue-600 font-bold">
                            ⏱ Duración:{" "}
                            {DURACION[agendaForm.tipoConsulta] || 20} min · Fin
                            estimado:{" "}
                            {addMins(
                              agendaForm.horaCita,
                              DURACION[agendaForm.tipoConsulta] || 20
                            )}
                          </span>
                        </div>
                      )}
                      <AgendaFieldF
                        label="Observación / Motivo"
                        name="obs"
                        value={agendaForm.observacion}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, observacion: v }))
                        }
                        width="w-full"
                      />
                    </div>
                  </div>
                  {/* Sección: Identificación */}
                  <div className="mb-3">
                    <p className="text-[10px] font-black text-gray-600 uppercase mb-2 border-b pb-1">
                      👤 Identificación
                    </p>
                    <div className="flex flex-wrap -mx-1">
                      <AgendaFieldF
                        label="Nombres Completos *"
                        name="nom"
                        value={agendaForm.nombre}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, nombre: v }))
                        }
                        width="w-1/2"
                        req
                      />
                      <AgendaFieldF
                        label="Tipo Doc."
                        name="dt"
                        value={agendaForm.docTipo}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, docTipo: v }))
                        }
                        opts={["CC", "CE", "PA", "TI", "NUIP", "RC", "MS"]}
                        width="w-1/6"
                      />
                      <AgendaFieldF
                        label="Nro. Documento"
                        name="dn"
                        value={agendaForm.docNumero}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, docNumero: v }))
                        }
                        width="w-1/3"
                      />
                      <AgendaFieldF
                        label="F. Nacimiento"
                        type="date"
                        name="fn"
                        value={agendaForm.fechaNacimiento}
                        onChange={(v) =>
                          setAgendaForm((p) => ({
                            ...p,
                            fechaNacimiento: v,
                            edad: calcEdad(v),
                          }))
                        }
                        width="w-1/4"
                      />
                      <AgendaFieldF
                        label="Edad"
                        name="ed"
                        value={agendaForm.edad}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, edad: v }))
                        }
                        width="w-1/6"
                        placeholder="Auto"
                      />
                      <AgendaFieldF
                        label="Género"
                        name="gen"
                        value={agendaForm.genero}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, genero: v }))
                        }
                        opts={[
                          "Masculino",
                          "Femenino",
                          "No binario",
                          "Prefiero no decir",
                        ]}
                        width="w-1/4"
                      />
                      <AgendaFieldF
                        label="Estado Civil"
                        name="ec"
                        value={agendaForm.estadoCivil}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, estadoCivil: v }))
                        }
                        opts={[
                          "Soltero(a)",
                          "Casado(a)",
                          "Unión libre",
                          "Divorciado(a)",
                          "Viudo(a)",
                        ]}
                        width="w-1/4"
                      />
                      <AgendaFieldF
                        label="Escolaridad"
                        name="esc"
                        value={agendaForm.escolaridad}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, escolaridad: v }))
                        }
                        opts={[
                          "Primaria",
                          "Bachillerato",
                          "Técnico",
                          "Tecnólogo",
                          "Universitario",
                          "Posgrado",
                          "Ninguno",
                        ]}
                        width="w-1/4"
                      />
                      <AgendaFieldF
                        label="Grupo Sanguíneo"
                        name="gs"
                        value={agendaForm.grupoSanguineo}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, grupoSanguineo: v }))
                        }
                        opts={[
                          "A+",
                          "A-",
                          "B+",
                          "B-",
                          "AB+",
                          "AB-",
                          "O+",
                          "O-",
                        ]}
                        width="w-1/4"
                      />
                      <AgendaFieldF
                        label="Grupo Étnico"
                        name="ge"
                        value={agendaForm.grupoEtnico}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, grupoEtnico: v }))
                        }
                        opts={[
                          "Ninguno",
                          "Indígena",
                          "Afrocolombiano",
                          "Raizal",
                          "Palenquero",
                          "Rom",
                          "Otro",
                        ]}
                        width="w-1/4"
                      />
                      <AgendaFieldF
                        label="Identidad Género"
                        name="ig"
                        value={agendaForm.identidadGenero}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, identidadGenero: v }))
                        }
                        opts={[
                          "Cisgénero",
                          "Transgénero",
                          "No binario",
                          "Prefiero no decir",
                        ]}
                        width="w-1/4"
                      />
                    </div>
                  </div>
                  {/* Sección: Contacto */}
                  <div className="mb-3">
                    <p className="text-[10px] font-black text-gray-600 uppercase mb-2 border-b pb-1">
                      📞 Contacto y Residencia
                    </p>
                    <div className="flex flex-wrap -mx-1">
                      <AgendaFieldF
                        label="Celular"
                        name="cel"
                        value={agendaForm.celular}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, celular: v }))
                        }
                        width="w-1/4"
                      />
                      <AgendaFieldF
                        label="Teléfono"
                        name="tel"
                        value={agendaForm.telefono}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, telefono: v }))
                        }
                        width="w-1/4"
                      />
                      <AgendaFieldF
                        label="Email"
                        type="email"
                        name="em"
                        value={agendaForm.email}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, email: v }))
                        }
                        width="w-1/2"
                      />
                      <AgendaFieldF
                        label="Dirección Residencia"
                        name="res"
                        value={agendaForm.residencia}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, residencia: v }))
                        }
                        width="w-1/2"
                      />
                      <AgendaFieldF
                        label="Zona"
                        name="zr"
                        value={agendaForm.zonaResidencia}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, zonaResidencia: v }))
                        }
                        opts={["Urbana", "Rural"]}
                        width="w-1/6"
                      />
                      <AgendaFieldF
                        label="Estrato"
                        name="est"
                        value={agendaForm.estrato}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, estrato: v }))
                        }
                        opts={["1", "2", "3", "4", "5", "6"]}
                        width="w-1/6"
                      />
                      <AgendaFieldF
                        label="Tipo Vivienda"
                        name="tv"
                        value={agendaForm.tipoVivienda}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, tipoVivienda: v }))
                        }
                        opts={["Propia", "Arrendada", "Familiar", "Otro"]}
                        width="w-1/4"
                      />
                      <AgendaFieldF
                        label="Personas a Cargo"
                        name="pc"
                        value={agendaForm.numPersonasCargo}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, numPersonasCargo: v }))
                        }
                        width="w-1/6"
                      />
                    </div>
                  </div>
                  {/* Sección: Afiliaciones */}
                  <div className="mb-3">
                    <p className="text-[10px] font-black text-gray-600 uppercase mb-2 border-b pb-1">
                      🏥 Afiliaciones SGSSS
                    </p>
                    <div className="flex flex-wrap -mx-1">
                      <AgendaFieldF
                        label="EPS"
                        name="eps"
                        value={agendaForm.eps}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, eps: v }))
                        }
                        width="w-1/4"
                        list="eps-list"
                      />
                      <AgendaFieldF
                        label="ARL"
                        name="arl"
                        value={agendaForm.arl}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, arl: v }))
                        }
                        width="w-1/4"
                        list="arl-list"
                      />
                      <AgendaFieldF
                        label="Nivel Riesgo ARL"
                        name="nr"
                        value={agendaForm.nivelRiesgoARL}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, nivelRiesgoARL: v }))
                        }
                        opts={["I", "II", "III", "IV", "V"]}
                        width="w-1/6"
                      />
                      <AgendaFieldF
                        label="AFP"
                        name="afp"
                        value={agendaForm.afp}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, afp: v }))
                        }
                        width="w-1/4"
                        list="afp-list"
                      />
                    </div>
                  </div>
                  {/* Sección: Laboral */}
                  <div className="mb-4">
                    <p className="text-[10px] font-black text-gray-600 uppercase mb-2 border-b pb-1">
                      💼 Datos Laborales
                    </p>
                    <div className="flex flex-wrap -mx-1">
                      <AgendaFieldF
                        label="Empresa"
                        name="emp"
                        value={agendaForm.empresa}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, empresa: v }))
                        }
                        width="w-1/2"
                      />
                      <AgendaFieldF
                        label="Cargo"
                        name="car"
                        value={agendaForm.cargo}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, cargo: v }))
                        }
                        width="w-1/2"
                      />
                      <AgendaFieldF
                        label="Área / Dependencia"
                        name="dep"
                        value={agendaForm.dependencia}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, dependencia: v }))
                        }
                        width="w-1/3"
                      />
                      <AgendaFieldF
                        label="Tipo Contrato"
                        name="tc2"
                        value={agendaForm.tipoContrato}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, tipoContrato: v }))
                        }
                        opts={[
                          "Término fijo",
                          "Término indefinido",
                          "Prestación de servicios",
                          "Obra o labor",
                          "Aprendizaje",
                        ]}
                        width="w-1/3"
                      />
                      <AgendaFieldF
                        label="Turno"
                        name="turno"
                        value={agendaForm.turnoTrabajo}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, turnoTrabajo: v }))
                        }
                        opts={[
                          "Diurno",
                          "Nocturno",
                          "Mixto",
                          "Rotativo",
                          "12h Día",
                          "12h Noche",
                        ]}
                        width="w-1/6"
                      />
                      <AgendaFieldF
                        label="Antigüedad"
                        name="ant"
                        value={agendaForm.antiguedadEmpresa}
                        onChange={(v) =>
                          setAgendaForm((p) => ({ ...p, antiguedadEmpresa: v }))
                        }
                        width="w-1/6"
                      />
                    </div>
                  </div>
                  {/* Citas recurrentes */}
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agendaRecurrente}
                        onChange={function (e) { setAgendaRecurrente(e.target.checked); }}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <span className="text-xs font-bold text-purple-700">
                        {"🔄 Programar control periódico"}
                      </span>
                    </label>
                    {agendaRecurrente && (
                      <div className="mt-2">
                        <select
                          value={agendaRecurrenciaPeriodo}
                          onChange={function (e) { setAgendaRecurrenciaPeriodo(e.target.value); }}
                          className="p-2 border border-purple-300 rounded-lg text-sm w-full"
                        >
                          <option value="3m">{"Cada 3 meses"}</option>
                          <option value="6m">{"Cada 6 meses"}</option>
                          <option value="1y">{"Cada 1 año"}</option>
                        </select>
                        <p className="text-[10px] text-purple-600 mt-1 font-bold">
                          {"Se creará automáticamente una cita futura de control"}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={registrarPaciente}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-black hover:bg-blue-700 flex items-center justify-center gap-2 shadow"
                  >
                    <UserCheck className="w-5 h-5" />
                    {agendaForm.fechaCita && agendaForm.fechaCita > today
                      ? "📅 Programar cita para " + agendaForm.fechaCita
                      : "✅ Registrar en sala de espera"}
                  </button>
                </div>
                {/* Panel derecho: agenda del día resumida */}
                <div className="col-span-2 space-y-4">
                  <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 overflow-hidden">
                    <div className="bg-yellow-50 px-4 py-2.5 border-b border-yellow-100">
                      <p className="text-sm font-black text-yellow-800">
                        ⏳ En espera hoy ({enEspera.length})
                      </p>
                    </div>
                    {enEspera.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-6">
                        Sin pacientes en espera
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {enEspera.map((ag, i) => (
                          <CardPaciente key={ag.id} ag={ag} idx={i} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
                    <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-100">
                      <p className="text-sm font-black text-purple-800">
                        📅 Próximas ({proximas.slice(0, 5).length})
                      </p>
                    </div>
                    {proximas.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-6">
                        Sin citas programadas
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {proximas.slice(0, 5).map((ag, i) => (
                          <CardPaciente key={ag.id} ag={ag} idx={i} showFecha />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* ─── TAB: SEMANAL ─────────────────────────────────── */}
            {agendaTab === "semanal" && (function () {
              var hoy = new Date();
              var diaSemana = hoy.getDay();
              var diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
              var lunes = new Date(hoy);
              lunes.setDate(hoy.getDate() + diffLunes + (agendaSemanaOffset * 7));
              var diasSemana = [];
              var nombresDia = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
              for (var i = 0; i < 7; i++) {
                var d = new Date(lunes);
                d.setDate(lunes.getDate() + i);
                diasSemana.push({
                  fecha: d.toISOString().split("T")[0],
                  nombre: nombresDia[i],
                  dia: d.getDate(),
                  mes: d.toLocaleDateString("es-CO", { month: "short" }),
                });
              }
              var lunesStr = diasSemana[0].fecha;
              var domStr = diasSemana[6].fecha;
              return (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-blue-50 px-5 py-3 border-b border-blue-100 flex items-center justify-between">
                    <button
                      onClick={function () { setAgendaSemanaOffset(agendaSemanaOffset - 1); }}
                      className="text-blue-600 hover:text-blue-800 font-black text-sm px-2 py-1 rounded hover:bg-blue-100"
                    >{"← Anterior"}</button>
                    <p className="text-sm font-black text-blue-800">
                      {"📅 Semana: " + lunesStr + " al " + domStr}
                    </p>
                    <button
                      onClick={function () { setAgendaSemanaOffset(agendaSemanaOffset + 1); }}
                      className="text-blue-600 hover:text-blue-800 font-black text-sm px-2 py-1 rounded hover:bg-blue-100"
                    >{"Siguiente →"}</button>
                  </div>
                  <div className="grid grid-cols-7 divide-x divide-gray-100">
                    {diasSemana.map(function (ds) {
                      var citasDia = agendados.filter(function (a) {
                        if (a.fecha !== ds.fecha) return false;
                        if (_agendaEmpresaId) return a.empresaId === _agendaEmpresaId || a.medicoEmpresaId === _agendaEmpresaId;
                        if (isAdminOrSec) return true;
                        return a.medicoId === (currentUser && currentUser.user);
                      }).sort(function (a, b) { return (a.horaCita || "").localeCompare(b.horaCita || ""); });
                      var esHoyFlag = ds.fecha === today;
                      return (
                        <div key={ds.fecha} className={"min-h-[200px] " + (esHoyFlag ? "bg-blue-50/50" : "")}>
                          <div className={"text-center py-2 border-b " + (esHoyFlag ? "bg-blue-100 border-blue-200" : "bg-gray-50 border-gray-100")}>
                            <p className={"text-[10px] font-black " + (esHoyFlag ? "text-blue-700" : "text-gray-500")}>{ds.nombre}</p>
                            <p className={"text-sm font-black " + (esHoyFlag ? "text-blue-800" : "text-gray-700")}>{ds.dia}</p>
                            <p className="text-[9px] text-gray-400">{ds.mes}</p>
                          </div>
                          <div className="p-1 space-y-1">
                            {citasDia.length === 0 && (
                              <p className="text-[9px] text-gray-300 text-center py-4">{"-"}</p>
                            )}
                            {citasDia.map(function (ag) {
                              var colorMap = { espera: "bg-yellow-100 border-yellow-300 text-yellow-800", atendiendo: "bg-blue-100 border-blue-300 text-blue-800", atendido: "bg-emerald-100 border-emerald-300 text-emerald-800", programado: "bg-purple-100 border-purple-300 text-purple-800" };
                              var colorClass = colorMap[ag.estado] || colorMap.espera;
                              return (
                                <div key={ag.id} className={"p-1.5 rounded-lg border text-[9px] " + colorClass}>
                                  <p className="font-black truncate">{ag.nombre}</p>
                                  <p>{(ag.horaCita || ag.hora || "") + " · " + (ag.tipoConsulta || "").replace("_", " ")}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {/* ─── TAB: MENSUAL ─────────────────────────────────── */}
            {agendaTab === "mensual" && (function () {
              var hoy2 = new Date();
              var mesActual = new Date(hoy2.getFullYear(), hoy2.getMonth() + agendaMesOffset, 1);
              var anio = mesActual.getFullYear();
              var mes = mesActual.getMonth();
              var nombreMes = mesActual.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
              var primerDia = new Date(anio, mes, 1).getDay();
              var offsetDia = primerDia === 0 ? 6 : primerDia - 1;
              var diasEnMes = new Date(anio, mes + 1, 0).getDate();
              var celdas = [];
              for (var i2 = 0; i2 < offsetDia; i2++) celdas.push(null);
              for (var d2 = 1; d2 <= diasEnMes; d2++) {
                var fechaStr = anio + "-" + String(mes + 1).padStart(2, "0") + "-" + String(d2).padStart(2, "0");
                var citasDia2 = agendados.filter(function (a) {
                  if (a.fecha !== fechaStr) return false;
                  if (_agendaEmpresaId) return a.empresaId === _agendaEmpresaId || a.medicoEmpresaId === _agendaEmpresaId;
                  if (isAdminOrSec) return true;
                  return a.medicoId === (currentUser && currentUser.user);
                });
                var totalDia = citasDia2.length;
                var atendidasDia = citasDia2.filter(function (a) { return a.estado === "atendido"; }).length;
                var pendientesDia = citasDia2.filter(function (a) { return a.estado === "espera" || a.estado === "programado"; }).length;
                var ausentesDia = citasDia2.filter(function (a) { return a.estado === "ausente"; }).length;
                var colorDia = totalDia === 0 ? "" : ausentesDia > 0 ? "bg-red-100 border-red-300" : pendientesDia > 0 ? "bg-yellow-100 border-yellow-300" : "bg-emerald-100 border-emerald-300";
                celdas.push({ dia: d2, fecha: fechaStr, total: totalDia, color: colorDia, esHoy: fechaStr === today });
              }
              return (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-purple-50 px-5 py-3 border-b border-purple-100 flex items-center justify-between">
                    <button
                      onClick={function () { setAgendaMesOffset(agendaMesOffset - 1); }}
                      className="text-purple-600 hover:text-purple-800 font-black text-sm px-2 py-1 rounded hover:bg-purple-100"
                    >{"← Anterior"}</button>
                    <p className="text-sm font-black text-purple-800">
                      {"📊 " + nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
                    </p>
                    <button
                      onClick={function () { setAgendaMesOffset(agendaMesOffset + 1); }}
                      className="text-purple-600 hover:text-purple-800 font-black text-sm px-2 py-1 rounded hover:bg-purple-100"
                    >{"Siguiente →"}</button>
                  </div>
                  <div className="grid grid-cols-7">
                    {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(function (dn) {
                      return <div key={dn} className="text-center text-[9px] font-black text-gray-500 py-2 bg-gray-50 border-b border-gray-100">{dn}</div>;
                    })}
                    {celdas.map(function (celda, idx) {
                      if (!celda) return <div key={"empty_" + idx} className="min-h-[60px] border-b border-r border-gray-50" />;
                      return (
                        <div key={celda.fecha} className={"min-h-[60px] border-b border-r border-gray-100 p-1 " + (celda.esHoy ? "ring-2 ring-blue-400 ring-inset" : "") + " " + celda.color}>
                          <p className={"text-xs font-black " + (celda.esHoy ? "text-blue-700" : "text-gray-700")}>{celda.dia}</p>
                          {celda.total > 0 && (
                            <p className="text-[10px] font-bold text-gray-600 mt-1">
                              {celda.total + " cita" + (celda.total !== 1 ? "s" : "")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-4 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400 inline-block" /> {"Todas atendidas"}</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-400 inline-block" /> {"Pendientes"}</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 border border-red-400 inline-block" /> {"Ausencias"}</span>
                  </div>
                </div>
              );
            })()}
          </div>
          {/* ─── ESTADÍSTICAS DE AGENDA ─────────────────────────── */}
          {(function () {
            var hoyStats = miAgendaHoy;
            var progHoy = hoyStats.filter(function (a) { return a.estado === "espera" || a.estado === "programado"; }).length;
            var atendidosHoy = hoyStats.filter(function (a) { return a.estado === "atendido"; }).length;
            var enEsperaHoy = hoyStats.filter(function (a) { return a.estado === "espera"; }).length;
            var ausentesHoy = hoyStats.length - atendidosHoy - enEsperaHoy - hoyStats.filter(function (a) { return a.estado === "atendiendo"; }).length;
            if (ausentesHoy < 0) ausentesHoy = 0;
            // Semana
            var hoyDate = new Date();
            var diaSem = hoyDate.getDay();
            var diffL = diaSem === 0 ? -6 : 1 - diaSem;
            var lunesSem = new Date(hoyDate);
            lunesSem.setDate(hoyDate.getDate() + diffL);
            var domSem = new Date(lunesSem);
            domSem.setDate(lunesSem.getDate() + 6);
            var lunesStr2 = lunesSem.toISOString().split("T")[0];
            var domStr2 = domSem.toISOString().split("T")[0];
            var citasSemana = agendados.filter(function (a) {
              if (a.fecha < lunesStr2 || a.fecha > domStr2) return false;
              if (_agendaEmpresaId) return a.empresaId === _agendaEmpresaId || a.medicoEmpresaId === _agendaEmpresaId;
              if (isAdminOrSec) return true;
              return a.medicoId === (currentUser && currentUser.user);
            });
            var atendidosSemana = citasSemana.filter(function (a) { return a.estado === "atendido"; }).length;
            var pendientesSemana = citasSemana.length - atendidosSemana;
            return (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-4">
                <p className="text-sm font-black text-gray-800 mb-2">{"📊 Resumen de Agenda"}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <p className="text-[10px] font-black text-blue-700 uppercase mb-1">{"Hoy"}</p>
                    <p className="text-xs text-gray-700">
                      {miAgendaHoy.length + " programadas | " + atendidosHoy + " atendidas | " + enEsperaHoy + " en espera" + (ausentesHoy > 0 ? " | " + ausentesHoy + " ausente" + (ausentesHoy !== 1 ? "s" : "") : "")}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                    <p className="text-[10px] font-black text-purple-700 uppercase mb-1">{"Semana"}</p>
                    <p className="text-xs text-gray-700">
                      {citasSemana.length + " citas | " + atendidosSemana + " atendidas | " + pendientesSemana + " pendientes"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
}
