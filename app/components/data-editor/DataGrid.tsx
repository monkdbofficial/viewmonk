'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save, Plus, Trash2, X, Check, RefreshCw, AlertCircle,
  Download, Upload, Search, ChevronDown, FileJson, FileText,
  FileSpreadsheet, Key, Expand, ChevronLeft, ChevronRight,
  Loader2, Copy,
} from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  bgApp:     '#0f1f30',
  bgHeader:  '#0e1e2e',
  bgPanel:   '#112233',
  bgInput:   '#1a3048',
  bgRow:     '#0f1f30',
  bgRowAlt:  '#111e2d',
  bgRowHov:  'rgba(148,163,184,0.04)',
  bgRowNew:  'rgba(52,211,153,0.04)',
  bgRowDel:  'rgba(248,113,113,0.06)',
  bgRowMod:  'rgba(251,191,36,0.04)',
  border:    '#1a3050',
  borderGrid:'rgba(148,163,184,0.10)',
  borderFocus:'#2563eb',
  textPrimary:  '#d1d5db',
  textSecondary:'#9ca3af',
  textMuted:    '#6b7280',
  textDisabled: '#374151',
  accent:       '#3b82f6',
  accentHover:  '#60a5fa',
  accentText:   '#93c5fd',
  accentBg:     'rgba(59,130,246,0.12)',
  accentBorder: 'rgba(59,130,246,0.35)',
  success:    '#4ade80',
  successBg:  'rgba(74,222,128,0.10)',
  warning:    '#fbbf24',
  warningBg:  'rgba(251,191,36,0.10)',
  error:      '#f87171',
  errorBg:    'rgba(248,113,113,0.10)',
};

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
}
interface DataGridProps {
  schema: string;
  table: string;
  onClose?: () => void;
}
interface CellEdit {
  rowIndex: number;
  columnName: string;
  value: any;
}
interface RowChange {
  type: 'insert' | 'update' | 'delete';
  rowIndex: number;
  data?: Record<string, any>;
  originalData?: Record<string, any>;
}

