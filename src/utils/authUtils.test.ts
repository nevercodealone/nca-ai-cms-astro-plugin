import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
    process.env.EDITOR_ADMIN = 'admin';
    process.env.EDITOR_PASSWORD = 'secret';
  });

  afterEach(() => {
    delete process.env.EDITOR_ADMIN;
    delete process.env.EDITOR_PASSWORD;
  });

  it('returns true for valid base64 credentials', () => {
    const token = btoa('admin:secret');
    expect(isAuthenticated(token)).toBe(true);
  });

  it('returns false for wrong credentials', () => {
    const token = btoa('admin:wrong');
    expect(isAuthenticated(token)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAuthenticated(undefined)).toBe(false);
  });

  it('returns false for invalid base64', () => {
    expect(isAuthenticated('%%%not-base64')).toBe(false);
  });
});
