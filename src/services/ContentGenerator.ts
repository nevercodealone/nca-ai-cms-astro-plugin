import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Source } from '../domain/entities/Source';
import { Article, type ArticleProps } from '../domain/entities/Article';
import { ContentFetcher, type FetchedContent } from './ContentFetcher';

// PromptService interface for dependency injection (avoids astro:db import in tests)
export interface IPromptService {
  getPrompt(id: string): Promise<string | null>;
  getCTAConfig(): Promise<{ url: string; style: string; prompt: string }>;
  getCoreTags(): Promise<string[]>;
  getContentSettings(): Promise<import('./PromptService').ContentSettings>;
  validateContentSettings(settings: import('./PromptService').ContentSettings): { valid: boolean; missing: string[] };
}

export interface GeneratedContent {
  title: string;
  description: string;
  content: string;
  tags: string[];
  warnings?: string[];
}

export interface ContentGeneratorConfig {
  apiKey: string;
  model?: string;
  promptService: IPromptService;
}

interface SourceAnalysis {
  topic: string;
  keyPoints: string[];
  uniqueInsights: string[];
  codeExamples: string[];
}

export function buildSourceAnalysisSchema() {
  return {
    type: SchemaType.OBJECT as const,
    properties: {
      topic: {
        type: SchemaType.STRING,
        description: 'Das Hauptthema in 2-5 Wörtern',
      },
      keyPoints: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: 'Die wichtigsten Kernaussagen/Fakten',
      },
      uniqueInsights: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: 'Besondere/einzigartige Erkenntnisse oder Tipps',
      },
      codeExamples: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: 'Wichtige Code-Beispiele oder Patterns',
      },
    },
    required: ['topic', 'keyPoints', 'uniqueInsights', 'codeExamples'],
  } satisfies import('@google/generative-ai').Schema;
}

export class ContentGenerator {
  private client: GoogleGenerativeAI;
  private model: string;
  private fetcher: ContentFetcher;
  private promptService: IPromptService;
  private lastWarnings: string[] = [];

  get warnings(): string[] {
    return this.lastWarnings;
  }

  constructor(config: ContentGeneratorConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-2.5-flash';
    this.fetcher = new ContentFetcher();
    this.promptService = config.promptService;
  }

  async generateFromUrl(sourceUrl: string): Promise<Article> {
    const source = new Source(sourceUrl);
    const fetchedContent = await this.fetcher.fetch(source);

    // Step 1: Analyze source to detect topic and extract insights
    const analysis = await this.analyzeSource(fetchedContent);

    // Step 2: Generate article based on analysis
    const generated = await this.generateContent(analysis);
    this.lastWarnings = generated.warnings ?? [];

    const props: ArticleProps = {
      title: generated.title,
      description: generated.description,
      content: generated.content,
      date: new Date(),
      tags: generated.tags,
    };

    return new Article(props);
  }

  async generateFromKeywords(keywords: string): Promise<Article> {
    // Research the keywords using AI
    const analysis = await this.researchKeywords(keywords);

    // Generate article based on research
    const generated = await this.generateContent(analysis);
    this.lastWarnings = generated.warnings ?? [];

    const props: ArticleProps = {
      title: generated.title,
      description: generated.description,
      content: generated.content,
      date: new Date(),
      tags: generated.tags,
    };

    return new Article(props);
  }

  private async analyzeSource(
    fetched: FetchedContent
  ): Promise<SourceAnalysis> {
    const systemPrompt = await this.buildSystemPrompt();
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: buildSourceAnalysisSchema(),
      },
    });

    const prompt = `Analysiere diesen Web-Artikel und extrahiere die wichtigsten Informationen.

Titel: ${fetched.title}
URL: ${fetched.url}

Inhalt:
${fetched.content.slice(0, 12000)}

Identifiziere:
1. Das Hauptthema
2. Die wichtigsten Kernaussagen
3. Besondere Erkenntnisse oder einzigartige Tipps
4. Relevante Code-Beispiele oder Patterns`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Failed to parse source analysis response: ${text.slice(0, 200)}`);
    }
  }

  private async researchKeywords(keywords: string): Promise<SourceAnalysis> {
    const systemPrompt = await this.buildSystemPrompt();
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: buildSourceAnalysisSchema(),
      },
    });

    const prompt = `Recherchiere zum Thema: "${keywords}"

