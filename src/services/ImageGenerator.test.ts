import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ImageSettings } from './PromptService';

const mockGetImageSettings = vi.fn();
const mockValidateImageSettings = vi.fn();

vi.mock('./PromptService', () => {
  return {
    PromptService: class {
      getImageSettings = mockGetImageSettings;
      validateImageSettings = mockValidateImageSettings;
    },
  };
});

const mockGenerateImages = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = { generateImages: mockGenerateImages };
    },
    PersonGeneration: {
      DONT_ALLOW: 'DONT_ALLOW',
    },
  };
});

const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return { generateContent: mockGenerateContent };
      }
    },
  };
});

vi.mock('astro:db', () => ({
  db: {},
  Prompts: {},
  SiteSettings: {},
  eq: vi.fn(),
}));

import { ImageGenerator } from './ImageGenerator';

function makeValidSettings(overrides?: Partial<ImageSettings>): ImageSettings {
  return {
    baseStylePrompt: 'Photorealistic industrial photograph',
    constraints: 'No text, no letters, no words',
    sceneTemplate: 'Scene about "{title}"',
    altTextTemplate: 'Header-Bild zum Thema {title}',
    filenamePrompt: 'Generate filename for "{title}"',
    categoryScenes: {
      devops: 'server room with blinking lights',
      default: 'modern tech office workspace',
    },
    ...overrides,
  };
}

describe('ImageGenerator', () => {
  let generator: ImageGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new ImageGenerator({ apiKey: 'test-key' });
  });

  describe('generate()', () => {
    it('throws when settings validation fails', async () => {
      const settings = makeValidSettings({ baseStylePrompt: '', constraints: '' });
      mockGetImageSettings.mockResolvedValue(settings);
      mockValidateImageSettings.mockReturnValue({
        valid: false,
        missing: ['baseStylePrompt', 'constraints'],
      });

      await expect(generator.generate('Test Title')).rejects.toThrow(
        'Bildgenerierung nicht konfiguriert. Fehlende Settings: baseStylePrompt, constraints. Bitte unter Einstellungen → Bildgenerierung ausfüllen.'
      );
    });

    it('error message lists missing field names', async () => {
      const settings = makeValidSettings({
        sceneTemplate: '',
        filenamePrompt: '',
        altTextTemplate: '',
      });
      mockGetImageSettings.mockResolvedValue(settings);
      mockValidateImageSettings.mockReturnValue({
        valid: false,
        missing: ['sceneTemplate', 'altTextTemplate', 'filenamePrompt'],
      });

      await expect(generator.generate('Test')).rejects.toThrow(
        'sceneTemplate, altTextTemplate, filenamePrompt'
      );
    });

    it('generates image when all settings are configured', async () => {
      const settings = makeValidSettings();
      mockGetImageSettings.mockResolvedValue(settings);
      mockValidateImageSettings.mockReturnValue({ valid: true, missing: [] });
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'seo-filename-test' },
      });
      mockGenerateImages.mockResolvedValue({
        generatedImages: [
          { image: { imageBytes: 'base64encodeddata' } },
        ],
      });

      const result = await generator.generate('Test Title');

      expect(result.url).toBe('data:image/png;base64,base64encodeddata');
      expect(result.base64).toBe('base64encodeddata');
      expect(result.filepath).toContain('.webp');
    });

    it('uses altTextTemplate with {title} replaced', async () => {
      const settings = makeValidSettings({
        altTextTemplate: 'Illustration for {title} article',
      });
      mockGetImageSettings.mockResolvedValue(settings);
      mockValidateImageSettings.mockReturnValue({ valid: true, missing: [] });
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'some-filename' },
      });
      mockGenerateImages.mockResolvedValue({
        generatedImages: [
          { image: { imageBytes: 'imgdata' } },
        ],
      });

      const result = await generator.generate('Docker Compose');

      expect(result.alt).toBe('Illustration for Docker Compose article');
    });

    it('includes category scene hint when category matches', async () => {
      const settings = makeValidSettings();
      mockGetImageSettings.mockResolvedValue(settings);
      mockValidateImageSettings.mockReturnValue({ valid: true, missing: [] });
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'devops-filename' },
      });
      mockGenerateImages.mockResolvedValue({
        generatedImages: [
          { image: { imageBytes: 'imgdata' } },
        ],
      });

      await generator.generate('CI/CD Pipelines', 'devops');

      const promptArg = mockGenerateImages.mock.calls[0][0].prompt;
      expect(promptArg).toContain('Visual elements: server room with blinking lights');
    });

    it('uses default category scene when category not found', async () => {
      const settings = makeValidSettings();
      mockGetImageSettings.mockResolvedValue(settings);
      mockValidateImageSettings.mockReturnValue({ valid: true, missing: [] });
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'unknown-cat-filename' },
      });
      mockGenerateImages.mockResolvedValue({
        generatedImages: [
          { image: { imageBytes: 'imgdata' } },
        ],
      });

      await generator.generate('Random Topic', 'unknown-category');

      const promptArg = mockGenerateImages.mock.calls[0][0].prompt;
      expect(promptArg).toContain('Visual elements: modern tech office workspace');
    });

    it('does not include visual elements when no category provided', async () => {
      const settings = makeValidSettings();
      mockGetImageSettings.mockResolvedValue(settings);
      mockValidateImageSettings.mockReturnValue({ valid: true, missing: [] });
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'no-cat-filename' },
      });
      mockGenerateImages.mockResolvedValue({
        generatedImages: [
          { image: { imageBytes: 'imgdata' } },
        ],
      });

      await generator.generate('Simple Topic');

      const promptArg = mockGenerateImages.mock.calls[0][0].prompt;
      expect(promptArg).not.toContain('Visual elements:');
    });

    it('fallback filename uses Slug.generate without hardcoded content', async () => {
      const settings = makeValidSettings();
      mockGetImageSettings.mockResolvedValue(settings);
      mockValidateImageSettings.mockReturnValue({ valid: true, missing: [] });
      mockGenerateContent.mockRejectedValue(new Error('API error'));
      mockGenerateImages.mockResolvedValue({
        generatedImages: [
          { image: { imageBytes: 'imgdata' } },
        ],
      });

      const result = await generator.generate('Formulare');

      // Slug.generate('Formulare') => 'formulare'
      expect(result.filepath).toBe('dist/client/images/formulare.webp');
      // Must NOT contain hardcoded strings like "barrierefreiheit" or "accessibility"
      expect(result.filepath).not.toContain('barrierefreiheit');
      expect(result.filepath).not.toContain('accessibility');
    });

    it('fallback filename uses Slug.generate when API returns empty string', async () => {
      const settings = makeValidSettings();
      mockGetImageSettings.mockResolvedValue(settings);
      mockValidateImageSettings.mockReturnValue({ valid: true, missing: [] });
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '' },
      });
      mockGenerateImages.mockResolvedValue({
        generatedImages: [
          { image: { imageBytes: 'imgdata' } },
        ],
      });

      const result = await generator.generate('Test Title');

      expect(result.filepath).toBe('dist/client/images/test-title.webp');
    });
  });
});
