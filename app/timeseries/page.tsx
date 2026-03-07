'use client';
import { useState, useCallback } from 'react';
import DashboardHome from '@/app/components/timeseries/home/DashboardHome';
import DashboardViewer from '@/app/components/timeseries/viewer/DashboardViewer';
import DashboardBuilder from '@/app/components/timeseries/builder/DashboardBuilder';
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
}: {
  dashboardId: string;
  onEdit: () => void;
  onBack: () => void;
  onSave: (c: DashboardConfig) => void;
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

export default function TimeSeriesPage() {
  const [appState, setAppState] = useState<AppState>({ mode: 'home' });
  const { save } = useDashboardList();

  const goHome          = useCallback(() => setAppState({ mode: 'home' }), []);
  const goHomeTemplates = useCallback(() => setAppState({ mode: 'home', activeTab: 'templates' }), []);

  // ── Template preview ──
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
    return (
      <ViewPage
        dashboardId={appState.dashboardId}
        onEdit={() => setAppState({ mode: 'builder', dashboardId: appState.dashboardId })}
        onBack={goHome}
        onSave={save}
      />
    );
  }

  // ── Dashboard builder ──
  if (appState.mode === 'builder') {
    return (
      <BuilderPage
        dashboardId={appState.dashboardId}
        fromTemplate={appState.fromTemplate}
        onSave={save}
        onPreview={(updated) => {
          save(updated);
          setAppState({ mode: 'view', dashboardId: updated.id });
        }}
        onBack={goHome}
      />
    );
  }

  // ── Home (default) ──
  return (
    <DashboardHome
      initialTab={appState.mode === 'home' ? appState.activeTab : undefined}
      onOpenDashboard={(id) => setAppState({ mode: 'view',    dashboardId: id })}
      onEditDashboard={(id) => setAppState({ mode: 'builder', dashboardId: id })}
      onPreviewTemplate={(t) => setAppState({ mode: 'template-preview', templateId: t.id })}
      onUseTemplate={(t) => {
        // Build a dashboard from the template with unconfigured (empty) datasources
        // and drop the user straight into the builder so they can configure each widget inline.
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
        setAppState({ mode: 'builder', dashboardId: config.id, fromTemplate: true });
      }}
    />
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
