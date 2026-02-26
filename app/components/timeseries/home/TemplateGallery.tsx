'use client';
import { useState } from 'react';
import { Search, Eye, ArrowRight, Layers, Star } from 'lucide-react';
import { ALL_TEMPLATES } from '@/app/lib/timeseries/templates';
import { THEMES } from '@/app/lib/timeseries/themes';
import type { TemplateCategory, TemplateDefinition } from '@/app/lib/timeseries/types';

const CATEGORY_LABELS: Record<TemplateCategory | 'all', string> = {
  all:            'All templates',
  iot:            'IoT',
  analytics:      'Analytics',
  business:       'Business',
  finance:        'Finance',
  infrastructure: 'Infrastructure',
  weather:        'Weather',
};

const CATEGORY_COUNTS: Record<TemplateCategory | 'all', number> = (() => {
  const counts: Record<string, number> = { all: ALL_TEMPLATES.length };
  for (const t of ALL_TEMPLATES) {
    counts[t.category] = (counts[t.category] ?? 0) + 1;
  }
  return counts as Record<TemplateCategory | 'all', number>;
})();


interface TemplateGalleryProps {
  onPreview: (template: TemplateDefinition) => void;
  onUse: (template: TemplateDefinition) => void;
}

export default function TemplateGallery({ onPreview, onUse }: TemplateGalleryProps) {
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');

  const filtered = ALL_TEMPLATES.filter((t) => {
    const matchCat    = category === 'all' || t.category === category;
    const matchSearch = !search.trim() || [t.name, t.description, ...t.tags]
      .some((s) => s.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-7">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Template Gallery</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-white/40">
          Start from a professionally designed template — connect your MonkDB tables and go live instantly.
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative min-w-56 flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/28" />
          <input
            type="text"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white dark:placeholder-white/28 dark:focus:border-blue-500/50"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABELS) as (TemplateCategory | 'all')[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white/50 dark:hover:border-white/[0.20] dark:hover:text-white/80'
              }`}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                category === cat
                  ? 'bg-white/25 text-white'
                  : 'bg-gray-200 text-gray-500 dark:bg-white/[0.10] dark:text-white/35'
              }`}>
                {CATEGORY_COUNTS[cat] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Results info ── */}
      {search.trim() && (
        <p className="mb-4 text-sm text-gray-400 dark:text-white/35">
          {filtered.length} template{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
        </p>
      )}

      {/* ── Template grid ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Layers className="mb-4 h-12 w-12 text-gray-300 dark:text-white/20" />
          <p className="text-base font-medium text-gray-600 dark:text-white/40">No templates found</p>
          <button
            onClick={() => { setSearch(''); setCategory('all'); }}
            className="mt-3 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
        >
          {filtered.map((template) => {
            const theme = THEMES[template.themeId];

            return (
              <div
                key={template.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:border-gray-300 dark:border-white/[0.10] dark:bg-white/[0.07] dark:ring-0 dark:shadow-none dark:hover:border-white/[0.22] dark:hover:bg-white/[0.11]"
              >
                {/* Accent top border */}
                <div
                  className="absolute inset-x-0 top-0 h-[3px] z-10"
                  style={{ background: `linear-gradient(90deg, ${theme.accentPrimary}, ${theme.accentPrimary}88)` }}
                />

                {/* Thumbnail — adapts to app light/dark mode */}
                <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-900/80">
                  {/* Accent color wash — unique per template */}
                  <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(135deg, ${theme.accentPrimary}22 0%, transparent 55%)` }}
                  />

                  {/* Simulated widget grid */}
                  <div className="absolute inset-4 grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
                    <div className="rounded-lg border border-gray-300/60 bg-gray-200/70 dark:border-white/[0.08] dark:bg-white/[0.08]" />
                    <div className="rounded-lg border border-gray-300/60 bg-gray-200/70 dark:border-white/[0.08] dark:bg-white/[0.08]" />
                    <div className="rounded-lg border border-gray-300/60 bg-gray-200/70 dark:border-white/[0.08] dark:bg-white/[0.08]" />
                    <div className="col-span-2 row-span-2 rounded-lg border border-gray-300/60 bg-gray-200/80 dark:border-white/[0.10] dark:bg-white/[0.12]" />
                    <div className="row-span-2 rounded-lg border border-gray-300/60 bg-gray-200/60 dark:border-white/[0.07] dark:bg-white/[0.06]" />
                  </div>

                  {/* Accent glow blob */}
                  <div
                    className="absolute -left-6 -top-6 h-32 w-32 rounded-full blur-3xl opacity-30 dark:opacity-40"
                    style={{ background: theme.accentPrimary }}
                  />
                  {/* Bottom fade */}
                  <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-gray-100/80 to-transparent dark:from-gray-900/80" />

                  {/* Widget count badge */}
                  <div className="absolute bottom-3 left-3 z-10">
                    <span
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ backgroundColor: theme.accentPrimary + '22', color: theme.accentPrimary, border: `1px solid ${theme.accentPrimary}35` }}
                    >
                      <Layers className="h-3 w-3" />
                      {template.widgetCount} widgets
                    </span>
                  </div>

                  {/* Category badge */}
                  <div className="absolute right-3 top-5 z-10">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                      style={{ backgroundColor: theme.accentPrimary + '22', color: theme.accentPrimary, border: `1px solid ${theme.accentPrimary}30` }}
                    >
                      {template.category}
                    </span>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center gap-3 bg-gray-900/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
                    <button
                      onClick={() => onPreview(template)}
                      className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                    <button
                      onClick={() => onUse(template)}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-blue-500"
                    >
                      Use
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-3 px-4 py-4">
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">{template.name}</h3>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-gray-500 dark:text-white/50">{template.description}</p>
                  </div>
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {template.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: theme.accentPrimary + '18', color: theme.accentPrimary }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="flex gap-2.5 border-t border-gray-100 px-4 py-3.5 dark:border-white/[0.07]">
                  <button
                    onClick={() => onPreview(template)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-white/[0.12] dark:text-white/55 dark:hover:border-white/[0.25] dark:hover:bg-white/[0.05] dark:hover:text-white/85"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </button>
                  <button
                    onClick={() => onUse(template)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-500 hover:shadow-md"
                  >
                    Use Template
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pro tip ── */}
      {filtered.length > 0 && (
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-blue-200/60 bg-blue-50/60 px-5 py-4 dark:border-blue-500/[0.15] dark:bg-blue-500/[0.06]">
          <Star className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Connect your own data
            </p>
            <p className="mt-0.5 text-sm text-blue-700/70 dark:text-blue-400/60">
              After selecting a template, map your MonkDB tables and columns — the dashboard updates live to reflect your data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
