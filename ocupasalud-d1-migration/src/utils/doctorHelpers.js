// src/utils/doctorHelpers.js - Helpers para documentos médicos
import { _sanitize, _safeLogoUrl } from './security.js';
export { _sanitize } from './security.js';

const _ipsDocLeftHtml = (ipsData, docData, accentSafe) => {
  const ac = accentSafe || "#059669";
  if (ipsData) {
    const n = _sanitize(ipsData.nombre || "");
    const nit = _sanitize(ipsData.nit || "");
    const dv = _sanitize(ipsData.dv || "");
    const dir = _sanitize(ipsData.direccion || "");
    const ciu = _sanitize(ipsData.ciudad || "");
    const tel = _sanitize(ipsData.telefono || "");
    const mail = _sanitize(ipsData.correo || "");
    const lema = _sanitize(ipsData.lema || "");
    const logo = _safeLogoUrl(ipsData.logo || ""); // SEC-FIX-02: validar URL logo
    const logoHtml = logo
      ? `<img src="${logo}" style="max-height:42px;max-width:100px;object-fit:contain;display:block;margin-bottom:4px;" />`
      : "";
    return `<div style="width:32%;padding-right:8px;">
      ${logoHtml}
      <p style="font-size:10pt;font-weight:900;color:${ac};text-transform:uppercase;margin:0 0 2px 0;">${n}</p>
      ${
        nit
          ? `<p style="font-size:7.5pt;color:#555;margin:1px 0;">NIT: ${nit}${
              dv ? "-" + dv : ""
            }</p>`
          : ""
      }
      ${
        dir
          ? `<p style="font-size:7.5pt;color:#555;margin:1px 0;">${dir}${
              ciu ? " · " + ciu : ""
            }</p>`
          : ""
      }
      ${
        tel
          ? `<p style="font-size:7.5pt;color:#555;margin:1px 0;">Tel: ${tel}</p>`
          : ""
      }
      ${
        mail
          ? `<p style="font-size:7.5pt;color:#555;margin:1px 0;">${mail}</p>`
          : ""
      }
      ${
        lema
          ? `<p style="font-size:7pt;color:#888;font-style:italic;margin:2px 0;">${lema}</p>`
          : ""
      }
    </div>`;
  }
  const d = docData || {};
  return `<div style="width:32%;padding-right:8px;">
    <p style="font-size:10.5pt;font-weight:900;color:${ac};text-transform:uppercase;margin:0 0 3px 0;">${_sanitize(
    d.nombre || ""
  )}</p>
    <p style="font-size:7.5pt;color:#555;margin:1px 0;">${_sanitize(
      d.titulo || ""
    )}</p>
    <p style="font-size:7.5pt;color:#555;margin:1px 0;">Lic: ${_sanitize(
      d.licencia || ""
    )} · ${_sanitize(d.ciudad || "")}</p>
    <p style="font-size:7.5pt;color:#555;margin:1px 0;">Tel: ${_sanitize(
      d.celular || ""
    )} · ${_sanitize(d.email || "")}</p>
  </div>`;
};

export { _ipsDocLeftHtml };
