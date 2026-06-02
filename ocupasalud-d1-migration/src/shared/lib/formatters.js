// ==========================================
// MÓDULO 4: UTILIDADES DE FORMATO
// ==========================================

export const numeroALetras = (num) => {
  if (!num) return "";
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const diez = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  let n = parseFloat(num);
  if (n === 0) return "CERO";
  let out = "";
  if (n >= 1000000) {
    out += numeroALetras(Math.floor(n / 1000000)) + (Math.floor(n / 1000000) === 1 ? " MILLÓN " : " MILLONES ");
    n %= 1000000;
  }
  if (n >= 1000) {
    if (Math.floor(n / 1000) === 1) out += "MIL ";
    else out += numeroALetras(Math.floor(n / 1000)) + " MIL ";
    n %= 1000;
  }
  if (n >= 100) {
    if (n === 100) return out + "CIEN";
    out += centenas[Math.floor(n / 100)] + " ";
    n %= 100;
  }
  if (n >= 20) {
    out += decenas[Math.floor(n / 10)];
    n %= 10;
    if (n > 0) out += " Y ";
  } else if (n >= 10) {
    out += diez[n - 10];
    n = 0;
  }
  if (n > 0) out += unidades[n];
  return out.trim();
};

export const analyzeBP = (v) => {
  if (!v || !v.includes("/")) return null;
  const [s, d] = v.split("/").map(Number);
  if (isNaN(s) || isNaN(d)) return null;
  if (s < 90 || d < 60) return { text: "Hipotensión", color: "text-blue-600 bg-blue-100" };
  if (s < 120 && d < 80) return { text: "Normotenso", color: "text-green-600 bg-green-100" };
  if (s >= 120 && s <= 129 && d < 80) return { text: "Elevada", color: "text-yellow-600 bg-yellow-100" };
  if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) return { text: "HTA Grado 1", color: "text-orange-600 bg-orange-100" };
  if (s >= 140 || d >= 90) return { text: "HTA Grado 2", color: "text-red-600 bg-red-100" };
  return null;
};

export const analyzeHR = (v) => {
  const h = parseInt(v);
  if (isNaN(h)) return null;
  if (h < 60) return { text: "Bradicardia", color: "text-blue-600 bg-blue-100" };
  if (h <= 100) return { text: "Normal", color: "text-green-600 bg-green-100" };
  return { text: "Taquicardia", color: "text-red-600 bg-red-100" };
};

export const analyzeBMI = (v) => {
  const b = parseFloat(v);
  if (isNaN(b)) return null;
  if (b < 18.5) return { text: "Bajo Peso", color: "text-blue-600 bg-blue-100" };
  if (b < 25) return { text: "Normal", color: "text-green-600 bg-green-100" };
  if (b < 30) return { text: "Sobrepeso", color: "text-orange-600 bg-orange-100" };
  if (b < 35) return { text: "Obesidad I", color: "text-red-600 bg-red-100" };
  if (b < 40) return { text: "Obesidad II", color: "text-red-700 bg-red-200" };
  return { text: "Obesidad III", color: "text-red-800 bg-red-300" };
};

export const getSpanishDate = (d) => {
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  let dt;
  if (d && typeof d === "string" && d.includes("-")) {
    const [y, m, day] = d.split("-").map(Number);
    return `${day} de ${months[m - 1]} de ${y}`;
  }
  dt = d ? new Date(d) : new Date();
  return `${dt.getDate()} de ${months[dt.getMonth()]} de ${dt.getFullYear()}`;
};
