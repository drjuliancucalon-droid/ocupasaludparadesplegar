import React, { useState } from 'react';

/**
 * ConsentimientoModal - Consentimiento Informado Digital
 * Ley 23/1981 (ética médica) + Res. 8430/1993 (investigación en salud)
 * Ley 1581/2012 (habeas data) + Res. 1843/2025 Art. 12
 */
export const ConsentModal = ({ data, onConfirmar, onCerrar, estadoCerrada }) => {
  const [nombre, setNombre] = useState(data.consentimientoNombrePaciente || '');
  const [aceptado, setAceptado] = useState(false);
  const [error, setError] = useState('');

  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const horaAhora = new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit',
  });

  const handleConfirmar = () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio || nombreLimpio.length < 3) {
      setError('Ingrese su nombre completo tal como aparece en el documento de identidad.');
      return;
    }
    if (!aceptado) {
      setError('Debe marcar la casilla de aceptación para continuar.');
      return;
    }
    const ts = new Date().toISOString();
    onConfirmar({
      consentimientoInformado: true,
      consentimientoNombrePaciente: nombreLimpio,
      tipoConsentimiento: 'Digital',
      fechaConsentimiento: ts.split('T')[0],
      consentimientoTimestamp: ts,
      consentimientoIp: 'sesión-web',
      consentimientoVersion: 'v2025-1843',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden"
      role="dialog" aria-modal="true" aria-labelledby="ci-titulo">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 id="ci-titulo" className="text-white font-black text-base uppercase tracking-wide">
              Consentimiento Informado
            </h2>
            <p className="text-emerald-200 text-xs mt-0.5">
              Ley 23/1981 · Res. 8430/1993 · Ley 1581/2012 · Res. 1843/2025 Art.12
            </p>
          </div>
          {!estadoCerrada && (
            <button onClick={onCerrar} className="text-emerald-200 hover:text-white text-xl font-black leading-none" aria-label="Cerrar">✕</button>
          )}
        </div>

        {/* Cuerpo scrollable */}
        <div className="overflow-y-auto flex-grow px-6 py-4 text-xs text-gray-700 space-y-3">
          <p className="font-bold text-gray-900 text-sm">AUTORIZACIÓN PARA EVALUACIÓN MÉDICA OCUPACIONAL</p>
          <p>
            Yo, el/la trabajador(a) identificado(a) con el nombre y documento que diligencie a continuación,
            en ejercicio de mi capacidad legal y actuando de manera libre y voluntaria, <strong>AUTORIZO</strong> al
            profesional de medicina del trabajo y salud ocupacional a:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Realizar la evaluación médica ocupacional de ingreso, periódica o de egreso, según corresponda,
              de conformidad con la <strong>Resolución 1843 de 2025</strong> y la Resolución 2346 de 2007.</li>
            <li>Recopilar, almacenar y procesar mis datos personales y de salud con fines exclusivamente
              médico-ocupacionales, en cumplimiento de la <strong>Ley 1581 de 2012</strong> (Habeas Data).</li>
            <li>Compartir el <em>Certificado de Aptitud Laboral</em> con la empresa contratante o solicitante
              de la evaluación, en los términos del artículo 12 de la Resolución 1843 de 2025.</li>
          </ul>
          <p>
            <strong>Confidencialidad:</strong> Mi historia clínica ocupacional es un documento privado.
            Su acceso está restringido únicamente al equipo de salud tratante y a las autoridades que lo
            requieran por mandato legal (<strong>Ley 23 de 1981, Art. 37</strong>).
          </p>
          <p>
            <strong>Derechos como titular de datos (Ley 1581/2012):</strong> Tengo derecho a conocer,
            actualizar, rectificar y solicitar la supresión de mis datos personales.
          </p>
          <p>
            <strong>Voluntariedad:</strong> Entiendo que puedo revocar esta autorización en cualquier momento,
            aunque ello puede implicar la imposibilidad de emitir el certificado de aptitud laboral.
          </p>
          <p className="text-gray-500 italic">
            Fecha y hora de este acto: <strong>{fechaHoy}, {horaAhora}</strong>
          </p>
        </div>

        {/* Zona de firma */}
        {!estadoCerrada ? (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex-shrink-0 space-y-3">
            <div>
              <label className="block text-xs font-black text-gray-700 mb-1">
                Nombre completo del trabajador <span className="text-red-600">*</span>
                <span className="font-normal text-gray-400 ml-1">(tal como aparece en su documento de identidad)</span>
              </label>
              <input
                type="text" value={nombre}
                onChange={(e) => { setNombre(e.target.value); setError(''); }}
                placeholder="Ej: JUAN CARLOS PÉREZ GÓMEZ"
                className="w-full p-2 border-2 border-gray-300 rounded-lg text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                autoComplete="off"
              />
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={aceptado}
                onChange={(e) => { setAceptado(e.target.checked); setError(''); }}
                className="mt-0.5 w-4 h-4 accent-emerald-600 flex-shrink-0" />
              <span className="text-xs text-gray-700 leading-relaxed">
                He leído, comprendido y acepto voluntariamente el presente consentimiento informado.
                Confirmo que la información es veraz y que actúo sin presión alguna.
              </span>
            </label>
            {error && <p className="text-red-600 text-xs font-bold">⚠️ {error}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={onCerrar} className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleConfirmar} disabled={!nombre.trim() || !aceptado}
                className="px-5 py-2 text-xs font-black text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                ✅ Confirmar consentimiento
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-200 px-6 py-4 bg-emerald-50 flex-shrink-0">
            <p className="text-xs text-emerald-800 font-bold">
              ✅ Consentimiento registrado - Historia clínica cerrada (solo lectura)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
