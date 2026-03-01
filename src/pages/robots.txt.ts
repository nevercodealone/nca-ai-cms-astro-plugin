import type { APIContext } from 'astro';

export function generateRobotsTxt(siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, '');

  return `User-agent: *
Allow: /
Disallow: /editor
Disallow: /login
Disallow: /api/

Sitemap: ${base}/sitemap.xml
`;
}

export function GET(context: APIContext): Response {
  const siteUrl = context.site?.toString() ?? context.url.origin;
  const body = generateRobotsTxt(siteUrl);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
