// Plantilla base de impresión de OcupaSalud (2026-11-13).
// La HC ocupacional es la referencia de diseño; este módulo concentra lo que TODOS los
// documentos impresos/PDF deben compartir, para que se vean y se corten igual.
// Solo presentación: ningún texto clínico ni legal se define aquí.

// Hoja carta vertical con los márgenes de la HC ocupacional.
export const PRINT_PAGE_MARGIN = "1.1cm 1.4cm 1.3cm 1.4cm";
export const PRINT_PAGE_CSS = `@page{size:letter portrait;margin:${PRINT_PAGE_MARGIN};}`;

// Reglas de paginación (el navegador las usa al cortar páginas):
//  · un título de sección nunca queda solo al final de una página (.hc-sec va con lo siguiente)
//  · las tablas repiten su encabezado de columnas al cambiar de página
//  · una fila de tabla no se parte por la mitad
//  · los bloques marcados .hc-keep (firma, código de verificación, recuadros cortos) no se parten
export const PRINT_FLOW_CSS =
  ".hc-sec,h1,h2,h3{break-after:avoid;page-break-after:avoid;}" +
  "thead{display:table-header-group;}" +
  "tr,.hc-keep{break-inside:avoid;page-break-inside:avoid;}" +
  ".hc-end{break-before:avoid;page-break-before:avoid;}";

// Etiqueta de un dato booleano/valor: "Físicos" (true) o "Físicos: valor"; vacío si no aplica.
export const etiquetaValor = (label, val) => {
  if (val === true) return label;
  if (val === false || val == null || val === "") return "";
  return `${label}: ${val}`;
};
