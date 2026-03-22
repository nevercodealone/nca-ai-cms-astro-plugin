import { useState } from 'react';
import type { TabType } from './editor/types';
import { styles } from './editor/styles';
import { useTabNavigation } from './editor/useTabNavigation';
import {
  GenerateTabProvider,
  GenerateTabControls,
  GenerateTabPreview,
} from './editor/GenerateTab';
import { SettingsTab } from './editor/SettingsTab';
import { PlannerTab } from './editor/PlannerTab';
import { PagesTab } from './editor/PagesTab';

const TABS: { key: TabType; label: string }[] = [
  { key: 'generate', label: 'Generieren' },
  { key: 'planner', label: 'Planer' },
  { key: 'pages', label: 'Seiten' },
  { key: 'settings', label: 'Einstellungen' },
];

export default function Editor() {
  const [activeTab, setActiveTab] = useState<TabType>('generate');

  const tabIndex = TABS.findIndex((t) => t.key === activeTab);
  const { handleTabKeyDown, tabListRef } = useTabNavigation({
    tabCount: TABS.length,
    activeIndex: tabIndex,
    onActivate: (index) => { const tab = TABS[index]; if (tab) setActiveTab(tab.key); },
  });

  const isFullWidth = activeTab !== 'generate';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Editor-Tabs"
          style={styles.tabNav}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`panel-${tab.key}`}
              id={`tab-${tab.key}`}
              tabIndex={activeTab === tab.key ? 0 : -1}
              style={
                activeTab === tab.key ? styles.tabActive : styles.tab
              }
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={handleTabKeyDown}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          style={styles.logoutButton}
          onClick={handleLogout}
        >
          Abmelden
        </button>
      </div>

      {activeTab === 'generate' && (
        <GenerateTabProvider>
          <div
            id="panel-generate"
            role="tabpanel"
            aria-labelledby="tab-generate"
            style={{
              display: 'grid',
              gridTemplateColumns: '380px 1fr',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            <GenerateTabControls />
            <GenerateTabPreview />
          </div>
        </GenerateTabProvider>
      )}

      {activeTab === 'planner' && (
        <div
          id="panel-planner"
          role="tabpanel"
          aria-labelledby="tab-planner"
          style={isFullWidth ? styles.panelFullWidth : undefined}
        >
          <PlannerTab />
        </div>
      )}

      {activeTab === 'pages' && (
        <div
          id="panel-pages"
          role="tabpanel"
          aria-labelledby="tab-pages"
          style={isFullWidth ? styles.panelFullWidth : undefined}
        >
          <PagesTab />
        </div>
      )}

      {activeTab === 'settings' && (
        <div
          id="panel-settings"
          role="tabpanel"
          aria-labelledby="tab-settings"
          style={isFullWidth ? styles.panelFullWidth : undefined}
        >
          <SettingsTab />
        </div>
      )}
    </div>
  );
}
