import { validateSession } from '../services/SessionService.js';

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout', '/login'];
const PUBLIC_PATH_PREFIXES = ['/api/article-image/', '/api/page-image/'];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname === '/editor';
}

export async function isAuthenticated(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;

  try {
    return await validateSession(cookieValue);
  } catch {
    return false;
  }
}
