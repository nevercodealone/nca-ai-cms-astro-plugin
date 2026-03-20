import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoginRateLimiter, MAX_ATTEMPTS, WINDOW_MS } from './loginRateLimiter.js';

describe('LoginRateLimiter', () => {
  let limiter: LoginRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new LoginRateLimiter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests with zero attempts', () => {
    const result = limiter.check('192.168.1.1');
    expect(result.limited).toBe(false);
    expect(result.retryAfter).toBe(0);
  });

  it('allows requests under the limit', () => {
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      limiter.record('192.168.1.1');
    }
    const result = limiter.check('192.168.1.1');
    expect(result.limited).toBe(false);
    expect(result.retryAfter).toBe(0);
  });

  it('blocks requests at the limit', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      limiter.record('192.168.1.1');
    }
    const result = limiter.check('192.168.1.1');
    expect(result.limited).toBe(true);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('returns retryAfter as a positive integer', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      limiter.record('192.168.1.1');
    }
    const result = limiter.check('192.168.1.1');
    expect(result.retryAfter).toBe(Math.ceil(WINDOW_MS / 1000));
  });

  it('tracks different IPs independently', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      limiter.record('192.168.1.1');
    }
    const blocked = limiter.check('192.168.1.1');
    const allowed = limiter.check('192.168.1.2');
    expect(blocked.limited).toBe(true);
    expect(allowed.limited).toBe(false);
  });

  it('clears attempts on successful login', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      limiter.record('192.168.1.1');
    }
    expect(limiter.check('192.168.1.1').limited).toBe(true);

    limiter.clear('192.168.1.1');
    expect(limiter.check('192.168.1.1').limited).toBe(false);
  });

  it('does not count expired attempts', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      limiter.record('192.168.1.1');
    }
    expect(limiter.check('192.168.1.1').limited).toBe(true);

    vi.advanceTimersByTime(WINDOW_MS + 1);

    expect(limiter.check('192.168.1.1').limited).toBe(false);
  });

  it('records increment attempt count', () => {
    limiter.record('192.168.1.1');
    limiter.record('192.168.1.1');
    limiter.record('192.168.1.1');

    // 3 attempts — still under limit
    expect(limiter.check('192.168.1.1').limited).toBe(false);

    limiter.record('192.168.1.1');
    limiter.record('192.168.1.1');

    // 5 attempts — at limit
    expect(limiter.check('192.168.1.1').limited).toBe(true);
  });
});
