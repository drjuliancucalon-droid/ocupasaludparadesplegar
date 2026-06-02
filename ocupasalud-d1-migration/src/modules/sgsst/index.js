/**
 * SG-SST Module — Barrel Export
 * Sistema de Gestión de Seguridad y Salud en el Trabajo
 * Decreto 1072 de 2015, Resolución 0312 de 2019
 */

// Components
export { default as SSTDashboard } from './components/SSTDashboard';
export { default as PolicyGenerator } from './components/PolicyGenerator';
export { default as RiskMatrix } from './components/RiskMatrix';
export { default as AnnualPlan } from './components/AnnualPlan';
export { default as TrainingModule } from './components/TrainingModule';
export { default as AccidentInvestigation } from './components/AccidentInvestigation';
export { default as InspectionChecklist } from './components/InspectionChecklist';
export { default as DocumentRepository } from './components/DocumentRepository';

// Hooks
export { default as useSGSST, useRiesgos, usePlanes, useCapacitaciones, useInspecciones, useDocumentos, useAccidentes, usePoliticas } from './hooks/useSGSST';

// Services
export { default as sgsstService } from './services/sgsstService';
export {
  calcularCumplimiento,
  calcularIndicadores,
  calcularNivelProbabilidad,
  calcularNivelRiesgo,
  determinarAceptabilidad,
  determinarTipoEmpresa,
  generarPoliticaSST,
  getCompanyConfig,
  setCompanyConfig,
  toggleCumplimientoEstandar,
  riesgosCRUD,
  planesCRUD,
  capacitacionesCRUD,
  inspeccionesCRUD,
  documentosCRUD,
  accidentesCRUD,
  politicasCRUD,
  actividadesCRUD,
  CATEGORIAS_PELIGROS,
  CONTROLES_SUGERIDOS,
  NIVEL_DEFICIENCIA,
  NIVEL_EXPOSICION,
  NIVEL_CONSECUENCIA,
  ESTANDARES_MINIMOS,
  DOCUMENTOS_OBLIGATORIOS,
  CATALOGO_CAPACITACIONES,
  PLANTILLAS_INSPECCION,
} from './services/sgsstService';
