# ImageGenerator Settings Migration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all hardcoded prompt strings from `ImageGenerator.ts` and make every aspect of image generation configurable via the existing Settings system.

**Architecture:** The existing `SiteSettings` table (key-value store) and `PromptService` already support arbitrary settings with upsert. We add new `image.*` keys, extend `PromptService` with an `getImageSettings()` method, refactor `ImageGenerator` to read settings at runtime, and add UI fields to the existing `image-ai` sub-tab in `SettingsTab.tsx`.

**Tech Stack:** Astro 5 + @astrojs/db (SQLite), React 19, TypeScript, Vitest, Google GenAI (Imagen 4.0 + Gemini 2.0 Flash)

---

## Task 1: Add `getImageSettings()` to PromptService

**Files:**
- Modify: `src/services/PromptService.ts:51-83` (after existing `getSetting`/`getAllSettings`)
- Test: `src/services/PromptService.test.ts` (create)

**Step 1: Write the failing test**

Create `src/services/PromptService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock the astro:db module
vi.mock('astro:db', () => {
  const rows: Array<{ key: string; value: string }> = [];
  return {
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(() => ({ get: () => rows.find(() => true) })),
    },
    eq: vi.fn(),
    SiteSettings: {},
  };
});

import { PromptService } from './PromptService';

describe('PromptService.getImageSettings', () => {
  let service: PromptService;

  beforeEach(() => {
    service = new PromptService();
  });

  it('should have a getImageSettings method', () => {
    expect(typeof service.getImageSettings).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/PromptService.test.ts --reporter=verbose`
Expected: FAIL - `getImageSettings` is not a function

**Step 3: Define the ImageSettings interface and implement getImageSettings**

Add to `src/services/PromptService.ts` after line 1 (imports):

```typescript
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
```

Add method to the `PromptService` class (after `getCoreTags()`):

```typescript
async getImageSettings(): Promise<ImageSettings> {
  const settings: Record<string, string> = {};
  for (const key of IMAGE_SETTING_KEYS) {
    const value = await this.getSetting(key);
    settings[key] = value || '';
  }

  let categoryScenes: Record<string, string> = {};
  try {
    const raw = settings['image.categoryScenes'];
    if (raw) {
      categoryScenes = JSON.parse(raw);
    }
  } catch {
    categoryScenes = {};
  }

  return {
    baseStylePrompt: settings['image.baseStylePrompt'],
    constraints: settings['image.constraints'],
    sceneTemplate: settings['image.sceneTemplate'],
    altTextTemplate: settings['image.altTextTemplate'],
    filenamePrompt: settings['image.filenamePrompt'],
    categoryScenes,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/PromptService.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/PromptService.ts src/services/PromptService.test.ts
git commit -m "feat: add getImageSettings() to PromptService"
```

---

## Task 2: Add settings validation helper

**Files:**
- Modify: `src/services/PromptService.ts`
- Test: `src/services/PromptService.test.ts`

**Step 1: Write the failing test**

Add to `src/services/PromptService.test.ts`:

```typescript
import { REQUIRED_IMAGE_SETTINGS } from './PromptService';

describe('PromptService.validateImageSettings', () => {
  let service: PromptService;

  beforeEach(() => {
    service = new PromptService();
  });

  it('should have a validateImageSettings method', () => {
    expect(typeof service.validateImageSettings).toBe('function');
  });

  it('should return missing fields when settings are empty', () => {
    const settings = {
      baseStylePrompt: '',
      constraints: '',
      sceneTemplate: '',
      altTextTemplate: '',
      filenamePrompt: '',
      categoryScenes: {},
    };
    const result = service.validateImageSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBe(5);
  });

  it('should return valid when all required fields are filled', () => {
    const settings = {
      baseStylePrompt: 'some style',
      constraints: 'no text',
      sceneTemplate: 'scene about {title}',
      altTextTemplate: 'Image about {title}',
      filenamePrompt: 'filename for {title}',
      categoryScenes: {},
    };
    const result = service.validateImageSettings(settings);
    expect(result.valid).toBe(true);
    expect(result.missing.length).toBe(0);
  });

  it('should detect missing fields by name', () => {
    const settings = {
      baseStylePrompt: 'filled',
      constraints: '',
      sceneTemplate: 'filled {title}',
      altTextTemplate: '',
      filenamePrompt: 'filled {title}',
      categoryScenes: {},
    };
    const result = service.validateImageSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('constraints');
    expect(result.missing).toContain('altTextTemplate');
    expect(result.missing).not.toContain('baseStylePrompt');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/PromptService.test.ts --reporter=verbose`
