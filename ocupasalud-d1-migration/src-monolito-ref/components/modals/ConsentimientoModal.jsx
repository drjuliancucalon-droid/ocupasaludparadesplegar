// src/components/modals/ConsentimientoModal.jsx
import React from 'react';
import { CheckCircle2, X, FileText } from 'lucide-react';

const ConsentimientoModal = ({
  data,
  onConfirmar,
  onCerrar,
  estadoCerrada,
}) => {
  const { useState: useLocalState } = React;
  const [nombre, setNombre] = useLocalState(
    data.consentimientoNombrePaciente || ""
  );
  const [aceptado, setAceptado] = useLocalState(false);
  const [error, setError] = useLocalState("");
  const fechaHoy = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const horaAhora = new Date().toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleConfirmar = () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio || nombreLimpio.length < 3) {
      setError(
        "Ingrese su nombre completo tal como aparece en el documento de identidad."
      );
      return;
    }
    if (!aceptado) {
      setError("Debe marcar la casilla de aceptación para continuar.");
      return;
    }
    const ts = new Date().toISOString();
    onConfirmar({
      consentimientoInformado: true,
      consentimientoNombrePaciente: nombreLimpio,
      tipoConsentimiento: "Digital",
      fechaConsentimiento: ts.split("T")[0],
      consentimientoTimestamp: ts,
      consentimientoIp: "sesión-web",
      consentimientoVersion: "v2025-1843",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ci-titulo"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2
              id="ci-titulo"
              className="text-white font-black text-base uppercase tracking-wide"
            >
              Consentimiento Informado
            </h2>
            <p className="text-emerald-200 text-xs mt-0.5">
              Ley 23/1981 · Res. 8430/1993 · Ley 1581/2012 · Res. 1843/2025
              Art.12
            </p>
          </div>
          {!estadoCerrada && (
            <button
              onClick={onCerrar}
              className="text-emerald-200 hover:text-white text-xl font-black leading-none"
              aria-label="Cerrar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Cuerpo scrollable */}
        <div className="overflow-y-auto flex-grow px-6 py-4 text-xs text-gray-700 space-y-3">
          <p className="font-bold text-gray-900 text-sm">
            AUTORIZACIÓN PARA EVALUACIÓN MÉDICA OCUPACIONAL
          </p>
          <p>
            Yo, el/la trabajador(a) identificado(a) con el nombre y documento
            que diligencie a continuación, en ejercicio de mi capacidad legal y
            actuando de manera libre y voluntaria, <strong>AUTORIZO</strong> al
            profesional de medicina del trabajo y salud ocupacional a:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Realizar la evaluación médica ocupacional de ingreso, periódica o
              de egreso, según corresponda, de conformidad con la{" "}
              <strong>Resolución 1843 de 2025</strong> y la Resolución 2346 de
              2007.
            </li>
            <li>
              Recopilar, almacenar y procesar mis datos personales y de salud
              con fines exclusivamente médico-ocupacionales, en cumplimiento de
              la <strong>Ley 1581 de 2012</strong> (Habeas Data) y el Decreto
              1377 de 2013.
            </li>
            <li>
              Compartir el <em>Certificado de Aptitud Laboral</em> con la
              empresa contratante o solicitante de la evaluación, en los
              términos del artículo 12 de la Resolución 1843 de 2025.
            </li>
          </ul>
          <p>
            <strong>Confidencialidad:</strong> Mi historia clínica ocupacional
            es un documento privado. Su acceso está restringido únicamente al
            equipo de salud tratante y a las autoridades que lo requieran por
            mandato legal (<strong>Ley 23 de 1981, Art. 37</strong>). El médico
            está sujeto al secreto profesional.
          </p>
          <p>
            <strong>Derechos como titular de datos (Ley 1581/2012):</strong>{" "}
            Tengo derecho a conocer, actualizar, rectificar y solicitar la
            supresión de mis datos personales. Puedo ejercer estos derechos
            directamente ante el médico tratante.
          </p>
          <p>
            <strong>Voluntariedad:</strong> Entiendo que puedo revocar esta
            autorización en cualquier momento, aunque ello puede implicar la
            imposibilidad de emitir el certificado de aptitud laboral requerido
            por mi empleador.
          </p>
          <p className="text-gray-500 italic">
            Fecha y hora de este acto:{" "}
            <strong>
              {fechaHoy}, {horaAhora}
            </strong>
          </p>
        </div>

        {/* Zona de firma */}
        {!estadoCerrada ? (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex-shrink-0 space-y-3">
            <div>
              <label className="block text-xs font-black text-gray-700 mb-1">
                Nombre completo del trabajador{" "}
                <span className="text-red-600">*</span>
                <span className="font-normal text-gray-400 ml-1">
                  (tal como aparece en su documento de identidad)
                </span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setError("");
                }}
                placeholder="Ej: JUAN CARLOS PÉREZ GÓMEZ"
                className="w-full p-2 border-2 border-gray-300 rounded-lg text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                autoComplete="off"
              />
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aceptado}
                onChange={(e) => {
                  setAceptado(e.target.checked);
                  setError("");
                }}
                className="mt-0.5 w-4 h-4 accent-emerald-600 flex-shrink-0"
              />
              <span className="text-xs text-gray-700 leading-relaxed">
                He leído, comprendido y acepto voluntariamente el presente
                consentimiento informado. Confirmo que la información es veraz y
                que actúo sin presión alguna.
              </span>
            </label>
            {error && (
              <p className="text-red-600 text-xs font-bold">⚠️ {error}</p>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={onCerrar}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={!nombre.trim() || !aceptado}
                className="px-5 py-2 text-xs font-black text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                ✅ Confirmar consentimiento
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-200 px-6 py-4 bg-emerald-50 flex-shrink-0">
            <p className="text-xs text-emerald-800 font-bold">
              ✅ Consentimiento registrado - Historia clínica cerrada (solo
              lectura)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

function LoginForm({ onLogin, blockedUntil, attempts }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [remaining, setRemaining] = useState(0);
  // SEGURIDAD: countdown del bloqueo
  React.useEffect(() => {
    if (!blockedUntil) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const secs = Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
      setRemaining(secs);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [blockedUntil]);
  const isBlocked = blockedUntil && Date.now() < blockedUntil;
  // SEC-FIX-03: Limitar longitud de inputs para prevenir DoS y fuzzing (CWE-400)
  const MAX_USER_LEN = 64;
  const MAX_PASS_LEN = 128;
  const submit = () => {
    if (isBlocked) return;
    const user = u.trim().slice(0, MAX_USER_LEN);
    const pass = p.trim().slice(0, MAX_PASS_LEN);
    if (user && pass) onLogin(user, pass);
  };
  return (
    <div className="space-y-4 mb-6">
      {isBlocked && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-center">
          <p className="text-red-700 font-black text-sm">🔒 Acceso bloqueado</p>
          <p className="text-red-500 text-xs mt-1">
            Espere <span className="font-black">{remaining}s</span> antes de
            intentar de nuevo
          </p>
        </div>
      )}
      {!isBlocked && attempts > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-2 text-center">
          <p className="text-yellow-700 text-xs font-bold">
            ⚠️ {attempts} intento{attempts > 1 ? "s" : ""} fallido
            {attempts > 1 ? "s" : ""}. Máx. 5 antes del bloqueo.
          </p>
        </div>
      )}
      <input
        value={u}
        onChange={(e) => setU(e.target.value.slice(0, MAX_USER_LEN))}
        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
        placeholder="Usuario"
        onKeyDown={(e) => e.key === "Enter" && submit()}
        autoComplete="username"
        maxLength={MAX_USER_LEN}
        disabled={isBlocked}
      />
      <input
        type="password"
        value={p}
        onChange={(e) => setP(e.target.value.slice(0, MAX_PASS_LEN))}
        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
        placeholder="Contraseña"
        onKeyDown={(e) => e.key === "Enter" && submit()}
        autoComplete="current-password"
        maxLength={MAX_PASS_LEN}
        disabled={isBlocked}
      />
      <button
        onClick={submit}
        disabled={isBlocked}
        className={`w-full py-3 rounded-xl font-black text-sm transition shadow-lg ${
          isBlocked
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:opacity-90"
        }`}
      >
        {isBlocked ? `Bloqueado (${remaining}s)` : "Iniciar Sesión"}
      </button>
    </div>
  );
}

export default ConsentimientoModal;
