// src/components/modals/NotificacionModal.jsx
import React from 'react';
import { MessageSquare, X } from 'lucide-react';

const NotificacionModal = ({ data, onCerrar }) => {
  if (!data || !data.nombre) return null;
  const tel = (data.celular || "").replace(/\D/g, "");
  const email = data.emailPaciente || data.email || "";
  const nombre = data.nombres || data.nombre || "";
  const doc = `${data.docTipo || "CC"} ${data.docNumero || ""}`.trim();
  const codigo = data.codigoVerificacion || "";
  const fecha = data.fechaExamen || new Date().toISOString().split("T")[0];
  const concepto = data.conceptoAptitud || "pendiente";
  const empresa = data.empresaNombre || data.empresa || "";

  const waMsg = encodeURIComponent(
    `Estimado/a ${nombre},\n\n` +
      `Le informamos que su evaluación médica ocupacional ha sido registrada.\n\n` +
      `📋 *Código de verificación:* ${codigo}\n` +
      `📅 *Fecha:* ${fecha}\n` +
      `🏢 *Empresa:* ${empresa}\n` +
      `✅ *Concepto:* ${concepto}\n\n` +
      `Puede verificar su certificado en cualquier momento solicitando este código al médico.\n\n` +
      `Atentamente,\nServicio Médico Ocupacional - SISO OcupaSalud v4`
  );

  const mailSubject = encodeURIComponent(
    `Evaluación Médica Ocupacional - Código ${codigo}`
  );
  const mailBody = encodeURIComponent(
    `Estimado/a ${nombre},

` +
      `Le informamos que su evaluación médica ocupacional ha sido registrada.

` +
      `Código de verificación: ${codigo}
` +
      `Fecha: ${fecha}
` +
      `Empresa: ${empresa}
` +
      `Concepto de aptitud: ${concepto}

` +
      `Puede verificar su certificado presentando este código al médico tratante.

` +
      `Atentamente,
Servicio Médico Ocupacional - SISO OcupaSalud v4`
  );

  const waUrl = `https://wa.me/${
    tel.startsWith("57") ? tel : "57" + tel
  }?text=${waMsg}`;
  const mailUrl = `mailto:${email}?subject=${mailSubject}&body=${mailBody}`;
  const smsUrl = `sms:${tel}?body=${encodeURIComponent(
    `SISO OcupaSalud: Su código de verificación es ${codigo}. Fecha evaluación: ${fecha}.`
  )}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5 text-white flex items-center justify-between">
          <div>
            <h2 className="font-black text-base">📲 Notificar al Paciente</h2>
            <p className="text-green-100 text-xs mt-0.5">
              Res. 1552/2013 · Comunicación resultado
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="text-white/80 hover:text-white text-2xl font-bold"
          >
            ✕
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
            <p>
              <span className="font-black text-gray-600">Paciente:</span>{" "}
              {nombre}
            </p>
            <p>
              <span className="font-black text-gray-600">Documento:</span> {doc}
            </p>
            <p>
              <span className="font-black text-gray-600">
                Código verificación:
              </span>{" "}
              <span className="font-black text-blue-700">
                {codigo || "(guardar HC primero)"}
              </span>
            </p>
            <p>
              <span className="font-black text-gray-600">Concepto:</span>{" "}
              {concepto}
            </p>
          </div>

          <p className="text-xs font-black text-gray-700 uppercase">
            Canales de notificación
          </p>

          {tel ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition"
            >
              <span className="text-2xl">💬</span>
              <div>
                <p className="text-xs font-black text-green-800">WhatsApp</p>
                <p className="text-[10px] text-green-600">
                  +{tel.startsWith("57") ? tel : "57" + tel}
                </p>
              </div>
              <span className="ml-auto text-xs font-bold text-green-600">
                Abrir →
              </span>
            </a>
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-400">
              💬 WhatsApp - Registre celular del paciente para habilitar
            </div>
          )}

          {email ? (
            <a
              href={mailUrl}
              className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition"
            >
              <span className="text-2xl">📧</span>
              <div>
                <p className="text-xs font-black text-blue-800">
                  Correo electrónico
                </p>
                <p className="text-[10px] text-blue-600">{email}</p>
              </div>
              <span className="ml-auto text-xs font-bold text-blue-600">
                Abrir →
              </span>
            </a>
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-400">
              📧 Email - Registre correo del paciente para habilitar
            </div>
          )}

          {tel ? (
            <a
              href={smsUrl}
              className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition"
            >
              <span className="text-2xl">💬</span>
              <div>
                <p className="text-xs font-black text-purple-800">
                  SMS (código únicamente)
                </p>
                <p className="text-[10px] text-purple-600">
                  +{tel.startsWith("57") ? tel : "57" + tel}
                </p>
              </div>
              <span className="ml-auto text-xs font-bold text-purple-600">
                Abrir →
              </span>
            </a>
          ) : null}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[10px] text-amber-700">
            <p className="font-black">
              📋 Res. 1552/2013 - Notificación de resultados
            </p>
            <p className="mt-0.5">
              El médico tiene la obligación de informar los resultados al
              trabajador evaluado. Los links abren su app de WhatsApp/Email con
              el mensaje prellenado.
            </p>
          </div>

          <button
            onClick={onCerrar}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificacionModal;
