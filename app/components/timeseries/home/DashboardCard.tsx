'use client';
import { BarChart2, Clock, Copy, Edit3, Trash2, Eye, Download, Settings2 } from 'lucide-react';
import type { DashboardConfig } from '@/app/lib/timeseries/types';
import { THEMES } from '@/app/lib/timeseries/themes';

interface DashboardCardProps {
  config: DashboardConfig;
  onOpen: () => void;
  onEdit: () => void;
  onEditDetails?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExport?: () => void;
}


export default function DashboardCard({ config, onOpen, onEdit, onEditDetails, onDuplicate, onDelete, onExport }: DashboardCardProps) {
  const theme     = THEMES[config.themeId];
  const updatedAt = new Date(config.updatedAt);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-xl dark:border-white/[0.10] dark:bg-white/[0.07] dark:ring-0 dark:shadow-none dark:hover:border-white/[0.22] dark:hover:bg-white/[0.11]">

      {/* Accent top border */}
      <div
        className="absolute inset-x-0 top-0 h-[3px] z-10"
        style={{ background: `linear-gradient(90deg, ${theme.accentPrimary}, ${theme.accentPrimary}88)` }}
      />

      {/* Thumbnail — adapts to app light/dark mode */}
      <div
        className="relative h-44 cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-900/80"
        onClick={onOpen}
      >
        {/* Accent color wash */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${theme.accentPrimary}22 0%, transparent 55%)` }}
        />

        {/* Widget grid preview */}
        <div className="absolute inset-4 grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
          <div className="rounded-lg border border-gray-300/60 bg-gray-200/70 dark:border-white/[0.08] dark:bg-white/[0.08]" />
          <div className="rounded-lg border border-gray-300/60 bg-gray-200/70 dark:border-white/[0.08] dark:bg-white/[0.08]" />
          <div className="rounded-lg border border-gray-300/60 bg-gray-200/70 dark:border-white/[0.08] dark:bg-white/[0.08]" />
          <div className="col-span-2 row-span-2 rounded-lg border border-gray-300/60 bg-gray-200/80 dark:border-white/[0.10] dark:bg-white/[0.12]" />
          <div className="row-span-2 rounded-lg border border-gray-300/60 bg-gray-200/60 dark:border-white/[0.07] dark:bg-white/[0.06]" />
        </div>

        {/* Accent glow blob */}
        <div
          className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-30 dark:opacity-40"
          style={{ background: theme.accentPrimary }}
        />
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-gray-100/80 to-transparent dark:from-gray-900/80" />

        {/* Widget count badge */}
        <div className="absolute bottom-3 right-3 z-10">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: theme.accentPrimary + '22', color: theme.accentPrimary, border: `1px solid ${theme.accentPrimary}35` }}
          >
            {config.widgets.length} widget{config.widgets.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-[2px] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-5 py-2.5 backdrop-blur-sm">
            <Eye className="h-4 w-4 text-white" />
            <span className="text-sm font-bold text-white">Open Dashboard</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        <h3 className="truncate text-[15px] font-bold text-gray-900 dark:text-white">
          {config.name}
        </h3>
        {config.description ? (
          <p className="line-clamp-1 text-[13px] text-gray-500 dark:text-white/50">{config.description}</p>
        ) : (
          <p className="text-[13px] italic text-gray-300 dark:text-white/25">No description</p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
            style={{ backgroundColor: theme.accentPrimary + '18', color: theme.accentPrimary }}
          >
            {theme.name}
          </span>
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400 dark:text-white/35">
            <Clock className="h-3.5 w-3.5" />
            {updatedAt.toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 border-t border-gray-100 px-3 py-2.5 dark:border-white/[0.07]">
        <button
          onClick={onOpen}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-500 hover:shadow-md"
        >
          <BarChart2 className="h-3.5 w-3.5" />
          Open
        </button>
        <button
          onClick={onEdit}
          className="ml-1 rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-white/35 dark:hover:bg-white/[0.08] dark:hover:text-white/80"
          title="Edit widgets"
        >
          <Edit3 className="h-4 w-4" />
        </button>
        {onEditDetails && (
          <button
            onClick={onEditDetails}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-white/35 dark:hover:bg-white/[0.08] dark:hover:text-white/80"
            title="Edit details"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onDuplicate}
          className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-white/35 dark:hover:bg-white/[0.08] dark:hover:text-white/80"
          title="Duplicate"
        >
          <Copy className="h-4 w-4" />
        </button>
        {onExport && (
          <button
            onClick={onExport}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-white/35 dark:hover:bg-white/[0.08] dark:hover:text-white/80"
            title="Export JSON"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-white/35 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