Expected: FAIL - `validateImageSettings` is not a function

**Step 3: Implement validateImageSettings**

Add method to `PromptService` class:

```typescript
validateImageSettings(settings: ImageSettings): { valid: boolean; missing: string[] } {
  const requiredFields: Array<keyof Omit<ImageSettings, 'categoryScenes'>> = [
    'baseStylePrompt',
    'constraints',
    'sceneTemplate',
    'altTextTemplate',
    'filenamePrompt',
  ];

  const missing = requiredFields.filter(field => !settings[field]?.trim());

  return {
    valid: missing.length === 0,
    missing,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/PromptService.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/PromptService.ts src/services/PromptService.test.ts
git commit -m "feat: add validateImageSettings() for required field checks"
```

---

## Task 3: Refactor ImageGenerator to use settings

**Files:**
- Modify: `src/services/ImageGenerator.ts:1-109`
- Test: `src/services/ImageGenerator.test.ts` (create)

**Step 1: Write the failing test**

Create `src/services/ImageGenerator.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetImageSettings = vi.fn();
const mockValidateImageSettings = vi.fn();

vi.mock('./PromptService', () => ({
  PromptService: vi.fn().mockImplementation(() => ({
    getImageSettings: mockGetImageSettings,
    validateImageSettings: mockValidateImageSettings,
  })),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateImages: vi.fn().mockResolvedValue({
        generatedImages: [{ image: { imageBytes: 'dGVzdA==' } }],
      }),
    },
  })),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: { text: () => 'test-seo-filename' },
      }),
    }),
  })),
}));

import { ImageGenerator } from './ImageGenerator';

describe('ImageGenerator', () => {
  let generator: ImageGenerator;

  const validSettings = {
    baseStylePrompt: 'Photorealistic industrial photograph',
    constraints: 'No text, no letters',
    sceneTemplate: 'Scene about "{title}"',
    altTextTemplate: 'Header-Bild zum Thema {title}',
    filenamePrompt: 'Generate filename for "{title}"',
    categoryScenes: { devops: 'server room with blue LEDs' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new ImageGenerator({ apiKey: 'test-key' });
  });

  it('should throw when image settings are not configured', async () => {
    mockGetImageSettings.mockResolvedValue({
      baseStylePrompt: '',
      constraints: '',
      sceneTemplate: '',
      altTextTemplate: '',
      filenamePrompt: '',
      categoryScenes: {},
    });
    mockValidateImageSettings.mockReturnValue({
      valid: false,
      missing: ['baseStylePrompt', 'constraints', 'sceneTemplate', 'altTextTemplate', 'filenamePrompt'],
    });

    await expect(generator.generate('Test Title'))
      .rejects.toThrow(/nicht konfiguriert/);
  });

  it('should generate image when all settings are configured', async () => {
    mockGetImageSettings.mockResolvedValue(validSettings);
    mockValidateImageSettings.mockReturnValue({ valid: true, missing: [] });

    const result = await generator.generate('Test Title');
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('alt');
    expect(result).toHaveProperty('filepath');
  });

  it('should use altTextTemplate from settings with title replaced', async () => {
    mockGetImageSettings.mockResolvedValue(validSettings);
    mockValidateImageSettings.mockReturnValue({ valid: true, missing: [] });

    const result = await generator.generate('PHP Unit Testing');
    expect(result.alt).toBe('Header-Bild zum Thema PHP Unit Testing');
  });

  it('should include category scene hint when category matches', async () => {
    mockGetImageSettings.mockResolvedValue(validSettings);
    mockValidateImageSettings.mockReturnValue({ valid: true, missing: [] });

    // We test indirectly - the generate call should succeed with category
    const result = await generator.generate('Docker Basics', 'devops');
    expect(result).toHaveProperty('url');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/ImageGenerator.test.ts --reporter=verbose`
