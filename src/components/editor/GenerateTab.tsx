import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { GeneratedArticle, GeneratedImage } from './types';
import { styles } from './styles';

interface GenerateTabState {
  input: string;
  setInput: (value: string) => void;
  article: GeneratedArticle | null;
  image: GeneratedImage | null;
  generating: boolean;
  regenerating: 'article' | 'image' | null;
  publishing: boolean;
  published: boolean;
  error: string | null;
  handleGenerate: () => Promise<void>;
  handleRegenerateArticle: () => Promise<void>;
  handleRegenerateImage: () => Promise<void>;
  handlePublish: () => Promise<void>;
  handleReset: () => void;
}

const GenerateTabContext = createContext<GenerateTabState | null>(null);

function useGenerateTab(): GenerateTabState {
  const ctx = useContext(GenerateTabContext);
  if (!ctx) {
    throw new Error('useGenerateTab must be used within GenerateTabProvider');
  }
  return ctx;
}

interface GenerateTabProviderProps {
  children: ReactNode;
}

export function GenerateTabProvider({ children }: GenerateTabProviderProps) {
  const [input, setInput] = useState('');
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [image, setImage] = useState<GeneratedImage | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState<
    'article' | 'image' | null
  >(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateContent = useCallback(async (topic: string) => {
    const res = await fetch('/api/generate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: topic }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Fehler beim Generieren des Artikels');
    }
    return res.json() as Promise<GeneratedArticle>;
  }, []);

  const generateImage = useCallback(async (topic: string) => {
    const res = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: topic }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Fehler beim Generieren des Bildes');
    }
    return res.json() as Promise<GeneratedImage>;
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) return;
    setGenerating(true);
    setError(null);
    setArticle(null);
    setImage(null);
    setPublished(false);

    try {
      const [articleResult, imageResult] = await Promise.all([
        generateContent(input),
        generateImage(input),
      ]);
      setArticle(articleResult);
      setImage(imageResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten',
      );
    } finally {
      setGenerating(false);
    }
  }, [input, generateContent, generateImage]);

  const handleRegenerateArticle = useCallback(async () => {
    if (!input.trim()) return;
    setRegenerating('article');
    setError(null);
    try {
      const result = await generateContent(input);
      setArticle(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Fehler beim Regenerieren',
      );
    } finally {
      setRegenerating(null);
    }
  }, [input, generateContent]);

  const handleRegenerateImage = useCallback(async () => {
    if (!input.trim()) return;
    setRegenerating('image');
    setError(null);
    try {
      const result = await generateImage(input);
      setImage(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Fehler beim Regenerieren',
      );
    } finally {
      setRegenerating(null);
    }
  }, [input, generateImage]);

  const handlePublish = useCallback(async () => {
    if (!article || !image) return;
    setPublishing(true);
    setError(null);

    try {
      const saveRes = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article),
      });
      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => ({}));
        throw new Error(data.error || 'Fehler beim Speichern des Artikels');
      }
      const saveData = await saveRes.json();

      const imgRes = await fetch('/api/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: image.url, folderPath: saveData.folderPath }),
      });
      if (!imgRes.ok) {
        const data = await imgRes.json().catch(() => ({}));
        throw new Error(data.error || 'Fehler beim Speichern des Bildes');
      }

      setPublished(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Fehler beim Veröffentlichen',
      );
    } finally {
      setPublishing(false);
    }
  }, [article, image]);

  const handleReset = useCallback(() => {
    setInput('');
    setArticle(null);
    setImage(null);
    setPublished(false);
    setError(null);
  }, []);

  const value: GenerateTabState = {
    input,
    setInput,
    article,
    image,
    generating,
    regenerating,
    publishing,
    published,
    error,
    handleGenerate,
    handleRegenerateArticle,
    handleRegenerateImage,
    handlePublish,
    handleReset,
  };

  return (
    <GenerateTabContext.Provider value={value}>
      {children}
    </GenerateTabContext.Provider>
  );
}

