'use client';
import { useState, useRef } from 'react';
import {
  Plus, LayoutDashboard, Layers, TrendingUp,
  Sparkles, Search, SortAsc, Trash2, ChevronDown, X, Upload, AlertTriangle,
} from 'lucide-react';
import DashboardCard from './DashboardCard';
import TemplateGallery from './TemplateGallery';
import { useDashboardList } from '@/app/hooks/timeseries/useDashboard';
import { ALL_THEMES } from '@/app/lib/timeseries/themes';
import type { DashboardConfig, DashboardThemeId, TemplateDefinition } from '@/app/lib/timeseries/types';

type HomeTab  = 'my-dashboards' | 'templates';
type SortMode = 'newest' | 'oldest' | 'name-az' | 'name-za' | 'most-widgets';

const SORT_LABELS: Record<SortMode, string> = {
  newest:         'Newest first',
  oldest:         'Oldest first',
  'name-az':      'Name A → Z',
  'name-za':      'Name Z → A',
  'most-widgets': 'Most widgets',
};

function sortDashboards(list: DashboardConfig[], mode: SortMode): DashboardConfig[] {
  return [...list].sort((a, b) => {
    switch (mode) {
      case 'newest':        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'oldest':        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case 'name-az':       return a.name.localeCompare(b.name);
      case 'name-za':       return b.name.localeCompare(a.name);
      case 'most-widgets':  return b.widgets.length - a.widgets.length;
    }
  });
}

// ── New Dashboard Dialog ──────────────────────────────────────────────────────

interface NewDashboardDialogProps {
  onClose: () => void;
  onCreate: (name: string, themeId: DashboardThemeId, description: string) => void;
}

