import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ArticleFinder } from './ArticleFinder';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ArticleFinder', () => {
  let tempDir: string;
  let finder: ArticleFinder;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'article-finder-test-'));
    finder = new ArticleFinder(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('findBySlug', () => {
    it('finds article folder by slug', async () => {
      // Setup: create article folder structure
      const articleFolder = path.join(tempDir, '2026', '01', 'my-article-slug');
      await fs.mkdir(articleFolder, { recursive: true });
      await fs.writeFile(
        path.join(articleFolder, 'index.md'),
        '---\ntitle: Test\n---\nContent'
      );

      const result = await finder.findBySlug('my-article-slug');

      expect(result).not.toBeNull();
      expect(result?.folderPath).toBe(articleFolder);
      expect(result?.indexPath).toBe(path.join(articleFolder, 'index.md'));
    });

    it('returns null for non-existent slug', async () => {
      const result = await finder.findBySlug('does-not-exist');
      expect(result).toBeNull();
    });

    it('finds article in any year/month folder', async () => {
      // Create article in different year/month
      const articleFolder = path.join(tempDir, '2025', '06', 'summer-article');
      await fs.mkdir(articleFolder, { recursive: true });
      await fs.writeFile(
        path.join(articleFolder, 'index.md'),
        '---\ntitle: Summer\n---'
      );

      const result = await finder.findBySlug('summer-article');

      expect(result).not.toBeNull();
      expect(result?.folderPath).toBe(articleFolder);
    });

    it('returns first match when multiple articles have similar slugs', async () => {
      // Create two articles with similar names
      const folder1 = path.join(tempDir, '2026', '01', 'test-article');
      const folder2 = path.join(tempDir, '2025', '12', 'test-article');
      await fs.mkdir(folder1, { recursive: true });
      await fs.mkdir(folder2, { recursive: true });
      await fs.writeFile(
        path.join(folder1, 'index.md'),
        '---\ntitle: Test 1\n---'
      );
      await fs.writeFile(
        path.join(folder2, 'index.md'),
        '---\ntitle: Test 2\n---'
      );

      const result = await finder.findBySlug('test-article');

      expect(result).not.toBeNull();
      // Should find one of them (order depends on filesystem)
      expect(result?.folderPath).toContain('test-article');
    });

    it('ignores folders without index.md', async () => {
      // Create folder without index.md
      const emptyFolder = path.join(tempDir, '2026', '01', 'empty-folder');
      await fs.mkdir(emptyFolder, { recursive: true });

      const result = await finder.findBySlug('empty-folder');

      expect(result).toBeNull();
    });
  });

  describe('getArticlePath', () => {
    it('returns full article ID from folder path', async () => {
      const articleFolder = path.join(tempDir, '2026', '01', 'test-slug');
      await fs.mkdir(articleFolder, { recursive: true });
      await fs.writeFile(
        path.join(articleFolder, 'index.md'),
        '---\ntitle: Test\n---'
      );

      const result = await finder.findBySlug('test-slug');

      expect(result?.articleId).toBe('2026/01/test-slug');
    });
  });

  describe('flat folder support', () => {
    it('finds article in flat structure (basePath/slug/index.md)', async () => {
      const flatFolder = path.join(tempDir, 'laserreinigung');
      await fs.mkdir(flatFolder, { recursive: true });
      await fs.writeFile(
        path.join(flatFolder, 'index.md'),
        '---\ntitle: Laserreinigung\n---\nContent'
      );

      const result = await finder.findBySlug('laserreinigung');

      expect(result).not.toBeNull();
      expect(result?.folderPath).toBe(flatFolder);
      expect(result?.articleId).toBe('laserreinigung');
    });

    it('flat folder takes priority over year/month match', async () => {
      // Create both flat and nested
      const flatFolder = path.join(tempDir, 'my-page');
      await fs.mkdir(flatFolder, { recursive: true });
      await fs.writeFile(path.join(flatFolder, 'index.md'), '---\ntitle: Flat\n---');

      const nestedFolder = path.join(tempDir, '2026', '01', 'my-page');
      await fs.mkdir(nestedFolder, { recursive: true });
      await fs.writeFile(path.join(nestedFolder, 'index.md'), '---\ntitle: Nested\n---');

      const result = await finder.findBySlug('my-page');

      expect(result?.articleId).toBe('my-page');
      expect(result?.folderPath).toBe(flatFolder);
    });
  });
});
