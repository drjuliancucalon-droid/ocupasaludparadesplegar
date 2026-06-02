import React, { useState } from 'react';
import { Bell, X, MessageCircle, Mail, Smartphone, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import {
  generateWhatsAppUrl,
  generateEmailUrl,
  generateSMSUrl,
  generarMensajeResultados,
} from '../services/notificationService';

export const NotificationModal = ({ paciente, concepto, onClose }) => {
  const [copiado, setCopiado] = useState(false);
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');

  if (!paciente) return null;

  const nombre = paciente.nombre || paciente.paciente || 'Paciente';
  const doc = paciente.documento || 'N/A';
  const codigo = paciente.codigoVerificacion || paciente.codigo || 'N/A';
  const tel = paciente.celular || paciente.telefono || '';
  const email = paciente.email || paciente.correo || '';
  const conceptoFinal = concepto || paciente.concepto || 'Pendiente';

  const mensajeBase = generarMensajeResultados(paciente, conceptoFinal);
  const mensaje = mensajePersonalizado || mensajeBase;

  const copiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = mensaje;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" /> Notificar Resultado
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Info del paciente */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Paciente</span>
              <span className="text-sm font-semibold">{nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Documento</span>
              <span className="text-sm">{doc}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Código verificación</span>
              <span className="text-sm font-mono font-bold text-teal-700">{codigo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Concepto</span>
              <span className="text-sm font-semibold text-blue-700">{conceptoFinal}</span>
            </div>
          </div>

          {/* Mensaje */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Mensaje (editable)
            </label>
            <textarea
              value={mensajePersonalizado || mensajeBase}
              onChange={(e) => setMensajePersonalizado(e.target.value)}
              rows={6}
              className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-400"
            />
            <button
              onClick={copiarMensaje}
              className="mt-1 flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800"
            >
              {copiado ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiado ? 'Copiado!' : 'Copiar mensaje'}
            </button>
          </div>

          {/* Canales de envío */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600">Enviar por:</p>

            {/* WhatsApp */}
            <a
              href={generateWhatsAppUrl(tel, mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between w-full p-3 rounded-xl border transition ${
                tel
                  ? 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                  : 'bg-gray-50 border-gray-200 opacity-50 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">WhatsApp</p>
                  <p className="text-xs text-gray-500">{tel || 'Sin teléfono registrado'}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>

            {/* Email */}
            <a
              href={generateEmailUrl(email, `Resultados examen médico ocupacional - ${nombre}`, mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between w-full p-3 rounded-xl border transition ${
                email
                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer'
                  : 'bg-gray-50 border-gray-200 opacity-50 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Correo electrónico</p>
                  <p className="text-xs text-gray-500">{email || 'Sin correo registrado'}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>

            {/* SMS */}
            <a
              href={generateSMSUrl(tel, mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between w-full p-3 rounded-xl border transition ${
                tel
                  ? 'bg-purple-50 border-purple-200 hover:bg-purple-100 cursor-pointer'
                  : 'bg-gray-50 border-gray-200 opacity-50 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">SMS</p>
                  <p className="text-xs text-gray-500">{tel || 'Sin teléfono registrado'}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>

          {/* Nota legal */}
          <p className="text-[10px] text-gray-400 text-center">
            Conforme a Res. 1552/2013 — El trabajador tiene derecho a conocer los resultados de sus exámenes médicos ocupacionales.
          </p>
        </div>
      </div>
    </div>
  );
};
