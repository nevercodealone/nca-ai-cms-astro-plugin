// @ts-nocheck - astro:db types resolved by Astro build pipeline
import { defineTable, column } from "astro:db";

const SiteSettings = defineTable({
  columns: {
    key: column.text({ primaryKey: true }),
    value: column.text(),
    updatedAt: column.date({ default: new Date() }),
  },
});

const ScheduledPosts = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    input: column.text(),
    inputType: column.text(),
    scheduledDate: column.date(),
    status: column.text({ default: "pending" }),
    generatedTitle: column.text({ optional: true }),
    generatedDescription: column.text({ optional: true }),
    generatedContent: column.text({ optional: true }),
    generatedTags: column.text({ optional: true }),
    generatedImageData: column.text({ optional: true }),
    generatedImageAlt: column.text({ optional: true }),
    publishedPath: column.text({ optional: true }),
    createdAt: column.date({ default: new Date() }),
  },
});

const Prompts = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    category: column.text(),
    promptText: column.text(),
    updatedAt: column.date({ default: new Date() }),
  },
});

export { SiteSettings, Prompts, ScheduledPosts };
