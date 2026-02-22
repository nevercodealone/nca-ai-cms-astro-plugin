# NCA AI CMS Astro Plugin

An Astro plugin that adds an AI-powered content editor to your site. Generate articles and images with Google Gemini, schedule posts, and manage everything from a built-in editor UI.

**Never code alone** — this is an open source project by [Never Code Alone](https://nevercodealone.de).

## What it does

- Adds an `/editor` page with a React-based UI for content management
- Generates articles and images using Google Gemini AI
- Schedules and auto-publishes posts as Markdown files
- Handles authentication so your host project stays simple

## Setup

### 1. Install

```bash
npm install nca-ai-cms-astro-plugin @astrojs/node @astrojs/react @astrojs/db react react-dom @google/genai @google/generative-ai gray-matter marked sanitize-html sharp turndown zod
```

### 2. Add to your Astro config

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import ncaAiCms from 'nca-ai-cms-astro-plugin';

export default defineConfig({
  integrations: [ncaAiCms()],
});
```

The plugin auto-registers `react()`, `db()`, `output: 'server'`, and the `@astrojs/node` adapter. You can still set them manually if you need custom options.

### 3. Create `.env.local`

```env
EDITOR_ADMIN=admin
EDITOR_PASSWORD=your-secure-password
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
```

| Variable | Required | Purpose |
|---|---|---|
| `EDITOR_ADMIN` | Yes | Login username for the editor |
| `EDITOR_PASSWORD` | Yes | Login password for the editor |
| `GOOGLE_GEMINI_API_KEY` | Yes | Google Gemini API key for content and image generation |

Add `.env.local` to your `.gitignore` — never commit secrets.

### 4. Start the dev server

```bash
npx astro dev
```

- Login: http://localhost:4321/login
- Editor: http://localhost:4321/editor (redirects to login if not authenticated)

### Requirements

- Astro 5+
- Node.js 18+

## Options

```ts
ncaAiCms({
  contentPath: 'src/content/blog', // where Markdown files are saved (default: 'nca-ai-cms-content')
  autoPublish: true,               // auto-publish scheduled posts (default: true in production)
});
```

## Routes added

| Route | Description |
|---|---|
| `/login` | Login page |
| `/editor` | Content editor UI |
| `/api/auth/*` | Authentication endpoints |
| `/api/generate-content` | Generate article text |
| `/api/generate-image` | Generate article image |
| `/api/save` | Save Markdown file |
| `/api/prompts` | Manage prompt templates |
| `/api/scheduler` | Manage scheduled posts |
| `/api/articles/*` | Article operations |

All `/api/*` and `/editor` routes are protected by cookie-based authentication.

## Settings Best Practice

The editor has a **Settings** tab with two groups of fields (Homepage and Website) that control how AI generates content. It also has three prompt categories (Content-KI, Analyse-KI, Bild-KI) where you create reusable prompts. Filling these in with values tailored to your business dramatically improves output quality.

### Settings fields

| Tab | Field | Key | Description |
|---|---|---|---|
| Homepage | Hero Ueberschrift | `hero_headline` | Main headline shown on your homepage |
| Homepage | Hero Text | `hero_text` | Supporting text below the hero headline |
| Homepage | Zielgruppe | `target_audience` | Who your content is for (e.g. "CTOs at mid-size SaaS companies") |
| Homepage | Tonalitaet | `tone` | Voice and tone for generated content (e.g. "professional but approachable") |
| Homepage | Kernbotschaft | `core_message` | The one key message your site should communicate |
| Website | CTA Link | `cta_url` | Default call-to-action URL (e.g. "/contact" or "/demo") |
| Website | CTA Stil | `cta_style` | Style or label for the CTA button (e.g. "Jetzt starten") |
| Website | CTA Prompt | `cta_prompt` | Prompt text used to generate CTA copy |
| Website | Core Tags | `core_tags` | Comma-separated keywords for your site (e.g. "AI, CMS, Astro, Open Source") |
| Website | Markenrichtlinien | `brand_guidelines` | Brand rules the AI should follow (colors, dos/don'ts, terminology) |

### Get values for your business with one AI prompt

Copy the prompt below into any AI chat (ChatGPT, Claude, Gemini) and replace the placeholder with a description of your business. You will get ready-to-paste values for every field.

```text
I run the following business/website:
[Describe your business in 1-2 sentences, e.g. "An open-source community that organizes charity coding events for nonprofits in Germany."]

Please generate values for each of the following content management settings.
Return them as a simple list so I can copy-paste each value into the corresponding field.

1. hero_headline — A compelling hero headline (max ~10 words)
2. hero_text — Supporting hero text (2-3 sentences)
3. target_audience — Target audience description (one sentence)
4. tone — Tone of voice for all generated content (2-4 descriptive words)
5. core_message — Core message / value proposition (1-2 sentences)
6. cta_url — Suggested CTA link path (e.g. /contact)
7. cta_style — CTA button label text (2-4 words)
8. cta_prompt — Short prompt the AI uses to generate CTA copy (one sentence)
9. core_tags — 5-8 comma-separated keywords/tags for the site
10. brand_guidelines — Brand guidelines for AI-generated content (3-5 bullet points covering tone, terminology, and things to avoid)
```

### Prompt categories

The three prompt tabs let you create reusable prompts that the AI uses when generating or analysing content.

| Category | Purpose | Tips for good prompts |
|---|---|---|
| **Content-KI** | Controls how the AI writes blog articles and text | Define word count, structure (intro/sections/CTA), target keywords, and writing style. The more specific, the better. |
| **Analyse-KI** | Controls how the AI analyses existing text | Specify what to check — SEO, readability, accessibility, keyword density — and ask for concrete improvement suggestions. |
| **Bild-KI** | Controls how the AI generates images | Describe the visual style, color palette, composition, and aspect ratio. Mention what should *not* appear in the image. |

## Development

```bash
npm test          # run tests
npm run typecheck # check types
```

## License

MIT
