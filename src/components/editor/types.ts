export type TabType = 'generate' | 'planner' | 'pages' | 'settings';

export type SettingsSubTab =
  | 'homepage'
  | 'content-ai'
  | 'analysis-ai'
  | 'image-ai'
  | 'website';

export interface Prompt {
  id: string;
  name: string;
  category: string;
  promptText: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface GeneratedArticle {
  title: string;
  description: string;
  content: string;
  filepath: string;
}

export interface GeneratedImage {
  url: string;
  alt: string;
  filepath: string;
}

export interface ScheduledPostData {
  id: string;
  input: string;
  inputType: string;
  scheduledDate: string;
  status: string;
  generatedTitle?: string;
  generatedDescription?: string;
  generatedContent?: string;
  generatedTags?: string;
  generatedImageData?: string;
  generatedImageAlt?: string;
  publishedPath?: string;
  createdAt: string;
}
