import { defineDb } from 'astro:db';
import { SiteSettings, Prompts, ScheduledPosts, Sessions } from './tables.js';

export default defineDb({
  tables: { SiteSettings, Prompts, ScheduledPosts, Sessions },
});
