import { describe, it, expect } from 'vitest';

/**
 * RUNTIME CRASH TESTS — Verifica que TODOS los módulos se importan sin error.
 * Si alguno falla con "X is not defined", aparece aquí.
 * Esto simula lo que el browser hace al cargar cada componente.
 */
describe('Runtime — NO undefined reference errors', () => {

  // HC Pages (los que crasheaban)
  it('HistoriaPage importa sin error', async () => {
    const mod = await import('../pages/HistoriaPage.jsx');
    expect(mod.default).toBeDefined();
  });

  it('HistoriaGeneralPage importa sin error', async () => {
    const mod = await import('../pages/HistoriaGeneralPage.jsx');
    expect(mod.default).toBeDefined();
  });

  // Clinical components
  it('OccupationalHC importa sin error', async () => {
    const mod = await import('../modules/clinical/components/OccupationalHC.jsx');
    expect(mod.default || mod.OccupationalHC).toBeDefined();
  });

  it('GeneralHC importa sin error', async () => {
    const mod = await import('../modules/clinical/components/GeneralHC.jsx');
    expect(mod.default || mod.GeneralHC).toBeDefined();
  });

  // TABS — estos son los que crasheaban
  it('TabFormulaDerivacion importa sin error (SPECIALTIES_LIST fix)', async () => {
    const mod = await import('../components/forms/TabFormulaDerivacion.jsx');
    expect(mod.default || mod.TabFormulaDerivacion).toBeDefined();
  });

  it('PrescriptionTab importa sin error', async () => {
    const mod = await import('../modules/clinical/components/PrescriptionTab.jsx');
    expect(mod.default || mod.PrescriptionTab).toBeDefined();
  });

  it('ExamRequestTab importa sin error', async () => {
    const mod = await import('../modules/clinical/components/ExamRequestTab.jsx');
    expect(mod.default || mod.ExamRequestTab).toBeDefined();
  });

  it('AttachmentsTab importa sin error', async () => {
    const mod = await import('../modules/clinical/components/AttachmentsTab.jsx');
    expect(mod.default || mod.AttachmentsTab).toBeDefined();
  });

  it('DisabilityTab importa sin error', async () => {
    const mod = await import('../modules/clinical/components/DisabilityTab.jsx');
    expect(mod.default || mod.DisabilityTab).toBeDefined();
  });

  it('EvolucionModal importa sin error', async () => {
    const mod = await import('../modules/clinical/components/EvolucionModal.jsx');
    expect(mod.default || mod.EvolucionModal).toBeDefined();
  });

  it('CertificateView importa sin error', async () => {
    const mod = await import('../modules/clinical/components/CertificateView.jsx');
    expect(mod.default || mod.CertificateView).toBeDefined();
  });

  // Panels
  it('RestriccionesChecklistPanel importa sin error', async () => {
    const mod = await import('../components/panels/RestriccionesChecklistPanel.jsx');
    expect(mod.default).toBeDefined();
  });

  it('RecomendacionesChecklistPanel importa sin error', async () => {
    const mod = await import('../components/panels/RecomendacionesChecklistPanel.jsx');
    expect(mod.default).toBeDefined();
  });

  it('AIConfigPanel importa sin error', async () => {
    const mod = await import('../components/panels/AIConfigPanel.jsx');
    expect(mod.default).toBeDefined();
  });

  // Services
  it('printService importa sin error', async () => {
    const mod = await import('../lib/printService.js');
    expect(mod.printHC).toBeDefined();
  });

  it('aiAnalysis importa sin error', async () => {
    const mod = await import('../modules/ai/services/aiAnalysis.js');
    expect(mod.callAIWithFailover).toBeDefined();
  });

  it('printUtils importa sin error', async () => {
    const mod = await import('../shared/lib/printUtils.js');
    expect(mod._generarCertificadoHTMLNormalizado).toBeDefined();
  });

  // Other pages that might crash
  it('DashboardPage importa', async () => {
    const mod = await import('../pages/DashboardPage.jsx');
    expect(mod.default).toBeDefined();
  });

  it('PatientsPage importa', async () => {
    const mod = await import('../pages/PatientsPage.jsx');
    expect(mod.default).toBeDefined();
  });

  it('LoginPage importa', async () => {
    const mod = await import('../pages/LoginPage.jsx');
    expect(mod.default).toBeDefined();
  });
});
