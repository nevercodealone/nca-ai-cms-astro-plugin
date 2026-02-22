interface ImportMetaEnv {
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly EDITOR_ADMIN: string;
  readonly EDITOR_PASSWORD: string;
  readonly GOOGLE_GEMINI_API_KEY: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
