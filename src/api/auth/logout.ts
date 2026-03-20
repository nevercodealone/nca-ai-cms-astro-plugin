import type { APIRoute } from 'astro';
import { deleteSession } from '../../services/SessionService.js';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const token = cookies.get('editor-auth')?.value;
  if (token) await deleteSession(token);

  cookies.delete('editor-auth', { path: '/' });
  return redirect('/login', 302);
};
