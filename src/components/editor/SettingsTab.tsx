import { useState, useEffect, useCallback } from 'react';
import type { Prompt, Setting, SettingsSubTab } from './types';
import { styles } from './styles';

const SUB_TABS: { key: SettingsSubTab; label: string }[] = [
  { key: 'homepage', label: 'Homepage' },
  { key: 'content-ai', label: 'Content-KI' },
  { key: 'analysis-ai', label: 'Analyse-KI' },
  { key: 'image-ai', label: 'Bild-KI' },
  { key: 'website', label: 'Website' },
];

const SETTINGS_TABS: SettingsSubTab[] = ['homepage', 'website'];

const SETTINGS_FIELDS: Record<string, { key: string; label: string; type: 'input' | 'textarea' }[]> = {
  homepage: [
    { key: 'hero_headline', label: 'Hero Ueberschrift', type: 'input' },
    { key: 'hero_text', label: 'Hero Text', type: 'textarea' },
    { key: 'target_audience', label: 'Zielgruppe', type: 'input' },
    { key: 'tone', label: 'Tonalitaet', type: 'input' },
    { key: 'core_message', label: 'Kernbotschaft', type: 'textarea' },
  ],
  website: [
    { key: 'cta_url', label: 'CTA Link', type: 'input' },
    { key: 'cta_style', label: 'CTA Stil', type: 'input' },
    { key: 'cta_prompt', label: 'CTA Prompt', type: 'textarea' },
    { key: 'core_tags', label: 'Core Tags (kommagetrennt)', type: 'input' },
    { key: 'brand_guidelines', label: 'Markenrichtlinien', type: 'textarea' },
  ],
};

const CATEGORY_GUIDES: Record<SettingsSubTab, { title: string; description: string; example: string }> = {
  'homepage': {
    title: 'Homepage-Einstellungen',
    description: 'Konfiguriere hier die zentralen Inhalte deiner Startseite: Hero-Text, Zielgruppe, Tonalitaet und Kernbotschaft.',
    example: '',
  },
  'content-ai': {
    title: 'Content-KI Prompts',
    description: 'Steuere hier, wie die KI Blogartikel und Texte generiert. Je praeziser der Prompt, desto besser das Ergebnis. Definiere Schreibstil, SEO-Keywords und inhaltliche Schwerpunkte.',
    example: 'Beispiel: "Schreibe einen Fachartikel mit 800-1200 Woertern. Verwende die Keywords [KEYWORD] natuerlich im Text. Struktur: Einleitung mit Hook, 3-4 Abschnitte mit H2, Fazit mit CTA. Ton: fachlich aber verstaendlich."',
  },
  'analysis-ai': {
    title: 'Analyse-KI Prompts',
    description: 'Konfiguriere Prompts fuer die inhaltliche Analyse bestehender Texte. Die KI kann Texte auf SEO, Lesbarkeit, Barrierefreiheit und Content-Qualitaet pruefen.',
    example: 'Beispiel: "Analysiere den Text auf SEO-Optimierung. Pruefe: Keyword-Dichte, Meta-Beschreibung, Ueberschriften-Hierarchie, interne Verlinkung. Gib konkrete Verbesserungsvorschlaege."',
  },
  'image-ai': {
    title: 'Bild-KI Prompts',
    description: 'Definiere Prompts fuer die KI-Bildgenerierung. Beschreibe Stil, Farbpalette und Bildkomposition fuer konsistente visuelle Inhalte.',
    example: 'Beispiel: "Erstelle ein Blog-Header-Bild im minimalistischen Flat-Design. Farbpalette: Dunkelblau (#1a365d), Weiss, Akzent-Rot (#e63946). Kein Text im Bild. Seitenverhaeltnis 16:9."',
  },
  'website': {
    title: 'Website-Einstellungen',
    description: 'Allgemeine Einstellungen fuer deine Website: CTA-Texte, Standard-Tags und Markenrichtlinien.',
    example: '',
  },
};

