import type { AstroIntegration } from 'astro';
import react from '@astrojs/react';
import db from '@astrojs/db';
import node from '@astrojs/node';

export interface NcaAiCmsPluginOptions {
  contentPath?: string;
  autoPublish?: boolean;
}

export default function ncaAiCms(
  options: NcaAiCmsPluginOptions = {}
): AstroIntegration {
  const contentPath = options.contentPath ?? 'nca-ai-cms-content';
  const autoPublish = options.autoPublish ?? import.meta.env.PROD;

  return {
    name: 'nca-ai-cms-astro-plugin',
    hooks: {
      'astro:db:setup'({ extendDb }) {
        extendDb({
          configEntrypoint: new URL('./db/config.ts', import.meta.url),
        });
      },

      'astro:config:setup'({ injectRoute, updateConfig, addMiddleware, config }) {
        addMiddleware({
          entrypoint: 'nca-ai-cms-astro-plugin/middleware.ts',
          order: 'pre',
        });

        // Auto-register react and db integrations if not already present
        const hasReact = config.integrations.some((i) => i.name === '@astrojs/react');
        if (!hasReact) {
          config.integrations.push(react());
        }

        const hasDb = config.integrations.some((i) => i.name === '@astrojs/db');
        if (!hasDb) {
          config.integrations.push(...(db() as unknown as AstroIntegration[]));
        }

        // Auto-configure server output and node adapter
        updateConfig({
          output: 'server' as const,
          adapter: node({ mode: 'standalone' }),
        });

        // Virtual module for config sharing
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'nca-ai-cms-virtual-config',
                resolveId(id) {
                  if (id === 'virtual:nca-ai-cms/config') {
                    return '\0virtual:nca-ai-cms/config';
                  }
                },
                load(id) {
                  if (id === '\0virtual:nca-ai-cms/config') {
                    return `export const contentPath = ${JSON.stringify(contentPath)};\nexport const autoPublish = ${JSON.stringify(autoPublish)};`;
                  }
                },
              },
            ],
          },
        });

        // Inject API routes
        injectRoute({
          pattern: '/api/generate-content',
          entrypoint: 'nca-ai-cms-astro-plugin/api/generate-content.ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/generate-image',
          entrypoint: 'nca-ai-cms-astro-plugin/api/generate-image.ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/save',
          entrypoint: 'nca-ai-cms-astro-plugin/api/save.ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/save-image',
          entrypoint: 'nca-ai-cms-astro-plugin/api/save-image.ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/prompts',
          entrypoint: 'nca-ai-cms-astro-plugin/api/prompts.ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/scheduler',
          entrypoint: 'nca-ai-cms-astro-plugin/api/scheduler.ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/scheduler/generate',
          entrypoint: 'nca-ai-cms-astro-plugin/api/scheduler/generate.ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/scheduler/publish',
          entrypoint: 'nca-ai-cms-astro-plugin/api/scheduler/publish.ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/scheduler/[id]',
          entrypoint: 'nca-ai-cms-astro-plugin/api/scheduler/[id].ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/articles/[id]',
          entrypoint: 'nca-ai-cms-astro-plugin/api/articles/[id].ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/articles/[id]/apply',
          entrypoint: 'nca-ai-cms-astro-plugin/api/articles/[id]/apply.ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/articles/[id]/regenerate-text',
          entrypoint:
            'nca-ai-cms-astro-plugin/api/articles/[id]/regenerate-text.ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/articles/[id]/regenerate-image',
          entrypoint:
            'nca-ai-cms-astro-plugin/api/articles/[id]/regenerate-image.ts',
          prerender: false,
        });

        // Inject auth routes
        injectRoute({
          pattern: '/api/auth/login',
          entrypoint: 'nca-ai-cms-astro-plugin/api/auth/login.ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/auth/logout',
          entrypoint: 'nca-ai-cms-astro-plugin/api/auth/logout.ts',
          prerender: false,
        });
        injectRoute({
          pattern: '/api/auth/check',
          entrypoint: 'nca-ai-cms-astro-plugin/api/auth/check.ts',
          prerender: false,
        });

        // Inject pages
        injectRoute({
          pattern: '/login',
          entrypoint: 'nca-ai-cms-astro-plugin/pages/login.astro',
          prerender: false,
        });
        injectRoute({
          pattern: '/editor',
          entrypoint: 'nca-ai-cms-astro-plugin/pages/editor.astro',
          prerender: false,
        });
      },

      'astro:server:start'() {
        if (autoPublish) {
          import('./services/AutoPublisher.js').then(
            ({ startAutoPublisher }) => {
              startAutoPublisher(contentPath);
            }
          ).catch((err) => {
            console.error('[nca-ai-cms] AutoPublisher failed to start:', err);
          });
        }
      },
    },
  };
}

