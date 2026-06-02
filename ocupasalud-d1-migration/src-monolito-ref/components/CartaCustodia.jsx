// CartaCustodia.jsx
// Componente para generar y visualizar la Carta de Custodia de Historias Clínicas
// Cumple con Res. 1995/1999, Ley 1581/2012 y Res. 1843/2025

import React from 'react';
import { FileText, Building2, User, Calendar, Shield, Printer, Download } from 'lucide-react';

export const CartaCustodia = ({ 
  empresa,           // Objeto empresa { nombre, nit, dv, direccion, telefono }
  paciente,           // Objeto paciente individual (opcional para carta individual)
  pacientes,          // Array de pacientes para carta por empresa
  doctorData,         // Datos del médico { nombre, titulo, licencia, ciudad, cedula }
  fecha,             // Fecha de generación
  periodo,           // Período que cubre
  onPrint,           // Función para imprimir
  onDownload,        // Función para descargar PDF
}) => {
  const hoy = fecha || new Date().toISOString().split('T')[0];
  const doctor = doctorData || {};
  
  // Generar lista de pacientes
  const listaPacientes = pacientes || (paciente ? [paciente] : []);
  const totalPacientes = listaPacientes.length;

  // Texto de la carta
  const generarTextoCustodia = () => {
    const empresaInfo = empresa?.nombre ? `
    EMPRESA: ${empresa.nombre}
    NIT: ${empresa.nit}${empresa.dv ? '-' + empresa.dv : ''}
    ${empresa.direccion ? 'DIRECCIÓN: ' + empresa.direccion : ''}
    ${empresa.telefono ? 'TELÉFONO: ' + empresa.telefono : ''}
    ` : '';
    
    const particularInfo = !empresa?.nombre ? `
    ATENCIÓN: PARTICULAR / PACIENTE INDIVIDUAL
    ` : '';

    return `
POPAYÁN, ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}

Señores
${empresa?.nombre || 'TRABAJADOR(A)'}
${empresa?.nit ? 'NIT: ' + empresa.nit + (empresa.dv ? '-' + empresa.dv : '') : ''}
${empresa?.direccion || ''}
Ciudad

ASUNTO: CARTA DE CUSTODIA DE HISTORIAS CLÍNICAS OCUPACIONALES - CUMPLIMIENTO RESOLUCIÓN 1995/1999

Respetados señores:

Por medio de la presente, quien suscribe Dr(a). ${doctor.nombre || '[NOMBRE DEL MÉDICO]'}, 
identificado(a) con C.C. ${doctor.cedula || '[CEDULA]'}, 
titulado(a) como ${doctor.titulo || '[TÍTULO PROFESIONAL]'}, 
con Licencia de Funcionamiento No. ${doctor.licencia || '[LICENCIA]'} 
expedida por la autoridad competente, me permito informar:

PRIMERO: Que de conformidad con lo establecido en la Resolución 1995 de 1999 del Ministerio de Salud, 
y demás normas complementarias, este profesional de la salud ha custody de las historias clínicas 
ocupacionales de los trabajadores evaluados en el marco del Programa de Vigilancia Epidemiológica 
y los Exámenes Médicos Ocupacionales.

SEGUNDO: Que la custodia de las historias clínicas se extiende por un período mínimo de VEINTE (20) AÑOS, 
contados a partir de la fecha de cierre de cada historia clínica, de conformidad con lo establecido 
en la normatividad vigente.

TERCERO: Que las historias clínicas bajo mi custodia contienen:
- Exámenes médicos ocupacionales de ingreso, periódicos y egreso
- Evaluaciones clínicas completas
- Exámenes paraclinicos (audiometría, espirometría, visiometría, laboratorio clínico, etc.)
- Conceptos de aptitud laboral
- Recomendaciones y restricciones laborales
- Plans de vigilancia epidemiológica

CUARTO: Que la información contenida en las historias clínicas es CONFIDENCIAL y se encuentra 
protegida por la Ley 1581 de 2012 (Ley de Protección de Datos Personales) y el Decreto 1377 de 2013. 
Su acceso está limitado exclusivamente al trabajador titular, al empleador en lo que respecta a la 
aptitud laboral, y a las autoridades sanitarias competentes.

QUINTO: Para efectos de consultas, solicitudes o requerimientos relacionados con las historias clínicas 
bajo mi custodia, los interesados deberán comunicarse a los contactos indicados en el encabezamiento de 
esta comunicación, presentando documento de identificación válido.

SEXTO: Que mediante la Resolución 1843 de 2025 del Ministerio de Salud y Protección Social, se 
establecen los lineamientos actuales para la realización y custodia de las historias clínicas ocupacionales, 
norma que este consultorio cumple en su totalidad.

SÉPTIMO: El total de historias clínicas ocupacionales bajo mi custodia correspondientes a ${empresa?.nombre || 'esta atención'} 
es de ${totalPacientes} trabajador(es) evaluado(s) en el período ${periodo || 'reciente'}.

Sin otro particular, cordially saludo,

___________________________
Dr(a). ${doctor.nombre || '[NOMBRE DEL MÉDICO]'}
${doctor.titulo || '[TÍTULO]'}
Licencia: ${doctor.licencia || '[LICENCIA]'}
${doctor.ciudad || 'Popayán'}, Colombia
`.trim();
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg print:shadow-none print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-800">CARTA DE CUSTODIA</h2>
            <p className="text-xs text-gray-500">Historias Clínicas Ocupacionales</p>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          {onPrint && (
            <button onClick={onPrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          )}
          {onDownload && (
            <button onClick={onDownload} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200">
              <Download className="w-4 h-4" /> Descargar
            </button>
          )}
        </div>
      </div>

      {/* Info Header */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase">Fecha</p>
            <p className="font-bold">{new Date(hoy).toLocaleDateString('es-CO')}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase">Período</p>
            <p className="font-bold">{periodo || 'No especificado'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase">Total HC</p>
            <p className="font-bold">{totalPacientes} historias</p>
          </div>
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase">Empresa</p>
            <p className="font-bold">{empresa?.nombre || 'Particular'}</p>
          </div>
        </div>
      </div>

      {/* Contenido de la carta */}
      <div className="prose prose-sm max-w-none">
        {generarTextoCustodia().split('\n').map((linea, i) => (
          <p 
            key={i} 
            className={`${linea.match(/^[A-ZÁÉÍÓÚÑ\s]+:$/) ? 'font-bold mt-4 mb-2 text-gray-800' : 'text-gray-700 mb-2 text-justify'} ${linea.trim() === '' ? 'h-4' : ''}`}
          >
            {linea}
          </p>
        ))}
      </div>

      {/* Firma */}
      <div className="mt-8 pt-6 border-t">
        <div className="flex justify-between items-end">
          <div className="w-1/2">
            <div className="h-20 border-b border-gray-300 mb-2"></div>
            <p className="text-xs font-bold">Dr(a). {doctor.nombre || '[FIRMA DEL MÉDICO]'}</p>
            <p className="text-xs text-gray-600">{doctor.titulo || '[TÍTULO PROFESIONAL]'}</p>
            <p className="text-xs text-gray-600">Licencia: {doctor.licencia || '[No. LICENCIA]'}</p>
          </div>
          <div className="w-1/2 text-right">
            <p className="text-[10px] text-gray-400">
              Resolución 1995/1999 · Ley 1581/2012 · Resolución 1843/2025
            </p>
            <p className="text-[10px] text-gray-400">
              Custodia mínima: 20 años
            </p>
          </div>
        </div>
      </div>

      {/* Lista de pacientes si aplica */}
      {pacientes && pacientes.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-bold text-sm mb-3">Relación de Trabajadores evaluados:</h4>
          <div className="max-h-40 overflow-y-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Documento</th>
                  <th className="p-2 text-left">Nombre</th>
                  <th className="p-2 text-left">Cargo</th>
                  <th className="p-2 text-left">Fecha HC</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">{p.docNumero || p.docTipo + ' ' + p.docNumero || '-'}</td>
                    <td className="p-2">{p.nombres || '-'}</td>
                    <td className="p-2">{p.cargo || '-'}</td>
                    <td className="p-2">{p.fechaExamen || p.fecha || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">Total: {totalPacientes} trabajadores</p>
        </div>
      )}
    </div>
  );
};

export default CartaCustodia;
