import type { APIRoute } from 'astro';
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import {
  ArticleService,
  ArticleNotFoundError,
} from '../../../services/ArticleService';
import { convertToWebP } from '../../../services/ImageConverter';
import { pagesPath } from 'virtual:nca-ai-cms/config';
import { jsonResponse, jsonError } from '../../_utils';

interface ApplyRequest {
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  imageUrl?: string;
  imageAlt?: string;
}

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const slug = params.id;
    if (!slug) return jsonError('Page ID required', 400);

    const data: ApplyRequest = await request.json();
    const service = new ArticleService(pagesPath);
    const existingPage = await service.read(slug);
    if (!existingPage) throw new ArticleNotFoundError(slug);

    if (data.imageUrl) {
      const heroPath = path.join(existingPage.folderPath, 'hero.webp');
      const base64Data = data.imageUrl.replace(/^data:image\/\w+;base64,/, '');
      await convertToWebP(base64Data, heroPath);

      if (data.imageAlt) {
        const indexPath = path.join(existingPage.folderPath, 'index.md');
        const fileContent = await fs.readFile(indexPath, 'utf-8');
        const { data: frontmatter, content } = matter(fileContent);
        frontmatter.imageAlt = data.imageAlt;
        const updatedContent = matter.stringify(content, frontmatter);
        await fs.writeFile(indexPath, updatedContent);
      }
    }

    if (data.content || data.title || data.description) {
      await service.updateContent(slug, {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.content && { content: data.content }),
      });
    }

    return jsonResponse({ success: true, articleId: existingPage.articleId });
  } catch (error) {
    if (error instanceof ArticleNotFoundError) return jsonError(error, 404);
    console.error('Apply page changes error:', error);
    return jsonError(error);
  }
};
