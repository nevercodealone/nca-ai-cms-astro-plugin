import type { APIRoute } from 'astro';
import { z } from 'zod';
import { jsonResponse, jsonError } from '../_utils.js';
import { verifyCredentials } from '../../utils/credentialUtils.js';
import { createSession, purgeExpiredSessions } from '../../services/SessionService.js';
import { loginRateLimiter } from '../../utils/loginRateLimiter.js';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const ip =
    clientAddress ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  const { limited, retryAfter } = loginRateLimiter.check(ip);
  if (limited) {
    return new Response(
      JSON.stringify({ error: 'Too many login attempts. Try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', 400);
  }

  const result = loginSchema.safeParse(body);
  if (!result.success) {
    return jsonError('Username and password are required', 400);
  }

  const { username, password } = result.data;

  if (!verifyCredentials(username, password)) {
    loginRateLimiter.record(ip);
    console.warn(
      `[nca-ai-cms] Failed login attempt from ${ip} at ${new Date().toISOString()}`,
    );
    return jsonError('Invalid credentials', 401);
  }

  loginRateLimiter.clear(ip);
  await purgeExpiredSessions();
  const token = await createSession();

  cookies.set('editor-auth', token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return jsonResponse({ success: true });
};
