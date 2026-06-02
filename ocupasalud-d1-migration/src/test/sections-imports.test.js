import { describe, it, expect } from 'vitest';

// Verificar que cada section se importa sin errores de módulo
// Los ReferenceError de ctx ocurrirán en render, no en import

describe('sections — imports sin errores', () => {
  it('HistoriaOcupacional se importa correctamente', async () => {
    const mod = await import('../sections/HistoriaOcupacional.jsx');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('AgendaSection se importa correctamente', async () => {
    const mod = await import('../sections/AgendaSection.jsx');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('CompaniesSection se importa correctamente', async () => {
    const mod = await import('../sections/CompaniesSection.jsx');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('ReporteSection se importa correctamente', async () => {
    const mod = await import('../sections/ReporteSection.jsx');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('UsersSection se importa correctamente', async () => {
    const mod = await import('../sections/UsersSection.jsx');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
