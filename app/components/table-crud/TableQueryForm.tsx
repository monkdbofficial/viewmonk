'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Play, Copy, RefreshCw, ChevronDown, ChevronUp, SortAsc,
  X, Database, Plus, Edit, Trash2, CheckCircle2, Key,
} from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import type { ColumnMetadata } from '../../lib/monkdb-client';

interface TableQueryFormProps {
  schema: string;
  tableName: string;
  columns: ColumnMetadata[];
  onClose: () => void;
  onExecute?: (sql: string) => void;
}

type SortDir = 'ASC' | 'DESC';

const getTypeColor = (t: string) => {
  const d = t.toLowerCase();
  if (d.includes('text') || d.includes('char') || d.includes('string')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  if (d.includes('int') || d.includes('long') || d.includes('float') || d.includes('double') || d.includes('numeric') || d.includes('decimal') || d.includes('real')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (d.includes('timestamp') || d.includes('date') || d.includes('time')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  if (d.includes('bool')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300';
};

export default function TableQueryForm({ schema, tableName, columns, onClose, onExecute }: TableQueryFormProps) {
  const activeConnection = useActiveConnection();
  const toast = useToast();
  const { canWrite, canDelete } = usePermissions();

  // ── Query builder ───────────────────────────────────────────
  const [selectedCols, setSelectedCols] = useState<string[]>(['*']);
  const [whereClause, setWhereClause] = useState('');
  const [orderByCol, setOrderByCol] = useState('');
  const [orderDir, setOrderDir] = useState<SortDir>('ASC');
  const [limitVal, setLimitVal] = useState('100');
  const [colPickerOpen, setColPickerOpen] = useState(false);

  // ── Execution ───────────────────────────────────────────────
  const [result, setResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [resultSort, setResultSort] = useState<{ col: string; dir: 'asc' | 'desc' } | null>(null);

  // ── Row selection ───────────────────────────────────────────
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [deleteRowConfirm, setDeleteRowConfirm] = useState(false);
  const [deletingRow, setDeletingRow] = useState(false);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // ── Edit row ────────────────────────────────────────────────
  const [editRowOpen, setEditRowOpen] = useState(false);
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editRowValues, setEditRowValues] = useState<Record<string, string>>({});
  const [savingRow, setSavingRow] = useState(false);

  // ── Insert row ──────────────────────────────────────────────
  const [insertRowOpen, setInsertRowOpen] = useState(false);
  const [insertRowValues, setInsertRowValues] = useState<Record<string, string>>({});
  const [insertingRow, setInsertingRow] = useState(false);

  // ── PK columns (fetched from information_schema) ────────────
  const [pkColumnNames, setPkColumnNames] = useState<string[]>([]);

  // Fetch real PK columns
  useEffect(() => {
    if (!activeConnection) { setPkColumnNames([]); return; }
    const fetch = async () => {
      try {
        const res = await activeConnection.client.query(
          `SELECT kcu.column_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
             AND tc.table_name = kcu.table_name
           WHERE tc.constraint_type = 'PRIMARY KEY'
             AND tc.table_schema = '${schema}'
             AND tc.table_name = '${tableName}'`
        );
        setPkColumnNames(res.rows ? res.rows.map((r: any[]) => r[0]) : []);
      } catch { setPkColumnNames([]); }
    };
    fetch();
  }, [schema, tableName, activeConnection]);

  // Sync header checkbox indeterminate state
  useEffect(() => {
    if (!headerCheckboxRef.current || !sortedResult?.rows) {
      if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = false;
      return;
    }
    const total = sortedResult.rows.length;
    const selCount = sortedResult.rows.filter((_: any, i: number) => selectedRows.has(i)).length;
    headerCheckboxRef.current.indeterminate = selCount > 0 && selCount < total;
  });

  // ── Column picker ────────────────────────────────────────────
  const toggleCol = (name: string) => {
    if (name === '*') { setSelectedCols(['*']); return; }
    setSelectedCols(prev => {
      const filtered = prev.filter(c => c !== '*');
      if (filtered.includes(name)) {
        const next = filtered.filter(c => c !== name);
        return next.length === 0 ? ['*'] : next;
      }
      return [...filtered, name];
    });
  };

  // ── SQL generation ───────────────────────────────────────────
  const generateSQL = useCallback((): string => {
    const colList = selectedCols.includes('*') || selectedCols.length === 0
      ? '*'
      : selectedCols.map(c => `"${c}"`).join(', ');
    let sql = `SELECT ${colList}\nFROM "${schema}"."${tableName}"`;
    if (whereClause.trim()) sql += `\nWHERE ${whereClause.trim()}`;
    if (orderByCol) sql += `\nORDER BY "${orderByCol}" ${orderDir}`;
    if (limitVal) sql += `\nLIMIT ${limitVal}`;
    return sql;
  }, [selectedCols, schema, tableName, whereClause, orderByCol, orderDir, limitVal]);

  // ── Execute query ────────────────────────────────────────────
  const handleExecute = useCallback(async () => {
    if (!activeConnection || executing) return;
    const sql = generateSQL();
    setExecuting(true);
    setResult(null);
    setExecError(null);
    setResultSort(null);
    setSelectedRows(new Set());
    setDeleteRowConfirm(false);
    const t0 = Date.now();
    try {
      const res = await activeConnection.client.query(sql);
      setResult(res);
      setExecTime(Date.now() - t0);
      if (onExecute) onExecute(sql);
    } catch (err: any) {
      setExecError(err.message || 'Query failed');
      setExecTime(Date.now() - t0);
    } finally {
      setExecuting(false);
    }
  }, [activeConnection, executing, generateSQL, onExecute]);

  // Ctrl / Cmd + Enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleExecute(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleExecute]);

  // ── CRUD helpers ─────────────────────────────────────────────
  const buildRowWhereClause = (row: any[], cols: string[]): string => {
    if (pkColumnNames.length > 0) {
      return pkColumnNames.map(c => {
        const ci = cols.indexOf(c);
        const val = ci !== -1 ? row[ci] : null;
        if (val === null) return `"${c}" IS NULL`;
        if (typeof val === 'number') return `"${c}" = ${val}`;
        return `"${c}" = '${String(val).replace(/'/g, "''")}'`;
      }).join(' AND ');
    }
    const idIdx = cols.indexOf('_id');
    if (idIdx !== -1 && row[idIdx] !== null) return `_id = '${row[idIdx]}'`;
    return cols.map(c => {
      const ci = cols.indexOf(c);
      const val = row[ci];
      if (val === null) return `"${c}" IS NULL`;
      if (typeof val === 'number') return `"${c}" = ${val}`;
      return `"${c}" = '${String(val).replace(/'/g, "''")}'`;
    }).join(' AND ');
  };

  const openEditRow = (rowIdx: number) => {
    if (!sortedResult) return;
    const row = sortedResult.rows[rowIdx];
    const vals: Record<string, string> = {};
    sortedResult.cols.forEach((c: string, i: number) => {
      vals[c] = row[i] === null ? '' : typeof row[i] === 'object' ? JSON.stringify(row[i]) : String(row[i]);
    });
    setEditRowValues(vals);
    setEditingRowIdx(rowIdx);
    setEditRowOpen(true);
  };

  const handleSaveRow = async () => {
    if (editingRowIdx === null || !sortedResult || !activeConnection) return;
    const row = sortedResult.rows[editingRowIdx];
    const cols: string[] = sortedResult.cols;
    const whereClause = buildRowWhereClause(row, cols);
    const nonEditable = new Set([...pkColumnNames, '_id']);
    const setClauses = cols
      .filter(c => !nonEditable.has(c))
      .map(c => {
        const val = editRowValues[c];
        if (val === '' || val === undefined) return `"${c}" = NULL`;
        const cm = columns.find(col => col.column_name === c);
        const isNum = cm?.data_type.toLowerCase().match(/int|float|double|long|short|decimal|numeric|real/);
        if (isNum && !isNaN(Number(val))) return `"${c}" = ${val}`;
        return `"${c}" = '${val.replace(/'/g, "''")}'`;
      }).join(', ');
    if (!setClauses.trim()) {
      toast.error('Nothing to Update', 'All columns are primary keys and cannot be modified.');
      return;
    }
    setSavingRow(true);
    try {
      await activeConnection.client.query(
        `UPDATE "${schema}"."${tableName}" SET ${setClauses} WHERE ${whereClause}`
      );
      await activeConnection.client.query(`REFRESH TABLE "${schema}"."${tableName}"`);
      toast.success('Row Updated', 'Row updated successfully');
      setEditRowOpen(false);
      setSelectedRows(new Set());
      handleExecute();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update row');
    } finally {
      setSavingRow(false);
    }
  };

  const handleDeleteRow = async () => {
    if (selectedRows.size === 0 || !sortedResult || !activeConnection) return;
    const cols: string[] = sortedResult.cols;
    const whereClauses = [...selectedRows].map(i =>
      `(${buildRowWhereClause(sortedResult.rows[i], cols)})`
    );
    setDeletingRow(true);
    try {
      await activeConnection.client.query(
        `DELETE FROM "${schema}"."${tableName}" WHERE ${whereClauses.join(' OR ')}`
      );
      await activeConnection.client.query(`REFRESH TABLE "${schema}"."${tableName}"`);
      toast.success('Deleted', `${selectedRows.size} row${selectedRows.size !== 1 ? 's' : ''} deleted`);
      setSelectedRows(new Set());
      setDeleteRowConfirm(false);
      handleExecute();
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete rows');
    } finally {
      setDeletingRow(false);
    }
  };

  const openInsertRow = () => {
    const vals: Record<string, string> = {};
    columns.filter(c => c.column_name !== '_id').forEach(c => { vals[c.column_name] = ''; });
    setInsertRowValues(vals);
    setInsertRowOpen(true);
  };

  const handleInsertRow = async () => {
    if (!activeConnection) return;
    const insertCols = columns.filter(c =>
      c.column_name !== '_id' &&
      insertRowValues[c.column_name] !== '' &&
      insertRowValues[c.column_name] !== undefined
    );
    if (insertCols.length === 0) {
      toast.error('Insert Failed', 'Please fill in at least one column value.');
      return;
    }
    const vals = insertCols.map(col => {
      const val = insertRowValues[col.column_name];
      if (val.toLowerCase() === 'null') return 'NULL';
      const isNum = col.data_type.toLowerCase().match(/int|float|double|long|short|decimal|numeric|real/);
      if (isNum && !isNaN(Number(val))) return val;
      return `'${val.replace(/'/g, "''")}'`;
    });
    setInsertingRow(true);
    try {
      await activeConnection.client.query(
        `INSERT INTO "${schema}"."${tableName}" (${insertCols.map(c => `"${c.column_name}"`).join(', ')}) VALUES (${vals.join(', ')})`
      );
      await activeConnection.client.query(`REFRESH TABLE "${schema}"."${tableName}"`);
      toast.success('Row Inserted', 'New row added successfully');
      setInsertRowOpen(false);
      handleExecute();
    } catch (err: any) {
      toast.error('Insert Failed', err.message || 'Could not insert row');
    } finally {
      setInsertingRow(false);
    }
  };

  // ── Copy helpers ─────────────────────────────────────────────
  const handleCopySQL = () => {
    navigator.clipboard.writeText(generateSQL());
    toast.success('Copied', 'SQL copied to clipboard');
  };

  const handleCopyCSV = () => {
    if (!sortedResult?.rows) return;
    const header = sortedResult.cols.join(',');
    const rows = sortedResult.rows.map((row: any[]) =>
      row.map((cell: any) => {
        if (cell === null) return '';
        const s = typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    );
    navigator.clipboard.writeText([header, ...rows].join('\n'));
    toast.success('Copied', `${sortedResult.rows.length} rows copied as CSV`);
  };

  // ── Sorted result ────────────────────────────────────────────
  const sortedResult = (() => {
    if (!result?.rows || !resultSort) return result;
    const idx = result.cols.indexOf(resultSort.col);
    if (idx === -1) return result;
    const rows = [...result.rows].sort((a, b) => {
      const av = a[idx], bv = b[idx];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === 'number' && typeof bv === 'number')
        return resultSort.dir === 'asc' ? av - bv : bv - av;
      return resultSort.dir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return { ...result, rows };
  })();

  const colLabel = selectedCols.includes('*')
    ? 'All columns (*)'
    : `${selectedCols.length} column${selectedCols.length !== 1 ? 's' : ''} selected`;

  const rowCount = sortedResult?.rows?.length ?? 0;
  const sqlLines = generateSQL().split('\n');

  // ── Header checkbox checked state ────────────────────────────
  const allVisibleSelected = rowCount > 0 && sortedResult.rows.every((_: any, i: number) => selectedRows.has(i));

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-gray-800">

      {/* ═══ LEFT: Query Builder ═══════════════════════════════ */}
      <div className="flex w-72 flex-shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">

        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Query Builder</p>
          <p className="mt-0.5 truncate font-mono text-sm font-medium text-gray-600 dark:text-gray-300">
            {schema}.{tableName}
          </p>
        </div>

        <div className="flex flex-col gap-5 p-4">

          {/* SELECT */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">SELECT</label>
            <button
              type="button"
              onClick={() => setColPickerOpen(v => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <span className="font-mono text-sm">{colLabel}</span>
              {colPickerOpen
                ? <ChevronUp className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              }
            </button>
            {colPickerOpen && (
              <div className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="sticky top-0 border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={selectedCols.includes('*')} onChange={() => toggleCol('*')} className="h-4 w-4 rounded accent-blue-600" />
                    <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">* All columns</span>
                  </label>
                </div>
                <div className="p-1.5">
                  {columns.map(col => (
                    <label key={col.column_name} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={!selectedCols.includes('*') && selectedCols.includes(col.column_name)}
                        onChange={() => toggleCol(col.column_name)}
                        className="h-4 w-4 rounded accent-blue-600"
                      />
                      <span className="flex-1 truncate font-mono text-sm text-gray-700 dark:text-gray-200">{col.column_name}</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-400 dark:bg-gray-700">{col.data_type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* WHERE */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
              WHERE <span className="normal-case font-normal text-gray-300 dark:text-gray-600">(optional)</span>
            </label>
            <textarea
              value={whereClause}
              onChange={e => setWhereClause(e.target.value)}
              rows={3}
              placeholder={`status = 'active'\nAND age > 18`}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm leading-5 text-gray-800 placeholder-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-600"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {columns.slice(0, 8).map(col => (
                <button
                  key={col.column_name}
                  type="button"
                  onClick={() => setWhereClause(p => p.trim() ? `${p.trimEnd()}\nAND ${col.column_name} = ` : `${col.column_name} = `)}
                  className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-xs text-gray-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                >
                  {col.column_name}
                </button>
              ))}
            </div>
          </div>

          {/* ORDER BY */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">ORDER BY</label>
            <div className="flex gap-2">
              <select value={orderByCol} onChange={e => setOrderByCol(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                <option value="">— none —</option>
                {columns.map(c => <option key={c.column_name} value={c.column_name}>{c.column_name}</option>)}
              </select>
              <select value={orderDir} onChange={e => setOrderDir(e.target.value as SortDir)} disabled={!orderByCol}
                className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                <option value="ASC">ASC ↑</option>
                <option value="DESC">DESC ↓</option>
              </select>
            </div>
          </div>

          {/* LIMIT */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">LIMIT</label>
            <div className="flex items-center gap-2">
              <input type="number" value={limitVal} onChange={e => setLimitVal(e.target.value)} min="1"
                className="w-20 flex-shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              <div className="flex gap-1">
                {[100, 500, 1000].map(n => (
                  <button key={n} type="button" onClick={() => setLimitVal(String(n))}
                    className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${limitVal === String(n) ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Run */}
          <button onClick={handleExecute} disabled={executing || !activeConnection}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50">
            {executing ? <><RefreshCw className="h-4 w-4 animate-spin" />Running…</> : <><Play className="h-4 w-4" />Run Query</>}
          </button>
          <p className="text-center text-xs text-gray-400">
            <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-xs shadow-sm dark:border-gray-700 dark:bg-gray-800">⌘</kbd>
            {' / '}
            <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-xs shadow-sm dark:border-gray-700 dark:bg-gray-800">Ctrl</kbd>
            {' + '}
            <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-xs shadow-sm dark:border-gray-700 dark:bg-gray-800">Enter</kbd>
          </p>

          {(result || execError) && (
            <button
              onClick={() => { setResult(null); setExecError(null); setExecTime(null); setResultSort(null); setSelectedRows(new Set()); }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
              <X className="h-3.5 w-3.5" />Clear Results
            </button>
          )}
        </div>
      </div>

      {/* ═══ RIGHT: SQL Preview + Results ══════════════════════ */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

        {/* SQL preview */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between bg-slate-100 dark:bg-gray-950 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-gray-500">Generated SQL</p>
            </div>
            <button onClick={handleCopySQL}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-slate-500 dark:text-gray-400 transition-colors hover:bg-slate-200 dark:hover:bg-gray-800 hover:text-slate-800 dark:hover:text-gray-200">
              <Copy className="h-3 w-3" />Copy
            </button>
          </div>
          <div className="flex overflow-x-auto bg-slate-100 dark:bg-gray-950">
            <div className="select-none border-r border-slate-300 dark:border-gray-800 bg-slate-200/60 dark:bg-gray-900 px-3 py-3 text-right font-mono text-xs leading-5 text-slate-400 dark:text-gray-600">
              {sqlLines.map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <pre className="flex-1 px-4 py-3 font-mono text-sm leading-5 text-blue-700 dark:text-blue-300">{generateSQL()}</pre>
          </div>
        </div>

        {/* Results area */}
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">

          {/* Results toolbar */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Results</span>
              {result && !execError && (
                <>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {rowCount.toLocaleString()} {rowCount === 1 ? 'row' : 'rows'}
                  </span>
                  {execTime !== null && <span className="text-xs text-gray-400">{execTime}ms</span>}
                </>
              )}
              {execError && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">Error</span>}
            </div>
            <div className="flex items-center gap-2">
              {resultSort && (
                <button onClick={() => setResultSort(null)}
                  className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                  <SortAsc className="h-3 w-3" />{resultSort.col} {resultSort.dir === 'asc' ? '↑' : '↓'}<X className="h-2.5 w-2.5 ml-0.5" />
                </button>
              )}
              {sortedResult?.rows && sortedResult.rows.length > 0 && (
                <button onClick={handleCopyCSV}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <Copy className="h-3 w-3" />Copy CSV
                </button>
              )}
              {canWrite && columns.length > 0 && (
                <button onClick={openInsertRow}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-green-700">
                  <Plus className="h-3.5 w-3.5" />Add Row
                </button>
              )}
            </div>
          </div>

          {/* Results content */}
          {executing ? (
            <div className="flex flex-1 items-center justify-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-sm text-gray-400">Executing query…</span>
            </div>

          ) : execError ? (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800/60 dark:bg-red-900/20">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                    <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">Query Error</p>
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-sm leading-5 text-red-600 dark:text-red-400">{execError}</pre>
                  </div>
                </div>
              </div>
            </div>

          ) : sortedResult?.rows && sortedResult.rows.length > 0 ? (
            <>
              {/* Scrollable table */}
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {/* Select-all checkbox */}
                      <th className="border-b border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900">
                        <input
                          ref={headerCheckboxRef}
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={() => {
                            if (allVisibleSelected) {
                              setSelectedRows(new Set());
                            } else {
                              setSelectedRows(new Set(sortedResult.rows.map((_: any, i: number) => i)));
                            }
                            setDeleteRowConfirm(false);
                          }}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600"
                        />
                      </th>
                      <th className="border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:bg-gray-900">#</th>
                      {sortedResult.cols.map((col: string, i: number) => (
                        <th
                          key={i}
                          onClick={() => setResultSort(prev =>
                            prev?.col === col
                              ? prev.dir === 'asc' ? { col, dir: 'desc' } : null
                              : { col, dir: 'asc' }
                          )}
                          className="cursor-pointer select-none whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        >
                          <div className="flex items-center gap-1.5">
                            {col}
                            {pkColumnNames.includes(col) && <Key className="h-3 w-3 text-yellow-500" />}
                            {resultSort?.col === col
                              ? <span className="text-blue-500">{resultSort.dir === 'asc' ? '↑' : '↓'}</span>
                              : <SortAsc className="h-3 w-3 opacity-20" />
                            }
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {sortedResult.rows.map((row: any[], ri: number) => (
                      <tr
                        key={ri}
                        onClick={() => {
                          setSelectedRows(prev => {
                            const next = new Set(prev);
                            if (next.has(ri)) { next.delete(ri); } else { next.add(ri); }
                            return next;
                          });
                          setDeleteRowConfirm(false);
                        }}
                        onContextMenu={e => {
                          e.preventDefault();
                          setSelectedRows(new Set([ri]));
                        }}
                        className={`cursor-pointer transition-colors ${selectedRows.has(ri) ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-white hover:bg-blue-50/30 dark:bg-gray-800 dark:hover:bg-gray-700/30'}`}
                      >
                        <td className="whitespace-nowrap px-3 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(ri)}
                            onChange={() => {
                              setSelectedRows(prev => {
                                const next = new Set(prev);
                                if (next.has(ri)) { next.delete(ri); } else { next.add(ri); }
                                return next;
                              });
                              setDeleteRowConfirm(false);
                            }}
                            className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 font-mono text-sm text-gray-300 dark:text-gray-600">{ri + 1}</td>
                        {row.map((cell: any, ci: number) => {
                          const display = cell === null ? null : typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
                          return (
                            <td key={ci} className="whitespace-nowrap px-3 py-1.5 font-mono text-sm" title={display ?? 'NULL'}>
                              {cell === null
                                ? <span className="italic text-gray-300 dark:text-gray-600">NULL</span>
                                : typeof cell === 'object'
                                  ? <span className="text-amber-700 dark:text-amber-400">{display}</span>
                                  : <span className="text-gray-700 dark:text-gray-300">{display}</span>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action bar */}
              {selectedRows.size > 0 && (
                <div className="flex flex-shrink-0 items-center justify-between border-t border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-800/60 dark:bg-blue-900/20">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    {canWrite && selectedRows.size === 1 && (
                      <button
                        onClick={() => { openEditRow([...selectedRows][0]); }}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        <Edit className="h-3.5 w-3.5" />Edit Row
                      </button>
                    )}
                    {canDelete && !deleteRowConfirm && (
                      <button
                        onClick={() => setDeleteRowConfirm(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete{selectedRows.size > 1 ? ` (${selectedRows.size})` : ''}
                      </button>
                    )}
                    {canDelete && deleteRowConfirm && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-red-700 dark:text-red-300">
                          Delete {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''}?
                        </span>
                        <button onClick={handleDeleteRow} disabled={deletingRow}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                          {deletingRow ? 'Deleting…' : 'Yes, Delete'}
                        </button>
                        <button onClick={() => setDeleteRowConfirm(false)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                          Cancel
                        </button>
                      </div>
                    )}
                    {selectedRows.size === 1 && (
                      <>
                        <button
                          onClick={() => {
                            const row = sortedResult.rows[[...selectedRows][0]];
                            const obj: Record<string, any> = {};
                            sortedResult.cols.forEach((c: string, i: number) => { obj[c] = row[i]; });
                            navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
                            toast.success('Copied', 'Row copied as JSON');
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          <Copy className="h-3.5 w-3.5" />JSON
                        </button>
                        <button
                          onClick={() => {
                            const row = sortedResult.rows[[...selectedRows][0]];
                            const cols: string[] = sortedResult.cols;
                            const vals = cols.map((c: string, i: number) => {
                              const v = row[i];
                              if (v === null) return 'NULL';
                              if (typeof v === 'number') return String(v);
                              return `'${String(v).replace(/'/g, "''")}'`;
                            });
                            const sql = `INSERT INTO "${schema}"."${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});`;
                            navigator.clipboard.writeText(sql);
                            toast.success('Copied', 'INSERT SQL copied');
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          <Copy className="h-3.5 w-3.5" />INSERT SQL
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { setSelectedRows(new Set()); setDeleteRowConfirm(false); }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              )}
            </>

          ) : result ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <Database className="h-7 w-7 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Query returned 0 rows</p>
              <p className="text-xs text-gray-400">Try adjusting your WHERE clause or LIMIT</p>
            </div>

          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <Play className="h-7 w-7 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Run a query to see results</p>
              <p className="text-xs text-gray-400">Configure on the left, then click Run Query</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Edit Row Modal ═════════════════════════════════════ */}
      {editRowOpen && editingRowIdx !== null && sortedResult?.rows && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Row</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {schema}.{tableName} · Row {editingRowIdx + 1}
                </p>
              </div>
              <button onClick={() => setEditRowOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {sortedResult.cols.map((col: string) => {
                  const colMeta = columns.find(c => c.column_name === col);
                  const isPK = pkColumnNames.includes(col) || col === '_id';
                  return (
                    <div key={col}>
                      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <span className="font-mono">{col}</span>
                        {colMeta && <span className={`rounded px-1.5 py-0.5 text-xs ${getTypeColor(colMeta.data_type)}`}>{colMeta.data_type}</span>}
                        {isPK && (
                          <span className="flex items-center gap-1 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <Key className="h-3 w-3" />PK
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={editRowValues[col] ?? ''}
                        onChange={e => setEditRowValues(prev => ({ ...prev, [col]: e.target.value }))}
                        disabled={isPK}
                        placeholder={isPK ? '(Primary key — read only)' : 'Enter value, or leave empty for NULL'}
                        className={`w-full rounded-lg border px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white ${isPK ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700'}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button onClick={() => setEditRowOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleSaveRow} disabled={savingRow}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {savingRow
                  ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving…</>
                  : <><CheckCircle2 className="h-4 w-4" />Save Changes</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Insert Row Modal ═══════════════════════════════════ */}
      {insertRowOpen && columns.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New Row</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{schema}.{tableName}</p>
              </div>
              <button onClick={() => setInsertRowOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {columns.filter(col => col.column_name !== '_id').map(col => {
                  const isPK = pkColumnNames.includes(col.column_name);
                  const isRequired = col.is_nullable === 'NO' && !isPK;
                  return (
                    <div key={col.column_name}>
                      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <span className="font-mono">{col.column_name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-xs ${getTypeColor(col.data_type)}`}>{col.data_type}</span>
                        {isPK && <span className="flex items-center gap-1 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Key className="h-3 w-3" />PK</span>}
                        {isRequired && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">required</span>}
                        {col.is_nullable === 'YES' && <span className="text-xs text-gray-400">optional</span>}
                      </label>
                      <input
                        type="text"
                        value={insertRowValues[col.column_name] ?? ''}
                        onChange={e => setInsertRowValues(prev => ({ ...prev, [col.column_name]: e.target.value }))}
                        placeholder={col.is_nullable === 'YES' ? 'Leave empty for NULL' : `Enter ${col.data_type} value`}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                      />
                      {col.column_default && (
                        <p className="mt-1 text-xs text-gray-400">Default: <code className="font-mono">{col.column_default}</code></p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <p className="text-xs text-gray-400">Leave optional fields empty for NULL · <code className="font-mono">_id</code> is auto-generated</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setInsertRowOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button onClick={handleInsertRow} disabled={insertingRow}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                  {insertingRow
                    ? <><RefreshCw className="h-4 w-4 animate-spin" />Inserting…</>
                    : <><Plus className="h-4 w-4" />Insert Row</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
