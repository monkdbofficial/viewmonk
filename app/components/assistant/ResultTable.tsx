'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, Clock, Database } from 'lucide-react';
import type { SQLResult } from '../../lib/assistant/types';

interface ResultTableProps {
  result: SQLResult;
}

const INITIAL_ROWS = 8;

function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? v.toLocaleString()
      : v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  const s = String(v);
  return s.length > 80 ? s.slice(0, 80) + '…' : s;
}

function cellClass(v: unknown): string {
  if (v === null || v === undefined) return 'italic text-gray-400 dark:text-gray-600';
  if (typeof v === 'number') return 'font-mono text-blue-700 dark:text-blue-300';
  if (typeof v === 'boolean') return 'text-purple-700 dark:text-purple-400';
  return 'text-gray-800 dark:text-gray-200';
}

export default function ResultTable({ result }: ResultTableProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);

  const displayRows = expanded ? result.rows : result.rows.slice(0, INITIAL_ROWS);
  const hasMore = result.rows.length > INITIAL_ROWS;

  const copySql = () => {
    navigator.clipboard.writeText(result.sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const copyCsv = () => {
    const header = result.cols.join(',');
    const rows = result.rows.map(r =>
      r.map(v => (v === null || v === undefined ? '' : `"${String(v).replace(/"/g, '""')}"`)).join(',')
    );
    navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {result.rowCount.toLocaleString()} {result.rowCount === 1 ? 'row' : 'rows'}
            {result.truncated && <span className="text-gray-400"> (showing {result.rows.length})</span>}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <Clock className="h-3 w-3" />{result.durationMs}ms
          </span>
          <button
            onClick={copyCsv}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            {copiedCsv ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            CSV
          </button>
          <button
            onClick={copySql}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            {copiedSql ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            SQL
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-800/60">
              {result.cols.map(col => (
                <th
                  key={col}
                  className="px-3 py-1.5 text-left font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, ri) => (
              <tr
                key={ri}
                className={`border-b border-gray-100 dark:border-gray-800 ${
                  ri % 2 === 0 ? '' : 'bg-gray-50/40 dark:bg-gray-800/20'
                }`}
              >
                {row.map((cell, ci) => (
                  <td key={ci} className={`px-3 py-1.5 ${cellClass(cell)}`}>
                    {fmtCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expand/collapse */}
      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-gray-200 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Show all {result.rows.length} rows</>
          )}
        </button>
      )}
    </div>
  );
}
