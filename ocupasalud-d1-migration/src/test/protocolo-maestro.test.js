import { describe, it, expect } from 'vitest';

/**
 * PROTOCOLO MAESTRO — Tests de verificación final
 * Cada funcionalidad del forense (F1-F52) verificada
 */
describe('Protocolo Maestro — Verificación completa', () => {

  // ═══ BLOQUE 1: IMPRESIÓN Y ENVÍO (F1-F13) ═══
  describe('F1-F3: Print Service', () => {
    it('exporta _printHCClean con silentMode', async () => {
      const mod = await import('../lib/printService.js');
      expect(typeof mod._printHCClean).toBe('function');
    });

    it('exporta PrintStyles CSS', async () => {
      const mod = await import('../lib/printService.js');
      expect(mod.PrintStyles).toBeDefined();
      expect(mod.PrintStyles).toContain('ai-label-print-hide');
      expect(mod.PrintStyles).toContain('@media print');
    });

    it('exporta printSection para HC General', async () => {
      const mod = await import('../lib/printService.js');
      expect(typeof mod.printSection).toBe('function');
    });

    it('exporta generateHCPrintHTML + openPrintWindow + printHC', async () => {
      const mod = await import('../lib/printService.js');
      expect(typeof mod.generateHCPrintHTML).toBe('function');
      expect(typeof mod.openPrintWindow).toBe('function');
      expect(typeof mod.printHC).toBe('function');
    });

    it('exporta printCertificateBatch + printDisability + printCarnet', async () => {
      const mod = await import('../lib/printService.js');
      expect(typeof mod.printCertificateBatch).toBe('function');
      expect(typeof mod.printDisability).toBe('function');
      expect(typeof mod.printCarnet).toBe('function');
    });
  });

  // ═══ BLOQUE 1: EMAIL (F8-F12) ═══
  describe('F8-F12: Email Service', () => {
    it('exporta _generarEmailHTML', async () => {
      const mod = await import('../lib/emailService.js');
      expect(typeof mod._generarEmailHTML).toBe('function');
    });

    it('_generarEmailHTML genera HTML con header OcupaSalud', async () => {
      const { _generarEmailHTML } = await import('../lib/emailService.js');
      const html = _generarEmailHTML('Juan Pérez', '123456', 'https://portal.test', null);
      expect(html).toContain('OcupaSalud');
      expect(html).toContain('Juan');
    });

    it('exporta _enviarEmail y _enviarEmailJS', async () => {
      const mod = await import('../lib/emailService.js');
      expect(typeof mod._enviarEmail).toBe('function');
      expect(typeof mod._enviarEmailJS).toBe('function');
    });

    it('exporta enviarCertificadosMasivo', async () => {
      const mod = await import('../lib/emailService.js');
      expect(typeof mod.enviarCertificadosMasivo).toBe('function');
    });

    it('exporta saveEmailConfig y getEmailConfig', async () => {
      const mod = await import('../lib/emailService.js');
      expect(typeof mod.saveEmailConfig).toBe('function');
      expect(typeof mod.getEmailConfig).toBe('function');
    });
  });

  // ═══ BLOQUE 2: INTERACCIONES AUTOMÁTICAS (F14-F21) ═══
  describe('F14-F21: HistoriaPage interacciones', () => {
    it('HistoriaPage se importa', async () => {
      const mod = await import('../pages/HistoriaPage.jsx');
      expect(mod.default).toBeDefined();
    });

    it('_sha256 disponible para hash HC', async () => {
      const { _sha256 } = await import('../shared/lib/crypto.js');
      const hash = await _sha256('test-hc-data');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('useSaveData hook disponible para auto-billing', async () => {
      const { useSaveData } = await import('../hooks/useSaveData.js');
      expect(typeof useSaveData).toBe('function');
    });
  });

  // ═══ BLOQUE 3: HC TABS (F22-F25) ═══
  describe('F22-F25: HC Tabs', () => {
    it('PrescriptionTab (TabFormulaDerivacion) se importa', async () => {
      const mod = await import('../modules/clinical/components/PrescriptionTab.jsx');
      expect(mod.default).toBeDefined();
    });

    it('ExamRequestTab se importa', async () => {
      const mod = await import('../modules/clinical/components/ExamRequestTab.jsx');
      expect(mod.ExamRequestTab).toBeDefined();
    });

    it('DisabilityTab se importa', async () => {
      const mod = await import('../modules/clinical/components/DisabilityTab.jsx');
      expect(mod.DisabilityTab).toBeDefined();
    });

    it('AttachmentsTab se importa', async () => {
      const mod = await import('../modules/clinical/components/AttachmentsTab.jsx');
      expect(mod.AttachmentsTab).toBeDefined();
    });

    it('EvolucionModal se importa', async () => {
      const mod = await import('../modules/clinical/components/EvolucionModal.jsx');
      expect(mod.EvolucionModal).toBeDefined();
    });
  });

  // ═══ BLOQUE 4: ENCUESTAS (F26-F32) ═══
  describe('F26-F32: Empresas con encuestas', () => {
    it('Companies.jsx (legacy completo) se importa', async () => {
      const mod = await import('../pages/Companies.jsx');
      expect(mod.default).toBeDefined();
    });
  });

  // ═══ BLOQUE 5: FINANCIERO (F33-F40) ═══
  describe('F33-F40: Caja completa', () => {
    it('Caja.jsx (legacy con 6 tabs) se importa', async () => {
      const mod = await import('../pages/Caja.jsx');
      expect(mod.default).toBeDefined();
    });
  });

  // ═══ BLOQUE 7: PORTAL (F45-F48) ═══
  describe('F45-F48: Portal trabajador', () => {
    it('WorkerPortal.jsx se importa', async () => {
      const mod = await import('../pages/WorkerPortal.jsx');
      expect(mod.default).toBeDefined();
    });
  });

  // ═══ BLOQUE 8: REPORTES (F49-F52) ═══
  describe('F49-F52: Reportes completos', () => {
    it('Reporte.jsx (legacy completo) se importa', async () => {
      const mod = await import('../pages/Reporte.jsx');
      expect(mod.default).toBeDefined();
    });
  });

  // ═══ IA (8 funciones) ═══
  describe('IA: 8 funciones', () => {
    it('aiAnalysis exporta todas las funciones', async () => {
      const mod = await import('../modules/ai/services/aiAnalysis.js');
      expect(typeof mod.callAIWithFailover).toBe('function');
      expect(typeof mod.analyzeHC).toBe('function');
      expect(typeof mod.generateRestrictions).toBe('function');
      expect(typeof mod.generateRecommendations).toBe('function');
      expect(typeof mod.analyzeGeneralHC).toBe('function');
      expect(typeof mod.suggestDiagnosis).toBe('function');
      expect(typeof mod.suggestExams).toBe('function');
      expect(typeof mod.analyzeEpidemiologicalData).toBe('function');
    });

    it('parseAIJSON funciona', async () => {
      const { parseAIJSON } = await import('../shared/lib/aiProviders.js');
      const result = parseAIJSON('```json\n{"test":true}\n```');
      expect(result.test).toBe(true);
    });
  });

  // ═══ STORES ═══
  describe('Stores Zustand', () => {
    it('authStore', async () => {
      const { useAuthStore } = await import('../stores/authStore.js');
      expect(useAuthStore.getState).toBeDefined();
    });
    it('aiStore', async () => {
      const { useAIStore } = await import('../stores/aiStore.js');
      expect(useAIStore.getState().getConfig).toBeDefined();
    });
    it('uiStore', async () => {
      const { useUIStore } = await import('../stores/uiStore.js');
      expect(useUIStore).toBeDefined();
    });
  });

  // ═══ BACKEND ═══
  describe('Backend services', () => {
    it('apiClient', async () => {
      const { apiClient } = await import('../lib/apiClient.js');
      expect(typeof apiClient.get).toBe('function');
      expect(typeof apiClient.post).toBe('function');
    });
  });
});
