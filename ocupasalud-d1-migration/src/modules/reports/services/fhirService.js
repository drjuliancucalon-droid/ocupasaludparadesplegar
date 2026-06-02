/**
 * FHIR Service - Generación de bundles HL7 FHIR R4
 * Interoperabilidad para historia clínica electrónica
 */

export const generateFHIRPatient = (patient) => ({
  resourceType: 'Patient',
  id: patient.id || `pat-${patient.docNumero}`,
  identifier: [{
    system: 'urn:co:siso:id',
    value: patient.docNumero || '',
    type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: patient.docTipo === 'CC' ? 'NNCOL' : 'PPN' }] },
  }],
  name: [{ text: patient.nombres || '', family: (patient.nombres || '').split(' ').slice(-1)[0], given: (patient.nombres || '').split(' ').slice(0, -1) }],
  gender: patient.genero === 'Masculino' ? 'male' : patient.genero === 'Femenino' ? 'female' : 'other',
  birthDate: patient.fechaNacimiento || '',
  telecom: [
    patient.celular ? { system: 'phone', value: patient.celular } : null,
    patient.emailPaciente ? { system: 'email', value: patient.emailPaciente } : null,
  ].filter(Boolean),
});

export const generateFHIRPractitioner = (doctor) => ({
  resourceType: 'Practitioner',
  id: `doc-${(doctor?.cedula || '').replace(/\D/g, '')}`,
  identifier: [{ system: 'urn:co:siso:medico', value: doctor?.cedula || '' }],
  name: [{ text: doctor?.nombre || '' }],
  qualification: [{ code: { text: doctor?.titulo || 'Médico Especialista en Salud Ocupacional' } }],
});

export const generateFHIRObservation = (patient, type) => ({
  resourceType: 'Observation',
  status: 'final',
  category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'exam' }] }],
  code: { text: type === 'vital-signs' ? 'Signos vitales' : 'Examen físico' },
  subject: { reference: `Patient/${patient.id || patient.docNumero}` },
  effectiveDateTime: patient.fechaExamen || new Date().toISOString(),
  component: [
    patient.tensionArterial ? { code: { text: 'TA' }, valueString: patient.tensionArterial } : null,
    patient.frecuenciaCardiaca ? { code: { text: 'FC' }, valueString: patient.frecuenciaCardiaca } : null,
    patient.imc ? { code: { text: 'IMC' }, valueString: patient.imc } : null,
  ].filter(Boolean),
});

export const generateFHIRBundle = (patient, doctor) => ({
  resourceType: 'Bundle',
  type: 'collection',
  timestamp: new Date().toISOString(),
  entry: [
    { resource: generateFHIRPatient(patient) },
    { resource: generateFHIRPractitioner(doctor) },
    { resource: generateFHIRObservation(patient, 'vital-signs') },
  ],
  meta: { source: 'SISO-OcupaSalud-v4', lastUpdated: new Date().toISOString() },
});

export const downloadFHIRBundle = (patient, doctor) => {
  const bundle = generateFHIRBundle(patient, doctor);
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FHIR_${patient.docNumero || 'paciente'}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return bundle;
};
