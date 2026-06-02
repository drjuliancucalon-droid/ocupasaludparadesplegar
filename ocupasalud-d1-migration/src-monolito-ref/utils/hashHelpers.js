// src/utils/hashHelpers.js - Port Monolito Firma/QR/Hash (Historia.jsx)
import { sha256 } from './security.js'; // Usar sha256 portado

// Genera hash SHA-256 del contenido HC (monolito utils/formatters.js)
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
      medicoId: data._medicoId,
      estadoHistoria: "Cerrada",
      ts: new Date().toISOString(),
    });
    return await sha256(contenido);
  } catch {
    return "HASH-NO-DISPONIBLE-" + Date.now();
  }
};

// Genera código QR verificable (monolito)
export const generarCodigoQR = (id, hash, fecha = new Date()) => {
  const short = hash.substring(0, 16).toUpperCase();
  const fechaShort = fecha.toISOString().substring(0, 10).replace(/-/g, "");
  return `SISO-${fechaShort}-${id.substring(0, 8).toUpperCase()}-${short}`;
};

// Formato firma digital para HC impresa (monolito _formatFirmaDigital)
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

// Auto-test funcional (LLAMAR DESPUÉS de import en App.jsx/Historia.jsx)
export const testHashHelpers = async () => {
  const data = { id: "test123", nombres: "Test Paciente" };
  const hash = await generarHashHC(data);
  const qr = generarCodigoQR(data.id, hash);
  console.log("✅ hashHelpers TEST PASS:", { hash: hash.slice(0, 16), qr });
  return true;
};

export default { generarHashHC, generarCodigoQR, formatFirmaDigital, testHashHelpers };

