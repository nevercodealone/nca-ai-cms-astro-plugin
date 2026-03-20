import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockValidateSession = vi.fn();

vi.mock('../services/SessionService.js', () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}));

import { isPublicPath, isProtectedPath, isAuthenticated } from './authUtils.js';

describe('isPublicPath', () => {
  it('allows auth endpoints and login page', () => {
    expect(isPublicPath('/api/auth/login')).toBe(true);
    expect(isPublicPath('/api/auth/logout')).toBe(true);
    expect(isPublicPath('/login')).toBe(true);
  });

  it('allows article-image paths', () => {
    expect(isPublicPath('/api/article-image/123/hero.webp')).toBe(true);
    expect(isPublicPath('/api/article-image/some-slug/hero.webp')).toBe(true);
  });

  it('rejects other paths', () => {
    expect(isPublicPath('/api/generate-content')).toBe(false);
    expect(isPublicPath('/editor')).toBe(false);
    expect(isPublicPath('/')).toBe(false);
  });
});

describe('isProtectedPath', () => {
  it('protects API routes and editor', () => {
    expect(isProtectedPath('/api/generate-content')).toBe(true);
    expect(isProtectedPath('/api/prompts')).toBe(true);
    expect(isProtectedPath('/editor')).toBe(true);
  });

  it('does not protect other paths', () => {
    expect(isProtectedPath('/')).toBe(false);
    expect(isProtectedPath('/about')).toBe(false);
    expect(isProtectedPath('/login')).toBe(false);
  });
});

describe('isAuthenticated', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
  });

  it('returns true when session is valid', async () => {
    mockValidateSession.mockResolvedValue(true);
    const result = await isAuthenticated('valid-token');
    expect(result).toBe(true);
    expect(mockValidateSession).toHaveBeenCalledWith('valid-token');
  });

  it('returns false when session is invalid', async () => {
    mockValidateSession.mockResolvedValue(false);
    const result = await isAuthenticated('expired-token');
    expect(result).toBe(false);
  });

  it('returns false for undefined without calling validateSession', async () => {
    const result = await isAuthenticated(undefined);
    expect(result).toBe(false);
    expect(mockValidateSession).not.toHaveBeenCalled();
  });

  it('returns false for empty string without calling validateSession', async () => {
    const result = await isAuthenticated('');
    expect(result).toBe(false);
    expect(mockValidateSession).not.toHaveBeenCalled();
  });

  it('returns false when validateSession throws', async () => {
    mockValidateSession.mockRejectedValue(new Error('DB error'));
    const result = await isAuthenticated('some-token');
    expect(result).toBe(false);
  });
});
