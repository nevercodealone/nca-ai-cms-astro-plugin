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

export interface ContentSettings {
  branche: string;
  zielgruppe: string;
  tonalitaet: string;
  blacklist: string;
  minWortanzahl: string;
  maxWortanzahl: string;
  stilRegeln: string;
  ctaUrl: string;
  ctaStyle: string;
  ctaPrompt: string;
}

export const CONTENT_SETTING_KEYS = [
  'content.branche',
  'content.zielgruppe',
  'content.tonalitaet',
  'content.blacklist',
  'content.min_wortanzahl',
  'content.max_wortanzahl',
  'content.stil_regeln',
  'content.cta_url',
  'content.cta_style',
  'content.cta_prompt',
] as const;

export const REQUIRED_CONTENT_SETTINGS = [
  'content.branche',
  'content.zielgruppe',
  'content.tonalitaet',
  'content.min_wortanzahl',
  'content.max_wortanzahl',
  'content.cta_url',
  'content.cta_style',
  'content.cta_prompt',
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

  async getContentSettings(): Promise<ContentSettings> {
    const results = await Promise.all(
      CONTENT_SETTING_KEYS.map((key) => this.getSetting(key))
    );
    return {
      branche: results[0] ?? '',
      zielgruppe: results[1] ?? '',
      tonalitaet: results[2] ?? '',
      blacklist: results[3] ?? '',
      minWortanzahl: results[4] ?? '',
      maxWortanzahl: results[5] ?? '',
      stilRegeln: results[6] ?? '',
      ctaUrl: results[7] ?? '',
      ctaStyle: results[8] ?? '',
      ctaPrompt: results[9] ?? '',
    };
  }

  validateContentSettings(settings: ContentSettings): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    if (!settings.branche.trim()) missing.push('branche');
    if (!settings.zielgruppe.trim()) missing.push('zielgruppe');
    if (!settings.tonalitaet.trim()) missing.push('tonalitaet');
    if (!settings.minWortanzahl.trim()) missing.push('minWortanzahl');
    if (!settings.maxWortanzahl.trim()) missing.push('maxWortanzahl');
    if (!settings.ctaUrl.trim()) missing.push('ctaUrl');
    if (!settings.ctaStyle.trim()) missing.push('ctaStyle');
    if (!settings.ctaPrompt.trim()) missing.push('ctaPrompt');
    return { valid: missing.length === 0, missing };
  }

  async getCTAConfig(): Promise<CTAConfig> {
    const [url, style, prompt] = await Promise.all([
      this.getSetting('content.cta_url'),
      this.getSetting('content.cta_style'),
      this.getSetting('content.cta_prompt'),
    ]);
    return { url: url ?? '', style: style ?? '', prompt: prompt ?? '' };
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
    if (!tags) return [];
    try {
      return JSON.parse(tags);
    } catch {
      return [];
    }
  }
}
