import { describe, it, expect } from 'vitest';

describe('HC General — features verificadas vs ocupasalud', () => {
  it('GeneralHC componente se importa', async () => {
    const mod = await import('../modules/clinical/components/GeneralHC.jsx');
    expect(mod.default || mod.GeneralHC).toBeDefined();
  });

  it('HistoriaGeneralPage se importa', async () => {
    const mod = await import('../pages/HistoriaGeneralPage.jsx');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('initialStates tiene estado inicial de HC General', async () => {
    const mod = await import('../shared/data/initialStates.js');
    // Puede ser initialGeneralPatientState o reutilizar el ocupacional
    const state = mod.initialGeneralPatientState || mod.initialOccupPatientState;
    expect(state).toBeDefined();
    expect(state).toHaveProperty('nombres');
    expect(state).toHaveProperty('docNumero');
  });
});