Nutze dein Fachwissen um:
1. Das Hauptthema klar zu definieren
2. Die wichtigsten Fakten, Best Practices und Standards zusammenzufassen
3. Weniger bekannte aber wichtige Tipps und Erkenntnisse zu identifizieren
4. Praktische Beispiele oder Patterns vorzuschlagen

Fokussiere auf aktuelle Standards und praktische Anwendbarkeit.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Failed to parse keyword research response: ${text.slice(0, 200)}`);
    }
  }

  private async generateContent(
    analysis: SourceAnalysis
  ): Promise<GeneratedContent> {
    const systemPrompt = await this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(analysis);
    const coreTags = await this.getCoreTags();

    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title: {
              type: SchemaType.STRING,
              description: 'SEO-optimierter Titel, max 60 Zeichen',
            },
            description: {
              type: SchemaType.STRING,
              description: 'Meta-Description, max 155 Zeichen',
            },
            tags: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: 'Relevante Tags für den Artikel',
            },
            content: {
              type: SchemaType.STRING,
              description:
                'Vollständiger Markdown-Inhalt. MUSS mit H1 (# Titel) beginnen, dann H2/H3 Hierarchie. Keine HTML-Tags.',
            },
          },
          required: ['title', 'description', 'tags', 'content'],
        },
      },
    });

    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    let data: { title: string; description: string; content: string; tags: string[] };
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Failed to parse generated content response: ${text.slice(0, 200)}`);
    }

    const contentSettings = await this.promptService.getContentSettings();
    const blacklistWarnings = this.checkBlacklist(data.content, contentSettings.blacklist);

    return {
      title: data.title,
      description: data.description,
      content: data.content,
      tags: [...new Set([...coreTags, ...data.tags])],
      ...(blacklistWarnings.length > 0 ? { warnings: blacklistWarnings.map(term => `Blacklist-Begriff gefunden: "${term}"`) } : {}),
    };
  }

  private async buildSystemPrompt(): Promise<string> {
    const settings = await this.promptService.getContentSettings();
    const validation = this.promptService.validateContentSettings(settings);

    // Try custom system prompt from DB first
    const basePrompt = await this.promptService.getPrompt('system_prompt');

    let systemPrompt: string;

    if (!validation.valid) {
      // Fallback: use available settings where possible, skip what's missing
      const branche = settings.branche || '';
      const zielgruppe = settings.zielgruppe || '';
      const tonalitaet = settings.tonalitaet || '';
      const minWords = settings.minWortanzahl || '800';
      const maxWords = settings.maxWortanzahl || '1200';

      systemPrompt = basePrompt
        ? basePrompt
        : `Du bist ein erfahrener technischer Content-Writer.${branche ? ` Dein Fachgebiet ist ${branche}.` : ''}
Deine Aufgabe ist es, eine KOMPLETT NEUE Version eines bestehenden Artikels zu erstellen.
Der neue Artikel soll das gleiche Thema behandeln, aber mit völlig neuer Struktur, neuen Formulierungen und frischen Perspektiven.
${zielgruppe ? `\nZielgruppe: ${zielgruppe}` : ''}${tonalitaet ? `\nTonalität: ${tonalitaet}` : ''}

KRITISCH - 100% Originalität:
- Schreibe einen KOMPLETT EIGENSTÄNDIGEN Artikel — eine völlig neue Version
- KEINE Sätze, Formulierungen oder Strukturen aus der vorherigen Version übernehmen
- KEINE Hinweise auf Quellen, Referenzen oder Inspiration im Text
- Nutze ausschließlich DEIN Expertenwissen zum jeweiligen Thema
- Jeder Satz muss NEU formuliert sein - wie von einem Experten geschrieben
- Der Artikel muss wirken als käme er aus eigener Fachkenntnis
- Wähle eine andere Gliederung und andere Schwerpunkte als ein typischer Artikel zum Thema

Regeln:
- Schreibe auf Deutsch
- Mindestens ${minWords} Wörter, maximal ${maxWords} Wörter
- Verwende praktische Codebeispiele (eigene Beispiele, nicht kopiert)
- WICHTIG: Content MUSS mit einer H1-Überschrift (# Titel) beginnen
- Danach H2 (##) und H3 (###) Hierarchie ohne Sprünge
- WICHTIG: Nur Markdown, KEINE HTML-Tags wie <p>, <div>, <span> etc.
${settings.stilRegeln ? `\nZusätzliche Stilregeln:\n${settings.stilRegeln}` : ''}

Titel-Regeln:
- Das Hauptthema/Keyword MUSS im Titel vorkommen
- Nutze Zahlen wenn möglich (z.B. "5 Tipps", "3 Fehler")
- Zeige den Nutzen/Benefit (z.B. "So vermeidest du...", "Warum X wichtig ist")
- Wecke Neugier oder löse ein Problem`;
    } else {
      systemPrompt = basePrompt
        ? basePrompt
        : `Du bist ein erfahrener technischer Content-Writer für ${settings.branche}.
Deine Aufgabe ist es, hochwertige deutsche Fachartikel zu erstellen.

Zielgruppe: ${settings.zielgruppe}
Tonalität: ${settings.tonalitaet}

KRITISCH - 100% Originalität:
- Schreibe einen KOMPLETT EIGENSTÄNDIGEN Artikel
- KEINE Sätze, Formulierungen oder Strukturen aus externen Quellen übernehmen
- KEINE Hinweise auf Quellen, Referenzen oder Inspiration im Text
- Nutze ausschließlich DEIN Expertenwissen zum jeweiligen Thema
- Jeder Satz muss NEU formuliert sein - wie von einem Experten geschrieben
- Der Artikel muss wirken als käme er aus eigener Fachkenntnis

Regeln:
- Schreibe auf Deutsch
- Mindestens ${settings.minWortanzahl} Wörter, maximal ${settings.maxWortanzahl} Wörter
- Verwende praktische Codebeispiele (eigene Beispiele, nicht kopiert)
- WICHTIG: Content MUSS mit einer H1-Überschrift (# Titel) beginnen
- Danach H2 (##) und H3 (###) Hierarchie ohne Sprünge
- WICHTIG: Nur Markdown, KEINE HTML-Tags wie <p>, <div>, <span> etc.
${settings.stilRegeln ? `\nZusätzliche Stilregeln:\n${settings.stilRegeln}` : ''}

Titel-Regeln:
- Das Hauptthema/Keyword MUSS im Titel vorkommen
- Nutze Zahlen wenn möglich (z.B. "5 Tipps", "3 Fehler")
- Zeige den Nutzen/Benefit (z.B. "So vermeidest du...", "Warum X wichtig ist")
- Wecke Neugier oder löse ein Problem`;
    }

    // Only add CTA section when CTA settings are configured
    const hasCta = settings.ctaUrl && settings.ctaStyle && settings.ctaPrompt;
    if (hasCta) {
      return `${systemPrompt}

- WICHTIG: Beende den Artikel mit einem einzigartigen Call-to-Action:
  - Link: ${settings.ctaUrl}
  - Stil: ${settings.ctaStyle}
  ${settings.ctaPrompt}`;
    }

    return systemPrompt;
  }

  private buildUserPrompt(analysis: SourceAnalysis): string {
    return `Schreibe einen deutschen Fachartikel zum Thema: ${analysis.topic}

Behandle diese Aspekte aus deinem Fachwissen:
${analysis.keyPoints.map((p) => `- ${p}`).join('\n')}
${analysis.uniqueInsights.map((p) => `- ${p}`).join('\n')}

${analysis.codeExamples.length > 0 ? `Zeige praktische Beispiele für:\n${analysis.codeExamples.map((c) => `- ${c}`).join('\n')}` : ''}

Wichtig: Schreibe komplett eigenständig aus deiner Expertise heraus.`;
  }

  private async getCoreTags(): Promise<string[]> {
    return await this.promptService.getCoreTags();
  }

  private checkBlacklist(content: string, blacklist: string): string[] {
    if (!blacklist.trim()) return [];
    const terms = blacklist.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    return terms.filter(term => content.toLowerCase().includes(term));
  }
}
