import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  timingSafeStringEqual,
  verifyCredentials,
  generateCookieToken,
  verifyCookieToken,
} from './credentialUtils.js';

describe('timingSafeStringEqual', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeStringEqual('hello', 'hello')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(timingSafeStringEqual('hello', 'world')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(timingSafeStringEqual('short', 'much longer string')).toBe(false);
  });

  it('returns true for empty strings', () => {
    expect(timingSafeStringEqual('', '')).toBe(true);
  });

  it('handles unicode correctly', () => {
    expect(timingSafeStringEqual('über', 'über')).toBe(true);
    expect(timingSafeStringEqual('über', 'uber')).toBe(false);
  });
});

describe('verifyCredentials', () => {
  beforeEach(() => {
    process.env.EDITOR_ADMIN = 'admin';
    process.env.EDITOR_PASSWORD = 'secret';
  });

  afterEach(() => {
    delete process.env.EDITOR_ADMIN;
    delete process.env.EDITOR_PASSWORD;
  });

  it('returns true for correct credentials', () => {
    expect(verifyCredentials('admin', 'secret')).toBe(true);
  });

  it('returns false for wrong password', () => {
    expect(verifyCredentials('admin', 'wrong')).toBe(false);
  });

  it('returns false for wrong username', () => {
    expect(verifyCredentials('wrong', 'secret')).toBe(false);
  });

  it('returns false for both wrong', () => {
    expect(verifyCredentials('wrong', 'wrong')).toBe(false);
  });
});

describe('generateCookieToken + verifyCookieToken', () => {
  beforeEach(() => {
    process.env.EDITOR_ADMIN = 'admin';
    process.env.EDITOR_PASSWORD = 'secret';
  });

  afterEach(() => {
    delete process.env.EDITOR_ADMIN;
    delete process.env.EDITOR_PASSWORD;
  });

  it('round-trips successfully', () => {
    const token = generateCookieToken('admin');
    expect(verifyCookieToken(token)).toBe(true);
  });

  it('rejects a tampered token', () => {
    const token = generateCookieToken('admin');
    const tampered = token.slice(0, -2) + 'XX';
    expect(verifyCookieToken(tampered)).toBe(false);
  });

  it('rejects a token for wrong username', () => {
    const token = generateCookieToken('attacker');
    expect(verifyCookieToken(token)).toBe(false);
  });

  it('rejects invalid base64', () => {
    expect(verifyCookieToken('%%%not-base64')).toBe(false);
  });

  it('rejects token without colon separator', () => {
    expect(verifyCookieToken(btoa('nocolon'))).toBe(false);
  });

  it('changes when password changes', () => {
    const token1 = generateCookieToken('admin');
    process.env.EDITOR_PASSWORD = 'different';
    expect(verifyCookieToken(token1)).toBe(false);
  });
});
