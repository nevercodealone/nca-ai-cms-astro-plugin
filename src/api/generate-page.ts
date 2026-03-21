import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ContentGenerator } from '../services/ContentGenerator';
import { PromptService } from '../services/PromptService';
import { getEnvVariable } from '../utils/envUtils';
import { jsonResponse, jsonError } from './_utils';

const GeneratePageSchema = z.object({
  input: z.string().min(1, 'Input is required'),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const parsed = GeneratePageSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'Invalid request', 400);
    }
    const { input } = parsed.data;
    const isUrl = /^https?:\/\//.test(input);

    const apiKey = getEnvVariable('GOOGLE_GEMINI_API_KEY');
    const promptService = new PromptService();
    const generator = new ContentGenerator({ apiKey, promptService });
    const page = isUrl
      ? await generator.generateFromUrl(input)
      : await generator.generateFromKeywords(input);

    return jsonResponse({
      title: page.title,
      description: page.description,
      content: page.content,
      filepath: page.filepath,
      tags: page.tags,
      date: page.date.toISOString(),
      ...(generator.warnings.length > 0 ? { warnings: generator.warnings } : {}),
    });
  } catch (error) {
    console.error('Page generation error:', error);
    return jsonError(error);
  }
};
