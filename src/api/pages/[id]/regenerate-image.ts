import type { APIRoute } from 'astro';
import {
  ArticleService,
  ArticleNotFoundError,
} from '../../../services/ArticleService';
import { ImageGenerator } from '../../../services/ImageGenerator';
import { getEnvVariable } from '../../../utils/envUtils';
import { pagesPath } from 'virtual:nca-ai-cms/config';
import { jsonResponse, jsonError } from '../../_utils';

export const POST: APIRoute = async ({ params }) => {
  try {
    const slug = params.id;
    if (!slug) return jsonError('Page ID required', 400);

    const service = new ArticleService(pagesPath);
    const existingPage = await service.read(slug);
    if (!existingPage) throw new ArticleNotFoundError(slug);

    const apiKey = getEnvVariable('GOOGLE_GEMINI_API_KEY');
    const generator = new ImageGenerator({ apiKey });
    const image = await generator.generate(existingPage.title);

    return jsonResponse({
      url: image.url,
      alt: image.alt,
      articleId: existingPage.articleId,
      articleTitle: existingPage.title,
    });
  } catch (error) {
    if (error instanceof ArticleNotFoundError) return jsonError(error, 404);
    console.error('Regenerate page image error:', error);
    return jsonError(error);
  }
};
