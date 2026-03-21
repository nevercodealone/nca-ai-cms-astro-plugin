import type { APIRoute } from 'astro';
import { z } from 'zod';
import { Article } from '../domain/entities/Article';
import { FileWriter } from '../services/FileWriter';
import { pagesPath } from 'virtual:nca-ai-cms/config';
import { jsonResponse, jsonError } from './_utils';

const SavePageSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  content: z.string().min(1),
  date: z.string().optional(),
  tags: z.array(z.string()).optional(),
  imageAlt: z.string().optional(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const parsed = SavePageSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'Invalid request', 400);
    }
    const data = parsed.data;

    const page = new Article({
      title: data.title,
      description: data.description,
      content: data.content,
      date: new Date(data.date || Date.now()),
      tags: data.tags || [],
      image: './hero.webp',
      imageAlt: data.imageAlt,
      contentPath: pagesPath,
      flatPath: true,
    });

    const writer = new FileWriter();
    const result = await writer.write(page);

    return jsonResponse({
      success: true,
      filepath: result.filepath,
      folderPath: page.folderPath,
    });
  } catch (error) {
    console.error('Save page error:', error);
    return jsonError(error);
  }
};
