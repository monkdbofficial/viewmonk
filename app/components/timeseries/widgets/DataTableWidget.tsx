'use client';
import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Search, X, ArrowUp, ArrowDown, Check, AlertTriangle,
} from 'lucide-react';
import type { ThemeTokens } from '@/app/lib/timeseries/themes';
import type { ColumnFormattingRule } from '@/app/lib/timeseries/types';

// ── ISO date detection ────────────────────────────────────────────────────────

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
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(value);
}

// ── Conditional formatting engine ─────────────────────────────────────────────

function evalRule(rule: ColumnFormattingRule, value: unknown): boolean {
  if (typeof value !== 'number') return false;
  switch (rule.operator) {
    case 'gt':      return value >  rule.value;
    case 'gte':     return value >= rule.value;
    case 'lt':      return value <  rule.value;
    case 'lte':     return value <= rule.value;
    case 'eq':      return value === rule.value;
    case 'between': return value >= rule.value && value <= (rule.value2 ?? rule.value);
    default:        return false;
  }
}

// Returns the first matching rule for a given column + value (rules applied in order)
function getMatchingRule(
  col: string,
  value: unknown,
  rules: ColumnFormattingRule[],
): ColumnFormattingRule | null {
  for (const rule of rules) {
    if (rule.column === col && evalRule(rule, value)) return rule;
  }
  return null;
}

// ── Icon renderer ─────────────────────────────────────────────────────────────

function FormattingIcon({ icon, color }: { icon: string; color: string }) {
  const cls = 'h-3 w-3 flex-shrink-0';
  const style = { color };
  switch (icon) {
    case 'arrow-up':   return <ArrowUp    className={cls} style={style} />;
    case 'arrow-down': return <ArrowDown  className={cls} style={style} />;
    case 'check':      return <Check      className={cls} style={style} />;
    case 'x':          return <X          className={cls} style={style} />;
    case 'warning':    return <AlertTriangle className={cls} style={style} />;
    default:           return null;
  }
}

// ── Cell renderer — applies conditional formatting ────────────────────────────

interface FormattedCellProps {
  value: unknown;
  col: string;
  rules: ColumnFormattingRule[];
  colMax: number;   // column max for 'bar' style
  isLight: boolean;
  theme: ThemeTokens;
}

function FormattedCell({ value, col, rules, colMax, isLight, theme }: FormattedCellProps) {
  const rule    = getMatchingRule(col, value, rules);
  const display = formatCellValue(value);

  if (!rule) {
    return <span className={isLight ? 'text-gray-700' : theme.textSecondary}>{display}</span>;
  }

  const { style, color } = rule;

  if (style === 'bg-color') {
    return (
      <span
        className="inline-block rounded px-1.5 py-0.5 text-xs font-medium"
        style={{ background: color + '28', color, border: `1px solid ${color}40` }}
      >
        {display}
      </span>
    );
  }

  if (style === 'text-color') {
    return <span className="text-xs font-semibold" style={{ color }}>{display}</span>;
  }

  if (style === 'badge') {
    return (
      <span
        className="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold"
        style={{ background: color, color: '#fff' }}
      >
        {display}
      </span>
    );
  }

  if (style === 'bar') {
    const pct = colMax > 0 && typeof value === 'number'
      ? Math.max(0, Math.min(100, (value / colMax) * 100))
      : 0;
    return (
      <div className="flex items-center gap-2 min-w-[80px]">
        <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: color + '25' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <span className="flex-shrink-0 text-xs tabular-nums" style={{ color, minWidth: 32 }}>
          {display}
        </span>
      </div>
    );
  }

  if (style === 'icon') {
    return (
      <span className="flex items-center gap-1">
        {rule.icon && <FormattingIcon icon={rule.icon} color={color} />}
        <span className="text-xs" style={{ color }}>{display}</span>
      </span>
    );
  }

  return <span>{display}</span>;
}

// ── Main component ─────────────────────────────────────────────────────────────

interface DataTableWidgetProps {
  columns: string[];
  rows: Record<string, unknown>[];
  theme: ThemeTokens;
  pageSize?: number;
  columnFormatting?: ColumnFormattingRule[];
}

export default function DataTableWidget({
  columns, rows, theme, pageSize = 5, columnFormatting = [],
}: DataTableWidgetProps) {
  const [page,    setPage]    = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter,  setFilter]  = useState('');

  // Client-side full-text filter
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

  // Pre-compute per-column max for 'bar' style normalisation
  const colMaxMap = new Map<string, number>();
  if (columnFormatting.some((r) => r.style === 'bar')) {
    for (const col of columns) {
      if (columnFormatting.some((r) => r.column === col && r.style === 'bar')) {
        const vals = rows.map((r) => r[col]).filter((v) => typeof v === 'number') as number[];
        colMaxMap.set(col, vals.length ? Math.max(...vals) : 1);
      }
    }
  }

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
    setPage(0);
  };

  const handleFilterChange = (val: string) => { setFilter(val); setPage(0); };

  const isLight  = theme.id === 'light-clean';
  const headerCls = isLight
    ? 'bg-gray-50 text-gray-500 border-b border-gray-200 text-xs uppercase tracking-wide'
    : `bg-white/5 ${theme.textMuted} border-b ${theme.divider} text-xs uppercase tracking-wide`;
  const rowBaseCls = isLight
    ? 'border-b border-gray-100 hover:bg-gray-50 text-xs'
    : `border-b ${theme.divider} hover:bg-white/5 text-xs`;

  // Determine which columns have any active formatting rule (for header badge)
  const formattedCols = new Set(columnFormatting.map((r) => r.column));

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      {rows.length > pageSize && (
        <div className={`relative flex-shrink-0 border-b px-2 py-1.5 ${isLight ? 'border-gray-100' : 'border-white/[0.07]'}`}>
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
                    {/* Dot indicator for formatted columns */}
                    {formattedCols.has(col) && (
                      <span
                        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                        style={{ background: columnFormatting.find((r) => r.column === col)?.color ?? '#3B82F6' }}
                        title="Conditional formatting applied"
                      />
                    )}
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
              <tr key={i} className={rowBaseCls}>
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-1.5 max-w-[220px] truncate whitespace-nowrap"
                    title={String(row[col] ?? '')}
                  >
                    <FormattedCell
                      value={row[col]}
                      col={col}
                      rules={columnFormatting}
                      colMax={colMaxMap.get(col) ?? 1}
                      isLight={isLight}
                      theme={theme}
                    />
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className={`py-8 text-center text-xs ${theme.textMuted}`}>
                  No rows match the current filter
                </td>
              </tr>
            )}
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
            <span className={`text-xs ${theme.textMuted} opacity-50`}>{page + 1}/{totalPages}</span>
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
