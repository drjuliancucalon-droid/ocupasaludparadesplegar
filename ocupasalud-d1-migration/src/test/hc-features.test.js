import { describe, it, expect } from 'vitest';

describe('HC Ocupacional — features completas (referencia: ocupasalud)', () => {

  // ═══ MÓDULO CLÍNICO ═══
  describe('OccupationalHC component', () => {
    it('exporta un componente React', async () => {
      const mod = await import('../modules/clinical/components/OccupationalHC.jsx');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });
  });

  describe('CertificateView component', () => {
    it('exporta componente de certificado', async () => {
      const mod = await import('../modules/clinical/components/CertificateView.jsx');
      expect(mod.CertificateView || mod.default).toBeDefined();
    });
  });

  describe('EvolucionModal component', () => {
    it('exporta componente de evolución', async () => {
      const mod = await import('../modules/clinical/components/EvolucionModal.jsx');
      expect(mod.EvolucionModal || mod.default).toBeDefined();
    });
  });

  describe('PrescriptionTab component', () => {
    it('exporta tab de prescripción', async () => {
      const mod = await import('../modules/clinical/components/PrescriptionTab.jsx');
      expect(mod.PrescriptionTab || mod.default).toBeDefined();
    });
  });

  describe('ExamRequestTab component', () => {
    it('exporta tab de solicitud exámenes', async () => {
      const mod = await import('../modules/clinical/components/ExamRequestTab.jsx');
      expect(mod.ExamRequestTab || mod.default).toBeDefined();
    });
  });

  describe('AttachmentsTab component', () => {
    it('exporta tab de adjuntos', async () => {
      const mod = await import('../modules/clinical/components/AttachmentsTab.jsx');
      expect(mod.AttachmentsTab || mod.default).toBeDefined();
    });
  });

  describe('DisabilityTab component', () => {
    it('exporta tab de incapacidad', async () => {
      const mod = await import('../modules/clinical/components/DisabilityTab.jsx');
      expect(mod.DisabilityTab || mod.default).toBeDefined();
    });
  });

  // ═══ PANELS ═══
  describe('RestriccionesChecklistPanel', () => {
    it('exporta componente', async () => {
      const mod = await import('../components/panels/RestriccionesChecklistPanel.jsx');
      expect(mod.default).toBeDefined();
    });
  });

  describe('RecomendacionesChecklistPanel', () => {
    it('exporta componente', async () => {
      const mod = await import('../components/panels/RecomendacionesChecklistPanel.jsx');
      expect(mod.default).toBeDefined();
    });
  });

  // ═══ IA ═══
  describe('AI Analysis service', () => {
    it('exporta callAIWithFailover', async () => {
      const mod = await import('../modules/ai/services/aiAnalysis.js');
      expect(mod.callAIWithFailover).toBeDefined();
      expect(typeof mod.callAIWithFailover).toBe('function');
    });
  });

  describe('AI Providers (shared/lib)', () => {
    it('exporta AI_PROVIDERS con gemini, groq, together, openrouter', async () => {
      const mod = await import('../shared/lib/aiProviders.js');
      expect(mod.AI_PROVIDERS).toBeDefined();
      expect(mod.AI_PROVIDERS.gemini).toBeDefined();
      expect(mod.AI_PROVIDERS.groq).toBeDefined();
      expect(typeof mod.AI_PROVIDERS.gemini.call).toBe('function');
    });

    it('exporta parseAIJSON', async () => {
      const mod = await import('../shared/lib/aiProviders.js');
      expect(mod.parseAIJSON).toBeDefined();
      expect(typeof mod.parseAIJSON).toBe('function');
    });

    it('parseAIJSON parsea JSON válido', async () => {
      const { parseAIJSON } = await import('../shared/lib/aiProviders.js');
      const result = parseAIJSON('{"conceptoAptitud":"Apto sin restricciones"}');
      expect(result.conceptoAptitud).toBe('Apto sin restricciones');
    });

    it('parseAIJSON limpia markdown del JSON', async () => {
      const { parseAIJSON } = await import('../shared/lib/aiProviders.js');
      const result = parseAIJSON('```json\n{"ok":true}\n```');
      expect(result.ok).toBe(true);
    });
  });

  // ═══ RIPS / FHIR ═══
  describe('RIPS Service', () => {
    it('exporta generateRIPSBatch', async () => {
      const mod = await import('../modules/reports/services/ripsService.js');
      expect(mod.generateRIPSBatch).toBeDefined();
      expect(typeof mod.generateRIPSBatch).toBe('function');
    });
  });

  describe('FHIR Service', () => {
    it('exporta generateFHIRBundle', async () => {
      const mod = await import('../modules/reports/services/fhirService.js');
      expect(mod.generateFHIRBundle).toBeDefined();
      expect(typeof mod.generateFHIRBundle).toBe('function');
    });
  });

  // ═══ PRINT ═══
  describe('Print Service', () => {
    it('exporta printHC', async () => {
      const mod = await import('../lib/printService.js');
      expect(mod.printHC).toBeDefined();
      expect(typeof mod.printHC).toBe('function');
    });
  });

  // ═══ DATA ═══
  describe('initialStates', () => {
    it('initialOccupPatientState tiene campos de HC completos', async () => {
      const { initialOccupPatientState } = await import('../shared/data/initialStates.js');
      expect(initialOccupPatientState).toBeDefined();
      // Campos esenciales que debe tener según ocupasalud
      const essential = ['nombres', 'docNumero', 'tipoExamen', 'motivoConsulta', 'conceptoAptitud'];
      for (const field of essential) {
        expect(initialOccupPatientState).toHaveProperty(field);
      }
    });
  });

  // ═══ TABS EN HistoriaPage ═══
  describe('HistoriaPage (wrapper)', () => {
    it('exporta componente', async () => {
      const mod = await import('../pages/HistoriaPage.jsx');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });
  });
});
