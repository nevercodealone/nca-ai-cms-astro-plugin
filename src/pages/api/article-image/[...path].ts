import type { APIRoute } from 'astro';
import * as fs from 'fs/promises';
import * as path from 'path';

export const GET: APIRoute = async ({ params }) => {
  const imagePath = params.path;

  if (!imagePath) {
    return new Response('Not found', { status: 404 });
  }

  // Security: only allow webp/png/jpg from articles folder
  const allowedExtensions = ['.webp', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(imagePath).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return new Response('Invalid file type', { status: 400 });
  }

  // Prevent directory traversal by resolving and checking the final path
  const contentDir = path.resolve(process.cwd(), 'nca-ai-cms-content');
  const fullPath = path.resolve(contentDir, imagePath);

  if (!fullPath.startsWith(contentDir + path.sep)) {
    return new Response('Invalid path', { status: 400 });
  }

  try {
    const imageBuffer = await fs.readFile(fullPath);
    const contentType =
      ext === '.webp'
        ? 'image/webp'
        : ext === '.png'
          ? 'image/png'
          : 'image/jpeg';

    // Get file modification time for cache busting
    const stats = await fs.stat(fullPath);
    const etag = `"${stats.mtimeMs.toString(36)}"`;

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=0, must-revalidate',
        ETag: etag,
      },
    });
  } catch {
    return new Response('Image not found', { status: 404 });
  }
};
