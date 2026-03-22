import * as fs from 'fs/promises';
import * as path from 'path';

export interface ArticleLocation {
  folderPath: string;
  indexPath: string;
  articleId: string;
}

export class ArticleFinder {
  constructor(private readonly basePath: string) {}

  async findBySlug(slug: string): Promise<ArticleLocation | null> {
    try {
      // 1. Check flat structure: basePath/slug/index.md
      const flatPath = path.join(this.basePath, slug);
      const flatIndex = path.join(flatPath, 'index.md');
      try {
        await fs.access(flatIndex);
        const stat = await fs.stat(flatPath);
        if (stat.isDirectory()) {
          return { folderPath: flatPath, indexPath: flatIndex, articleId: slug };
        }
      } catch {}

      // 2. Fall back to year/month/slug structure
      const years = await this.getDirectories(this.basePath);

      for (const year of years) {
        const yearPath = path.join(this.basePath, year);
        const months = await this.getDirectories(yearPath);

        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const articles = await this.getDirectories(monthPath);

          for (const article of articles) {
            if (article === slug) {
              const folderPath = path.join(monthPath, article);
              const indexPath = path.join(folderPath, 'index.md');

              try {
                await fs.access(indexPath);
                return {
                  folderPath,
                  indexPath,
                  articleId: `${year}/${month}/${article}`,
                };
              } catch {
                continue;
              }
            }
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private async getDirectories(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }
}
