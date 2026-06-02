import { describe, it, expect } from 'vitest';

describe('data — catálogos CIE-10', () => {
  it('CIE10_OCUPACIONAL exporta un array no vacío', async () => {
    const { CIE10_OCUPACIONAL } = await import('../shared/data/cie10.js');
    expect(Array.isArray(CIE10_OCUPACIONAL)).toBe(true);
    expect(CIE10_OCUPACIONAL.length).toBeGreaterThan(50);
  });

  it('cada entrada tiene code y desc', async () => {
    const { CIE10_OCUPACIONAL } = await import('../shared/data/cie10.js');
    const sample = CIE10_OCUPACIONAL[0];
    expect(sample).toHaveProperty('code');
    expect(sample).toHaveProperty('desc');
  });

  it('_buscarCIE10 es una función', async () => {
    const { _buscarCIE10 } = await import('../shared/data/cie10.js');
    expect(typeof _buscarCIE10).toBe('function');
  });
});

describe('data — catálogos CUPS', () => {
  it('CUPS_OCUPACIONAL exporta un array no vacío', async () => {
    const { CUPS_OCUPACIONAL } = await import('../shared/data/cups.js');
    expect(Array.isArray(CUPS_OCUPACIONAL)).toBe(true);
    expect(CUPS_OCUPACIONAL.length).toBeGreaterThan(20);
  });

  it('_buscarCUPS es una función', async () => {
    const { _buscarCUPS } = await import('../shared/data/cups.js');
    expect(typeof _buscarCUPS).toBe('function');
  });
});

describe('data — medicamentos', () => {
  it('MEDICAMENTOS_CO_BASE exporta un array no vacío', async () => {
    const { MEDICAMENTOS_CO_BASE } = await import('../shared/data/medicamentos.js');
    expect(Array.isArray(MEDICAMENTOS_CO_BASE)).toBe(true);
    expect(MEDICAMENTOS_CO_BASE.length).toBeGreaterThan(100);
  });

  it('getAllMeds retorna array', async () => {
    const { getAllMeds } = await import('../shared/data/medicamentos.js');
    expect(typeof getAllMeds).toBe('function');
    const all = getAllMeds();
    expect(Array.isArray(all)).toBe(true);
  });
});

describe('data — restricciones', () => {
  it('RESTRICCIONES_CATALOG exporta datos no vacíos', async () => {
    const { RESTRICCIONES_CATALOG } = await import('../shared/data/restricciones.js');
    expect(RESTRICCIONES_CATALOG).toBeDefined();
    const entries = Array.isArray(RESTRICCIONES_CATALOG) ? RESTRICCIONES_CATALOG : Object.keys(RESTRICCIONES_CATALOG);
    expect(entries.length).toBeGreaterThan(3);
  });
});

describe('data — recomendaciones', () => {
  it('recomendaciones exporta datos', async () => {
    const mod = await import('../shared/data/recomendaciones.js');
    const keys = Object.keys(mod);
    expect(keys.length).toBeGreaterThan(0);
  });
});

describe('data — derivaciones', () => {
  it('DERIVACIONES_CATALOG exporta datos', async () => {
    const { DERIVACIONES_CATALOG } = await import('../shared/data/derivaciones.js');
    expect(DERIVACIONES_CATALOG).toBeDefined();
  });
});

describe('data — planConfig', () => {
  it('planConfig exporta configuración', async () => {
    const mod = await import('../shared/data/planConfig.js');
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});

describe('data — initialStates', () => {
  it('initialStates exporta estados iniciales', async () => {
    const mod = await import('../shared/data/initialStates.js');
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
