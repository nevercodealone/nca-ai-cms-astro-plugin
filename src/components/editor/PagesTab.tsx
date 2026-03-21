import { useState, useEffect, useCallback } from 'react';
import { styles } from './styles';

interface PageData {
  articleId: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  image?: string;
  imageAlt?: string;
}

export function PagesTab() {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [newInput, setNewInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pages');
      if (!res.ok) throw new Error('Fehler beim Laden der Seiten');
      const data = (await res.json()) as PageData[];
      setPages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleGenerate = async () => {
    if (!newInput.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      // Generate content
      const contentRes = await fetch('/api/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: newInput }),
      });
      if (!contentRes.ok) throw new Error('Fehler bei der Seitengenerierung');
      const content = await contentRes.json();

      // Generate image
      const imageRes = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: content.title }),
      });
      const image = imageRes.ok ? await imageRes.json() : null;

      // Save page
      const saveRes = await fetch('/api/save-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: content.title,
          description: content.description,
          content: content.content,
          tags: content.tags,
          date: content.date,
          imageAlt: image?.alt,
        }),
      });
      if (!saveRes.ok) throw new Error('Fehler beim Speichern der Seite');
      const saveResult = await saveRes.json();

      // Save image if generated
      if (image?.url && saveResult.folderPath) {
        await fetch('/api/save-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: image.url,
            folderPath: saveResult.folderPath,
          }),
        });
      }

      setNewInput('');
      await loadPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (slug: string) => {
    try {
      const res = await fetch(`/api/pages/${slug}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      setDeleteConfirm(null);
      await loadPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    }
  };

  if (loading) {
    return <div style={styles.loadingBox}>Seiten werden geladen...</div>;
  }

  return (
    <div style={styles.plannerContent}>
      {/* Generate new page form */}
      <div style={styles.plannerForm}>
        <div style={styles.addFormTitle}>Neue Seite generieren</div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={styles.addFormLabel}>Thema, Keywords oder URL</label>
            <input
              type="text"
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
              placeholder="z.B. Laserreinigung, Gleitschleifen..."
              style={styles.addFormInput}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
          </div>
          <button
            type="button"
            style={styles.addButton}
            onClick={handleGenerate}
            disabled={generating || !newInput.trim()}
          >
            {generating ? 'Generiert...' : 'Seite erstellen'}
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Page list */}
      {pages.length === 0 ? (
        <div style={styles.emptyState}>
          Noch keine Seiten vorhanden. Erstellen Sie Ihre erste Seite!
        </div>
      ) : (
        <div style={styles.plannerList}>
          {pages.map((page) => (
            <div key={page.articleId} style={styles.plannerCard}>
              <div style={styles.plannerCardHeader}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text, #faf9f7)' }}>
                    {page.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #b8b5b0)', marginTop: '0.25rem' }}>
                    {page.description}
                  </div>
                </div>
                <div style={styles.plannerCardActions}>
                  <a
                    href={`/services/${page.articleId}`}
                    style={{
                      ...styles.editButton,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    Ansehen
                  </a>
                  {deleteConfirm === page.articleId ? (
                    <>
                      <button
                        type="button"
                        style={styles.deleteButton}
                        onClick={() => handleDelete(page.articleId)}
                      >
                        Bestätigen
                      </button>
                      <button
                        type="button"
                        style={styles.cancelButton}
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Abbrechen
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      style={styles.deleteButton}
                      onClick={() => setDeleteConfirm(page.articleId)}
                    >
                      Löschen
                    </button>
                  )}
                </div>
              </div>
              {page.tags && page.tags.length > 0 && (
                <div style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const }}>
                  {page.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: 'var(--color-surface-accent, #222226)',
                        border: '1px solid var(--color-border, #2a2a2e)',
                        borderRadius: '4px',
                        padding: '0.15rem 0.5rem',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted, #b8b5b0)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
