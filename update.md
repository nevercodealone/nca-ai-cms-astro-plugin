# v1.0.14

## Bugfix: Regenerate text works without content-ai settings
- `buildSystemPrompt()` no longer throws when content-ai settings are missing
- Uses fallback prompt that works with whatever settings are available — fills in configured values, skips empty ones
- Fallback prompt explicitly instructs AI to create a completely new version of the existing article with fresh structure and perspectives
- CTA section is only appended when all three CTA fields (url, style, prompt) are configured — omitted entirely otherwise
- Updated tests: replaced "throws when not configured" with fallback behavior verification

## Fix: Delete article fetch credentials
- Added `credentials: 'same-origin'` to DELETE fetch call in `DeleteAction.astro`

---

# v1.0.13

## ContentGenerator: settings-driven, zero hardcoding
- Removed all hardcoded prompt strings from `ContentGenerator.ts` (DEFAULT_SYSTEM_PROMPT, DEFAULT_CONTACT_URL, DEFAULT_CORE_TAGS)
- All content generation parameters now read from `SiteSettings` at runtime via `PromptService.getContentSettings()`
- New settings: `content.branche`, `content.zielgruppe`, `content.tonalitaet`, `content.blacklist`, `content.min_wortanzahl`, `content.max_wortanzahl`, `content.stil_regeln`, `content.cta_url`, `content.cta_style`, `content.cta_prompt`
- Added `validateContentSettings()` — blocks generation with clear error message when settings are missing
- Added blacklist post-generation check with warnings in API response
- `promptService` is now required (was optional with hardcoded fallbacks)
- Removed hardcoded fallbacks from `getCTAConfig()` and `getCoreTags()`
- Settings UI: new Content-KI tab with all content settings fields, CTA fields moved from Website tab
- Content-KI tab shows both settings form and prompt cards (dual rendering)
- 17 new tests for ContentGenerator and PromptService content settings

---

# v1.0.12

## ImageGenerator: settings-driven, zero hardcoding
- Removed all hardcoded prompt strings from `ImageGenerator.ts` (Sheeler style, accessibility references, alt-text, filename prompt)
- All image generation parameters now read from `SiteSettings` at runtime via `PromptService.getImageSettings()`
- New settings: `image.baseStylePrompt`, `image.constraints`, `image.sceneTemplate`, `image.altTextTemplate`, `image.filenamePrompt`, `image.categoryScenes`
- Added `validateImageSettings()` — blocks generation with clear error message when settings are missing
- Added optional `category` parameter to `generate()` for category-specific scene hints
- Settings UI: new fields in Bild-KI tab with `{title}` placeholder validation
- 17 new tests for PromptService and ImageGenerator

## Fix: TypeScript errors with Astro virtual modules
- Added `@ts-ignore` / `@ts-nocheck` for `astro:db`, `astro:middleware`, `@astrojs/node` imports
- `tsc --noEmit` now passes cleanly

---

# v1.0.11

## Make article-image API route public
- Added `/api/article-image/` to public path prefixes in auth middleware
- Article hero images are now accessible without authentication
- Fixes image loading on public-facing frontend pages

---

# v1.0.8

## Generalize content generator for any topic
- Removed hardcoded accessibility/Barrierefreiheit references from all prompts
- `analyzeSource` now uses `systemInstruction` consistently with `researchKeywords` and `generateContent`
- Default system prompt uses topic-agnostic language ("zum jeweiligen Thema" instead of "zur Barrierefreiheit")
- Removed hardcoded keyword integration rule from default system prompt
- Default core tags changed from accessibility-specific to general (`Web-Entwicklung`, `Best Practices`)
- Default contact URL updated to generic contact page
- Domain specialization now lives entirely in configurable database prompts

## Fix: updateSetting upsert
- `PromptService.updateSetting()` now inserts if key doesn't exist instead of silently doing nothing
- Enables creating new settings through the settings UI without pre-seeding the database

---

# v1.0.6

## Separate settings from prompts in SettingsTab
- Homepage and Website tabs now show key-value settings forms (hero text, zielgruppe, CTA, core tags, etc.)
- Content-KI, Analyse-KI, and Bild-KI tabs show prompt card UI with create/edit/delete
- Settings are saved via `POST /api/prompts` with `type: setting`
- Each settings tab has defined fields: homepage (hero, zielgruppe, ton, kernbotschaft), website (CTA, tags, markenrichtlinien)

## Category guides and custom prompts
- Empty prompt categories show content marketing guidance with concrete examples
- New "+ Neuen Prompt hinzufuegen" button to create custom prompts
- Each prompt card now has a delete button
- API: added POST with `action: create` and DELETE endpoint for prompts
- PromptService: added `createPrompt()` and `deletePrompt()` methods

---

# v1.0.5

## Fix: SettingsTab crash on prompts response
- `/api/prompts` returns `{ prompts, settings }` but SettingsTab cast the entire response as `Prompt[]`
- Fixed to extract `data.prompts` from the response object

## Auto-register dependencies
- Plugin now auto-configures `output: 'server'`, `@astrojs/node` adapter, `react()`, and `db()` via `updateConfig()`
- Consumer config is now just `integrations: [ncaAiCms()]`
- Existing manual config is respected — auto-registration only kicks in when not already set

## Setup guide in README
- Full install command with all peer dependencies
- `.env.local` setup with variable reference table
- Minimal `astro.config.mjs` example

---

# v1.0.4

## Fix: Environment variables and route prerendering

### Environment variables now work with Astro's .env files
- `getEnvVariable()` now reads from `import.meta.env` first, with a `process.env` fallback
- Previously only checked `process.env`, which meant `.env` / `.env.local` files were ignored in Astro dev and SSR
- Works in all environments: local dev, Docker, GitLab CI/CD

### All injected routes are now server-rendered
- Added `prerender: false` to all 18 injected routes (API, auth, pages)
- Consumers no longer need to set `output: 'server'` globally in their Astro config
- The plugin works with Astro's default `output: 'static'` — only plugin routes are server-rendered

### Minor: use `import.meta.env.PROD` for auto-publish check
- Replaced `process.env.NODE_ENV === 'production'` with Astro's built-in `import.meta.env.PROD`
