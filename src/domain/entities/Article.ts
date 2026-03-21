import { Slug } from '../value-objects/Slug';
import { SEOMetadata } from '../value-objects/SEOMetadata';

export type ArticleProps = {
  title: string;
  description: string;
  content: string;
  date: Date;
  tags: string[];
  image?: string;
  imageAlt?: string;
  contentPath?: string;
  flatPath?: boolean;
};

export class Article {
  readonly title: string;
  readonly description: string;
  readonly content: string;
  readonly date: Date;
  readonly tags: string[];
  readonly slug: Slug;
  readonly seoMetadata: SEOMetadata;
  readonly image?: string;
  readonly imageAlt?: string;
  readonly contentPath: string;
  readonly flatPath: boolean;

  constructor(props: ArticleProps) {
    this.title = props.title;
    this.description = props.description;
    this.date = props.date;
    this.tags = props.tags;
    this.slug = new Slug(props.title);
    this.seoMetadata = new SEOMetadata(props.title, props.description);
    this.contentPath = props.contentPath ?? 'nca-ai-cms-content';
    this.flatPath = props.flatPath ?? false;

    this.content = props.content;

    if (props.image !== undefined) {
      this.image = props.image;
    }
    if (props.imageAlt !== undefined) {
      this.imageAlt = props.imageAlt;
    }
  }

  get filename(): string {
    return `${this.slug.toString()}.md`;
  }

  get year(): number {
    return this.date.getFullYear();
  }

  get month(): string {
    return String(this.date.getMonth() + 1).padStart(2, '0');
  }

  get folderPath(): string {
    if (this.flatPath) {
      return `${this.contentPath}/${this.slug.toString()}`;
    }
    return `${this.contentPath}/${this.year}/${this.month}/${this.slug.toString()}`;
  }

  get filepath(): string {
    return `${this.folderPath}/index.md`;
  }

  toFrontmatter(): Record<string, unknown> {
    return {
      title: this.title,
      description: this.description,
      date: this.date.toISOString().split('T')[0],
      createdAt: this.date.toISOString(),
      tags: this.tags,
      ...(this.image && { image: this.image }),
      ...(this.imageAlt && { imageAlt: this.imageAlt }),
    };
  }

  toMarkdown(): string {
    const frontmatter = Object.entries(this.toFrontmatter())
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: "${value}"`;
      })
      .join('\n');

    return `---\n${frontmatter}\n---\n\n${this.content}`;
  }
}
