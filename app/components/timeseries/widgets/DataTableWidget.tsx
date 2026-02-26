'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';

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

  const sorted = sortCol
    ? [...rows].sort((a, b) => {
        const va = a[sortCol] ?? '';
        const vb = b[sortCol] ?? '';
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : rows;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows   = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
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
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full table-auto border-collapse text-left">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className={`${headerCls} px-3 py-2 font-medium cursor-pointer whitespace-nowrap`}
                  onClick={() => toggleSort(col)}
                >
                  <div className="flex items-center gap-1">
                    {col}
                    {sortCol === col
                      ? sortDir === 'asc'
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />
                      : <ChevronUp className={`h-3 w-3 opacity-0 group-hover:opacity-40`} />
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
                  <td key={col} className="px-3 py-1.5 max-w-[200px] truncate whitespace-nowrap">
                    {String(row[col] ?? '—')}
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
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} of {rows.length}
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
