/**
 * Servicio de notificaciones - Res. 1552/2013
 * Genera URLs para WhatsApp, Email y SMS con mensajes pre-llenados
 */

/**
 * Genera URL de WhatsApp (wa.me) con mensaje pre-llenado
 * @param {string} tel - Número de teléfono (con código de país, ej: 573001234567)
 * @param {string} message - Mensaje a enviar
 * @returns {string} URL de WhatsApp
 */
export const generateWhatsAppUrl = (tel, message) => {
  const cleanTel = (tel || '').replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(message || '');
  return `https://wa.me/${cleanTel}?text=${encoded}`;
};

/**
 * Genera URL mailto: con asunto y cuerpo pre-llenados
 * @param {string} email - Dirección de correo
 * @param {string} subject - Asunto del correo
 * @param {string} body - Cuerpo del correo
 * @returns {string} URL mailto
 */
export const generateEmailUrl = (email, subject, body) => {
  const s = encodeURIComponent(subject || '');
  const b = encodeURIComponent(body || '');
  return `mailto:${email || ''}?subject=${s}&body=${b}`;
};

/**
 * Genera URL de SMS con mensaje pre-llenado
 * @param {string} tel - Número de teléfono
 * @param {string} message - Mensaje SMS
 * @returns {string} URL sms:
 */
export const generateSMSUrl = (tel, message) => {
  const cleanTel = (tel || '').replace(/[^0-9+]/g, '');
  const encoded = encodeURIComponent(message || '');
  return `sms:${cleanTel}?body=${encoded}`;
};

/**
 * Genera el mensaje estándar de notificación de resultados
 * @param {object} paciente - Datos del paciente
 * @param {string} concepto - Concepto de aptitud
 * @returns {string} Mensaje formateado
 */
export const generarMensajeResultados = (paciente, concepto) => {
  const nombre = paciente?.nombre || paciente?.paciente || 'Paciente';
  const doc = paciente?.documento || 'N/A';
  const codigo = paciente?.codigoVerificacion || paciente?.codigo || 'N/A';
  const fecha = paciente?.fechaExamen || new Date().toISOString().slice(0, 10);

  return `Estimado(a) ${nombre},\n\nLe informamos que los resultados de su examen médico ocupacional (fecha: ${fecha}) están disponibles.\n\nCódigo de verificación: ${codigo}\nDocumento: ${doc}\nConcepto: ${concepto || 'Pendiente'}\n\nPuede consultar sus resultados en el portal de trabajadores usando su código de verificación.\n\nConforme a la Resolución 1552 de 2013, tiene derecho a conocer los resultados de sus exámenes médicos ocupacionales.\n\nOcupaSalud - Sistema Integral de Salud Ocupacional`;
};