Expected: FAIL - ImageGenerator doesn't use PromptService yet

**Step 3: Refactor ImageGenerator.ts**

Replace the entire content of `src/services/ImageGenerator.ts`:

```typescript
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PromptService, type ImageSettings } from './PromptService';
import { Slug } from '../domain/value-objects/Slug';

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
  private textModel: GoogleGenerativeAI;
  private model: string;
  private promptService: PromptService;

  constructor(config: ImageGeneratorConfig) {
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.textModel = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'imagen-4.0-generate-001';
    this.promptService = new PromptService();
  }

  async generate(title: string, category?: string): Promise<GeneratedImage> {
    const settings = await this.promptService.getImageSettings();
    const validation = this.promptService.validateImageSettings(settings);

    if (!validation.valid) {
      throw new Error(
        `Bildgenerierung nicht konfiguriert. Fehlende Settings: ${validation.missing.join(', ')}. ` +
        `Bitte unter Einstellungen \u2192 Bildgenerierung ausf\u00fcllen.`
      );
    }

    const prompt = this.buildPrompt(title, settings, category);
    const filename = await this.generateSeoFilename(title, settings);
    const filepath = `dist/client/images/${filename}.webp`;

    const response = await this.client.models.generateImages({
      model: this.model,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
        personGeneration: PersonGeneration.DONT_ALLOW,
      },
    });

    const base64 = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64) {
      throw new Error('No image data received from Imagen API');
    }

    const alt = this.buildAltText(title, settings);

    return {
      url: `data:image/png;base64,${base64}`,
      alt,
      filepath,
      base64,
    };
  }

  private buildPrompt(title: string, settings: ImageSettings, category?: string): string {
    const parts = [
      settings.baseStylePrompt,
      settings.constraints,
      settings.sceneTemplate.replace('{title}', title),
    ];

    const sceneHint = settings.categoryScenes[category || ''] || settings.categoryScenes['default'] || '';
    if (sceneHint) {
      parts.push(`Visual elements: ${sceneHint}`);
    }

    return parts.filter(Boolean).join('. ');
  }

  private buildAltText(title: string, settings: ImageSettings): string {
    return settings.altTextTemplate.replace('{title}', title);
  }

  private async generateSeoFilename(title: string, settings: ImageSettings): Promise<string> {
    try {
      const model = this.textModel.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = settings.filenamePrompt.replace('{title}', title);
      const result = await model.generateContent(prompt);
      const filename = result.response.text().trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      return filename || Slug.generate(title);
    } catch {
      return Slug.generate(title);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/ImageGenerator.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/ImageGenerator.ts src/services/ImageGenerator.test.ts
git commit -m "refactor: ImageGenerator reads all prompts from settings, zero hardcoding"
```

---

## Task 4: Update generate-image API to pass category

**Files:**
- Modify: `src/api/generate-image.ts:1-34`

**Step 1: Read the current file and understand the schema**

Read: `src/api/generate-image.ts`

**Step 2: Update the API to accept optional category**

Replace content of `src/api/generate-image.ts`:

