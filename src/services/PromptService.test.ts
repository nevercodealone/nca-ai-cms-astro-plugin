import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('astro:db', () => ({
  db: {},
  Prompts: {},
  SiteSettings: {},
  eq: vi.fn(),
}));

import { PromptService, ImageSettings } from './PromptService';

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
});
