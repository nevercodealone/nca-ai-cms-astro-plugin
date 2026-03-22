// @ts-ignore - resolved by Astro build pipeline
import { db, Sessions, eq } from 'astro:db';

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function createSession(): Promise<string> {
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_MS);

  await db.insert(Sessions).values({
    token,
    createdAt: now,
    expiresAt,
  });

  return token;
}

export async function validateSession(token: string): Promise<boolean> {
  const row = await db
    .select()
    .from(Sessions)
    .where(eq(Sessions.token, token))
    .get();

  if (!row) return false;
  return new Date(row.expiresAt) > new Date();
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(Sessions).where(eq(Sessions.token, token));
}

export async function purgeExpiredSessions(): Promise<void> {
  const all = await db.select().from(Sessions);
  const now = new Date();

  for (const row of all) {
    if (new Date(row.expiresAt) <= now) {
      await db.delete(Sessions).where(eq(Sessions.token, row.token));
    }
  }
}
