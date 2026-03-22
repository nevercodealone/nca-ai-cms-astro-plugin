import type { APIRoute } from 'astro';
import {
  ArticleService,
  ArticleNotFoundError,
} from '../../services/ArticleService';
import { pagesPath } from 'virtual:nca-ai-cms/config';
import { jsonResponse, jsonError } from '../_utils';

// GET /api/pages/[id] - Get page details
export const GET: APIRoute = async ({ params }) => {
  try {
    const slug = params.id;
    if (!slug) return jsonError('Page ID required', 400);

    const service = new ArticleService(pagesPath);
    const page = await service.read(slug);
    if (!page) return jsonError('Page not found', 404);

    return jsonResponse(page);
  } catch (error) {
    console.error('Read page error:', error);
    return jsonError(error);
  }
};

// DELETE /api/pages/[id] - Delete a page by slug
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const slug = params.id;
    if (!slug) return jsonError('Page ID required', 400);

    const service = new ArticleService(pagesPath);
    await service.delete(slug);
    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof ArticleNotFoundError) return jsonError(error, 404);
    console.error('Delete page error:', error);
    return jsonError(error);
  }
};
