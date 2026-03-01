import { getEnvVariable } from './envUtils.js';

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout', '/login'];
const PUBLIC_PATH_PREFIXES = ['/api/article-image/'];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname === '/editor';
}

export function isAuthenticated(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;

  try {
    const decoded = atob(cookieValue);
    const [username, password] = decoded.split(':');
    const expectedUsername = getEnvVariable('EDITOR_ADMIN');
    const expectedPassword = getEnvVariable('EDITOR_PASSWORD');
    return username === expectedUsername && password === expectedPassword;
  } catch {
    return false;
  }
}
