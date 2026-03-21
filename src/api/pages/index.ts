import type { APIRoute } from 'astro';
import { ArticleService } from '../../services/ArticleService';
import { pagesPath } from 'virtual:nca-ai-cms/config';
import { jsonResponse, jsonError } from '../_utils';

// GET /api/pages - List all pages
export const GET: APIRoute = async () => {
  try {
    const service = new ArticleService(pagesPath);
    const pages = await service.list();
    return jsonResponse(pages);
  } catch (error) {
    console.error('List pages error:', error);
    return jsonError(error);
  }
};
