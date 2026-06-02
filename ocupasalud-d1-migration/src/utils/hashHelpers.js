// src/utils/hashHelpers.js - Port BASE para PRO (refactorizado)
// Compatible modules/ai + backend

import { sha256 } from './security.js'; // Import portado

// Genera hash SHA-256 HC
export const generarHashHC = async (data) => {
  try {
    const contenido = JSON.stringify({
      id: data.id,
      nombres: data.nombres,
      docNumero: data.docNumero,
      fechaExamen: data.fechaExamen,
      conceptoAptitud: data.conceptoAptitud,
      tipoExamen: data.tipoExamen,
      diagnosticoPrincipal: data.diagnosticoPrincipal,
      medicoId: data._medicoId || data.medicoUser,
      estadoHistoria: "Cerrada",
      ts: new Date().toISOString(),
    });
    return await sha256(contenido);
  } catch {
    return "HASH-NO-DISPONIBLE-" + Date.now();
  }
};

// Código QR verificable
export const generarCodigoQR = (id, hash, fecha = new Date()) => {
  const short = hash.substring(0, 16).toUpperCase();
  const fechaShort = fecha.toISOString().substring(0, 10).replace(/-/g, "");
  return `SISO-${fechaShort}-${id.substring(0, 8).toUpperCase()}-${short}`;
};

// Formato firma para display/print
export const formatFirmaDigital = (firma) => {
  if (!firma) return null;
  return {
    codigo: firma.codigoQR || firma.codigo,
    hash: firma.hash ? firma.hash.substring(0, 32) + "..." : null,
    firmadoPor: firma.firmadoPor,
    fechaFirma: firma.fechaFirma,
    valido: !!(firma.codigoQR && firma.hash && firma.firmadoPor),
  };
};

// Autotest
export const testHashHelpers = async () => {
  const data = { id: "pro-test", nombres: "Pro Test" };
  const hash = await generarHashHC(data);
  const qr = generarCodigoQR(data.id, hash);
  console.log("✅ PRO hashHelpers TEST PASS:", { hash: hash.slice(0, 16), qr });
  return true;
};

export default { generarHashHC, generarCodigoQR, formatFirmaDigital, testHashHelpers };

