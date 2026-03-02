'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';

// ISO 8601 timestamp pattern — covers '2024-01-15T14:30:00Z', '2024-01-15 14:30:00+00'
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

function formatCellValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    // Use toLocaleString for large integers; keep decimals for floats
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(value);
}

interface DataTableWidgetProps {
  columns: string[];
  rows: Record<string, unknown>[];
  theme: ThemeTokens;
  pageSize?: number;
}

export default function DataTableWidget({ columns, rows, theme, pageSize = 5 }: DataTableWidgetProps) {
  const [page, setPage]           = useState(0);
  const [sortCol, setSortCol]     = useState<string | null>(null);
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc');
  const [filter,  setFilter]      = useState('');

  // Client-side full-text filter across all column values
  const filterLower = filter.toLowerCase();
  const filtered = filter.trim()
    ? rows.filter((row) =>
        columns.some((col) => {
          const cell = row[col];
          return cell != null && String(cell).toLowerCase().includes(filterLower);
        }),
      )
    : rows;

  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const va = a[sortCol] ?? '';
        const vb = b[sortCol] ?? '';
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows   = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
    setPage(0);
  };

  const handleFilterChange = (val: string) => {
    setFilter(val);
    setPage(0);
  };

  const isLight = theme.id === 'light-clean';
  const headerCls = isLight
    ? 'bg-gray-50 text-gray-500 border-b border-gray-200 text-xs uppercase tracking-wide'
    : `bg-white/5 ${theme.textMuted} border-b ${theme.divider} text-xs uppercase tracking-wide`;
  const rowCls = isLight
    ? 'border-b border-gray-100 hover:bg-gray-50 text-gray-700 text-xs'
    : `border-b ${theme.divider} hover:bg-white/5 ${theme.textSecondary} text-xs`;

  return (
    <div className="flex h-full flex-col">
      {/* Search bar — only shown when there are enough rows to benefit from filtering */}
      {rows.length > pageSize && (
        <div className={`relative flex-shrink-0 border-b px-2 py-1.5 ${isLight ? 'border-gray-100' : `border-white/[0.07]`}`}>
          <Search className={`absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 ${theme.textMuted} opacity-60`} />
          <input
            type="text"
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            placeholder="Filter rows…"
            className={`w-full rounded-md py-1 pl-7 pr-6 text-xs outline-none transition ${
              isLight
                ? 'bg-gray-100/80 text-gray-700 placeholder-gray-400 focus:bg-gray-200/70'
                : `bg-white/[0.05] ${theme.textSecondary} placeholder-white/25 focus:bg-white/[0.09]`
            }`}
          />
          {filter && (
            <button
              onClick={() => handleFilterChange('')}
              className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme.textMuted} opacity-60 hover:opacity-100`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full table-auto border-collapse text-left">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className={`group ${headerCls} px-3 py-2 font-medium cursor-pointer whitespace-nowrap`}
                  onClick={() => toggleSort(col)}
                >
                  <div className="flex items-center gap-1">
                    {col}
                    {sortCol === col
                      ? sortDir === 'asc'
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />
                      : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                    }
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className={rowCls}>
                {columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 max-w-[200px] truncate whitespace-nowrap" title={String(row[col] ?? '')}>
                    {formatCellValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between border-t ${theme.divider} px-3 py-1.5`}>
          <span className={`text-xs ${theme.textMuted}`}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
            {filter && sorted.length !== rows.length && (
              <span className="ml-1 opacity-60">(filtered from {rows.length})</span>
            )}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className={`rounded p-0.5 transition-colors disabled:opacity-30 ${theme.textMuted} ${isLight ? 'hover:text-gray-900' : 'hover:text-white/90'}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className={`rounded p-0.5 transition-colors disabled:opacity-30 ${theme.textMuted} ${isLight ? 'hover:text-gray-900' : 'hover:text-white/90'}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
