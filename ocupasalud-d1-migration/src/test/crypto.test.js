import { describe, it, expect } from 'vitest';
import { _sha256, _pbkdf2Hash, _verifyPassword } from '../shared/lib/crypto.js';

describe('crypto — _sha256', () => {
  it('genera hash de 64 caracteres hexadecimales', async () => {
    const h = await _sha256('test');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('mismo input → mismo hash', async () => {
    const a = await _sha256('SISO');
    const b = await _sha256('SISO');
    expect(a).toBe(b);
  });

  it('distinto input → distinto hash', async () => {
    const a = await _sha256('aaa');
    const b = await _sha256('bbb');
    expect(a).not.toBe(b);
  });

  it('hash del string vacío tiene 64 chars', async () => {
    const h = await _sha256('');
    expect(h).toHaveLength(64);
  });

  it('hash conocido de "9207" coincide con _H.adminCode de ocupasalud', async () => {
    const h = await _sha256('9207');
    expect(h).toBe('8cd110accd359cbd1cba8e0d423314c09e531aa4f5fdbc926621198e911fa308');
  });
});

describe('crypto — _pbkdf2Hash', () => {
  it('retorna objeto con hash y salt', async () => {
    const result = await _pbkdf2Hash('password123', '0123456789abcdef');
    expect(result).toHaveProperty('hash');
    expect(result).toHaveProperty('salt');
  });

  it('hash es string hexadecimal no vacío', async () => {
    const result = await _pbkdf2Hash('MiClave@2025', 'aabbccdd11223344');
    expect(typeof result.hash).toBe('string');
    expect(result.hash.length).toBeGreaterThan(20);
  });

  it('mismo password y salt → mismo hash', async () => {
    const r1 = await _pbkdf2Hash('TestPass!1', 'abcd1234abcd1234');
    const r2 = await _pbkdf2Hash('TestPass!1', 'abcd1234abcd1234');
    expect(r1.hash).toBe(r2.hash);
  });

  it('passwords distintos → hashes distintos', async () => {
    const r1 = await _pbkdf2Hash('Pass1!xx', 'abcd1234abcd1234');
    const r2 = await _pbkdf2Hash('Pass2!xx', 'abcd1234abcd1234');
    expect(r1.hash).not.toBe(r2.hash);
  });
});

describe('crypto — _verifyPassword', () => {
  it('verifica password correcta con PBKDF2', async () => {
    const { hash, salt } = await _pbkdf2Hash('MiPass#2025', 'aabbccdd11223344');
    const valid = await _verifyPassword('MiPass#2025', hash, salt);
    expect(valid).toBe(true);
  });

  it('rechaza password incorrecta', async () => {
    const { hash, salt } = await _pbkdf2Hash('MiPass#2025', 'aabbccdd11223344');
    const valid = await _verifyPassword('OtroPass#2025', hash, salt);
    expect(valid).toBe(false);
  });

  it('modo legacy (sin salt) usa SHA-256', async () => {
    const hash = await _sha256('legacy123');
    const valid = await _verifyPassword('legacy123', hash, null);
    expect(valid).toBe(true);
  });
});
