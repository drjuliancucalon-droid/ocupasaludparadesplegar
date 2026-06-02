// src/lib/emailService.js — Email service (from ocupasalud L49300+)
// EmailJS SDK v4 integration + fallback mailto:
// Config persisted in siso_email_config_{user} Supabase key

import { _sanitize } from '../shared/lib/security';

// ═══ Email HTML Template ══════════════════════════════════════════════════
export function _generarEmailHTML(nombrePaciente, docNumero, portalLink, doctorData, includePortalButton = true) {
  return `
    <div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#059669,#0d9488);padding:20px 24px;text-align:center;">
        <h1 style="color:#fff;font-size:18px;margin:0;">OcupaSalud</h1>
        <p style="color:#d1fae5;font-size:11px;margin:4px 0 0;">Sistema Integral de Salud Ocupacional</p>
      </div>
      <div style="padding:24px;">
        <p style="font-size:14px;color:#374151;">Estimado/a <strong>${_sanitize(nombrePaciente || 'Paciente')}</strong>,</p>
        <p style="font-size:13px;color:#6b7280;line-height:1.6;">
          Sus documentos médicos ocupacionales están listos para consulta.
          ${docNumero ? `<br/>Documento: <strong>${_sanitize(docNumero)}</strong>` : ''}
        </p>
        ${includePortalButton && portalLink ? `
          <div style="text-align:center;margin:20px 0;">
            <a href="${portalLink}" style="display:inline-block;padding:12px 32px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">
              📋 Ver Certificado en Portal
            </a>
          </div>
          <p style="font-size:11px;color:#9ca3af;text-align:center;">
            También puede acceder ingresando a: <br/><a href="${portalLink}" style="color:#059669;">${portalLink}</a>
          </p>
        ` : ''}
        ${doctorData ? `
          <div style="border-top:1px solid #e5e7eb;margin-top:16px;padding-top:12px;">
            <p style="font-size:11px;color:#6b7280;margin:0;"><strong>${_sanitize(doctorData.nombre || '')}</strong></p>
            <p style="font-size:10px;color:#9ca3af;margin:2px 0;">${_sanitize(doctorData.titulo || 'Médico Ocupacional')}</p>
            <p style="font-size:10px;color:#059669;margin:2px 0;">RM: ${_sanitize(doctorData.licencia || '--')}</p>
          </div>
        ` : ''}
      </div>
      <div style="background:#f9fafb;padding:12px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="font-size:9px;color:#9ca3af;margin:0;">OcupaSalud · Res. 1843/2025 · Ley 1581/2012</p>
      </div>
    </div>
  `;
}

// ═══ Send Email via EmailJS (with mailto: fallback) ══════════════════════
export async function _enviarEmail(to, subject, textBody, htmlBody) {
  // Try EmailJS first
  try {
    const config = _getEmailConfig();
    if (config?.serviceId && config?.templateId && config?.publicKey) {
      // EmailJS SDK should be loaded via CDN in index.html
      if (typeof window !== 'undefined' && window.emailjs) {
        await window.emailjs.send(config.serviceId, config.templateId, {
          to_email: to,
          subject: subject,
          message: textBody,
          html_body: htmlBody,
        }, config.publicKey);
        return { ok: true, method: 'emailjs' };
      }
    }
  } catch (err) {
    console.warn('EmailJS failed:', err.message);
  }

  // Fallback: mailto:
  const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(textBody)}`;
  window.open(mailtoUrl);
  return { ok: true, method: 'mailto' };
}

// ═══ Send Email via EmailJS API (direct HTTP) ════════════════════════════
export async function _enviarEmailJS(to, subject, textBody, htmlBody) {
  const config = _getEmailConfig();
  if (!config?.serviceId || !config?.templateId || !config?.publicKey) {
    return _enviarEmail(to, subject, textBody, htmlBody);
  }

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        template_params: {
          to_email: to,
          subject: subject,
          message: textBody,
          html_body: htmlBody,
        },
      }),
    });
    if (res.ok) return { ok: true, method: 'emailjs-api' };
    throw new Error(`EmailJS API: ${res.status}`);
  } catch (err) {
    console.warn('EmailJS API failed:', err.message);
    return _enviarEmail(to, subject, textBody, htmlBody);
  }
}

// ═══ Bulk send certificates by company ═══════════════════════════════════
export async function enviarCertificadosMasivo(patients, doctorData, portalBaseUrl) {
  const results = [];
  for (const patient of patients) {
    if (!patient.email?.includes('@')) continue;
    const portalLink = `${portalBaseUrl}#portaltrabajador?codigo=${patient.codigoVerificacion || ''}`;
    const subject = `Certificado Ocupacional — ${patient.nombres || 'Trabajador'}`;
    const textBody = `Estimado/a ${patient.nombres},\n\nSus documentos médicos están listos.\n\nPortal: ${portalLink}`;
    const htmlBody = _generarEmailHTML(patient.nombres, patient.docNumero, portalLink, doctorData);
    try {
      const r = await _enviarEmailJS(patient.email, subject, textBody, htmlBody);
      results.push({ patient: patient.nombres, email: patient.email, ...r });
      // Rate limit: 1 req/sec for EmailJS free tier
      await new Promise(resolve => setTimeout(resolve, 1100));
    } catch (err) {
      results.push({ patient: patient.nombres, email: patient.email, ok: false, error: err.message });
    }
  }
  return results;
}

// ═══ Email Config (persisted in localStorage + Supabase) ═════════════════
function _getEmailConfig() {
  try {
    const key = 'siso_email_config';
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export function saveEmailConfig(config) {
  try {
    localStorage.setItem('siso_email_config', JSON.stringify(config));
  } catch {}
}

export function getEmailConfig() {
  return _getEmailConfig();
}
