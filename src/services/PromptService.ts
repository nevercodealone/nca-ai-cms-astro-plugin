import { db, Prompts, SiteSettings, eq } from 'astro:db';

export interface CTAConfig {
  url: string;
  style: string;
  prompt: string;
}

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
    await db
      .update(SiteSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(SiteSettings.key, key));
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

  async getCoreTags(): Promise<string[]> {
    const tags = await this.getSetting('core_tags');
    if (!tags) return ['Semantik', 'HTML', 'Barrierefrei'];
    try {
      return JSON.parse(tags);
    } catch {
      return ['Semantik', 'HTML', 'Barrierefrei'];
    }
  }
}
