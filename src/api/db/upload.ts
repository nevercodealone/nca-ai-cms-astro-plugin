import type { APIRoute } from 'astro';
import * as fs from 'fs/promises';
import * as path from 'path';
import { jsonResponse, jsonError } from '../_utils';

const MAX_DB_SIZE = 50 * 1024 * 1024; // 50 MB

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

export const POST: APIRoute = async ({ request }) => {
  try {
    const dbPath = getDbPath();
    const contentType = request.headers.get('content-type') || '';

    let dbBuffer: Buffer;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('database') as File | null;

      if (!file) {
        return jsonError('No database file provided. Use field name "database".', 400);
      }

      if (file.size > MAX_DB_SIZE) {
        return jsonError('File too large. Maximum 50 MB.', 413);
      }

      const arrayBuffer = await file.arrayBuffer();
      dbBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes('application/octet-stream')) {
      const arrayBuffer = await request.arrayBuffer();
      dbBuffer = Buffer.from(arrayBuffer);

      if (dbBuffer.length > MAX_DB_SIZE) {
        return jsonError('File too large. Maximum 50 MB.', 413);
      }
    } else {
      return jsonError('Invalid content type. Use multipart/form-data or application/octet-stream.', 400);
    }

    // SQLite validation
    const header = dbBuffer.subarray(0, 16).toString('utf8');
    if (!header.startsWith('SQLite format 3')) {
      return jsonError('Invalid file: not a SQLite database.', 400);
    }

    // Backup current DB before overwriting
    try {
      await fs.copyFile(dbPath, `${dbPath}.backup`);
    } catch {
      // No existing DB to backup
    }

    await fs.writeFile(dbPath, dbBuffer);

    return jsonResponse({
      success: true,
      size: dbBuffer.length,
    });
  } catch {
    return jsonError('Database upload failed', 500);
  }
};
