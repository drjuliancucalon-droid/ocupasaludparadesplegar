/**
 * RIPS Service - GeneraciÃ³n RIPS JSON (ResoluciÃ³n 2275/2023)
 * Registro Individual de PrestaciÃ³n de Servicios de Salud
 */
import { validarRIPSPaciente, _generarRIPSJson as generarRIPSJson, _descargarRIPSJson as descargarRIPSJson } from '../../../shared/lib/normativa';

export const generateRIPSBatch = (patients, doctorData, periodo) => {
  return generarRIPSJson ? generarRIPSJson(patients, doctorData, periodo) : null;
};

export const downloadRIPSBatch = (patients, doctorData, periodo) => {
  if (descargarRIPSJson) return descargarRIPSJson(patients, doctorData, periodo);

  // Fallback: build basic RIPS structure
  const rips = {
    version: 'RIPS-JSON-2275-2023',
    periodo: periodo || new Date().toISOString().substring(0, 7),
    prestador: {
      nombre: doctorData?.nombre || '',
      nit: doctorData?.cedula || '',
      codigoPrestador: doctorData?.codigoHabilitacion || '',
    },
    registros: patients.map((p) => ({
      tipoDocumento: p.docTipo || 'CC',
      numDocumento: p.docNumero || '',
      nombres: p.nombres || '',
      fechaNacimiento: p.fechaNacimiento || '',
      sexo: p.genero === 'Masculino' ? 'M' : p.genero === 'Femenino' ? 'F' : 'U',
      fechaConsulta: p.fechaExamen || '',
      codigoDiagnosticoPrincipal: (p.diagnostico1 || '').split(' ')[0] || '',
      tipoConsulta: p.tipoExamen === 'INGRESO' ? '01' : '02',
      finalidad: '10', // ValoraciÃ³n integral
      causaExterna: '13', // Enfermedad profesional / AT
    })),
    totalRegistros: patients.length,
    generadoEl: new Date().toISOString(),
  };

  const json = JSON.stringify(rips, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RIPS_${periodo || 'periodo'}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return rips;
};

export const validateRIPSPatient = (patient) => {
  if (validarRIPSPaciente) return validarRIPSPaciente(patient);
  const errors = [];
  if (!patient.docNumero) errors.push('Documento requerido');
  if (!patient.nombres) errors.push('Nombre requerido');
  if (!patient.fechaNacimiento) errors.push('Fecha nacimiento requerida');
  return { valid: errors.length === 0, errors };
};