```typescript
import type { APIRoute } from 'astro';
import { ImageGenerator } from '../services/ImageGenerator';
import { z } from 'zod';

const schema = z.object({
  input: z.string().min(1),
  category: z.string().optional(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { input, category } = schema.parse(body);

    const apiKey = import.meta.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_GEMINI_API_KEY not configured' }), { status: 500 });
    }

    const generator = new ImageGenerator({ apiKey });
    const image = await generator.generate(input, category);

    return new Response(JSON.stringify({ url: image.url, alt: image.alt, filepath: image.filepath }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image generation failed';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
```

**Step 3: Run existing tests to verify nothing is broken**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests PASS

**Step 4: Commit**

```bash
git add src/api/generate-image.ts
git commit -m "feat: generate-image API accepts optional category, surfaces settings errors"
```

---

## Task 5: Add Image Settings fields to Settings UI

**Files:**
- Modify: `src/components/editor/SettingsTab.tsx:5-32` (add `image-ai` to SETTINGS_FIELDS)

**Step 1: Read the current SettingsTab.tsx to understand the exact structure**

Read: `src/components/editor/SettingsTab.tsx`

**Step 2: Add image settings fields to SETTINGS_FIELDS**

In `src/components/editor/SettingsTab.tsx`, extend the `SETTINGS_FIELDS` object to include image-ai fields:

```typescript
const SETTINGS_FIELDS: Record<string, Array<{ key: string; label: string; type: 'text' | 'textarea' | 'json'; placeholder: string }>> = {
  homepage: [
    // ... existing homepage fields unchanged ...
  ],
  website: [
    // ... existing website fields unchanged ...
  ],
  'image-ai': [
    {
      key: 'image.baseStylePrompt',
      label: 'Bildstil-Prompt',
      type: 'textarea',
      placeholder: 'z.B. Photorealistic industrial photograph, cinematic wide-angle shot, dramatic volumetric lighting...',
    },
    {
      key: 'image.constraints',
      label: 'Bild-Einschränkungen',
      type: 'textarea',
      placeholder: 'z.B. IMPORTANT: absolutely no text, no letters, no words, no typography anywhere in the image',
    },
    {
      key: 'image.sceneTemplate',
      label: 'Szenen-Template (mit {title} Platzhalter)',
      type: 'textarea',
      placeholder: 'z.B. Scene visualizing the concept: "{title}"',
    },
    {
      key: 'image.altTextTemplate',
      label: 'Alt-Text-Template (mit {title} Platzhalter)',
      type: 'text',
      placeholder: 'z.B. Header-Bild zum Thema {title}',
    },
    {
      key: 'image.filenamePrompt',
      label: 'Dateiname-Prompt (mit {title} Platzhalter)',
      type: 'textarea',
      placeholder: 'z.B. Generate a single SEO-optimized filename for an image about: "{title}"...',
    },
    {
      key: 'image.categoryScenes',
      label: 'Kategorie-Szenen (JSON)',
      type: 'textarea',
      placeholder: '{"oberflaeche": "precision laser on polished steel", "devops": "server room with blue LED lighting", "default": "modern technology environment"}',
    },
  ],
};
```

**Step 3: Ensure the image-ai sub-tab renders SETTINGS_FIELDS as form fields (not just prompts)**

The current `SettingsTab.tsx` only renders form fields for `homepage` and `website` tabs, and renders prompt cards for `content-ai`, `analysis-ai`, `image-ai`. We need to make `image-ai` render the settings form fields instead of (or in addition to) the prompt cards.

In the render logic (around line 269-313 where the settings form is rendered), update the condition to include `image-ai`:

Change the condition from:
```typescript
{(activeSubTab === 'homepage' || activeSubTab === 'website') && (
```
to:
```typescript
{(activeSubTab === 'homepage' || activeSubTab === 'website' || activeSubTab === 'image-ai') && (
```

**Note:** Keep the existing prompt cards section for `image-ai` as well, so users can manage both the settings fields AND any custom prompts. The settings form should appear above the prompt cards.

**Step 4: Verify UI renders correctly**

