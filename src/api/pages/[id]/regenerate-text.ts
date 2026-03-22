import type { APIRoute } from 'astro';
import {
  ArticleService,
  ArticleNotFoundError,
} from '../../../services/ArticleService';
import { ContentGenerator } from '../../../services/ContentGenerator';
import { PromptService } from '../../../services/PromptService';
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
    const promptService = new PromptService();
    const generator = new ContentGenerator({ apiKey, promptService });
    const newPage = await generator.generateFromKeywords(existingPage.title);

    return jsonResponse({
      title: newPage.title,
      description: newPage.description,
      content: newPage.content,
      tags: newPage.tags,
      originalTitle: existingPage.title,
      articleId: existingPage.articleId,
    });
  } catch (error) {
    if (error instanceof ArticleNotFoundError) return jsonError(error, 404);
    console.error('Regenerate page text error:', error);
    return jsonError(error);
  }
};
