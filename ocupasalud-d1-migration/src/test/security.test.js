import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeInput, validatePasswordStrength, _rl, _sanitize, _safeLogoUrl, _validarContrasena } from '../shared/lib/security.js';

describe('security — sanitizeInput', () => {
  it('escapa caracteres HTML peligrosos', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).not.toContain('<script>');
    expect(sanitizeInput('"hola"')).toContain('&quot;');
  });

  it('no modifica texto limpio', () => {
    expect(sanitizeInput('Hola mundo')).toBe('Hola mundo');
  });

  it('escapa & < > " \' /', () => {
    expect(sanitizeInput('a & b')).toContain('&amp;');
    expect(sanitizeInput("it's")).toContain('&#x27;');
    expect(sanitizeInput('a/b')).toContain('&#x2F;');
  });

  it('retorna no-string sin cambios', () => {
    expect(sanitizeInput(123)).toBe(123);
    expect(sanitizeInput(null)).toBe(null);
  });
});

describe('security — _sanitize', () => {
  it('devuelve string vacío para null/undefined', () => {
    expect(_sanitize(null)).toBe('');
    expect(_sanitize(undefined)).toBe('');
  });

  it('escapa HTML', () => {
    expect(_sanitize('<b>bold</b>')).not.toContain('<b>');
  });
});

describe('security — validatePasswordStrength', () => {
  it('rechaza password corta', () => {
    const r = validatePasswordStrength('Ab1');
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('rechaza sin mayúscula', () => {
    const r = validatePasswordStrength('abcdefgh1');
    expect(r.valid).toBe(false);
  });

  it('acepta password fuerte', () => {
    const r = validatePasswordStrength('MiPass#2025');
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });
});

describe('security — _validarContrasena', () => {
  it('rechaza password corta (<10 chars)', () => {
    const r = _validarContrasena('Ab1!x');
    expect(r.valida).toBe(false);
  });

  it('rechaza password sin especial', () => {
    const r = _validarContrasena('Abcdefgh123');
    expect(r.valida).toBe(false);
  });

  it('rechaza palabras comunes como "password"', () => {
    const r = _validarContrasena('Password123!xx');
    expect(r.valida).toBe(false);
  });

  it('acepta password fuerte', () => {
    const r = _validarContrasena('M1Cl@ve$egura2025');
    expect(r.valida).toBe(true);
  });

  it('retorna fortaleza numérica', () => {
    const r = _validarContrasena('M1Cl@ve$egura2025');
    expect(r.fortaleza).toBeGreaterThanOrEqual(0);
  });
});

describe('security — _rl (rate limiting)', () => {
  beforeEach(() => {
    localStorage.clear();
    _rl.reset();
  });

  it('empieza sin bloqueo', () => {
    expect(_rl.isBlocked()).toBeFalsy();
    expect(_rl.getAttempts()).toBe(0);
  });

  it('registra intentos fallidos', () => {
    _rl.recordFailure();
    expect(_rl.getAttempts()).toBe(1);
  });

  it('bloquea después de 5 intentos', () => {
    for (let i = 0; i < 5; i++) _rl.recordFailure();
    expect(_rl.isBlocked()).toBe(true);
    expect(_rl.getRemainingMin()).toBeGreaterThan(0);
  });

  it('reset limpia bloqueo', () => {
    for (let i = 0; i < 5; i++) _rl.recordFailure();
    _rl.reset();
    expect(_rl.isBlocked()).toBeFalsy();
    expect(_rl.getAttempts()).toBe(0);
  });
});

describe('security — _safeLogoUrl', () => {
  it('acepta https://', () => {
    expect(_safeLogoUrl('https://example.com/logo.png')).toBe('https://example.com/logo.png');
  });

  it('acepta data:image/', () => {
    expect(_safeLogoUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('rechaza javascript:', () => {
    expect(_safeLogoUrl('javascript:alert(1)')).toBe('');
  });

  it('rechaza vacío y null', () => {
    expect(_safeLogoUrl('')).toBe('');
    expect(_safeLogoUrl(null)).toBe('');
  });
});
