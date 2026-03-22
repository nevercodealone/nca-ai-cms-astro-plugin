import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { ArticleFinder } from '../domain/value-objects/ArticleFinder';

export class ArticleNotFoundError extends Error {
  constructor(slug: string) {
    super(`Article not found: ${slug}`);
    this.name = 'ArticleNotFoundError';
  }
}

export interface ArticleData {
  articleId: string;
  title: string;
  description: string;
  date: Date;
  createdAt?: Date;
  tags: string[];
  image?: string;
  imageAlt?: string;
  content: string;
  folderPath: string;
}

export interface UpdateContentOptions {
  title?: string;
  description?: string;
  content?: string;
}

export class ArticleService {
  private readonly finder: ArticleFinder;
  private readonly basePath: string;

  constructor(basePath: string = 'nca-ai-cms-content') {
    this.finder = new ArticleFinder(basePath);
    this.basePath = basePath;
  }

  async list(): Promise<ArticleData[]> {
    const articles: ArticleData[] = [];
    const fullBasePath = path.join(process.cwd(), this.basePath);

    try {
      const entries = await fs.readdir(fullBasePath);

      for (const entry of entries) {
        const entryPath = path.join(fullBasePath, entry);
        const entryStat = await fs.stat(entryPath).catch(() => null);
        if (!entryStat?.isDirectory()) continue;

        // Check if this is a flat article (has index.md directly)
        const flatIndex = path.join(entryPath, 'index.md');
        try {
          await fs.access(flatIndex);
          const article = await this.read(entry);
          if (article) articles.push(article);
          continue;
        } catch {}

        // Otherwise treat as year directory → scan month/slug
        const months = await fs.readdir(entryPath);

        for (const month of months) {
          const monthPath = path.join(entryPath, month);
          const monthStat = await fs.stat(monthPath).catch(() => null);
          if (!monthStat?.isDirectory()) continue;

          const slugs = await fs.readdir(monthPath);

          for (const slug of slugs) {
            const slugPath = path.join(monthPath, slug);
            const slugStat = await fs.stat(slugPath).catch(() => null);
            if (!slugStat?.isDirectory()) continue;

            const article = await this.read(slug);
            if (article) articles.push(article);
          }
        }
      }
    } catch {
      // Return empty array if base path doesn't exist
    }

    return articles;
  }

  async delete(slug: string): Promise<void> {
    const location = await this.finder.findBySlug(slug);

    if (!location) {
      throw new ArticleNotFoundError(slug);
    }

    await fs.rm(location.folderPath, { recursive: true, force: true });
  }

  async read(slug: string): Promise<ArticleData | null> {
    const location = await this.finder.findBySlug(slug);

    if (!location) {
      return null;
    }

    try {
      const fileContent = await fs.readFile(location.indexPath, 'utf-8');
      const { data, content } = matter(fileContent);

      const result: ArticleData = {
        articleId: location.articleId,
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        tags: data.tags || [],
        image: data.image,
        imageAlt: data.imageAlt,
        content: content.trim(),
        folderPath: location.folderPath,
      };

      if (data.createdAt) {
        result.createdAt = new Date(data.createdAt);
      }

      return result;
    } catch {
      return null;
    }
  }

  async updateContent(
    slug: string,
    options: UpdateContentOptions
  ): Promise<void> {
    const location = await this.finder.findBySlug(slug);

    if (!location) {
      throw new ArticleNotFoundError(slug);
    }

    const fileContent = await fs.readFile(location.indexPath, 'utf-8');
    const { data, content } = matter(fileContent);

    // Update frontmatter fields if provided
    const updatedData = {
      ...data,
      ...(options.title && { title: options.title }),
      ...(options.description && { description: options.description }),
    };

    // Use new content or keep existing
    const updatedContent = options.content ?? content;

    // Rebuild the file with frontmatter
    const newFileContent = matter.stringify(updatedContent, updatedData);

    await fs.writeFile(location.indexPath, newFileContent, 'utf-8');
  }
}