function isSettingsTab(tab: SettingsSubTab): boolean {
  return SETTINGS_TABS.includes(tab);
}

interface EditState {
  id: string;
  value: string;
}

interface AddFormState {
  name: string;
  promptText: string;
}

export function SettingsTab() {
  const [activeSubTab, setActiveSubTab] =
    useState<SettingsSubTab>('homepage');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [_settings, setSettings] = useState<Setting[]>([]);
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>({ name: '', promptText: '' });
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/prompts');
      if (!res.ok) throw new Error('Fehler beim Laden der Einstellungen');
      const data = await res.json();
      setPrompts(Array.isArray(data.prompts) ? data.prompts : []);
      const loadedSettings: Setting[] = Array.isArray(data.settings) ? data.settings : [];
      setSettings(loadedSettings);
      const formValues: Record<string, string> = {};
      for (const s of loadedSettings) {
        formValues[s.key] = s.value;
      }
      setSettingsForm(formValues);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPrompts = prompts.filter(
    (p) => p.category === activeSubTab,
  );

  const handleEdit = (prompt: Prompt) => {
    setEditing({ id: prompt.id, value: prompt.promptText });
  };

  const handleCancel = () => {
    setEditing(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          promptText: editing.value,
        }),
      });
      if (!res.ok) throw new Error('Fehler beim Speichern');
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === editing.id ? { ...p, promptText: editing.value } : p,
        ),
      );
      setEditing(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Fehler beim Speichern',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsSave = async () => {
    setSaving(true);
    setError(null);
    setSettingsSaved(false);
    try {
      const fields = SETTINGS_FIELDS[activeSubTab] ?? [];
      for (const field of fields) {
        const value = settingsForm[field.key] ?? '';
        const res = await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'setting', key: field.key, value }),
        });
        if (!res.ok) throw new Error(`Fehler beim Speichern von "${field.label}"`);
      }
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Fehler beim Speichern',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.promptText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: addForm.name,
          category: activeSubTab,
          promptText: addForm.promptText,
        }),
      });
      if (!res.ok) throw new Error('Fehler beim Erstellen');
      setAddForm({ name: '', promptText: '' });
      setShowAddForm(false);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Fehler beim Erstellen',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch('/api/prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Fehler beim Loeschen');
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      if (editing?.id === id) setEditing(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Fehler beim Loeschen',
      );
    } finally {
      setDeleting(null);
    }
  };

  const guide = CATEGORY_GUIDES[activeSubTab];

  return (
    <div style={styles.settingsContent}>
      <div style={styles.subTabNav} role="tablist">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeSubTab === tab.key}
            style={
              activeSubTab === tab.key
                ? styles.subTabActive
                : styles.subTab
            }
            onClick={() => {
              setActiveSubTab(tab.key);
              setEditing(null);
              setShowAddForm(false);
              setSettingsSaved(false);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={styles.loadingBox}>Einstellungen werden geladen...</div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {/* Settings tabs: Homepage, Website — key-value form */}
      {!loading && isSettingsTab(activeSubTab) && (
        <div style={styles.addForm}>
          <div style={styles.addFormTitle}>{guide.title}</div>
          <div style={{ ...styles.emptyGuideText, marginBottom: '1rem' }}>{guide.description}</div>
          {(SETTINGS_FIELDS[activeSubTab] ?? []).map((field) => (
            <div key={field.key} style={styles.addFormField}>
              <label style={styles.addFormLabel}>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  style={styles.textarea}
                  value={settingsForm[field.key] ?? ''}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, [field.key]: e.target.value })
                  }
                />
              ) : (
                <input
                  style={styles.addFormInput}
                  type="text"
                  value={settingsForm[field.key] ?? ''}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, [field.key]: e.target.value })
                  }
                />
              )}
            </div>
          ))}
          <div style={styles.editButtons}>
            <button
              type="button"
              style={styles.addButton}
              onClick={handleSettingsSave}
              disabled={saving}
            >
              {saving ? 'Speichere...' : 'Einstellungen speichern'}
            </button>
            {settingsSaved && (
              <span style={{ color: '#4ade80', fontSize: '0.85rem', alignSelf: 'center' }}>
                Gespeichert
              </span>
            )}
          </div>
        </div>
      )}

      {/* Prompt tabs: Content-KI, Analyse-KI, Bild-KI — prompt cards */}
      {!loading && !isSettingsTab(activeSubTab) && (
        <>
          {filteredPrompts.length === 0 && !showAddForm && (
            <div style={styles.emptyGuide}>
              <div style={styles.emptyGuideTitle}>{guide.title}</div>
              <div style={styles.emptyGuideText}>{guide.description}</div>
              {guide.example && (
                <div style={styles.emptyGuideExample}>{guide.example}</div>
              )}
            </div>
          )}

          {filteredPrompts.length > 0 && (
            <div style={styles.cardGrid}>
              {filteredPrompts.map((prompt) => (
                <div key={prompt.id} style={styles.settingsCard}>
                  <div style={styles.settingsCardHeader}>
                    <div style={styles.settingsItemLabel}>{prompt.name}</div>
                    <div style={styles.settingsItemCategory}>
                      {prompt.category}
                    </div>
                  </div>

                  {editing?.id === prompt.id ? (
                    <div style={styles.editArea}>
                      <textarea
                        style={styles.textarea}
                        value={editing.value}
                        onChange={(e) =>
                          setEditing({ ...editing, value: e.target.value })
                        }
                      />
                      <div style={styles.editButtons}>
                        <button
                          type="button"
                          style={styles.saveButton}
                          onClick={handleSave}
                          disabled={saving}
                        >
                          {saving ? 'Speichere...' : 'Speichern'}
                        </button>
                        <button
                          type="button"
                          style={styles.cancelButton}
                          onClick={handleCancel}
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.settingsItemValue}>
                        {prompt.promptText}
                      </div>
                      <div style={{ padding: '0 1rem 1rem', display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          style={styles.editButton}
                          onClick={() => handleEdit(prompt)}
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          style={styles.deleteButton}
                          onClick={() => handleDelete(prompt.id)}
                          disabled={deleting === prompt.id}
                        >
                          {deleting === prompt.id ? 'Loesche...' : 'Loeschen'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {showAddForm && (
            <div style={styles.addForm}>
              <div style={styles.addFormTitle}>Neuen Prompt hinzufuegen ({guide.title})</div>
              <div style={styles.addFormField}>
                <label style={styles.addFormLabel}>Name</label>
                <input
                  style={styles.addFormInput}
                  type="text"
                  placeholder="z.B. Blog-Artikel Prompt, SEO-Analyse, Hero-Text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                />
              </div>
              <div style={styles.addFormField}>
                <label style={styles.addFormLabel}>Prompt-Text</label>
                <textarea
                  style={styles.textarea}
                  placeholder={guide.example}
                  value={addForm.promptText}
                  onChange={(e) => setAddForm({ ...addForm, promptText: e.target.value })}
                />
              </div>
              <div style={styles.editButtons}>
                <button
                  type="button"
                  style={styles.addButton}
                  onClick={handleAdd}
                  disabled={saving || !addForm.name.trim() || !addForm.promptText.trim()}
                >
                  {saving ? 'Erstelle...' : 'Erstellen'}
                </button>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowAddForm(false);
                    setAddForm({ name: '', promptText: '' });
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {!showAddForm && (
            <div style={{ textAlign: 'center' as const, padding: '1rem 0' }}>
              <button
                type="button"
                style={styles.addButton}
                onClick={() => setShowAddForm(true)}
              >
                + Neuen Prompt hinzufuegen
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