function NewDashboardDialog({ onClose, onCreate }: NewDashboardDialogProps) {
  const [name,        setName]        = useState('My Dashboard');
  const [description, setDescription] = useState('');
  const [themeId,     setThemeId]     = useState<DashboardThemeId>('dark-navy');

  const handleSubmit = () => {
    if (name.trim()) onCreate(name.trim(), themeId, description);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.12] dark:bg-[#0e1929]">
        <div className="border-b border-gray-100 px-7 py-5 dark:border-white/[0.08]">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Create dashboard</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-white/40">
            Start with a blank canvas — you can change the theme later.
          </p>
        </div>

        <div className="space-y-5 px-7 py-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-white/60">
              Dashboard name
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white dark:focus:border-blue-500/60"
              placeholder="e.g. IoT Sensor Dashboard"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-white/60">
              Description <span className="text-gray-400 dark:text-white/25 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white dark:focus:border-blue-500/60"
              placeholder="What is this dashboard for?"
            />
          </div>

          <div>
            <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-white/60">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {ALL_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  className={`flex items-center gap-2.5 rounded-lg border p-3 text-sm transition-all ${
                    themeId === t.id
                      ? 'border-blue-500/60 bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-400'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-white/[0.08] dark:text-white/40 dark:hover:border-white/[0.20] dark:hover:text-white/70'
                  }`}
                >
                  <span className="h-3.5 w-3.5 flex-shrink-0 rounded-full" style={{ background: t.accentPrimary }} />
                  <span className="truncate font-medium">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-7 py-4 dark:border-white/[0.08]">
          <button
            onClick={onClose}
            className="rounded-lg px-5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/60"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create & Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Dashboard Details Dialog ─────────────────────────────────────────────

interface EditDashboardDialogProps {
  config: DashboardConfig;
  onClose: () => void;
  onSave: (updates: Pick<DashboardConfig, 'name' | 'description' | 'themeId'>) => void;
}

function EditDashboardDialog({ config, onClose, onSave }: EditDashboardDialogProps) {
  const [name,        setName]        = useState(config.name);
  const [description, setDescription] = useState(config.description ?? '');
  const [themeId,     setThemeId]     = useState<DashboardThemeId>(config.themeId);

  const handleSave = () => {
    if (name.trim()) onSave({ name: name.trim(), description, themeId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.12] dark:bg-[#0e1929]">
        <div className="flex items-center justify-between border-b border-gray-100 px-7 py-5 dark:border-white/[0.08]">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Edit dashboard details</h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-white/40">Update name, description and theme.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-white/35 dark:hover:bg-white/[0.07] dark:hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-7 py-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-white/60">
              Dashboard name
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white dark:focus:border-blue-500/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-white/60">
              Description <span className="font-normal text-gray-400 dark:text-white/25">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white dark:focus:border-blue-500/60"
              placeholder="What is this dashboard for?"
            />
          </div>

          <div>
            <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-white/60">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {ALL_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  className={`flex items-center gap-2.5 rounded-lg border p-3 text-sm transition-all ${
                    themeId === t.id
                      ? 'border-blue-500/60 bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-400'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-white/[0.08] dark:text-white/40 dark:hover:border-white/[0.20] dark:hover:text-white/70'
                  }`}
                >
                  <span className="h-3.5 w-3.5 flex-shrink-0 rounded-full" style={{ background: t.accentPrimary }} />
                  <span className="truncate font-medium">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-7 py-4 dark:border-white/[0.08]">
          <button
            onClick={onClose}
            className="rounded-lg px-5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/60"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sort dropdown ─────────────────────────────────────────────────────────────

function SortDropdown({ value, onChange }: { value: SortMode; onChange: (m: SortMode) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white/55 dark:hover:border-white/[0.20] dark:hover:text-white/80"
      >
        <SortAsc className="h-4 w-4" />
        {SORT_LABELS[value]}
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/[0.10] dark:bg-[#0e1929]">
            {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { onChange(m); setOpen(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04] ${
                  value === m
                    ? 'font-semibold text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-white/55'
                }`}
              >
                {SORT_LABELS[m]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── DashboardHome ─────────────────────────────────────────────────────────────

export interface DashboardHomeProps {
  onOpenDashboard:   (id: string) => void;
  onEditDashboard:   (id: string) => void;
  onPreviewTemplate: (template: TemplateDefinition) => void;
  onUseTemplate:     (template: TemplateDefinition) => void;
}

export default function DashboardHome({
  onOpenDashboard,
  onEditDashboard,
  onPreviewTemplate,
  onUseTemplate,
}: DashboardHomeProps) {
  const { dashboards, loading, create, save, remove, duplicate } = useDashboardList();
  const [tab,             setTab]             = useState<HomeTab>('my-dashboards');
  const [showNewDialog,   setShowNewDialog]   = useState(false);
  const [editDetailsId,   setEditDetailsId]   = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search,          setSearch]          = useState('');
  const [sortMode,        setSortMode]        = useState<SortMode>('newest');
  const [importError,     setImportError]     = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const editingConfig = editDetailsId ? dashboards.find((d) => d.id === editDetailsId) ?? null : null;

  const handleSaveDetails = (updates: Pick<DashboardConfig, 'name' | 'description' | 'themeId'>) => {
    if (!editingConfig) return;
    save({ ...editingConfig, ...updates, updatedAt: new Date().toISOString() });
    setEditDetailsId(null);
  };

  const handleCreate = (name: string, themeId: DashboardThemeId, description: string) => {
    const d = create(name, themeId, description);
    setShowNewDialog(false);
    onEditDashboard(d.id);
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      remove(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId((c) => (c === id ? null : c)), 4000);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-imported if needed
    e.target.value = '';
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string) as DashboardConfig;
        if (!raw.id || !raw.name || !Array.isArray(raw.widgets)) {
          throw new Error('File does not look like a valid dashboard export.');
        }
        // Give it a fresh ID to avoid stomping an existing dashboard
        const imported: DashboardConfig = {
          ...raw,
          id:        `dash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name:      raw.name.endsWith(' (imported)') ? raw.name : `${raw.name} (imported)`,
          updatedAt: new Date().toISOString(),
        };
        save(imported);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Invalid dashboard file.');
        setTimeout(() => setImportError(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  const handleExportDashboard = (config: DashboardConfig) => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${config.name.toLowerCase().replace(/\s+/g, '-')}-dashboard.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const searchLower = search.trim().toLowerCase();
  const filteredDashboards = sortDashboards(
    searchLower
      ? dashboards.filter((d) =>
          d.name.toLowerCase().includes(searchLower) ||
          (d.description ?? '').toLowerCase().includes(searchLower),
        )
      : dashboards,
    sortMode,
  );

  const totalWidgets = dashboards.reduce((s, d) => s + d.widgets.length, 0);

  return (
    // Transparent — no background, inherits from AppLayout's page background
    <div>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Timeseries Studio
            </h1>
          </div>
          <p className="pl-[52px] text-sm text-gray-500 dark:text-white/45">
            Build and manage real-time analytics dashboards powered by MonkDB
          </p>
          {!loading && dashboards.length > 0 && (
            <div className="mt-2 flex items-center gap-3 pl-[52px]">
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white/55">
                {dashboards.length} dashboard{dashboards.length !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white/55">
                {totalWidgets} widget{totalWidgets !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Primary actions */}
        <div className="flex flex-shrink-0 items-center gap-2.5 pt-1">
          {/* Hidden file input for JSON import */}
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white/55 dark:hover:border-white/[0.22] dark:hover:text-white/80"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={() => setShowNewDialog(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            New Dashboard
          </button>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center border-b border-gray-200 dark:border-white/[0.09]">
        {([
          { id: 'my-dashboards', label: 'My Dashboards', icon: LayoutDashboard, count: loading ? null : dashboards.length },
          { id: 'templates',     label: 'Templates',      icon: Layers,          count: null },
        ] as { id: HomeTab; label: string; icon: React.ElementType; count: number | null }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-800 dark:text-white/45 dark:hover:text-white/75'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count !== null && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold leading-none ${
                tab === t.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500 dark:bg-white/[0.10] dark:text-white/40'
              }`}>
                {t.count}
              </span>
            )}
            {tab === t.id && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        ))}

        <div className="ml-auto mb-0.5 flex items-center gap-2">
          {tab === 'my-dashboards' && (
            <button
              onClick={() => setTab('templates')}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-white/35 dark:hover:text-white/65"
            >
              <Sparkles className="h-4 w-4" />
              Browse templates
            </button>
          )}
          {tab === 'templates' && (
            <button
              onClick={() => setTab('my-dashboards')}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-white/35 dark:hover:text-white/65"
            >
              <LayoutDashboard className="h-4 w-4" />
              My Dashboards
            </button>
          )}
        </div>
      </div>

      {/* ── My Dashboards content ────────────────────────────────────────────── */}
      {tab === 'my-dashboards' && (
        <>
          {loading ? (
            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
            >
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-white/[0.05]" />
              ))}
            </div>
          ) : dashboards.length === 0 ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.12]">
                <LayoutDashboard className="h-9 w-9 text-gray-300 dark:text-white/20" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">No dashboards yet</h3>
              <p className="mt-3 max-w-sm text-base text-gray-500 dark:text-white/40">
                Build rich analytics dashboards with charts, gauges, and live data from MonkDB.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setShowNewDialog(true)}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-500"
                >
                  <Plus className="h-4 w-4" />
                  Create Dashboard
                </button>
                <button
                  onClick={() => setTab('templates')}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.10] dark:text-white/55 dark:hover:border-white/[0.22] dark:hover:text-white/75"
                >
                  <Sparkles className="h-4 w-4" />
                  Browse Templates
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search + sort bar */}
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className="relative min-w-60 flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/30" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search dashboards…"
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white dark:placeholder-white/28 dark:focus:border-blue-500/50"
                  />
                </div>
                <SortDropdown value={sortMode} onChange={setSortMode} />
                {search.trim() && (
                  <span className="text-sm text-gray-400 dark:text-white/35">
                    {filteredDashboards.length} result{filteredDashboards.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Cards */}
              {filteredDashboards.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-base text-gray-500 dark:text-white/35">
                    No dashboards match &ldquo;{search}&rdquo;
                  </p>
                  <button
                    onClick={() => setSearch('')}
                    className="mt-3 text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div
                  className="grid gap-5"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
                >
                  {filteredDashboards.map((config) => (
                    <div key={config.id} className="relative">
                      {confirmDeleteId === config.id && (
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/80 backdrop-blur-sm">
                          <Trash2 className="h-6 w-6 text-red-400" />
                          <p className="text-sm font-medium text-white/85">
                            Delete &ldquo;{config.name}&rdquo;?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-white/20 px-4 py-1.5 text-sm text-white/65 hover:bg-white/10"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(config.id)}
                              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                      <DashboardCard
                        config={config}
                        onOpen={() => onOpenDashboard(config.id)}
                        onEdit={() => onEditDashboard(config.id)}
                        onEditDetails={() => setEditDetailsId(config.id)}
                        onDuplicate={() => duplicate(config.id)}
                        onDelete={() => handleDelete(config.id)}
                        onExport={() => handleExportDashboard(config)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Templates ───────────────────────────────────────────────────────── */}
      {tab === 'templates' && (
        <TemplateGallery
          onPreview={onPreviewTemplate}
          onUse={onUseTemplate}
        />
      )}

      {showNewDialog && (
        <NewDashboardDialog
          onClose={() => setShowNewDialog(false)}
          onCreate={handleCreate}
        />
      )}

      {editingConfig && (
        <EditDashboardDialog
          config={editingConfig}
          onClose={() => setEditDetailsId(null)}
          onSave={handleSaveDetails}
        />
      )}

      {/* Import error toast */}
      {importError && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl border border-red-200 bg-white px-5 py-3.5 shadow-xl dark:border-red-900/50 dark:bg-gray-900">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{importError}</p>
          <button onClick={() => setImportError(null)} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