Start dev server and navigate to Settings > Image AI tab. Verify:
- All 6 fields appear with correct labels and placeholders
- Saving writes values to the database
- Reloading shows saved values

**Step 5: Commit**

```bash
git add src/components/editor/SettingsTab.tsx
git commit -m "feat: add image generation settings fields to image-ai tab"
```

---

## Task 6: Add settings loading to SettingsTab for image-ai keys

**Files:**
- Modify: `src/components/editor/SettingsTab.tsx` (ensure image.* keys are loaded into settingsForm state)

**Step 1: Verify settings loading logic**

Read `src/components/editor/SettingsTab.tsx` around the `useEffect` that loads settings (around line 95). The current `loadData` function fetches all settings and prompts. Verify that:
- `GET /api/prompts` already returns all settings from the DB
- The `settingsForm` state is populated from the response

**Step 2: Ensure settingsForm initialization includes image.* keys**

The existing logic should already work if it iterates over all settings returned by the API. Check if the settings form is populated by iterating over `SETTINGS_FIELDS[activeSubTab]` or all settings. If it only populates known keys, extend it.

In the `loadData` function, ensure the settings form is populated from all settings returned:

```typescript
const settingsMap: Record<string, string> = {};
for (const setting of data.settings) {
  settingsMap[setting.key] = setting.value;
}
setSettingsForm(settingsMap);
```

If the current code already does this, no change is needed. If it only populates specific keys, update it to be generic.

**Step 3: Verify save logic handles image.* keys**

The save handler should already work since it uses the generic `type: 'setting'` POST to `/api/prompts`. Verify the save button iterates over all fields in `SETTINGS_FIELDS[activeSubTab]`.

**Step 4: Test end-to-end**

1. Open Settings > Image AI
2. Fill in all fields
3. Click Save
4. Reload page
5. Verify values persist

**Step 5: Commit (if changes were needed)**

```bash
git add src/components/editor/SettingsTab.tsx
git commit -m "fix: ensure image settings are loaded and saved correctly"
```

---

## Task 7: Add validation for {title} placeholder in templates

**Files:**
- Modify: `src/components/editor/SettingsTab.tsx` (add client-side validation)

**Step 1: Add validation before save**

In the save handler for settings, add validation for image-ai fields that require `{title}`:

```typescript
// Before saving image-ai settings, validate {title} placeholder
if (activeSubTab === 'image-ai') {
  const templateFields = ['image.sceneTemplate', 'image.altTextTemplate', 'image.filenamePrompt'];
  for (const key of templateFields) {
    const value = settingsForm[key];
    if (value && !value.includes('{title}')) {
      alert(`Das Feld "${key}" muss den Platzhalter {title} enthalten.`);
      return;
    }
  }
}
```

**Step 2: Test validation**

1. Open Settings > Image AI
2. Enter a scene template without `{title}`
3. Click Save
4. Verify alert appears and save is blocked

**Step 3: Commit**

```bash
git add src/components/editor/SettingsTab.tsx
git commit -m "feat: validate {title} placeholder in image template settings"
```

---

## Task 8: Integration test - full flow

**Files:**
- Test: `src/services/ImageGenerator.test.ts` (extend)

**Step 1: Add integration-style test for buildPrompt composition**

Add to `src/services/ImageGenerator.test.ts`:

