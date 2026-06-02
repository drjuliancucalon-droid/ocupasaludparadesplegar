// src/utils/bulkDownload.js
// Utilidades para descarga masiva de certificados y documentos

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { _generarCertificadoHTMLNormalizado } from '../shared/lib/printUtils';

/**
 * Genera un archivo PDF a partir de HTML usando window.print()
 * Nota: En un entorno real, se usaría una librería como jsPDF o html2pdf.js
 * Por ahora, usamos la misma técnica que el sistema actual (HTML + print)
 */
export function generatePDFfromHTML(html, filename) {
  // Crear ventana de impresión
  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) {
    throw new Error('El navegador bloqueó la ventana emergente. Permita los popups.');
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
          }
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6;
            color: #333;
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          // Auto-print cuando se cargue
          window.onload = function() {
            setTimeout(function() {
              window.print();
              // Cerrar después de imprimir (opcional)
              // window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
  
  return printWindow;
}

/**
 * Descarga un certificado individual como archivo HTML (fallback hasta tener PDF real)
 */
export function downloadCertificateAsHTML(patient, doctorData, signature, filename) {
  const html = _generarCertificadoHTMLNormalizado(patient, doctorData, signature);
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `certificado_${patient.docNumero}_${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Descarga múltiples certificados como archivos HTML individuales
 */
export async function downloadMultipleCertificates(certificates, doctorData, signature, onProgress) {
  const total = certificates.length;
  let completed = 0;
  
  for (const cert of certificates) {
    try {
      const filename = `certificado_${cert.docNumero}_${cert.nombres?.replace(/\s+/g, '_') || 'paciente'}.html`;
      downloadCertificateAsHTML(cert, doctorData, signature, filename);
      
      completed++;
      onProgress?.(completed, total);
      
      // Pequeña pausa para no saturar el navegador
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.error(`Error descargando certificado ${cert.docNumero}:`, err);
    }
  }
  
  return { completed, total };
}

/**
 * Genera un ZIP con todos los certificados en formato HTML
 * Nota: Requiere la librería JSZip
 */
export async function downloadCertificatesAsZip(certificates, doctorData, signature, companyName) {
  if (!certificates || certificates.length === 0) {
    throw new Error('No hay certificados para descargar');
  }

  const zip = new JSZip();
  const folderName = companyName 
    ? `certificados_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`
    : `certificados_${new Date().toISOString().split('T')[0]}`;
  
  const folder = zip.folder(folderName);

  // Agregar cada certificado al ZIP
  for (let i = 0; i < certificates.length; i++) {
    const cert = certificates[i];
    const html = _generarCertificadoHTMLNormalizado(cert, doctorData, signature);
    
    const filename = `${String(i + 1).padStart(3, '0')}_certificado_${cert.docNumero}_${cert.nombres?.replace(/\s+/g, '_') || 'paciente'}.html`;
    
    folder.file(filename, html);
  }

  // Agregar índice/README
  const indexContent = generateIndexFile(certificates, companyName);
  folder.file(`00_INDICE_${folderName}.txt`, indexContent);

  // Generar y descargar ZIP
  const content = await zip.generateAsync({ type: 'blob' });
  const zipFilename = `${folderName}.zip`;
  
  saveAs(content, zipFilename);
  
  return {
    filename: zipFilename,
    count: certificates.length,
    folderName
  };
}

/**
 * Genera un archivo de índice con la lista de certificados
 */
function generateIndexFile(certificates, companyName) {
  const date = new Date().toLocaleString('es-CO');
  
  let content = `========================================
CERTIFICADOS DE APTITUD LABORAL
========================================
`;
  
  if (companyName) {
    content += `Empresa: ${companyName}
`;
  }
  
  content += `Fecha de generación: ${date}
Total de certificados: ${certificates.length}

========================================
LISTA DE CERTIFICADOS
========================================

`;
  
  certificates.forEach((cert, index) => {
    content += `${String(index + 1).padStart(3, '0')}. ${cert.nombres || 'N/A'}
   Documento: ${cert.docTipo || 'CC'} ${cert.docNumero || 'N/A'}
   Concepto: ${cert.conceptoAptitud || 'N/A'}
   Fecha examen: ${cert.fechaExamen || 'N/A'}
   Vigencia: ${cert.vigencia || 'N/A'}
   Código verificación: ${cert.codigoVerificacion || 'N/A'}
   
`;
  });

  content += `========================================
Generado por SISO-OcupaSalud
Resolución 1843 de 2025
========================================`;
  
  return content;
}

/**
 * Descarga un informe como archivo HTML
 */
export function downloadReportAsHTML(reportData, filename) {
  const html = generateReportHTML(reportData);
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `informe_${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera HTML para un informe epidemiológico
 */
function generateReportHTML(reportData) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe Epidemiológico - ${reportData.empresaNombre || 'Empresa'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .header { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .section { margin: 20px 0; }
    .data-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .data-table th, .data-table td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    .data-table th { background: #e5e7eb; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #d1d5db; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Informe Epidemiológico</h1>
    <p><strong>Empresa:</strong> ${reportData.empresaNombre || 'N/A'}</p>
    <p><strong>Período:</strong> ${reportData.periodoInicio || 'N/A'} - ${reportData.periodoFin || 'N/A'}</p>
    <p><strong>Total trabajadores evaluados:</strong> ${reportData.totalTrabajadores || 'N/A'}</p>
    <p><strong>Fecha de generación:</strong> ${new Date(reportData.fechaGeneracion).toLocaleString('es-CO')}</p>
  </div>
  
  <div class="section">
    <h2>Resumen Ejecutivo</h2>
    <p>${reportData.resumenEjecutivo || 'No disponible'}</p>
  </div>
  
  <div class="section">
    <h2>Conclusiones</h2>
    <p>${reportData.conclusiones || 'No disponible'}</p>
  </div>
  
  <div class="section">
    <h2>Recomendaciones</h2>
    <p>${reportData.recomendacionesInforme || 'No disponible'}</p>
  </div>
  
  <div class="footer">
    <p>Generado por SISO-OcupaSalud - Resolución 1843 de 2025</p>
    <p>Informe generado por: ${reportData.generadoPorNombre || 'Sistema'}</p>
  </div>
</body>
</html>
  `;
}

/**
 * Descarga una cuenta de cobro como archivo HTML
 */
export function downloadBillAsHTML(billData, filename) {
  const html = generateBillHTML(billData);
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `cuenta_cobro_${billData.numero || Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera HTML para una cuenta de cobro
 */
function generateBillHTML(billData) {
  const items = billData.items || [];
  const total = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cuenta de Cobro - ${billData.numero || 'N/A'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px; }
    .header { background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .company-info { margin-bottom: 20px; }
    .data-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .data-table th, .data-table td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    .data-table th { background: #e5e7eb; font-weight: bold; }
    .total { font-size: 18px; font-weight: bold; color: #059669; text-align: right; margin-top: 20px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #d1d5db; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Cuenta de Cobro</h1>
    <div class="company-info">
      <p><strong>Número:</strong> ${billData.numero || 'N/A'}</p>
      <p><strong>Fecha:</strong> ${billData.fecha || 'N/A'}</p>
      <p><strong>Empresa:</strong> ${billData.empresaNombre || billData.companyName || 'N/A'}</p>
      <p><strong>NIT:</strong> ${billData.empresaNit || billData.nit || 'N/A'}</p>
    </div>
  </div>
  
  <table class="data-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Descripción</th>
        <th>Cantidad</th>
        <th>Valor Unitario</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.descripcion || 'N/A'}</td>
          <td>${item.cantidad || 0}</td>
          <td>$${(item.valorUnit || 0).toLocaleString('es-CO')}</td>
          <td>$${(item.subtotal || 0).toLocaleString('es-CO')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="total">
    TOTAL: $${total.toLocaleString('es-CO')}
  </div>
  
  <div class="footer">
    <p>Generado por SISO-OcupaSalud</p>
    <p>Fecha de generación: ${new Date().toLocaleString('es-CO')}</p>
  </div>
</body>
</html>
  `;
}

/**
 * Descarga una carta de custodia como archivo HTML
 */
export function downloadCustodiaAsHTML(cartaData, filename) {
  // La carta ya tiene su HTML generado
  const html = cartaData.contenidoHTML || generateCustodiaHTML(cartaData);
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `carta_custodia_${cartaData.empresaNombre || 'empresa'}_${cartaData.mes}_${cartaData.anio}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera HTML básico para carta de custodia (fallback)
 */
function generateCustodiaHTML(cartaData) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Carta de Custodia - ${cartaData.empresaNombre || 'Empresa'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #1e40af; }
    .header { margin-bottom: 30px; }
    .content { text-align: justify; }
    .footer { margin-top: 50px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Carta de Custodia de Historias Clínicas</h1>
    <p><strong>Empresa:</strong> ${cartaData.empresaNombre || 'N/A'}</p>
    <p><strong>Período:</strong> ${cartaData.mesTexto || 'N/A'} de ${cartaData.anio || 'N/A'}</p>
    <p><strong>Fecha de carta:</strong> ${cartaData.fechaCarta || 'N/A'}</p>
  </div>
  
  <div class="content">
    <p>Se certifica que las historias clínicas ocupacionales de los trabajadores de 
    ${cartaData.empresaNombre || 'la empresa'} se encuentran bajo custodia electrónica 
    conforme a la Resolución 1072 de 2015 y Resolución 1843 de 2025.</p>
    
    <p>La custodia está garantizada por un periodo de 15 años contados a partir de la 
    fecha de la última atención.</p>
  </div>
  
  <div class="footer">
    <p>Atentamente,</p>
    <p><strong>${cartaData.medicoNombre || 'Médico Ocupacional'}</strong></p>
    <p>Licencia SST: ${cartaData.medicoLicencia || 'N/A'}</p>
  </div>
</body>
</html>
  `;
}

// Exportar todas las funciones
export default {
  generatePDFfromHTML,
  downloadCertificateAsHTML,
  downloadMultipleCertificates,
  downloadCertificatesAsZip,
  downloadReportAsHTML,
  downloadBillAsHTML,
  downloadCustodiaAsHTML
};
