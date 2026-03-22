import { describe, it, expect } from 'vitest';
import { Article } from './Article';

describe('Article', () => {
  const defaultProps = {
    title: 'HTML Accessibility Grundlagen',
    description: 'Lernen Sie die Grundlagen der HTML-Barrierefreiheit',
    content: '# HTML Accessibility\n\nContent here...',
    date: new Date('2025-12-07'),
    tags: ['accessibility', 'html'],
  };

  it('creates article with valid props', () => {
    const article = new Article(defaultProps);
    expect(article.title).toBe('HTML Accessibility Grundlagen');
    expect(article.tags).toEqual(['accessibility', 'html']);
  });

  it('generates SEO-compliant slug from title', () => {
    const article = new Article(defaultProps);
    expect(article.slug.toString()).toBe('html-accessibility-grundlagen');
  });

  it('generates correct filename', () => {
    const article = new Article(defaultProps);
    expect(article.filename).toBe('html-accessibility-grundlagen.md');
  });

  it('generates correct folderPath with default contentPath', () => {
    const article = new Article(defaultProps);
    expect(article.folderPath).toBe(
      'nca-ai-cms-content/2025/12/html-accessibility-grundlagen'
    );
  });

  it('generates correct filepath with index.md', () => {
    const article = new Article(defaultProps);
    expect(article.filepath).toBe(
      'nca-ai-cms-content/2025/12/html-accessibility-grundlagen/index.md'
    );
  });

  it('uses configurable contentPath', () => {
    const article = new Article({
      ...defaultProps,
      contentPath: 'custom-content',
    });
    expect(article.folderPath).toBe(
      'custom-content/2025/12/html-accessibility-grundlagen'
    );
    expect(article.filepath).toBe(
      'custom-content/2025/12/html-accessibility-grundlagen/index.md'
    );
  });

  it('defaults contentPath to nca-ai-cms-content when not provided', () => {
    const article = new Article(defaultProps);
    expect(article.contentPath).toBe('nca-ai-cms-content');
  });

  it('stores explicit contentPath', () => {
    const article = new Article({
      ...defaultProps,
      contentPath: 'src/content/articles',
    });
    expect(article.contentPath).toBe('src/content/articles');
  });

  it('extracts year from date', () => {
    const article = new Article(defaultProps);
    expect(article.year).toBe(2025);
  });

  it('extracts zero-padded month from date', () => {
    const article = new Article({
      ...defaultProps,
      date: new Date('2025-01-15'),
    });
    expect(article.month).toBe('01');
  });

  it('generates valid frontmatter object', () => {
    const article = new Article(defaultProps);
    const frontmatter = article.toFrontmatter();

    expect(frontmatter.title).toBe('HTML Accessibility Grundlagen');
    expect(frontmatter.description).toBe(
      'Lernen Sie die Grundlagen der HTML-Barrierefreiheit'
    );
    expect(frontmatter.date).toBe('2025-12-07');
    expect(frontmatter.tags).toEqual(['accessibility', 'html']);
  });

  it('generates complete markdown with frontmatter', () => {
    const article = new Article(defaultProps);
    const markdown = article.toMarkdown();

    expect(markdown).toContain('---');
    expect(markdown).toContain('title: "HTML Accessibility Grundlagen"');
    expect(markdown).toContain('# HTML Accessibility');
  });

  it('truncates SEO title to 60 chars when title exceeds limit', () => {
    const longTitle = 'A'.repeat(67);
    const article = new Article({
      ...defaultProps,
      title: longTitle,
    });

    expect(article.seoMetadata.title.length).toBe(60);
    expect(article.seoMetadata.title.endsWith('...')).toBe(true);
    expect(article.title).toBe(longTitle); // Full title preserved
  });

  it('includes optional image fields with relative path', () => {
    const article = new Article({
      ...defaultProps,
      image: './hero.webp',
      imageAlt: 'Accessibility illustration',
    });

    const frontmatter = article.toFrontmatter();
    expect(frontmatter.image).toBe('./hero.webp');
    expect(frontmatter.imageAlt).toBe('Accessibility illustration');
  });

  it('uses relative image path in markdown frontmatter', () => {
    const article = new Article({
      ...defaultProps,
      image: './hero.webp',
      imageAlt: 'Accessibility illustration',
    });

    const markdown = article.toMarkdown();
    expect(markdown).toContain('image: "./hero.webp"');
    expect(markdown).toContain('imageAlt: "Accessibility illustration"');
  });

  it('generates flat folderPath when flatPath is true', () => {
    const article = new Article({
      ...defaultProps,
      contentPath: 'nca-ai-cms-pages',
      flatPath: true,
    });

    expect(article.folderPath).toBe(
      'nca-ai-cms-pages/html-accessibility-grundlagen'
    );
  });

  it('generates nested folderPath when flatPath is false', () => {
    const article = new Article({
      ...defaultProps,
      flatPath: false,
    });

    expect(article.folderPath).toBe(
      'nca-ai-cms-content/2025/12/html-accessibility-grundlagen'
    );
  });
});
