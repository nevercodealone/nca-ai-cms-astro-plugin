export const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_ATTEMPTS = 5;

export class LoginRateLimiter {
  private store = new Map<string, number[]>();

  constructor() {
    const interval = setInterval(() => this.cleanup(), WINDOW_MS);
    if (typeof interval === 'object' && 'unref' in interval) {
      (interval as NodeJS.Timeout).unref();
    }
  }

  check(ip: string): { limited: boolean; retryAfter: number } {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const attempts = (this.store.get(ip) ?? []).filter((t) => t > windowStart);

    if (attempts.length >= MAX_ATTEMPTS) {
      const oldest = attempts[0] ?? now;
      const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000);
      return { limited: true, retryAfter };
    }

    return { limited: false, retryAfter: 0 };
  }

  record(ip: string): void {
    const attempts = this.store.get(ip) ?? [];
    attempts.push(Date.now());
    this.store.set(ip, attempts);
  }

  clear(ip: string): void {
    this.store.delete(ip);
  }

  private cleanup(): void {
    const windowStart = Date.now() - WINDOW_MS;
    for (const [ip, attempts] of this.store) {
      const fresh = attempts.filter((t) => t > windowStart);
      if (fresh.length === 0) {
        this.store.delete(ip);
      } else {
        this.store.set(ip, fresh);
      }
    }
  }
}

export const loginRateLimiter = new LoginRateLimiter();
