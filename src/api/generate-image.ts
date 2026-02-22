import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ImageGenerator } from '../services/ImageGenerator';
import { getEnvVariable } from '../utils/envUtils';
import { jsonResponse, jsonError } from './_utils';

const GenerateImageSchema = z.object({
  input: z.string().min(1, 'Input is required'),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const parsed = GenerateImageSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'Invalid request', 400);
    }
    const { input } = parsed.data;

    const apiKey = getEnvVariable('GOOGLE_GEMINI_API_KEY');
    const generator = new ImageGenerator({ apiKey });
    const image = await generator.generate(input);

    return jsonResponse({
      url: image.url,
      alt: image.alt,
      filepath: image.filepath,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return jsonError(error);
  }
};