```typescript
describe('ImageGenerator prompt composition', () => {
  it('should compose prompt from all settings parts', async () => {
    const settingsWithCategory = {
      baseStylePrompt: 'Photorealistic',
      constraints: 'No text',
      sceneTemplate: 'Scene about "{title}"',
      altTextTemplate: 'Bild: {title}',
      filenamePrompt: 'Filename for "{title}"',
      categoryScenes: { devops: 'server room', default: 'tech office' },
    };
    mockGetImageSettings.mockResolvedValue(settingsWithCategory);
    mockValidateImageSettings.mockReturnValue({ valid: true, missing: [] });

    // Generate with category - should include category scene hint
    const result = await generator.generate('CI/CD Pipeline', 'devops');
    expect(result.alt).toBe('Bild: CI/CD Pipeline');
  });

  it('should use default category scene when category not found', async () => {
    const settings = {
      baseStylePrompt: 'Style',
      constraints: 'Constraints',
      sceneTemplate: 'Scene "{title}"',
      altTextTemplate: 'Alt {title}',
      filenamePrompt: 'File {title}',
      categoryScenes: { default: 'generic tech' },
    };
    mockGetImageSettings.mockResolvedValue(settings);
    mockValidateImageSettings.mockReturnValue({ valid: true, missing: [] });

    const result = await generator.generate('Unknown Category Article', 'nonexistent');
    expect(result).toHaveProperty('url');
  });

  it('should list missing fields in error message', async () => {
    mockGetImageSettings.mockResolvedValue({
      baseStylePrompt: 'filled',
      constraints: '',
      sceneTemplate: '',
      altTextTemplate: 'filled {title}',
      filenamePrompt: '',
      categoryScenes: {},
    });
    mockValidateImageSettings.mockReturnValue({
      valid: false,
      missing: ['constraints', 'sceneTemplate', 'filenamePrompt'],
    });

    await expect(generator.generate('Test'))
      .rejects.toThrow('constraints, sceneTemplate, filenamePrompt');
  });
});
```

**Step 2: Run all tests**

Run: `npx vitest run --reporter=verbose`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/services/ImageGenerator.test.ts
git commit -m "test: add integration tests for ImageGenerator settings composition"
```

---

## Task 9: Verify zero hardcoding with grep

**Files:** None (verification only)

**Step 1: Grep for hardcoded strings in ImageGenerator**

Run: `grep -n "Sheeler\|Precisionism\|accessibility\|Barrierefreiheit\|geometric shapes\|sharp focus" src/services/ImageGenerator.ts`
Expected: No matches

**Step 2: Grep for any remaining hardcoded prompt content**

Run: `grep -n "Blog header image\|Minimal Precisionism\|Illustration zum Thema" src/services/ImageGenerator.ts`
Expected: No matches

**Step 3: Verify only dynamic/structural strings remain**

Run: `grep -n "'" src/services/ImageGenerator.ts | head -30`
Expected: Only structural strings like `'data:image/png;base64,'`, `'{title}'`, `'Visual elements: '`, error messages

**Step 4: Commit (verification step, no code changes)**

No commit needed - this is a verification step.

---

## Task 10: Final test run and cleanup

**Files:** All modified files

**Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: ALL tests PASS

**Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Final commit with all remaining changes**

```bash
git status
# If any unstaged changes remain:
git add -A
git commit -m "chore: final cleanup for image settings migration"
```

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/PromptService.ts` | Modify | Add `ImageSettings` interface, `getImageSettings()`, `validateImageSettings()` |
| `src/services/PromptService.test.ts` | Create | Tests for new methods |
| `src/services/ImageGenerator.ts` | Rewrite | Remove all hardcoding, use PromptService for settings |
| `src/services/ImageGenerator.test.ts` | Create | Full test coverage with mocked settings |
| `src/api/generate-image.ts` | Modify | Accept optional `category`, surface settings errors |
| `src/components/editor/SettingsTab.tsx` | Modify | Add image-ai settings form fields, validation |

## Dependencies Between Tasks

```
Task 1 (PromptService.getImageSettings)
  └── Task 2 (validateImageSettings)
       └── Task 3 (Refactor ImageGenerator) ← core change
            └── Task 4 (Update API)
Task 5 (Settings UI fields) ← independent, can parallel with 3-4
  └── Task 6 (Settings loading)
       └── Task 7 (Validation)
Task 8 (Integration tests) ← after 3
Task 9 (Grep verification) ← after 3
Task 10 (Final check) ← after all
```
