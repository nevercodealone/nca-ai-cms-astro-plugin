import { createHmac, timingSafeEqual } from 'node:crypto';
import { getEnvVariable } from './envUtils.js';

/**
 * Timing-safe string comparison that does not leak length information.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    // Compare against a dummy buffer to avoid timing leak on length mismatch
    const dummy = Buffer.alloc(bufA.length);
    timingSafeEqual(bufA, dummy);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify username and password against env vars using timing-safe comparison.
 * Both comparisons always run to prevent short-circuit timing leaks.
 */
export function verifyCredentials(username: string, password: string): boolean {
  const expectedUsername = getEnvVariable('EDITOR_ADMIN');
  const expectedPassword = getEnvVariable('EDITOR_PASSWORD');

  const usernameOk = timingSafeStringEqual(username, expectedUsername);
  const passwordOk = timingSafeStringEqual(password, expectedPassword);

  return usernameOk && passwordOk;
}

/**
 * Generate an HMAC-based cookie token that proves knowledge of credentials
 * without embedding the plain-text password.
 */
export function generateCookieToken(username: string): string {
  const secret = getEnvVariable('EDITOR_PASSWORD');
  const hmac = createHmac('sha256', secret).update(username).digest('hex');
  return btoa(`${username}:${hmac}`);
}

/**
 * Verify a cookie token by recomputing the HMAC.
 */
export function verifyCookieToken(token: string): boolean {
  try {
    const decoded = atob(token);
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return false;

    const username = decoded.substring(0, colonIndex);
    const hmac = decoded.substring(colonIndex + 1);

    const expectedUsername = getEnvVariable('EDITOR_ADMIN');
    const secret = getEnvVariable('EDITOR_PASSWORD');
    const expectedHmac = createHmac('sha256', secret).update(username).digest('hex');

    const usernameOk = timingSafeStringEqual(username, expectedUsername);
    const hmacOk = timingSafeStringEqual(hmac, expectedHmac);

    return usernameOk && hmacOk;
  } catch {
    return false;
  }
}
