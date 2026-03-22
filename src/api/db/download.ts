import type { APIRoute } from 'astro';
import * as fs from 'fs/promises';
import * as path from 'path';
import { jsonError } from '../_utils';

function getDbPath(): string {
  const envPath = process.env.ASTRO_DATABASE_FILE;
  if (envPath) {
    const resolved = path.resolve(process.cwd(), envPath);
    if (!resolved.startsWith(process.cwd())) {
      throw new Error('Invalid database path');
    }
    return resolved;
  }
  return path.join(process.cwd(), '.astro', 'content.db');
}

export const GET: APIRoute = async () => {
  try {
    const dbPath = getDbPath();
    const dbBuffer = await fs.readFile(dbPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    return new Response(dbBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="content-${timestamp}.db"`,
        'Content-Length': String(dbBuffer.length),
      },
    });
  } catch {
    return jsonError('Database file not found', 404);
  }
};
