'use client';
import { useState, useCallback, useEffect } from 'react';
import DashboardHome from '@/app/components/timeseries/home/DashboardHome';
import DashboardViewer from '@/app/components/timeseries/viewer/DashboardViewer';
import DashboardBuilder from '@/app/components/timeseries/builder/DashboardBuilder';
import DashboardTabBar, { type DashboardTab } from '@/app/components/timeseries/viewer/DashboardTabBar';
import { useDashboard, useDashboardList } from '@/app/hooks/timeseries/useDashboard';
import { getTemplate } from '@/app/lib/timeseries/templates';
import { saveDashboard } from '@/app/lib/timeseries/dashboard-store';
import { DEMO_TABLE_SCHEMAS } from '@/app/lib/timeseries/demo-setup';
import { buildTemplateDemoData } from '@/app/lib/timeseries/template-mock-data';
import type { DashboardConfig, TemplateDefinition, DataSourceConfig } from '@/app/lib/timeseries/types';

// ── Navigation state ──────────────────────────────────────────────────────────

type HomeTab = 'my-dashboards' | 'templates';

type AppState =
  | { mode: 'home';             activeTab?: HomeTab }
  | { mode: 'view';             dashboardId: string }
  | { mode: 'builder';          dashboardId: string; fromTemplate?: boolean }
  | { mode: 'template-preview'; templateId: string };

// ── Sub-pages that need a dashboard loaded ────────────────────────────────────

function ViewPage({
  dashboardId,
  onEdit,
  onBack,
  onSave,
  hasTabBar,
}: {
  dashboardId: string;
  onEdit: () => void;
  onBack: () => void;
  onSave: (c: DashboardConfig) => void;
  hasTabBar?: boolean;
}) {
  const { config } = useDashboard(dashboardId);

  if (!config) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
        <p className="text-sm">Dashboard not found.</p>
        <button onClick={onBack} className="text-sm text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Go back
        </button>
      </div>
    );
  }

  return (
    <DashboardViewer
      config={config}
      onEdit={onEdit}
      onBack={onBack}
      hasTabBar={hasTabBar}
    />
  );
}

function BuilderPage({
  dashboardId,
  fromTemplate,
  onSave,
  onPreview,
  onBack,
}: {
  dashboardId: string;
  fromTemplate?: boolean;
  onSave: (c: DashboardConfig) => void;
  onPreview: (c: DashboardConfig) => void;
  onBack: () => void;
}) {
  const { config, update } = useDashboard(dashboardId);

  if (!config) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
        <p className="text-sm">Dashboard not found.</p>
        <button onClick={onBack} className="text-sm text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Go back
        </button>
      </div>
    );
  }

  return (
    <DashboardBuilder
      config={config}
      fromTemplate={fromTemplate}
      onSave={(updated) => {
        update(updated);
        onSave(updated);
      }}
      onPreview={(updated) => {
        update(updated);
        onPreview(updated);
      }}
      onBack={onBack}
    />
  );
}

// ── Build a DashboardConfig that queries the template's _demo_* table ─────────
// Column names are resolved at runtime from DEMO_TABLE_SCHEMAS via role indices.
// Zero hardcoded column strings — the schema registry is the single source of truth.

function buildPreviewConfig(template: TemplateDefinition): DashboardConfig {
  const schema = DEMO_TABLE_SCHEMAS[template.demoTable];
  const fallbackMetric = schema?.primaryMetric ?? 'value';

  const baseDs: DataSourceConfig = {
    schema:       'monkdb',
    table:        template.demoTable,
    timestampCol: 'ts',
    metricCol:    fallbackMetric,
    aggregation:  'AVG' as const,
    limit:        200,
  };

  return {
    id:              `preview_${template.id}`,
    name:            template.name,
    description:     template.description,
    themeId:         template.themeId,
    refreshInterval: 'manual',
    createdAt:       new Date().toISOString(),
    updatedAt:       new Date().toISOString(),
    templateId:      template.id,
    widgets: template.defaultLayout.map((layout) => {
      const role = schema?.widgetRoles[layout.id];
      if (!role || !schema) return { ...layout, dataSource: baseDs };

      return {
        ...layout,
        dataSource: {
          ...baseDs,
          metricCol:   role.metricCol,
          aggregation: role.agg,
          ...(role.groupCol !== undefined && { groupCol: role.groupCol }),
          ...(role.limit    !== undefined && { limit:    role.limit }),
        },
      };
    }),
  };
}

