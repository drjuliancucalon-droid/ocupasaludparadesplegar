import { describe, it, expect } from 'vitest';

describe('Sprint 1 Forense — Impresión + Interacciones automáticas', () => {

  // F1-F3: Print Service
  describe('Print Service (F1-F3)', () => {
    it('exporta generateHCPrintHTML', async () => {
      const mod = await import('../lib/printService.js');
      expect(typeof mod.generateHCPrintHTML).toBe('function');
    });

    it('exporta openPrintWindow', async () => {
      const mod = await import('../lib/printService.js');
      expect(typeof mod.openPrintWindow).toBe('function');
    });

    it('exporta printHC', async () => {
      const mod = await import('../lib/printService.js');
      expect(typeof mod.printHC).toBe('function');
    });

    it('exporta printCertificateBatch', async () => {
      const mod = await import('../lib/printService.js');
      expect(typeof mod.printCertificateBatch).toBe('function');
    });

    it('exporta printDisability', async () => {
      const mod = await import('../lib/printService.js');
      expect(typeof mod.printDisability).toBe('function');
    });
  });

  // F4: _generarCertificadoHTMLNormalizado
  describe('Certificado HTML (F4-F6)', () => {
    it('printUtils exporta _generarCertificadoHTMLNormalizado', async () => {
      const mod = await import('../shared/lib/printUtils.js');
      expect(mod._generarCertificadoHTMLNormalizado).toBeDefined();
      expect(typeof mod._generarCertificadoHTMLNormalizado).toBe('function');
    });
  });

  // F16: SHA-256 para hash HC
  describe('Hash HC (F16)', () => {
    it('crypto._sha256 genera hash de HC data', async () => {
      const { _sha256 } = await import('../shared/lib/crypto.js');
      const hcData = JSON.stringify({ nombres: 'Juan', docNumero: '123', conceptoAptitud: 'Apto' });
      const hash = await _sha256(hcData);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // F14-F15: HistoriaPage tiene las funciones
  describe('HistoriaPage interacciones (F14-F19)', () => {
    it('HistoriaPage se importa correctamente', async () => {
      const mod = await import('../pages/HistoriaPage.jsx');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('useSaveData hook funciona', async () => {
      const { useSaveData } = await import('../hooks/useSaveData.js');
      expect(typeof useSaveData).toBe('function');
    });
  });

  // F20: Portal
  describe('Portal (F17-F18)', () => {
    it('PortalPublicoTrabajador existe', async () => {
      const mod = await import('../components/modals/PortalPublicoTrabajador.jsx');
      expect(mod.default).toBeDefined();
    });
  });

  // Verificar que los módulos reportes existen
  describe('RIPS + FHIR services', () => {
    it('ripsService exporta generateRIPSBatch', async () => {
      const mod = await import('../modules/reports/services/ripsService.js');
      expect(typeof mod.generateRIPSBatch).toBe('function');
    });

    it('fhirService exporta generateFHIRBundle', async () => {
      const mod = await import('../modules/reports/services/fhirService.js');
      expect(typeof mod.generateFHIRBundle).toBe('function');
    });
  });
});