// ─── Type badge helpers ───────────────────────────────────────────────────────
function getTypeMeta(type: string): { color: string; bg: string; short: string } {
  const t = type.toLowerCase();
  if (t.includes('bigint') || t.includes('integer') || t.includes('smallint') ||
      t.includes('float') || t.includes('double') || t.includes('numeric') ||
      t.includes('decimal') || t.includes('long') || t.includes('short'))
    return { color: '#93c5fd', bg: 'rgba(59,130,246,0.12)', short: 'num' };
  if (t.includes('text') || t.includes('varchar') || t.includes('char'))
    return { color: '#6ee7b7', bg: 'rgba(52,211,153,0.10)', short: 'txt' };
  if (t.includes('bool'))
    return { color: '#c4b5fd', bg: 'rgba(167,139,250,0.10)', short: 'bool' };
  if (t.includes('timestamp') || t.includes('date') || t.includes('time'))
    return { color: '#fde68a', bg: 'rgba(251,191,36,0.10)', short: 'ts' };
  if (t.includes('object') || t.includes('json'))
    return { color: '#fed7aa', bg: 'rgba(251,146,60,0.10)', short: 'obj' };
  if (t.includes('array'))
    return { color: '#f9a8d4', bg: 'rgba(244,114,182,0.10)', short: 'arr' };
  if (t.includes('ip'))
    return { color: '#a5f3fc', bg: 'rgba(34,211,238,0.10)', short: 'ip' };
  return { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', short: 'any' };
}

function defaultColWidth(col: Column): number {
  const t = col.type.toLowerCase();
  if (t.includes('timestamp') || t.includes('time zone')) return 190;
  if (t.includes('object') || t.includes('array') || t.includes('json')) return 180;
  if (t.includes('bool')) return 80;
  if (t.includes('bigint') || t.includes('integer') || t.includes('float') || t.includes('numeric')) return 120;
  if (col.isPrimaryKey) return 130;
  return 160;
}

// ─── Cell value formatter ─────────────────────────────────────────────────────
function formatCellValue(value: any, col: Column): { display: string; isNull: boolean; isObject: boolean; isBool: boolean; isNumber: boolean } {
  if (value === null || value === undefined) return { display: 'NULL', isNull: true, isObject: false, isBool: false, isNumber: false };

  const t = col.type.toLowerCase();

  if (typeof value === 'boolean' || t.includes('bool'))
    return { display: value ? 'true' : 'false', isNull: false, isObject: false, isBool: true, isNumber: false };

  if (typeof value === 'object')
    return { display: JSON.stringify(value), isNull: false, isObject: true, isBool: false, isNumber: false };

  if (t.includes('timestamp') || t.includes('date')) {
    try {
      const d = new Date(typeof value === 'number' ? value : value);
      if (!isNaN(d.getTime()))
        return { display: d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }), isNull: false, isObject: false, isBool: false, isNumber: false };
    } catch {}
  }

  const isNum = typeof value === 'number' || (t.includes('int') || t.includes('float') || t.includes('double') || t.includes('numeric') || t.includes('decimal'));
  return { display: String(value), isNull: false, isObject: false, isBool: false, isNumber: isNum && !isNaN(Number(value)) };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DataGrid({ schema, table, onClose }: DataGridProps) {
  const activeConnection = useActiveConnection();
  const { success, error: showError } = useToast();

  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [changes, setChanges] = useState<Map<number, RowChange>>(new Map());
  const [newRowsMap, setNewRowsMap] = useState<Map<number, Record<string, any>>>(new Map());
  const [deletedRows, setDeletedRows] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [expandCell, setExpandCell] = useState<{ value: any; col: Column } | null>(null);
  const [copiedExpand, setCopiedExpand] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizingRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);

  useEffect(() => { fetchColumns(); }, [schema, table]);
  useEffect(() => { if (columns.length > 0) fetchData(); }, [columns.length, page, pageSize, searchTerm, searchColumn]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showExportMenu && !(e.target as HTMLElement).closest('.export-menu-container'))
        setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  // Column resize mouse handlers
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { colIdx, startX, startW } = resizingRef.current;
      const delta = e.clientX - startX;
      setColWidths(prev => {
        const next = [...prev];
        next[colIdx] = Math.max(60, startW + delta);
        return next;
      });
    };
    const onMouseUp = () => { resizingRef.current = null; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const fetchColumns = async () => {
    if (!activeConnection) return;
    try {
      const result = await activeConnection.client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = ? AND table_name = ?
        ORDER BY ordinal_position
      `, [schema, table]);
      const pkResult = await activeConnection.client.query(`
        SELECT column_name FROM information_schema.key_column_usage
        WHERE table_schema = ? AND table_name = ? AND constraint_name LIKE '%_pkey'
      `, [schema, table]);
      const pkCols = new Set(pkResult.rows.map((r: any[]) => r[0]));
      const cols: Column[] = result.rows.map((r: any[]) => ({
        name: r[0], type: r[1], nullable: r[2] === 'YES', defaultValue: r[3], isPrimaryKey: pkCols.has(r[0]),
      }));
      setColumns(cols);
      setColWidths(cols.map(defaultColWidth));
    } catch (err: any) {
      showError('Failed to Load Columns', err.message);
    }
  };

  const fetchData = async () => {
    if (!activeConnection) return;
    setLoading(true);
    try {
      let whereClause = ''; let queryParams: any[] = [];
      if (searchTerm && searchColumn) {
        whereClause = ` WHERE CAST(${searchColumn} AS TEXT) LIKE ?`;
        queryParams = [`%${searchTerm}%`]; setIsSearching(true);
      } else if (searchTerm) {
        whereClause = ` WHERE ${columns.map(c => `CAST(${c.name} AS TEXT) LIKE ?`).join(' OR ')}`;
        queryParams = columns.map(() => `%${searchTerm}%`); setIsSearching(true);
      } else { setIsSearching(false); }
      const countResult = await activeConnection.client.query(
        `SELECT COUNT(*) FROM "${schema}"."${table}"${whereClause}`, queryParams);
      setTotalRows(countResult.rows[0][0]);
      const result = await activeConnection.client.query(
        `SELECT * FROM "${schema}"."${table}"${whereClause} LIMIT ${pageSize} OFFSET ${page * pageSize}`, queryParams);
      setRows(result.rows);
    } catch (err: any) {
      showError('Failed to Load Data', err.message);
      setTotalRows(0); setRows([]);
    } finally { setLoading(false); }
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    if (!deletedRows.has(rowIndex)) {
      setEditingCell({ row: rowIndex, col: colIndex });
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const columnName = columns[colIndex].name;
    const updated = [...rows]; updated[rowIndex][colIndex] = value; setRows(updated);
    const existing = changes.get(rowIndex);
    if (existing) { existing.data = existing.data || {}; existing.data[columnName] = value; }
    else {
      const orig: Record<string, any> = {};
      columns.forEach((col, idx) => { orig[col.name] = rows[rowIndex][idx]; });
      changes.set(rowIndex, { type: 'update', rowIndex, data: { [columnName]: value }, originalData: orig });
    }
    setChanges(new Map(changes));
  };

  const handleCellBlur = () => setEditingCell(null);

  const handleAddRow = () => {
    const newRow = columns.map(col => col.defaultValue || null);
    const idx = rows.length; setRows([...rows, newRow]);
    const rowData: Record<string, any> = {};
    columns.forEach((col, i) => { rowData[col.name] = newRow[i]; });
    newRowsMap.set(idx, rowData); setNewRowsMap(new Map(newRowsMap));
  };

  const handleDeleteRow = (rowIndex: number) => {
    deletedRows.add(rowIndex); setDeletedRows(new Set(deletedRows));
    const orig: Record<string, any> = {};
    columns.forEach((col, idx) => { orig[col.name] = rows[rowIndex][idx]; });
    changes.set(rowIndex, { type: 'delete', rowIndex, originalData: orig });
    setChanges(new Map(changes));
  };

  const handleSaveChanges = async () => {
    if (!activeConnection) return;
    setLoading(true);
    try {
      for (const [, change] of changes.entries()) {
        if (change.type === 'insert') {
          const cols = Object.keys(change.data || {}); const vals = Object.values(change.data || {});
          await activeConnection.client.query(
            `INSERT INTO "${schema}"."${table}" (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`, vals);
        } else if (change.type === 'update') {
          const setParts = Object.keys(change.data || {}).map(c => `${c} = ?`);
          const vals = Object.values(change.data || {});
          const pkCols = columns.filter(c => c.isPrimaryKey);
          const whereParts = pkCols.map(c => `${c.name} = ?`);
          const whereVals = pkCols.map(c => change.originalData?.[c.name]);
          await activeConnection.client.query(
            `UPDATE "${schema}"."${table}" SET ${setParts.join(', ')} WHERE ${whereParts.join(' AND ')}`,
            [...vals, ...whereVals]);
        } else if (change.type === 'delete') {
          const pkCols = columns.filter(c => c.isPrimaryKey);
          const whereParts = pkCols.map(c => `${c.name} = ?`);
          const whereVals = pkCols.map(c => change.originalData?.[c.name]);
          await activeConnection.client.query(
            `DELETE FROM "${schema}"."${table}" WHERE ${whereParts.join(' AND ')}`, whereVals);
        }
      }
      success('Changes Saved', `${changes.size} change(s) saved`);
      setChanges(new Map()); setNewRowsMap(new Map()); setDeletedRows(new Set()); fetchData();
    } catch (err: any) { showError('Failed to Save Changes', err.message); }
    finally { setLoading(false); }
  };

  const handleDiscardChanges = () => {
    setChanges(new Map()); setNewRowsMap(new Map()); setDeletedRows(new Set()); fetchData();
  };

  const exportToCSV = () => {
    try {
      const headers = columns.map(c => c.name).join(',');
      const csvRows = rows.map(row => row.map(cell => {
        if (cell === null) return '';
        const s = typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')).join('\n');
      const blob = new Blob([`${headers}\n${csvRows}`], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `${schema}_${table}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      success('Exported', `${rows.length} rows to CSV`); setShowExportMenu(false);
    } catch (err: any) { showError('Export Failed', err.message); }
  };

  const exportToJSON = () => {
    try {
      const data = rows.map(row => { const o: any = {}; columns.forEach((c, i) => { o[c.name] = row[i]; }); return o; });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `${schema}_${table}_${new Date().toISOString().slice(0, 10)}.json`; a.click();
      success('Exported', `${rows.length} rows to JSON`); setShowExportMenu(false);
    } catch (err: any) { showError('Export Failed', err.message); }
  };

  const exportToSQL = () => {
    try {
      const cols = columns.map(c => c.name).join(', ');
      const stmts = rows.map(row => {
        const vals = row.map(cell => {
          if (cell === null) return 'NULL';
          if (typeof cell === 'number') return cell;
          if (typeof cell === 'boolean') return cell ? 'TRUE' : 'FALSE';
          return `'${String(cell).replace(/'/g, "''")}'`;
        }).join(', ');
        return `INSERT INTO "${schema}"."${table}" (${cols}) VALUES (${vals});`;
      }).join('\n');
      const blob = new Blob([stmts], { type: 'text/plain' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `${schema}_${table}_${new Date().toISOString().slice(0, 10)}.sql`; a.click();
      success('Exported', `${rows.length} rows to SQL`); setShowExportMenu(false);
    } catch (err: any) { showError('Export Failed', err.message); }
  };

  const downloadCSVTemplate = () => {
    try {
      const headers = columns.map(c => c.name).join(',');
      const sample = columns.map(c => {
        if (c.isPrimaryKey) return '<primary_key>';
        if (c.type.toLowerCase().includes('int') || c.type.toLowerCase().includes('float')) return '<number>';
        if (c.type.toLowerCase().includes('bool')) return '<true/false>';
        if (c.type.toLowerCase().includes('timestamp') || c.type.toLowerCase().includes('date')) return '<datetime>';
        return '<text>';
      }).join(',');
      const blob = new Blob([`${headers}\n${sample}`], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `${schema}_${table}_template.csv`; a.click();
      success('Template Downloaded', 'CSV template ready');
    } catch (err: any) { showError('Download Failed', err.message); }
  };

  const downloadJSONTemplate = () => {
    try {
      const tmpl = [columns.reduce((o, c) => {
        o[c.name] = c.isPrimaryKey ? '<primary_key>' : c.type.toLowerCase().includes('int') ? 0 :
          c.type.toLowerCase().includes('bool') ? false : c.type.toLowerCase().includes('timestamp') ? '2024-01-01T00:00:00Z' : '<text>';
        return o;
      }, {} as any)];
      const blob = new Blob([JSON.stringify(tmpl, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `${schema}_${table}_template.json`; a.click();
      success('Template Downloaded', 'JSON template ready');
    } catch (err: any) { showError('Download Failed', err.message); }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConnection) return;
    setImporting(true);
    try {
      const content = await file.text();
      const ext = file.name.split('.').pop()?.toLowerCase();
      let data: Record<string, any>[] = [];
      if (ext === 'json') { data = JSON.parse(content); }
      else if (ext === 'csv') {
        const lines = content.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        data = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const obj: any = {}; headers.forEach((h, i) => { obj[h] = vals[i] === '' ? null : vals[i]; }); return obj;
        });
      } else throw new Error('Unsupported format. Use CSV or JSON.');
      const tableCols = columns.map(c => c.name);
      const unknown = Object.keys(data[0] || {}).filter(k => !tableCols.includes(k));
      if (unknown.length) { showError('Import Failed', `Unknown columns: ${unknown.join(', ')}`); return; }
      let count = 0;
      for (const row of data) {
        const cols = Object.keys(row); const vals = Object.values(row);
        await activeConnection.client.query(
          `INSERT INTO "${schema}"."${table}" (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`, vals);
        count++;
      }
      success('Imported', `${count} rows inserted`); setShowImportDialog(false); fetchData();
    } catch (err: any) { showError('Import Failed', err.message); }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const hasChanges = changes.size > 0;
  const totalPages = Math.ceil(totalRows / pageSize);
  const ROW_H = 36;
  const HEAD_H = 42;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bgApp, color: C.textPrimary, fontFamily: 'var(--font-geist-sans), -apple-system, system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 52, background: C.bgHeader, borderBottom: `1px solid ${C.border}`, flexShrink: 0, gap: 12 }}>
        {/* Left: table info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, fontFamily: 'var(--font-geist-mono), monospace', whiteSpace: 'nowrap' }}>
                {schema}<span style={{ color: C.textMuted }}> . </span>{table}
              </span>
              {loading && <Loader2 style={{ width: 13, height: 13, color: C.textMuted, animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
            </div>
            <span style={{ fontSize: 11, color: C.textMuted }}>
              {totalRows.toLocaleString()} row{totalRows !== 1 ? 's' : ''} · {columns.length} col{columns.length !== 1 ? 's' : ''}
              {isSearching && <span style={{ color: C.accentText }}> · filtered</span>}
              {hasChanges && <span style={{ color: C.warning }}> · {changes.size} unsaved</span>}
            </span>
          </div>
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {hasChanges && (
            <>
              <ToolBtn icon={<X style={{ width: 13, height: 13 }} />} label="Discard" onClick={handleDiscardChanges} color={C.error} />
              <ToolBtn icon={<Save style={{ width: 13, height: 13 }} />} label="Save" onClick={handleSaveChanges} accent />
            </>
          )}
          <ToolBtn icon={<Plus style={{ width: 13, height: 13 }} />} label="Add Row" onClick={handleAddRow} />
          <ToolBtn icon={<RefreshCw style={{ width: 13, height: 13, ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />} label="Refresh" onClick={fetchData} disabled={loading} />

          {/* Export */}
          <div className="export-menu-container" style={{ position: 'relative' }}>
            <ToolBtn icon={<Download style={{ width: 13, height: 13 }} />} label="Export" onClick={() => setShowExportMenu(v => !v)} trailing={<ChevronDown style={{ width: 10, height: 10 }} />} />
            {showExportMenu && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 178, background: '#152d45', border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.55)', zIndex: 50, overflow: 'hidden', padding: '4px 0' }}>
                {[
                  { icon: <FileText style={{ width: 14, height: 14, color: '#93c5fd' }} />, label: 'Export as CSV', action: exportToCSV },
                  { icon: <FileJson style={{ width: 14, height: 14, color: '#fed7aa' }} />, label: 'Export as JSON', action: exportToJSON },
                  { icon: <FileSpreadsheet style={{ width: 14, height: 14, color: '#6ee7b7' }} />, label: 'Export as SQL', action: exportToSQL },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textPrimary, fontSize: 13, textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(148,163,184,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {item.icon}{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ToolBtn icon={<Upload style={{ width: 13, height: 13 }} />} label="Import" onClick={() => setShowImportDialog(true)} />
          {onClose && (
            <button onClick={onClose} style={{ padding: 6, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: C.textSecondary, display: 'flex' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.10)'; e.currentTarget.style.color = C.error; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSecondary; }}>
              <X style={{ width: 15, height: 15 }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: C.bgPanel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <Search style={{ width: 14, height: 14, color: C.textMuted, flexShrink: 0 }} />
        <select
          value={searchColumn}
          onChange={e => setSearchColumn(e.target.value)}
          style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSecondary, fontSize: 12, padding: '4px 8px', outline: 'none', cursor: 'pointer' }}
          onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
          onBlur={e => e.currentTarget.style.borderColor = C.border}>
          <option value="">All columns</option>
          {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(0); fetchData(); } }}
            placeholder="Filter rows…"
            style={{ width: '100%', background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textPrimary, fontSize: 13, padding: '5px 10px', paddingRight: searchTerm ? 28 : 10, outline: 'none', fontFamily: 'var(--font-geist-mono), monospace' }}
            onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
            onBlur={e => e.currentTarget.style.borderColor = C.border}
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setSearchColumn(''); setPage(0); }}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', padding: 2 }}>
              <X style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
        {isSearching && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 6, padding: '3px 8px' }}>
            <AlertCircle style={{ width: 12, height: 12, color: C.accentText }} />
            <span style={{ fontSize: 12, color: C.accentText, fontWeight: 500 }}>{totalRows.toLocaleString()} result{totalRows !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {loading && rows.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <Loader2 style={{ width: 28, height: 28, color: C.accent, animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: C.textSecondary }}>Loading table data…</span>
          </div>
        ) : rows.length === 0 && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
            <span style={{ fontSize: 15, color: C.textSecondary, fontWeight: 500 }}>No rows in this table</span>
            <span style={{ fontSize: 13, color: C.textMuted }}>Click "Add Row" to insert data</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            {/* Col group for widths */}
            <colgroup>
              <col style={{ width: 44 }} />
              {columns.map((_, i) => <col key={i} style={{ width: colWidths[i] || 160 }} />)}
              <col style={{ width: 44 }} />
            </colgroup>

            {/* ── Header ── */}
            <thead>
              <tr style={{ background: C.bgHeader, height: HEAD_H, position: 'sticky', top: 0, zIndex: 10 }}>
                {/* Row number */}
                <th style={{ ...thSt, width: 44, color: C.textMuted, fontSize: 11, borderRight: `1px solid ${C.borderGrid}`, borderBottom: `1px solid rgba(148,163,184,0.18)` }}>#</th>

                {columns.map((col, i) => {
                  const tm = getTypeMeta(col.type);
                  return (
                    <th key={i} style={{ ...thSt, borderRight: `1px solid ${C.borderGrid}`, borderBottom: `1px solid rgba(148,163,184,0.18)`, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', paddingRight: 8 }}>
                        {col.isPrimaryKey && (
                          <Key style={{ width: 11, height: 11, color: '#fbbf24', flexShrink: 0 }} />
                        )}
                        <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 12, fontWeight: 600, color: col.isPrimaryKey ? '#fde68a' : C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                          {col.name}
                        </span>
                        {!col.nullable && <span style={{ color: C.error, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>*</span>}
                        <span style={{ fontSize: 10, fontWeight: 600, color: tm.color, background: tm.bg, borderRadius: 4, padding: '1px 5px', flexShrink: 0, fontFamily: 'var(--font-geist-mono), monospace', border: `1px solid ${tm.color}30` }}>
                          {col.type.length > 12 ? col.type.slice(0, 10) + '…' : col.type}
                        </span>
                      </div>
                      {/* Resize handle */}
                      <div
                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 1 }}
                        onMouseDown={e => {
                          e.preventDefault();
                          resizingRef.current = { colIdx: i, startX: e.clientX, startW: colWidths[i] || 160 };
                          document.body.style.cursor = 'col-resize';
                          document.body.style.userSelect = 'none';
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.4)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      />
                    </th>
                  );
                })}

                {/* Actions */}
                <th style={{ ...thSt, width: 44, borderBottom: `1px solid rgba(148,163,184,0.18)`, color: C.textMuted, fontSize: 11 }} />
              </tr>
            </thead>

            {/* ── Body ── */}
            <tbody>
              {rows.map((row, ri) => {
                const isDeleted = deletedRows.has(ri);
                const isNew = newRowsMap.has(ri);
                const isMod = changes.has(ri) && !isDeleted;
                const rowBg = isDeleted ? C.bgRowDel : isNew ? C.bgRowNew : isMod ? C.bgRowMod : ri % 2 === 0 ? C.bgRow : C.bgRowAlt;

                return (
                  <tr key={ri} style={{ height: ROW_H, background: rowBg, transition: 'background 0.08s' }}
                    onMouseEnter={e => { if (!isDeleted && !isNew && !isMod) (e.currentTarget as HTMLTableRowElement).style.background = C.bgRowHov; }}
                    onMouseLeave={e => { if (!isDeleted && !isNew && !isMod) (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}>

                    {/* Row number */}
                    <td style={{ ...tdSt, textAlign: 'center', color: C.textMuted, fontSize: 11, fontVariantNumeric: 'tabular-nums', borderRight: `1px solid ${C.borderGrid}`, opacity: isDeleted ? 0.4 : 1 }}>
                      {page * pageSize + ri + 1}
                    </td>

                    {/* Data cells */}
                    {row.map((cell, ci) => {
                      const isEditing = editingCell?.row === ri && editingCell?.col === ci;
                      const col = columns[ci];
                      const fmt = formatCellValue(cell, col);
                      const isObj = fmt.isObject || (typeof cell === 'object' && cell !== null);

                      return (
                        <td key={ci}
                          style={{ ...tdSt, borderRight: `1px solid ${C.borderGrid}`, cursor: isDeleted ? 'default' : 'pointer', position: 'relative', opacity: isDeleted ? 0.4 : 1 }}
                          onClick={() => { if (!isDeleted && !isObj) handleCellClick(ri, ci); }}>
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              type="text"
                              value={cell === null ? '' : String(cell)}
                              onChange={e => handleCellChange(ri, ci, e.target.value)}
                              onBlur={handleCellBlur}
                              onKeyDown={e => { if (e.key === 'Enter') handleCellBlur(); if (e.key === 'Escape') { handleDiscardChanges(); handleCellBlur(); } }}
                              style={{ width: '100%', height: '100%', background: C.bgInput, border: `2px solid ${C.borderFocus}`, borderRadius: 0, color: C.textPrimary, fontSize: 13, padding: '0 8px', outline: 'none', fontFamily: 'var(--font-geist-mono), monospace' }}
                            />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', overflow: 'hidden' }}>
                              {fmt.isNull ? (
                                <span style={{ fontSize: 12, color: C.textDisabled, fontStyle: 'italic', fontFamily: 'var(--font-geist-mono), monospace' }}>NULL</span>
                              ) : fmt.isBool ? (
                                <span style={{ fontSize: 12, fontWeight: 600, color: fmt.display === 'true' ? C.success : C.error, fontFamily: 'var(--font-geist-mono), monospace' }}>{fmt.display}</span>
                              ) : isObj ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', width: '100%' }}>
                                  <span style={{ fontSize: 12, color: '#fed7aa', fontFamily: 'var(--font-geist-mono), monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                    {fmt.display.length > 40 ? fmt.display.slice(0, 38) + '…' : fmt.display}
                                  </span>
                                  <button
                                    onClick={e => { e.stopPropagation(); setExpandCell({ value: cell, col }); }}
                                    style={{ flexShrink: 0, padding: 3, borderRadius: 4, background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)', cursor: 'pointer', display: 'flex', color: '#fed7aa' }}
                                    title="Expand value">
                                    <Expand style={{ width: 10, height: 10 }} />
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 13, color: fmt.isNumber ? '#93c5fd' : C.textPrimary, fontFamily: 'var(--font-geist-mono), monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: fmt.isNumber ? 'right' : 'left', width: '100%', display: 'block' }}>
                                  {fmt.display}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Delete */}
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      {!isDeleted ? (
                        <button onClick={() => handleDeleteRow(ri)}
                          style={{ padding: 4, borderRadius: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', opacity: 0, transition: 'opacity 0.1s' }}
                          className="row-del-btn"
                          onMouseEnter={e => { e.currentTarget.style.background = C.errorBg; e.currentTarget.style.color = C.error; e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textMuted; e.currentTarget.style.opacity = '0'; }}>
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      ) : (
                        <button onClick={() => { deletedRows.delete(ri); setDeletedRows(new Set(deletedRows)); changes.delete(ri); setChanges(new Map(changes)); }}
                          style={{ padding: 4, borderRadius: 5, background: C.errorBg, border: 'none', cursor: 'pointer', color: C.error, display: 'flex' }}
                          title="Undo delete">
                          <X style={{ width: 13, height: 13 }} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer / Pagination ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 44, background: C.bgPanel, borderTop: `1px solid ${C.border}`, flexShrink: 0, gap: 12 }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>
          Showing {totalRows === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalRows)} of <strong style={{ color: C.textSecondary }}>{totalRows.toLocaleString()}</strong> rows
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PagBtn label="Previous" icon={<ChevronLeft style={{ width: 13, height: 13 }} />} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} />
          <span style={{ fontSize: 12, color: C.textSecondary, minWidth: 80, textAlign: 'center' }}>
            Page <strong style={{ color: C.textPrimary }}>{page + 1}</strong> of {totalPages || 1}
          </span>
          <PagBtn label="Next" icon={<ChevronRight style={{ width: 13, height: 13 }} />} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} iconRight />
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
            style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSecondary, fontSize: 12, padding: '4px 8px', outline: 'none', cursor: 'pointer' }}>
            {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n} rows</option>)}
          </select>
        </div>
      </div>

      {/* ── Expand Cell Panel ────────────────────────────────────────────────── */}
      {expandCell && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setExpandCell(null)}>
          <div style={{ width: 560, maxWidth: '90vw', maxHeight: '80vh', background: '#112233', border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.bgHeader, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: 'var(--font-geist-mono), monospace' }}>{expandCell.col.name}</span>
                <span style={{ fontSize: 11, color: getTypeMeta(expandCell.col.type).color, background: getTypeMeta(expandCell.col.type).bg, borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--font-geist-mono), monospace', fontWeight: 600 }}>{expandCell.col.type}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { navigator.clipboard.writeText(typeof expandCell.value === 'object' ? JSON.stringify(expandCell.value, null, 2) : String(expandCell.value)); setCopiedExpand(true); setTimeout(() => setCopiedExpand(false), 1500); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: copiedExpand ? C.successBg : C.accentBg, border: `1px solid ${copiedExpand ? 'rgba(74,222,128,0.3)' : C.accentBorder}`, borderRadius: 6, cursor: 'pointer', color: copiedExpand ? C.success : C.accentText, fontSize: 12, fontWeight: 500 }}>
                  {copiedExpand ? <><Check style={{ width: 12, height: 12 }} /> Copied</> : <><Copy style={{ width: 12, height: 12 }} /> Copy</>}
                </button>
                <button onClick={() => setExpandCell(null)}
                  style={{ padding: 5, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: C.textSecondary, display: 'flex' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(148,163,184,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>
            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              <pre style={{ margin: 0, color: '#fed7aa', fontSize: 13, lineHeight: 1.7, fontFamily: 'var(--font-geist-mono), monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {typeof expandCell.value === 'object' ? JSON.stringify(expandCell.value, null, 2) : String(expandCell.value)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Dialog ────────────────────────────────────────────────────── */}
      {showImportDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}
          onClick={() => !importing && setShowImportDialog(false)}>
          <div style={{ width: 480, maxWidth: '90vw', background: '#112233', border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.7)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: C.bgHeader, borderBottom: `1px solid ${C.border}` }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>Import Data</p>
                <p style={{ fontSize: 11, color: C.textMuted }}>Into {schema}.{table}</p>
              </div>
              <button onClick={() => !importing && setShowImportDialog(false)}
                style={{ padding: 5, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: C.textSecondary, display: 'flex' }}>
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Templates */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textLabel, marginBottom: 8 }}>Download Template</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'CSV Template', sub: `${columns.length} columns`, icon: <FileText style={{ width: 18, height: 18 }} />, color: '#93c5fd', fn: downloadCSVTemplate },
                    { label: 'JSON Template', sub: `${columns.length} fields`, icon: <FileJson style={{ width: 18, height: 18 }} />, color: '#fed7aa', fn: downloadJSONTemplate },
                  ].map(t => (
                    <button key={t.label} onClick={t.fn} disabled={importing}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: t.color, textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = t.color + '60'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                      {t.icon}
                      <div><div style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</div><div style={{ fontSize: 11, color: C.textMuted }}>{t.sub}</div></div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Upload */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textLabel, marginBottom: 8 }}>Upload File</p>
                <label style={{ display: 'block', padding: '20px', border: `2px dashed ${C.border}`, borderRadius: 8, textAlign: 'center', cursor: 'pointer', color: C.textSecondary, fontSize: 13 }}
                  onMouseEnter={e => (e.currentTarget as HTMLLabelElement).style.borderColor = C.accentBorder}
                  onMouseLeave={e => (e.currentTarget as HTMLLabelElement).style.borderColor = C.border}>
                  {importing ? (
                    <><Loader2 style={{ width: 20, height: 20, margin: '0 auto 6px', animation: 'spin 1s linear infinite', color: C.accent }} /><span>Importing…</span></>
                  ) : (
                    <><Upload style={{ width: 20, height: 20, margin: '0 auto 6px', color: C.textMuted }} /><div>Click to select CSV or JSON file</div><div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Column names must match table columns</div></>
                  )}
                  <input ref={fileInputRef} type="file" accept=".csv,.json" onChange={handleImportFile} disabled={importing} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        tr:hover .row-del-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────
const C_label = '#9ca3af';
const thSt: React.CSSProperties = {
  padding: '0 8px', fontSize: 11, fontWeight: 600, textAlign: 'left',
  color: C_label, userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
};
const tdSt: React.CSSProperties = {
  padding: 0, height: 36, borderBottom: 'rgba(148,163,184,0.08) solid 1px', overflow: 'hidden',
};

function ToolBtn({ icon, label, onClick, disabled, accent, color, trailing }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  disabled?: boolean; accent?: boolean; color?: string; trailing?: React.ReactNode;
}) {
  const base: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
    border: `1px solid ${accent ? 'rgba(59,130,246,0.4)' : color ? color + '40' : '#1a3050'}`,
    background: accent ? 'rgba(59,130,246,0.14)' : 'rgba(148,163,184,0.05)',
    color: accent ? '#93c5fd' : color || '#9ca3af',
    transition: 'all 0.1s',
  };
  return (
    <button style={base} onClick={onClick} disabled={disabled}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = accent ? 'rgba(59,130,246,0.22)' : 'rgba(148,163,184,0.10)'; } }}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background = accent ? 'rgba(59,130,246,0.14)' : 'rgba(148,163,184,0.05)'; } }}>
      {icon}{label}{trailing}
    </button>
  );
}

function PagBtn({ label, icon, onClick, disabled, iconRight }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; iconRight?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1, background: 'rgba(148,163,184,0.05)', border: '1px solid #1a3050', color: '#9ca3af', transition: 'all 0.1s' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(148,163,184,0.10)'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = 'rgba(148,163,184,0.05)'; }}>
      {!iconRight && icon}{label}{iconRight && icon}
    </button>
  );
}