export function GenerateTabControls() {
  const {
    input,
    setInput,
    article,
    image,
    generating,
    regenerating,
    publishing,
    published,
    error,
    handleGenerate,
    handleRegenerateArticle,
    handleRegenerateImage,
    handlePublish,
    handleReset,
  } = useGenerateTab();

  if (published && article) {
    return (
      <div style={styles.panel}>
        <div style={styles.successBox}>
          <div style={styles.successIcon}>&#10003;</div>
          <div style={styles.successTitle}>Erfolgreich veröffentlicht!</div>
          <div style={styles.successPath}>{article.filepath}</div>
          <button
            type="button"
            style={styles.newButton}
            onClick={handleReset}
          >
            Neuen Artikel erstellen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.field}>
        <label style={styles.label} htmlFor="topic-input">
          Thema oder Keyword
        </label>
        <input
          id="topic-input"
          type="text"
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="z.B. React Server Components, TypeScript Generics..."
          disabled={generating}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleGenerate();
          }}
        />
        <span style={styles.hint}>
          Gib ein Thema ein, um einen Artikel zu generieren
        </span>
      </div>

      <button
        type="button"
        style={{
          ...styles.generateButton,
          opacity: generating || !input.trim() ? 0.6 : 1,
          cursor:
            generating || !input.trim() ? 'not-allowed' : 'pointer',
        }}
        onClick={handleGenerate}
        disabled={generating || !input.trim()}
      >
        <span style={styles.buttonContent}>
          {generating && <span style={styles.spinner} />}
          {generating ? 'Generiere...' : 'Artikel generieren'}
        </span>
      </button>

      {error && <div style={styles.error}>{error}</div>}

      {article && !published && (
        <div style={styles.actionSection}>
          <div style={styles.regenerateRow}>
            <button
              type="button"
              style={{
                ...styles.secondaryButton,
                opacity: regenerating ? 0.6 : 1,
              }}
              onClick={handleRegenerateArticle}
              disabled={regenerating !== null}
            >
              {regenerating === 'article'
                ? 'Regeneriere...'
                : 'Artikel regenerieren'}
            </button>
            <button
              type="button"
              style={{
                ...styles.secondaryButton,
                opacity: regenerating ? 0.6 : 1,
              }}
              onClick={handleRegenerateImage}
              disabled={regenerating !== null}
            >
              {regenerating === 'image'
                ? 'Regeneriere...'
                : 'Bild regenerieren'}
            </button>
          </div>

          <button
            type="button"
            style={{
              ...styles.publishButton,
              opacity: publishing || !image ? 0.6 : 1,
              cursor:
                publishing || !image ? 'not-allowed' : 'pointer',
            }}
            onClick={handlePublish}
            disabled={publishing || !image}
          >
            <span style={styles.buttonContent}>
              {publishing && <span style={styles.spinner} />}
              {publishing
                ? 'Veröffentliche...'
                : 'Artikel veröffentlichen'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export function GenerateTabPreview() {
  const { article, image, published } = useGenerateTab();

  if (!article && !image) return null;

  return (
    <div style={styles.previewArea}>
      {image && (
        <div style={styles.imagePreview}>
          <img src={image.url} alt={image.alt} style={styles.image} />
          <div style={styles.imageAlt}>{image.alt}</div>
        </div>
      )}

      {article && (
        <div style={published ? styles.publishedPreview : styles.preview}>
          <div style={styles.previewHeader}>
            <span style={styles.previewTitle}>Vorschau</span>
            {published && (
              <span style={styles.publishedBadge}>Veröffentlicht</span>
            )}
          </div>
          <div style={styles.filepath}>{article.filepath}</div>
          <div style={styles.frontmatter}>
            <div style={styles.frontmatterRow}>
              <span style={styles.frontmatterLabel}>Titel:</span>
              <span style={styles.frontmatterValue}>
                {article.title}
              </span>
            </div>
            <div style={styles.frontmatterRow}>
              <span style={styles.frontmatterLabel}>Beschreibung:</span>
              <span style={styles.frontmatterValue}>
                {article.description}
              </span>
            </div>
          </div>
          <div style={styles.content}>
            <div style={styles.markdown}>{article.content}</div>
          </div>
        </div>
      )}
    </div>
  );
}
