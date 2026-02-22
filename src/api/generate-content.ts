import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ContentGenerator } from '../services/ContentGenerator';
import { PromptService } from '../services/PromptService';
import { getEnvVariable } from '../utils/envUtils';
import { jsonResponse, jsonError } from './_utils';

const GenerateContentSchema = z.object({
  input: z.string().min(1, 'Input is required'),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const parsed = GenerateContentSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'Invalid request', 400);
    }
    const { input } = parsed.data;
    const isUrl = /^https?:\/\//.test(input);

    const apiKey = getEnvVariable('GOOGLE_GEMINI_API_KEY');
    const promptService = new PromptService();
    const generator = new ContentGenerator({ apiKey, promptService });
    const article = isUrl
      ? await generator.generateFromUrl(input)
      : await generator.generateFromKeywords(input);

    return jsonResponse({
      title: article.title,
      description: article.description,
      content: article.content,
      filepath: article.filepath,
      tags: article.tags,
      date: article.date.toISOString(),
    });
  } catch (error) {
    console.error('Generation error:', error);
    return jsonError(error);
  }
};
