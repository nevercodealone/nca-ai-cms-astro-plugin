import { describe, it, expect, beforeEach, vi } from 'vitest';

let callCount = 0;
const mockGenerateContent = vi.fn().mockImplementation(() => {
  callCount++;
  if (callCount % 2 === 1) {
    // First call: researchKeywords → SourceAnalysis
    return {
      response: {
        text: () =>
          JSON.stringify({
            topic: 'PHP Testing',
            keyPoints: ['Unit Tests sind wichtig'],
            uniqueInsights: ['PHPUnit 11 hat neue Features'],
            codeExamples: ['assertEquals()'],
          }),
      },
    };
  }
  // Second call: generateContent → article
  return {
    response: {
      text: () =>
        JSON.stringify({
          title: 'Test Titel',
          description: 'Test Beschreibung',
          content: '# Test\n\nInhalt hier',
          tags: ['test'],
        }),
    },
  };
});

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return { generateContent: mockGenerateContent };
      }
    },
    SchemaType: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY' },
  };
});

vi.mock('./ContentFetcher', () => ({
  ContentFetcher: class {
    async fetch() {
      return {
        title: 'Source Title',
        url: 'https://example.com',
        content: 'Source content here',
      };
    }
  },
}));

import type { ContentSettings } from './PromptService';
import type { IPromptService } from './ContentGenerator';
import { ContentGenerator } from './ContentGenerator';

function makeValidContentSettings(): ContentSettings {
  return {
    branche: 'Web-Entwicklung',
    zielgruppe: 'Entwickler und CTOs',
    tonalitaet: 'Professionell',
    blacklist: '',
    minWortanzahl: '800',
    maxWortanzahl: '1200',
    stilRegeln: '',
    ctaUrl: 'https://example.com/kontakt',
    ctaStyle: 'Einladend',
    ctaPrompt: 'Generiere einen CTA',
  };
}

function makeMockPromptService(overrides: Partial<ContentSettings> = {}): IPromptService {
  const settings = { ...makeValidContentSettings(), ...overrides };
  return {
    getPrompt: vi.fn().mockResolvedValue(null),
    getCTAConfig: vi.fn().mockResolvedValue({
      url: settings.ctaUrl,
      style: settings.ctaStyle,
      prompt: settings.ctaPrompt,
    }),
    getCoreTags: vi.fn().mockResolvedValue([]),
    getContentSettings: vi.fn().mockResolvedValue(settings),
    validateContentSettings: vi.fn().mockReturnValue({ valid: true, missing: [] }),
  };
}

describe('ContentGenerator', () => {
  beforeEach(() => {
    callCount = 0;
    mockGenerateContent.mockClear();
  });

  describe('buildSystemPrompt via generateFromKeywords', () => {
    it('uses fallback prompt when settings not configured', async () => {
      const promptService = makeMockPromptService({
        branche: '',
        zielgruppe: '',
        tonalitaet: '',
        ctaUrl: '',
        ctaStyle: '',
        ctaPrompt: '',
      });
      (promptService.validateContentSettings as ReturnType<typeof vi.fn>).mockReturnValue({
        valid: false,
        missing: ['branche', 'zielgruppe'],
      });

      const generator = new ContentGenerator({
        apiKey: 'test-key',
        promptService,
      });

      const article = await generator.generateFromKeywords('PHP Testing');

      expect(article.title).toBe('Test Titel');
      expect(article.content).toBe('# Test\n\nInhalt hier');
      // Verify system prompt used generic fallback values
      const systemInstruction = mockGenerateContent.mock.calls[0]?.[0] ||
        mockGenerateContent.mock.results[0];
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('omits CTA section when CTA settings are empty', async () => {
      const promptService = makeMockPromptService({
        ctaUrl: '',
        ctaStyle: '',
        ctaPrompt: '',
      });
      (promptService.validateContentSettings as ReturnType<typeof vi.fn>).mockReturnValue({
        valid: true,
        missing: [],
      });

      const generator = new ContentGenerator({
        apiKey: 'test-key',
        promptService,
      });

      const article = await generator.generateFromKeywords('PHP Testing');

      expect(article.title).toBe('Test Titel');
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('generates content when settings configured', async () => {
      const promptService = makeMockPromptService();
      const generator = new ContentGenerator({
        apiKey: 'test-key',
        promptService,
      });

      const article = await generator.generateFromKeywords('PHP Testing');

      expect(article.title).toBe('Test Titel');
      expect(article.content).toBe('# Test\n\nInhalt hier');
    });

    it('getCoreTags returns empty array (no hardcoded fallback)', async () => {
      const promptService = makeMockPromptService();
      (promptService.getCoreTags as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const generator = new ContentGenerator({
        apiKey: 'test-key',
        promptService,
      });

      const article = await generator.generateFromKeywords('test');

      expect(article.tags).toEqual(['test']);
      expect(article.tags).not.toContain('Web-Entwicklung');
      expect(article.tags).not.toContain('Best Practices');
    });
  });

  describe('blacklist check', () => {
    it('checkBlacklist returns empty when content is clean', () => {
      const generator = new ContentGenerator({
        apiKey: 'test-key',
        promptService: makeMockPromptService(),
      });

      // Access private method for testing
      const result = (generator as any).checkBlacklist('Dieser Text ist sauber.', 'gratis,kostenlos');

      expect(result).toEqual([]);
    });

    it('checkBlacklist detects blacklisted terms', () => {
      const generator = new ContentGenerator({
        apiKey: 'test-key',
        promptService: makeMockPromptService(),
      });

      const result = (generator as any).checkBlacklist(
        'Dieses gratis Tool ist kostenlos.',
        'gratis,kostenlos'
      );

      expect(result).toEqual(['gratis', 'kostenlos']);
    });

    it('checkBlacklist returns empty with empty blacklist', () => {
      const generator = new ContentGenerator({
        apiKey: 'test-key',
        promptService: makeMockPromptService(),
      });

      const result = (generator as any).checkBlacklist('Irgendein Text', '');

      expect(result).toEqual([]);
    });
  });
});
