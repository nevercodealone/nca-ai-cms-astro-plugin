import type { APIContext } from 'astro';
import { ArticleService } from '../services/ArticleService';
import type { ArticleData } from '../services/ArticleService';

const STATIC_PAGES = ['/', '/impressum', '/ueber-ai-cms'];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

export function generateSitemapXml(
  siteUrl: string,
  articles: ArticleData[]
): string {
  const base = siteUrl.replace(/\/+$/, '');

  const staticEntries = STATIC_PAGES.map(
    (page) => `  <url>
    <loc>${escapeXml(base + page)}</loc>
  </url>`
  );

  const articleEntries = articles.map(
    (article) => `  <url>
    <loc>${escapeXml(base + '/articles/' + article.articleId)}</loc>
    <lastmod>${formatDate(article.date)}</lastmod>
  </url>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...articleEntries].join('\n')}
</urlset>`;
}

export async function GET(context: APIContext): Promise<Response> {
  const siteUrl = context.site?.toString() ?? context.url.origin;
  const service = new ArticleService();
  const articles = await service.list();

  const xml = generateSitemapXml(siteUrl, articles);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
