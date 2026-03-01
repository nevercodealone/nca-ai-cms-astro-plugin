import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('astro:db', () => ({
  db: {},
  Prompts: {},
  SiteSettings: {},
  eq: vi.fn(),
}));

import { PromptService, ImageSettings, ContentSettings } from './PromptService';

describe('PromptService', () => {
  let service: PromptService;

  beforeEach(() => {
    service = new PromptService();
    vi.restoreAllMocks();
  });

  describe('getImageSettings', () => {
    it('returns correct structure when settings exist', async () => {
      vi.spyOn(service, 'getSetting').mockImplementation(async (key: string) => {
        const map: Record<string, string> = {
          'image.baseStylePrompt': 'A digital illustration',
          'image.constraints': 'No text overlays',
          'image.sceneTemplate': 'Scene with {title}',
          'image.altTextTemplate': 'Alt for {title}',
          'image.filenamePrompt': 'Generate a filename',
          'image.categoryScenes': '{"php":"PHP code on screen"}',
        };
        return map[key] ?? null;
      });

      const settings = await service.getImageSettings();

      expect(settings.baseStylePrompt).toBe('A digital illustration');
      expect(settings.constraints).toBe('No text overlays');
      expect(settings.sceneTemplate).toBe('Scene with {title}');
      expect(settings.altTextTemplate).toBe('Alt for {title}');
      expect(settings.filenamePrompt).toBe('Generate a filename');
      expect(settings.categoryScenes).toEqual({ php: 'PHP code on screen' });
    });

    it('returns empty strings when settings do not exist', async () => {
      vi.spyOn(service, 'getSetting').mockResolvedValue(null);

      const settings = await service.getImageSettings();

      expect(settings.baseStylePrompt).toBe('');
      expect(settings.constraints).toBe('');
      expect(settings.sceneTemplate).toBe('');
      expect(settings.altTextTemplate).toBe('');
      expect(settings.filenamePrompt).toBe('');
      expect(settings.categoryScenes).toEqual({});
    });

    it('parses categoryScenes JSON correctly', async () => {
      const scenes = { testing: 'Unit test scene', devops: 'CI/CD pipeline' };
      vi.spyOn(service, 'getSetting').mockImplementation(async (key: string) => {
        if (key === 'image.categoryScenes') return JSON.stringify(scenes);
        return 'some value';
      });

      const settings = await service.getImageSettings();

      expect(settings.categoryScenes).toEqual(scenes);
    });

    it('handles invalid categoryScenes JSON gracefully', async () => {
      vi.spyOn(service, 'getSetting').mockImplementation(async (key: string) => {
        if (key === 'image.categoryScenes') return '{invalid json!!}';
        return 'some value';
      });

      const settings = await service.getImageSettings();

      expect(settings.categoryScenes).toEqual({});
    });
  });

  describe('validateImageSettings', () => {
    function makeValidSettings(): ImageSettings {
      return {
        baseStylePrompt: 'A digital illustration',
        constraints: 'No text overlays',
        sceneTemplate: 'Scene template',
        altTextTemplate: 'Alt text template',
        filenamePrompt: 'Filename prompt',
        categoryScenes: {},
      };
    }

    it('returns valid:true when all required fields are filled', () => {
      const result = service.validateImageSettings(makeValidSettings());

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('returns valid:false with missing field names when empty', () => {
      const settings: ImageSettings = {
        baseStylePrompt: '',
        constraints: '',
        sceneTemplate: '',
        altTextTemplate: '',
        filenamePrompt: '',
        categoryScenes: {},
      };

      const result = service.validateImageSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(5);
      expect(result.missing).toContain('baseStylePrompt');
      expect(result.missing).toContain('constraints');
      expect(result.missing).toContain('sceneTemplate');
      expect(result.missing).toContain('altTextTemplate');
      expect(result.missing).toContain('filenamePrompt');
    });

    it('detects specific missing fields by name', () => {
      const settings = makeValidSettings();
      settings.constraints = '';
      settings.filenamePrompt = '   ';

      const result = service.validateImageSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['constraints', 'filenamePrompt']);
    });

    it('ignores categoryScenes (not required)', () => {
      const settings = makeValidSettings();
      settings.categoryScenes = {};

      const result = service.validateImageSettings(settings);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });
  });

  describe('getContentSettings', () => {
    it('returns correct structure when settings exist', async () => {
      vi.spyOn(service, 'getSetting').mockImplementation(async (key: string) => {
        const map: Record<string, string> = {
          'content.branche': 'Web-Entwicklung',
          'content.zielgruppe': 'Entwickler und CTOs',
          'content.tonalitaet': 'Professionell',
          'content.blacklist': 'gratis,kostenlos',
          'content.min_wortanzahl': '800',
          'content.max_wortanzahl': '1200',
          'content.stil_regeln': 'Keine Emojis',
          'content.cta_url': 'https://example.com/kontakt',
          'content.cta_style': 'Einladend',
          'content.cta_prompt': 'Generiere einen CTA',
        };
        return map[key] ?? null;
      });

      const settings = await service.getContentSettings();

      expect(settings.branche).toBe('Web-Entwicklung');
      expect(settings.zielgruppe).toBe('Entwickler und CTOs');
      expect(settings.tonalitaet).toBe('Professionell');
      expect(settings.blacklist).toBe('gratis,kostenlos');
      expect(settings.minWortanzahl).toBe('800');
      expect(settings.maxWortanzahl).toBe('1200');
      expect(settings.stilRegeln).toBe('Keine Emojis');
      expect(settings.ctaUrl).toBe('https://example.com/kontakt');
      expect(settings.ctaStyle).toBe('Einladend');
      expect(settings.ctaPrompt).toBe('Generiere einen CTA');
    });

    it('returns empty strings when settings do not exist', async () => {
      vi.spyOn(service, 'getSetting').mockResolvedValue(null);

      const settings = await service.getContentSettings();

      expect(settings.branche).toBe('');
      expect(settings.zielgruppe).toBe('');
      expect(settings.tonalitaet).toBe('');
      expect(settings.blacklist).toBe('');
      expect(settings.minWortanzahl).toBe('');
      expect(settings.maxWortanzahl).toBe('');
      expect(settings.stilRegeln).toBe('');
      expect(settings.ctaUrl).toBe('');
      expect(settings.ctaStyle).toBe('');
      expect(settings.ctaPrompt).toBe('');
    });
  });

  describe('validateContentSettings', () => {
    function makeValidContentSettings(): ContentSettings {
      return {
        branche: 'Web-Entwicklung',
        zielgruppe: 'Entwickler',
        tonalitaet: 'Professionell',
        blacklist: '',
        minWortanzahl: '800',
        maxWortanzahl: '1200',
        stilRegeln: '',
        ctaUrl: 'https://example.com',
        ctaStyle: 'Einladend',
        ctaPrompt: 'Generiere einen CTA',
      };
    }

    it('returns valid:true when all required fields are filled', () => {
      const result = service.validateContentSettings(makeValidContentSettings());

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('returns valid:false with missing field names when empty', () => {
      const settings: ContentSettings = {
        branche: '',
        zielgruppe: '',
        tonalitaet: '',
        blacklist: '',
        minWortanzahl: '',
        maxWortanzahl: '',
        stilRegeln: '',
        ctaUrl: '',
        ctaStyle: '',
        ctaPrompt: '',
      };

      const result = service.validateContentSettings(settings);

      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(8);
      expect(result.missing).toContain('branche');
      expect(result.missing).toContain('zielgruppe');
      expect(result.missing).toContain('tonalitaet');
      expect(result.missing).toContain('minWortanzahl');
      expect(result.missing).toContain('maxWortanzahl');
      expect(result.missing).toContain('ctaUrl');
      expect(result.missing).toContain('ctaStyle');
      expect(result.missing).toContain('ctaPrompt');
    });

    it('ignores optional fields (blacklist, stilRegeln)', () => {
      const settings = makeValidContentSettings();
      settings.blacklist = '';
      settings.stilRegeln = '';

      const result = service.validateContentSettings(settings);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });
  });

  describe('getCTAConfig', () => {
    it('returns empty strings when no settings exist', async () => {
      vi.spyOn(service, 'getSetting').mockResolvedValue(null);

      const config = await service.getCTAConfig();

      expect(config.url).toBe('');
      expect(config.style).toBe('');
      expect(config.prompt).toBe('');
    });
  });

  describe('getCoreTags', () => {
    it('returns empty array when no setting exists', async () => {
      vi.spyOn(service, 'getSetting').mockResolvedValue(null);

      const tags = await service.getCoreTags();

      expect(tags).toEqual([]);
    });

    it('parses valid JSON tags', async () => {
      vi.spyOn(service, 'getSetting').mockResolvedValue('["PHP","Testing"]');

      const tags = await service.getCoreTags();

      expect(tags).toEqual(['PHP', 'Testing']);
    });

    it('returns empty array for invalid JSON', async () => {
      vi.spyOn(service, 'getSetting').mockResolvedValue('invalid');

      const tags = await service.getCoreTags();

      expect(tags).toEqual([]);
    });
  });
});
