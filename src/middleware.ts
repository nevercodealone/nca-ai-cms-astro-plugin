// @ts-ignore - resolved by Astro build pipeline
import { defineMiddleware } from 'astro:middleware';
import { isPublicPath, isProtectedPath, isAuthenticated } from './utils/authUtils.js';

export const onRequest = defineMiddleware(async ({ request, cookies, redirect }: any, next: any) => {
  const url = new URL(request.url);
  const { pathname } = url;

  if (isPublicPath(pathname)) {
    return next();
  }

  if (!isProtectedPath(pathname)) {
    return next();
  }

  const authCookie = cookies.get('editor-auth')?.value;

  if (isAuthenticated(authCookie)) {
    return next();
  }

  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return redirect('/login', 302);
});