// ── Template preview page — shows mock data instantly, no MonkDB required ────

function TemplatePreviewPage({
  templateId,
  onBack,
  onUseTemplate,
}: {
  templateId: string;
  onBack: () => void;
  onUseTemplate: () => void;
}) {
  const template = getTemplate(templateId);
  if (!template) return <NotFound onBack={onBack} />;

  const previewConfig    = buildPreviewConfig(template);
  const templateDemoData = buildTemplateDemoData(previewConfig.widgets);

  return (
    <DashboardViewer
      config={previewConfig}
      demoMode
      templateDemoData={templateDemoData}
      onBack={onBack}
      onEdit={onUseTemplate}
    />
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// ── Shared dashboard view (from #share= URL) ─────────────────────────────────

function SharedDashboardView({ encoded, onBack }: { encoded: string; onBack: () => void }) {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [error,  setError]  = useState('');

  useEffect(() => {
    try {
      const json = decodeURIComponent(atob(encoded));
      setConfig(JSON.parse(json) as DashboardConfig);
    } catch {
      setError('Invalid or corrupted share link.');
    }
  }, [encoded]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
        <p className="text-sm font-semibold text-red-400">{error}</p>
        <button onClick={onBack} className="text-sm text-blue-600 underline">Go back</button>
      </div>
    );
  }
  if (!config) return null;

  return <DashboardViewer config={config} onBack={onBack} />;
}

const TABS_STORAGE_KEY   = 'monkdb_open_tabs';
const ACTIVE_STORAGE_KEY = 'monkdb_active_tab';

export default function TimeSeriesPage() {
  const [appState, setAppState] = useState<AppState>({ mode: 'home' });
  const { save, dashboards } = useDashboardList();

  // ── Multi-dashboard tabs ──────────────────────────────────────────────────
  // Restore tabs from localStorage on first render
  const [openTabs, setOpenTabs] = useState<DashboardTab[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(TABS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as DashboardTab[]) : [];
    } catch { return []; }
  });

  // Restore active tab on first render (after tabs are loaded)
  useEffect(() => {
    try {
      const activeId = localStorage.getItem(ACTIVE_STORAGE_KEY);
      const tabs: DashboardTab[] = JSON.parse(localStorage.getItem(TABS_STORAGE_KEY) ?? '[]');
      if (activeId && tabs.some((t) => t.dashboardId === activeId)) {
        setAppState({ mode: 'view', dashboardId: activeId });
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist tabs to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(openTabs)); } catch { /* ignore */ }
  }, [openTabs]);

  // Persist active tab whenever we navigate to a dashboard
  useEffect(() => {
    if (appState.mode === 'view' || appState.mode === 'builder') {
      try { localStorage.setItem(ACTIVE_STORAGE_KEY, appState.dashboardId); } catch { /* ignore */ }
    }
  }, [appState]);

  /** Ensure a tab exists for the given dashboard and optionally navigate */
  const ensureTab = useCallback((id: string, name: string) => {
    setOpenTabs((prev) => {
      if (prev.some((t) => t.dashboardId === id)) return prev;
      return [...prev, { dashboardId: id, name }];
    });
  }, []);

  /** Open a dashboard: add a tab (if not already open) and switch to view mode */
  const openDashboard = useCallback((id: string, name: string) => {
    ensureTab(id, name);
    setAppState({ mode: 'view', dashboardId: id });
    try { localStorage.setItem(ACTIVE_STORAGE_KEY, id); } catch { /* ignore */ }
  }, [ensureTab]);

  /** Close a tab; switch to adjacent tab or home */
  const closeTab = useCallback((id: string) => {
    setOpenTabs((prev) => {
      const idx  = prev.findIndex((t) => t.dashboardId === id);
      const next = prev.filter((t) => t.dashboardId !== id);
      setAppState((cur) => {
        if ((cur.mode === 'view' || cur.mode === 'builder') && cur.dashboardId === id) {
          const neighbour = next[Math.min(idx, next.length - 1)];
          if (neighbour) {
            try { localStorage.setItem(ACTIVE_STORAGE_KEY, neighbour.dashboardId); } catch { /* ignore */ }
            return { mode: 'view', dashboardId: neighbour.dashboardId };
          }
          try { localStorage.removeItem(ACTIVE_STORAGE_KEY); } catch { /* ignore */ }
          return { mode: 'home' };
        }
        return cur;
      });
      return next;
    });
  }, []);

  /** Update the display name of an open tab (e.g., after the dashboard is renamed) */
  const renameTab = useCallback((id: string, name: string) => {
    setOpenTabs((prev) => prev.map((t) => t.dashboardId === id ? { ...t, name } : t));
  }, []);

  // Keep tab names in sync with the live dashboard list (handles renames from the home screen)
  useEffect(() => {
    if (!dashboards.length) return;
    setOpenTabs((prev) => prev.map((tab) => {
      const live = dashboards.find((d) => d.id === tab.dashboardId);
      return live && live.name !== tab.name ? { ...tab, name: live.name } : tab;
    }));
  }, [dashboards]);

  const goHome = useCallback(() => {
    setAppState({ mode: 'home' });
    try { localStorage.removeItem(ACTIVE_STORAGE_KEY); } catch { /* ignore */ }
  }, []);
  const goHomeTemplates = useCallback(() => {
    setAppState({ mode: 'home', activeTab: 'templates' });
    try { localStorage.removeItem(ACTIVE_STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const hasTabs = openTabs.length > 0;
  const activeId = (appState.mode === 'view' || appState.mode === 'builder')
    ? appState.dashboardId
    : null;

  // ── Handle #share= links ──
  const [shareEncoded, setShareEncoded] = useState<string | null>(null);
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#share=(.+)$/);
    if (match) setShareEncoded(match[1]);
  }, []);

  if (shareEncoded) {
    return (
      <SharedDashboardView
        encoded={shareEncoded}
        onBack={() => {
          setShareEncoded(null);
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    );
  }

  // ── Template preview (no tabs UI — full-screen preview) ──
  if (appState.mode === 'template-preview') {
    const handleUseTemplate = () => {
      const t = getTemplate(appState.templateId);
      if (!t) return;
      const emptyDs: DataSourceConfig = {
        schema: 'monkdb', table: '', timestampCol: '', metricCol: '', aggregation: 'AVG', limit: 50,
      };
      const now = new Date().toISOString();
      const config: DashboardConfig = {
        id: `dash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: t.name,
        description: t.description,
        themeId: t.themeId,
        refreshInterval: 'manual',
        createdAt: now,
        updatedAt: now,
        templateId: t.id,
        widgets: t.defaultLayout.map((layout) => ({
          ...layout,
          dataSource: { ...emptyDs },
        })),
      };
      saveDashboard(config);
      ensureTab(config.id, config.name);
      setAppState({ mode: 'builder', dashboardId: config.id, fromTemplate: true });
    };
    return (
      <TemplatePreviewPage
        templateId={appState.templateId}
        onBack={goHomeTemplates}
        onUseTemplate={handleUseTemplate}
      />
    );
  }

  // ── Dashboard viewer ──
  if (appState.mode === 'view') {
    const { dashboardId } = appState;
    const inner = (
      <ViewPage
        dashboardId={dashboardId}
        onEdit={() => setAppState({ mode: 'builder', dashboardId })}
        onBack={hasTabs ? () => closeTab(dashboardId) : goHome}
        onSave={(updated) => { save(updated); renameTab(updated.id, updated.name); }}
        hasTabBar={hasTabs}
      />
    );
    if (!hasTabs) return inner;
    return (
      <div className="-m-8">
        <div className="sticky top-0 z-30">
          <DashboardTabBar
            tabs={openTabs}
            activeDashboardId={activeId}
            homeActive={false}
            onSelectTab={(id) => setAppState({ mode: 'view', dashboardId: id })}
            onCloseTab={closeTab}
            onGoHome={goHome}
          />
        </div>
        {inner}
      </div>
    );
  }

  // ── Dashboard builder ──
  if (appState.mode === 'builder') {
    const { dashboardId, fromTemplate } = appState;
    const inner = (
      <BuilderPage
        dashboardId={dashboardId}
        fromTemplate={fromTemplate}
        onSave={(updated) => { save(updated); renameTab(updated.id, updated.name); }}
        onPreview={(updated) => {
          save(updated);
          renameTab(updated.id, updated.name);
          setAppState({ mode: 'view', dashboardId: updated.id });
        }}
        onBack={hasTabs ? () => setAppState({ mode: 'view', dashboardId }) : goHome}
      />
    );
    if (!hasTabs) return inner;

    // Wrap builder in the tab bar breakout container.
    // The sticky tab bar stays pinned to the top of the main scroll area
    // while the dashboard canvas scrolls underneath it normally.
    return (
      <div className="-m-8">
        <div className="sticky top-0 z-30">
          <DashboardTabBar
            tabs={openTabs}
            activeDashboardId={activeId}
            homeActive={false}
            onSelectTab={(id) => setAppState({ mode: 'view', dashboardId: id })}
            onCloseTab={closeTab}
            onGoHome={goHome}
          />
        </div>
        {inner}
      </div>
    );
  }

  // ── Home (default) ──
  return (
    <>
      {hasTabs && (
        <div className="-mx-8 -mt-8 mb-4">
          <DashboardTabBar
            tabs={openTabs}
            activeDashboardId={null}
            homeActive
            onSelectTab={(id) => setAppState({ mode: 'view', dashboardId: id })}
            onCloseTab={closeTab}
            onGoHome={goHome}
          />
        </div>
      )}
      <DashboardHome
        initialTab={appState.mode === 'home' ? appState.activeTab : undefined}
        onOpenDashboard={(id, name) => openDashboard(id, name ?? id)}
        onEditDashboard={(id, name) => {
          ensureTab(id, name ?? id);
          setAppState({ mode: 'builder', dashboardId: id });
        }}
        onPreviewTemplate={(t) => setAppState({ mode: 'template-preview', templateId: t.id })}
        onUseTemplate={(t) => {
          const emptyDs: DataSourceConfig = {
            schema: 'monkdb', table: '', timestampCol: '', metricCol: '', aggregation: 'AVG', limit: 50,
          };
          const now = new Date().toISOString();
          const config: DashboardConfig = {
            id: `dash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: t.name,
            description: t.description,
            themeId: t.themeId,
            refreshInterval: 'manual',
            createdAt: now,
            updatedAt: now,
            templateId: t.id,
            widgets: t.defaultLayout.map((layout) => ({
              ...layout,
              dataSource: { ...emptyDs },
            })),
          };
          saveDashboard(config);
          ensureTab(config.id, config.name);
          setAppState({ mode: 'builder', dashboardId: config.id, fromTemplate: true });
        }}
      />
    </>
  );
}

// ── Not Found fallback ────────────────────────────────────────────────────────

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
      <p className="text-sm">Resource not found.</p>
      <button onClick={onBack} className="text-sm text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
        Go back
      </button>
    </div>
  );
}
