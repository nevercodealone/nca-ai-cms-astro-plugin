import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Slug } from '../domain/value-objects/Slug';
import { PromptService, type ImageSettings } from './PromptService';

export interface GeneratedImage {
  url: string;
  alt: string;
  filepath: string;
  base64?: string;
}

export interface ImageGeneratorConfig {
  apiKey: string;
  model?: string;
}

export class ImageGenerator {
  private client: GoogleGenAI;
  private textClient: GoogleGenerativeAI;
  private model: string;
  private promptService: PromptService;

  constructor(config: ImageGeneratorConfig) {
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.textClient = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'imagen-4.0-generate-001';
    this.promptService = new PromptService();
  }

  async generate(title: string, category?: string): Promise<GeneratedImage> {
    const settings = await this.promptService.getImageSettings();
    const validation = this.promptService.validateImageSettings(settings);

    if (!validation.valid) {
      throw new Error(
        `Bildgenerierung nicht konfiguriert. Fehlende Settings: ${validation.missing.join(', ')}. Bitte unter Einstellungen → Bildgenerierung ausfüllen.`
      );
    }

    const prompt = this.buildPrompt(title, settings, category);
    const filename = await this.generateSeoFilename(title, settings);
    const filepath = `dist/client/images/${filename}.webp`;

    try {
      const response = await this.client.models.generateImages({
        model: this.model,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
          personGeneration: PersonGeneration.DONT_ALLOW,
        },
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error('No image generated');
      }

      const imageData = response.generatedImages[0];
      if (!imageData) {
        throw new Error('No image data in response');
      }
      const base64 = imageData.image?.imageBytes;

      if (!base64) {
        throw new Error('No image data received');
      }

      return {
        url: `data:image/png;base64,${base64}`,
        alt: this.buildAltText(title, settings),
        filepath,
        base64,
      };
    } catch (error) {
      console.error('Image generation error:', error);
      throw new Error(
        `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private buildPrompt(title: string, settings: ImageSettings, category?: string): string {
    const scene = settings.sceneTemplate.replace('{title}', title);
    let prompt = `${scene} ${settings.baseStylePrompt} ${settings.constraints}`;

    if (category) {
      const sceneHint = settings.categoryScenes[category] ?? settings.categoryScenes['default'];
      if (sceneHint) {
        prompt += ` Visual elements: ${sceneHint}`;
      }
    }

    return prompt;
  }

  private buildAltText(title: string, settings: ImageSettings): string {
    return settings.altTextTemplate.replace('{title}', title);
  }

  private async generateSeoFilename(title: string, settings: ImageSettings): Promise<string> {
    const model = this.textClient.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });

    const prompt = settings.filenamePrompt.replace('{title}', title);

    try {
      const result = await model.generateContent(prompt);
      const filename = result.response
        .text()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '');
      return filename || Slug.generate(title);
    } catch {
      return Slug.generate(title);
    }
  }
}
