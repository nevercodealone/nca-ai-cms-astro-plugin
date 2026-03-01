// @ts-ignore - resolved by Astro build pipeline
import { db, Prompts, SiteSettings, eq } from 'astro:db';

export interface CTAConfig {
  url: string;
  style: string;
  prompt: string;
}

export interface ImageSettings {
  baseStylePrompt: string;
  constraints: string;
  sceneTemplate: string;
  altTextTemplate: string;
  filenamePrompt: string;
  categoryScenes: Record<string, string>;
}

export const IMAGE_SETTING_KEYS = [
  'image.baseStylePrompt',
  'image.constraints',
  'image.sceneTemplate',
  'image.altTextTemplate',
  'image.filenamePrompt',
  'image.categoryScenes',
] as const;

export const REQUIRED_IMAGE_SETTINGS = [
  'image.baseStylePrompt',
  'image.constraints',
  'image.sceneTemplate',
  'image.altTextTemplate',
  'image.filenamePrompt',
] as const;

export class PromptService {
  async getPrompt(id: string): Promise<string | null> {
    const result = await db
      .select()
      .from(Prompts)
      .where(eq(Prompts.id, id))
      .get();
    return result?.promptText ?? null;
  }

  async createPrompt(id: string, name: string, category: string, promptText: string): Promise<void> {
    await db.insert(Prompts).values({
      id,
      name,
      category,
      promptText,
      updatedAt: new Date(),
    });
  }

  async deletePrompt(id: string): Promise<void> {
    await db.delete(Prompts).where(eq(Prompts.id, id));
  }

  async updatePrompt(id: string, text: string): Promise<void> {
    await db
      .update(Prompts)
      .set({ promptText: text, updatedAt: new Date() })
      .where(eq(Prompts.id, id));
  }

  async getAllPrompts(): Promise<
    Array<{
      id: string;
      name: string;
      category: string;
      promptText: string;
    }>
  > {
    return await db.select().from(Prompts);
  }

  async getSetting(key: string): Promise<string | null> {
    const result = await db
      .select()
      .from(SiteSettings)
      .where(eq(SiteSettings.key, key))
      .get();
    return result?.value ?? null;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    const existing = await db
      .select()
      .from(SiteSettings)
      .where(eq(SiteSettings.key, key))
      .get();

    if (existing) {
      await db
        .update(SiteSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(SiteSettings.key, key));
    } else {
      await db.insert(SiteSettings).values({
        key,
        value,
        updatedAt: new Date(),
      });
    }
  }

  async getAllSettings(): Promise<Array<{ key: string; value: string }>> {
    return await db.select().from(SiteSettings);
  }

  async getCTAConfig(): Promise<CTAConfig> {
    const [url, style, prompt] = await Promise.all([
      this.getSetting('cta_url'),
      this.getSetting('cta_style'),
      this.getPrompt('cta_prompt'),
    ]);

    return {
      url:
        url ??
        'https://nevercodealone.de/de/landingpages/barrierefreies-webdesign',
      style:
        style ??
        'Professionell, einladend, mit klarem Nutzenversprechen. Deutsche Sprache.',
      prompt: prompt ?? 'Generiere einen einzigartigen Call-to-Action.',
    };
  }

  async getImageSettings(): Promise<ImageSettings> {
    const [
      baseStylePrompt,
      constraints,
      sceneTemplate,
      altTextTemplate,
      filenamePrompt,
      categoryScenesRaw,
    ] = await Promise.all(
      IMAGE_SETTING_KEYS.map((key) => this.getSetting(key))
    );

    let categoryScenes: Record<string, string> = {};
    if (categoryScenesRaw) {
      try {
        categoryScenes = JSON.parse(categoryScenesRaw);
      } catch {
        categoryScenes = {};
      }
    }

    return {
      baseStylePrompt: baseStylePrompt ?? '',
      constraints: constraints ?? '',
      sceneTemplate: sceneTemplate ?? '',
      altTextTemplate: altTextTemplate ?? '',
      filenamePrompt: filenamePrompt ?? '',
      categoryScenes,
    };
  }

  validateImageSettings(settings: ImageSettings): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!settings.baseStylePrompt.trim()) missing.push('baseStylePrompt');
    if (!settings.constraints.trim()) missing.push('constraints');
    if (!settings.sceneTemplate.trim()) missing.push('sceneTemplate');
    if (!settings.altTextTemplate.trim()) missing.push('altTextTemplate');
    if (!settings.filenamePrompt.trim()) missing.push('filenamePrompt');

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  async getCoreTags(): Promise<string[]> {
    const tags = await this.getSetting('core_tags');
    if (!tags) return ['Web-Entwicklung', 'Best Practices'];
    try {
      return JSON.parse(tags);
    } catch {
      return ['Web-Entwicklung', 'Best Practices'];
    }
  }
}
