'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload, FileText, FileJson, Table as TableIcon, X,
  CheckCircle2, AlertCircle, RefreshCw, ChevronDown,
  ArrowRight, Play, Loader2, FileCode, Info, Download,
} from 'lucide-react';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';
import type { ColumnMetadata } from '../../lib/monkdb-client';

interface TableImportFormProps {
  schema: string;
  tableName: string;
  columns: ColumnMetadata[];
  onImportComplete?: () => void;
}

type ImportFormat = 'csv' | 'sql' | 'json';
type ImportMode = 'insert' | 'skip';
type Delimiter = ',' | '\t' | ';' | '|';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

// ── Parsers ─────────────────────────────────────────────────────────────────

function parseCSV(content: string, delimiter: string): string[][] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result: string[][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        row.push(current); current = '';
      } else {
        current += ch;
      }
    }
    row.push(current);
    result.push(row);
  }
  return result;
}

function parseSQLStatements(content: string): string[] {
  const stmts: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (!inString && (ch === "'" || ch === '"')) {
      inString = true; stringChar = ch; current += ch;
    } else if (inString && ch === stringChar) {
      inString = false; current += ch;
    } else if (!inString && ch === '-' && content[i + 1] === '-') {
      while (i < content.length && content[i] !== '\n') i++;
      continue;
    } else if (!inString && ch === '/' && content[i + 1] === '*') {
      i += 2;
      while (i < content.length && !(content[i] === '*' && content[i + 1] === '/')) i++;
      i += 2; continue;
    } else if (!inString && ch === ';') {
      const stmt = current.trim();
      if (stmt) stmts.push(stmt);
      current = '';
    } else {
      current += ch;
    }
    i++;
  }
  const last = current.trim();
  if (last) stmts.push(last);
  return stmts;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function TableImportForm({
  schema, tableName, columns, onImportComplete,
}: TableImportFormProps) {
  const activeConnection = useActiveConnection();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<ImportFormat>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // CSV options
  const [delimiter, setDelimiter] = useState<Delimiter>(',');
  const [hasHeaderRow, setHasHeaderRow] = useState(true);

  // Column mapping: for CSV → index string key; for JSON → field name key
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Import mode
  const [importMode, setImportMode] = useState<ImportMode>('insert');

  // Import state
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const BATCH = 200;

  // ── Derived data ──────────────────────────────────────────────────────────

  const csvRows = fileContent && format === 'csv' ? parseCSV(fileContent, delimiter) : [];
  const csvHeaders = csvRows.length > 0
    ? (hasHeaderRow ? csvRows[0] : csvRows[0].map((_, i) => `Col ${i + 1}`))
    : [];
  const csvDataRows = hasHeaderRow ? csvRows.slice(1) : csvRows;

  const sqlStatements = fileContent && format === 'sql' ? parseSQLStatements(fileContent) : [];

  const jsonData = (() => {
    if (!fileContent || format !== 'json') return [] as any[];
    try {
      const parsed = JSON.parse(fileContent);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch { return null; }
  })();
  const jsonKeys = jsonData && jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

  // Auto-map columns when file or delimiter changes
  useEffect(() => {
    if (!fileContent) return;
    if (format === 'csv' && csvRows.length > 0 && hasHeaderRow) {
      const mapping: Record<string, string> = {};
      csvRows[0].forEach((h, i) => {
        const match = columns.find(c => c.column_name.toLowerCase() === h.trim().toLowerCase());
        mapping[String(i)] = match ? match.column_name : '';
      });
      setColumnMapping(mapping);
    } else if (format === 'json' && jsonData && jsonData.length > 0) {
      const mapping: Record<string, string> = {};
      Object.keys(jsonData[0]).forEach(k => {
        const match = columns.find(c => c.column_name.toLowerCase() === k.toLowerCase());
        mapping[k] = match ? match.column_name : '';
      });
      setColumnMapping(mapping);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileContent, format, delimiter, hasHeaderRow]);

  // ── File reading ──────────────────────────────────────────────────────────

  const readFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setProgress(0);
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext === 'sql') setFormat('sql');
    else if (ext === 'json' || ext === 'jsonl') setFormat('json');
    else { setFormat('csv'); if (ext === 'tsv') setDelimiter('\t'); }
    const reader = new FileReader();
    reader.onload = e => setFileContent(e.target?.result as string ?? null);
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) readFile(f);
  }, [readFile]);

  // ── Value formatter ────────────────────────────────────────────────────────

  const formatValue = (val: any, col: ColumnMetadata | undefined): string => {
    if (val === null || val === undefined || String(val).trim() === '') return 'NULL';
    const s = String(val).trim();
    if (s.toLowerCase() === 'null') return 'NULL';
    const dt = col?.data_type.toLowerCase() || '';
    if (dt.match(/int|float|double|long|short|decimal|numeric|real/) && !isNaN(Number(s))) return s;
    if (dt === 'boolean' || dt === 'bool') {
      const l = s.toLowerCase();
      if (l === 'true' || l === '1' || l === 'yes') return 'true';
      if (l === 'false' || l === '0' || l === 'no') return 'false';
    }
    return `'${s.replace(/'/g, "''")}'`;
  };

  const buildInsertSQL = (
    colNames: string[],
    rows: string[][],
    colMeta: (ColumnMetadata | undefined)[],
    mode: ImportMode,
  ): string => {
    const colList = colNames.map(c => `"${c}"`).join(', ');
    const valueRows = rows.map(row =>
      `(${colMeta.map((cm, i) => formatValue(row[i], cm)).join(', ')})`
    ).join(',\n');
    let sql = `INSERT INTO "${schema}"."${tableName}" (${colList})\nVALUES\n${valueRows}`;
    if (mode === 'skip') sql += '\nON CONFLICT DO NOTHING';
    return sql;
  };

  // ── Import handlers ───────────────────────────────────────────────────────

  const handleImportCSV = async () => {
    if (!activeConnection || !csvDataRows.length) return;
    const mappedCols = csvHeaders
      .map((_, i) => ({ idx: i, tableCol: columnMapping[String(i)], meta: columns.find(c => c.column_name === columnMapping[String(i)]) }))
      .filter(m => !!m.tableCol);
    if (!mappedCols.length) { toast.error('Import Failed', 'Map at least one column first.'); return; }

    setImporting(true); setProgress(0);
    const res: ImportResult = { total: csvDataRows.length, success: 0, failed: 0, errors: [] };
    const colNames = mappedCols.map(m => m.tableCol);
    const colMeta = mappedCols.map(m => m.meta);

    for (let i = 0; i < csvDataRows.length; i += BATCH) {
      const batch = csvDataRows.slice(i, i + BATCH).map(row => mappedCols.map(m => row[m.idx] ?? ''));
      try {
        await activeConnection.client.query(buildInsertSQL(colNames, batch, colMeta, importMode));
        res.success += batch.length;
      } catch {
        for (let j = 0; j < batch.length; j++) {
          try {
            await activeConnection.client.query(buildInsertSQL(colNames, [batch[j]], colMeta, importMode));
            res.success++;
          } catch (rowErr: any) {
            res.failed++;
            if (res.errors.length < 50) res.errors.push({ row: i + j + (hasHeaderRow ? 2 : 1), message: rowErr.message });
          }
        }
      }
      setProgress(Math.round(((i + Math.min(BATCH, csvDataRows.length - i)) / csvDataRows.length) * 100));
    }
    await activeConnection.client.query(`REFRESH TABLE "${schema}"."${tableName}"`);
    setResult(res); setImporting(false);
    if (res.success > 0) { toast.success('Import Complete', `${res.success.toLocaleString()} rows imported`); onImportComplete?.(); }
    else toast.error('Import Failed', 'No rows were imported. Check column mapping and data types.');
  };

  const handleImportSQL = async () => {
    if (!activeConnection || !sqlStatements.length) return;
    setImporting(true); setProgress(0);
    const res: ImportResult = { total: sqlStatements.length, success: 0, failed: 0, errors: [] };
    for (let i = 0; i < sqlStatements.length; i++) {
      try {
        await activeConnection.client.query(sqlStatements[i]);
        res.success++;
      } catch (err: any) {
        res.failed++;
        if (res.errors.length < 50) res.errors.push({ row: i + 1, message: err.message });
      }
      setProgress(Math.round(((i + 1) / sqlStatements.length) * 100));
    }
    setResult(res); setImporting(false);
    if (res.success > 0) { toast.success('SQL Import Complete', `${res.success} of ${res.total} statements executed`); onImportComplete?.(); }
    else toast.error('Import Failed', 'All statements failed. Check the SQL file.');
  };

  const handleImportJSON = async () => {
    if (!activeConnection || !jsonData || !jsonData.length) return;
    const mappedCols = jsonKeys
      .map(k => ({ key: k, tableCol: columnMapping[k], meta: columns.find(c => c.column_name === columnMapping[k]) }))
      .filter(m => !!m.tableCol);
    if (!mappedCols.length) { toast.error('Import Failed', 'Map at least one field first.'); return; }

    setImporting(true); setProgress(0);
    const res: ImportResult = { total: jsonData.length, success: 0, failed: 0, errors: [] };
    const colNames = mappedCols.map(m => m.tableCol);
    const colMeta = mappedCols.map(m => m.meta);

    for (let i = 0; i < jsonData.length; i += BATCH) {
      const batch = jsonData.slice(i, i + BATCH).map((rec: any) =>
        mappedCols.map(m => rec[m.key] == null ? '' : typeof rec[m.key] === 'object' ? JSON.stringify(rec[m.key]) : String(rec[m.key]))
      );
      try {
        await activeConnection.client.query(buildInsertSQL(colNames, batch, colMeta, importMode));
        res.success += batch.length;
      } catch {
        for (let j = 0; j < batch.length; j++) {
          try {
            await activeConnection.client.query(buildInsertSQL(colNames, [batch[j]], colMeta, importMode));
            res.success++;
          } catch (rowErr: any) {
            res.failed++;
            if (res.errors.length < 50) res.errors.push({ row: i + j + 1, message: rowErr.message });
          }
        }
      }
      setProgress(Math.round(((i + Math.min(BATCH, jsonData.length - i)) / jsonData.length) * 100));
    }
    await activeConnection.client.query(`REFRESH TABLE "${schema}"."${tableName}"`);
    setResult(res); setImporting(false);
    if (res.success > 0) { toast.success('Import Complete', `${res.success.toLocaleString()} records imported`); onImportComplete?.(); }
    else toast.error('Import Failed', 'No records were imported.');
  };

  const handleImport = () => {
    if (format === 'csv') handleImportCSV();
    else if (format === 'sql') handleImportSQL();
    else handleImportJSON();
  };

  const clearFile = () => {
    setFile(null); setFileContent(null); setResult(null); setProgress(0); setColumnMapping({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Sample template download ───────────────────────────────────────────────
  const downloadSample = () => {
    const tableCols = columns.filter(c => c.column_name !== '_id');
    let content: string;
    let filename: string;
    let mime: string;

    if (format === 'csv') {
      const sep = delimiter === '\t' ? '\t' : delimiter;
      const header = tableCols.map(c => c.column_name).join(sep);
      const sampleRow = tableCols.map(c => {
        const dt = c.data_type.toLowerCase();
        if (dt.match(/int|long|short/)) return '1';
        if (dt.match(/float|double|decimal|numeric|real/)) return '1.0';
        if (dt === 'boolean' || dt === 'bool') return 'true';
        if (dt.includes('timestamp')) return new Date().toISOString();
        if (dt.includes('date')) return new Date().toISOString().slice(0, 10);
        return 'example';
      }).join(sep);
      content = `${header}\n${sampleRow}\n`;
      filename = `${tableName}_sample.csv`;
      mime = 'text/csv';
    } else if (format === 'json') {
      const sampleObj: Record<string, any> = {};
      tableCols.forEach(c => {
        const dt = c.data_type.toLowerCase();
        if (dt.match(/int|long|short/)) sampleObj[c.column_name] = 1;
        else if (dt.match(/float|double|decimal|numeric|real/)) sampleObj[c.column_name] = 1.0;
        else if (dt === 'boolean' || dt === 'bool') sampleObj[c.column_name] = true;
        else if (dt.includes('timestamp')) sampleObj[c.column_name] = new Date().toISOString();
        else if (dt.includes('date')) sampleObj[c.column_name] = new Date().toISOString().slice(0, 10);
        else sampleObj[c.column_name] = 'example';
      });
      content = JSON.stringify([sampleObj, { ...sampleObj }], null, 2);
      filename = `${tableName}_sample.json`;
      mime = 'application/json';
    } else {
      // SQL sample
      const colList = tableCols.map(c => `"${c.column_name}"`).join(', ');
      const valList = tableCols.map(c => {
        const dt = c.data_type.toLowerCase();
        if (dt.match(/int|long|short/)) return '1';
        if (dt.match(/float|double|decimal|numeric|real/)) return '1.0';
        if (dt === 'boolean' || dt === 'bool') return 'true';
        if (dt.includes('timestamp')) return `'${new Date().toISOString()}'`;
        if (dt.includes('date')) return `'${new Date().toISOString().slice(0, 10)}'`;
        return `'example_value'`;
      }).join(', ');
      content = `-- Sample INSERT for ${schema}.${tableName}\nINSERT INTO "${schema}"."${tableName}" (${colList})\nVALUES (${valList});\n\n-- Add more statements below...\n`;
      filename = `${tableName}_sample.sql`;
      mime = 'text/plain';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Preview row count ─────────────────────────────────────────────────────
  const PREVIEW_ROWS = 8;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-gray-800">

      {/* ═══ LEFT: Settings Panel ══════════════════════════════════════════ */}
      <div className="flex w-80 flex-shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">

        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Import Data</p>
          <p className="mt-0.5 truncate font-mono text-sm font-medium text-gray-600 dark:text-gray-300">
            {schema}.{tableName}
          </p>
        </div>

        <div className="flex flex-col gap-5 p-4">

          {/* Format selector */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">File Format</label>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
              {([
                { id: 'csv', label: 'CSV', icon: <TableIcon className="h-3.5 w-3.5" />, desc: '.csv .tsv' },
                { id: 'sql', label: 'SQL', icon: <FileCode className="h-3.5 w-3.5" />, desc: '.sql' },
                { id: 'json', label: 'JSON', icon: <FileJson className="h-3.5 w-3.5" />, desc: '.json' },
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => { setFormat(f.id); clearFile(); }}
                  className={`flex flex-col items-center gap-0.5 rounded-md px-2 py-2 text-xs font-medium transition-all ${
                    format === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  {f.icon}
                  <span className="font-semibold">{f.label}</span>
                  <span className={`text-[10px] ${format === f.id ? 'text-blue-200' : 'text-gray-400'}`}>{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload zone */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Upload File</label>
            {file ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-green-800 dark:text-green-300">{file.name}</p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button onClick={clearFile} className="rounded p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
                  dragging
                    ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                    : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-600'
                }`}
              >
                <Upload className={`h-6 w-6 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop file here</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">or click to browse</p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-600">
                  {format === 'csv' ? '.csv, .tsv' : format === 'sql' ? '.sql' : '.json'}
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={format === 'csv' ? '.csv,.tsv,.txt' : format === 'sql' ? '.sql,.txt' : '.json,.jsonl'}
              onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f); }}
              className="hidden"
            />
          </div>

          {/* CSV Options */}
          {format === 'csv' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">CSV Options</label>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Delimiter</label>
                <div className="grid grid-cols-4 gap-1">
                  {([
                    { val: ',', label: 'Comma' },
                    { val: '\t', label: 'Tab' },
                    { val: ';', label: 'Semi' },
                    { val: '|', label: 'Pipe' },
                  ] as const).map(d => (
                    <button key={d.label} onClick={() => setDelimiter(d.val)}
                      className={`rounded-md border py-1.5 text-xs font-medium transition-colors ${
                        delimiter === d.val
                          ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={hasHeaderRow} onChange={e => setHasHeaderRow(e.target.checked)}
                  className="h-4 w-4 rounded accent-blue-600" />
                <span className="text-sm text-gray-600 dark:text-gray-300">First row is header</span>
              </label>
              {file && csvDataRows.length > 0 && (
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                  <strong>{csvDataRows.length.toLocaleString()}</strong> data rows · <strong>{csvHeaders.length}</strong> columns detected
                </div>
              )}
            </div>
          )}

          {/* SQL info */}
          {format === 'sql' && file && (
            <div className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              <strong>{sqlStatements.length.toLocaleString()}</strong> SQL statements detected
            </div>
          )}

          {/* JSON info */}
          {format === 'json' && file && (
            jsonData === null ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
                Invalid JSON — could not parse file
              </div>
            ) : (
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                <strong>{jsonData.length.toLocaleString()}</strong> records · <strong>{jsonKeys.length}</strong> fields detected
              </div>
            )
          )}

          {/* Import mode (not for SQL) */}
          {format !== 'sql' && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">On Conflict</label>
              <div className="space-y-1.5">
                {([
                  { val: 'insert', label: 'Fail on conflict', desc: 'Stop if duplicate key found' },
                  { val: 'skip', label: 'Skip duplicates', desc: 'ON CONFLICT DO NOTHING' },
                ] as const).map(m => (
                  <label key={m.val} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                    importMode === m.val
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800'
                  }`}>
                    <input type="radio" value={m.val} checked={importMode === m.val}
                      onChange={() => setImportMode(m.val)} className="mt-0.5 accent-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{m.label}</p>
                      <p className="text-xs text-gray-400">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Download sample template */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Sample Template</label>
            <button
              onClick={downloadSample}
              disabled={columns.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
            >
              <Download className="h-4 w-4" />
              Download {format.toUpperCase()} Template
            </button>
            <p className="mt-1.5 text-center text-xs text-gray-400">
              Fill in the template, then upload it above
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Import button */}
          <button
            onClick={handleImport}
            disabled={
              importing || !file || !activeConnection ||
              (format === 'csv' && csvDataRows.length === 0) ||
              (format === 'sql' && sqlStatements.length === 0) ||
              (format === 'json' && (!jsonData || jsonData.length === 0))
            }
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {importing
              ? <><Loader2 className="h-4 w-4 animate-spin" />Importing…</>
              : <><Play className="h-4 w-4" />Run Import</>
            }
          </button>

          {/* Progress bar */}
          {importing && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT: Preview / Mapping / Results ════════════════════════════ */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

        {/* Results panel */}
        {result && (
          <div className={`flex-shrink-0 border-b px-6 py-4 ${
            result.failed === 0
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : result.success > 0
                ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          }`}>
            <div className="flex items-start gap-4">
              {result.failed === 0
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                : <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
              }
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">Import {result.failed === 0 ? 'Successful' : 'Completed with errors'}</p>
                <div className="mt-1.5 flex gap-4 text-sm">
                  <span className="text-green-700 dark:text-green-400"><strong>{result.success.toLocaleString()}</strong> succeeded</span>
                  {result.failed > 0 && <span className="text-red-700 dark:text-red-400"><strong>{result.failed.toLocaleString()}</strong> failed</span>}
                  <span className="text-gray-500 dark:text-gray-400"><strong>{result.total.toLocaleString()}</strong> total</span>
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-3 max-h-32 overflow-y-auto rounded-lg border border-red-200 bg-white dark:border-red-800 dark:bg-gray-900">
                    {result.errors.map((e, i) => (
                      <div key={i} className="border-b border-red-100 px-3 py-1.5 last:border-0 dark:border-red-900">
                        <span className="font-mono text-xs text-red-600 dark:text-red-400">
                          Row {e.row}: {e.message}
                        </span>
                      </div>
                    ))}
                    {result.failed > result.errors.length && (
                      <div className="px-3 py-1.5 text-xs text-gray-400">
                        +{result.failed - result.errors.length} more errors not shown
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No file state */}
        {!file && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Upload className="h-9 w-9 text-gray-300 dark:text-gray-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-300">Upload a file to get started</p>
              <p className="mt-1 text-sm text-gray-400">
                {format === 'csv' && 'CSV or TSV files with column headers are auto-mapped to table columns'}
                {format === 'sql' && 'SQL files with INSERT, UPDATE, DELETE, or any other statements'}
                {format === 'json' && 'JSON array of objects — each object becomes one row'}
              </p>
            </div>

            {/* Format tips */}
            <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-gray-50 p-4 text-left dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Info className="h-3.5 w-3.5" />Expected Format
              </div>
              {format === 'csv' && (
                <pre className="font-mono text-xs leading-5 text-gray-600 dark:text-gray-400">{`id,name,value,created_at\n1,Alice,99.5,2024-01-01\n2,Bob,42.0,2024-01-02`}</pre>
              )}
              {format === 'sql' && (
                <pre className="font-mono text-xs leading-5 text-gray-600 dark:text-gray-400">{`INSERT INTO "${schema}"."${tableName}" (col1, col2)\nVALUES ('value1', 42);\n\nUPDATE "${schema}"."${tableName}"\nSET col2 = 99 WHERE col1 = 'value1';`}</pre>
              )}
              {format === 'json' && (
                <pre className="font-mono text-xs leading-5 text-gray-600 dark:text-gray-400">{`[\n  { "id": 1, "name": "Alice", "value": 99.5 },\n  { "id": 2, "name": "Bob",   "value": 42.0 }\n]`}</pre>
              )}
            </div>
          </div>
        )}

        {/* CSV: Column Mapping + Preview */}
        {file && format === 'csv' && csvRows.length > 0 && (
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">

            {/* Column mapping header */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">Column Mapping</p>
                  <p className="text-xs text-gray-400 mt-0.5">Map each CSV column to a table column (unmapped columns are skipped)</p>
                </div>
                <div className="text-xs text-gray-400">
                  {Object.values(columnMapping).filter(Boolean).length} of {csvHeaders.length} mapped
                </div>
              </div>
            </div>

            {/* Mapping table */}
            <div className="flex-shrink-0 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">#</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">CSV Column</th>
                    <th className="w-8 px-2 py-2 text-center text-gray-300"><ArrowRight className="h-3.5 w-3.5 mx-auto" /></th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Table Column</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Sample Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700/60 dark:bg-gray-800">
                  {csvHeaders.map((header, i) => {
                    const sample = csvDataRows[0]?.[i] ?? '';
                    const mapped = columnMapping[String(i)];
                    return (
                      <tr key={i} className={mapped ? '' : 'opacity-50'}>
                        <td className="px-4 py-1.5 font-mono text-xs text-gray-400">{i + 1}</td>
                        <td className="px-4 py-1.5 font-mono text-sm font-medium text-gray-800 dark:text-gray-200">{header}</td>
                        <td className="px-2 py-1.5 text-center text-gray-300">
                          <ArrowRight className="h-3 w-3 mx-auto" />
                        </td>
                        <td className="px-4 py-1.5">
                          <select
                            value={mapped || ''}
                            onChange={e => setColumnMapping(prev => ({ ...prev, [String(i)]: e.target.value }))}
                            className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          >
                            <option value="">— skip —</option>
                            {columns.map(c => (
                              <option key={c.column_name} value={c.column_name}>{c.column_name} ({c.data_type})</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-1.5 font-mono text-xs text-gray-400 max-w-[200px] truncate" title={sample}>{sample || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Data preview */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-2 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Data Preview (first {Math.min(PREVIEW_ROWS, csvDataRows.length)} of {csvDataRows.length.toLocaleString()} rows)
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {csvHeaders.map((h, i) => (
                      <th key={i} className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700">
                        {h}
                        {columnMapping[String(i)] && (
                          <span className="ml-1 font-normal text-blue-500 normal-case">→ {columnMapping[String(i)]}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700/60 dark:bg-gray-800">
                  {csvDataRows.slice(0, PREVIEW_ROWS).map((row, ri) => (
                    <tr key={ri} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      {row.map((cell, ci) => (
                        <td key={ci} className="whitespace-nowrap px-3 py-1.5 font-mono text-sm text-gray-700 dark:text-gray-300">{cell || <span className="italic text-gray-300 dark:text-gray-600">empty</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SQL: Statement list */}
        {file && format === 'sql' && (
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {sqlStatements.length} SQL Statement{sqlStatements.length !== 1 ? 's' : ''} Detected
              </p>
              <p className="mt-0.5 text-xs text-gray-400">Statements will be executed sequentially. Errors are logged but execution continues.</p>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              {sqlStatements.length === 0 ? (
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                  <p className="text-sm text-gray-400">No SQL statements found. Check the file format.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {sqlStatements.slice(0, 100).map((stmt, i) => (
                    <div key={i} className="flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                      <span className="w-8 flex-shrink-0 font-mono text-xs text-gray-400 pt-0.5 text-right">{i + 1}</span>
                      <pre className="flex-1 overflow-x-auto whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300 break-all">{stmt.length > 300 ? stmt.slice(0, 300) + '…' : stmt}</pre>
                    </div>
                  ))}
                  {sqlStatements.length > 100 && (
                    <div className="px-6 py-3 text-sm text-gray-400">
                      … and {(sqlStatements.length - 100).toLocaleString()} more statements
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* JSON: Field mapping + preview */}
        {file && format === 'json' && (
          jsonData === null ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div>
                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
                <p className="font-semibold text-red-600 dark:text-red-400">Invalid JSON File</p>
                <p className="mt-1 text-sm text-gray-400">The file could not be parsed. Ensure it is a valid JSON array or object.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
              {/* Field mapping */}
              <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">Field Mapping</p>
                    <p className="text-xs text-gray-400 mt-0.5">Map each JSON field to a table column</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {Object.values(columnMapping).filter(Boolean).length} of {jsonKeys.length} mapped
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">JSON Field</th>
                      <th className="w-8 px-2 py-2 text-center text-gray-300"><ArrowRight className="h-3.5 w-3.5 mx-auto" /></th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Table Column</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Sample Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700/60 dark:bg-gray-800">
                    {jsonKeys.map(key => {
                      const sample = jsonData[0]?.[key];
                      const display = sample == null ? '' : typeof sample === 'object' ? JSON.stringify(sample) : String(sample);
                      const mapped = columnMapping[key];
                      return (
                        <tr key={key} className={mapped ? '' : 'opacity-50'}>
                          <td className="px-4 py-1.5 font-mono text-sm font-medium text-gray-800 dark:text-gray-200">{key}</td>
                          <td className="px-2 py-1.5 text-center text-gray-300"><ArrowRight className="h-3 w-3 mx-auto" /></td>
                          <td className="px-4 py-1.5">
                            <select
                              value={mapped || ''}
                              onChange={e => setColumnMapping(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                              <option value="">— skip —</option>
                              {columns.map(c => (
                                <option key={c.column_name} value={c.column_name}>{c.column_name} ({c.data_type})</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-1.5 font-mono text-xs text-gray-400 max-w-[200px] truncate" title={display}>{display || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* JSON data preview */}
              <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-2 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Data Preview (first {Math.min(PREVIEW_ROWS, jsonData.length)} of {jsonData.length.toLocaleString()} records)
                </p>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {jsonKeys.map(k => (
                        <th key={k} className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700">
                          {k}
                          {columnMapping[k] && <span className="ml-1 font-normal text-blue-500 normal-case">→ {columnMapping[k]}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700/60 dark:bg-gray-800">
                    {jsonData.slice(0, PREVIEW_ROWS).map((rec: any, ri: number) => (
                      <tr key={ri} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        {jsonKeys.map(k => {
                          const v = rec[k];
                          const display = v == null ? null : typeof v === 'object' ? JSON.stringify(v) : String(v);
                          return (
                            <td key={k} className="whitespace-nowrap px-3 py-1.5 font-mono text-sm text-gray-700 dark:text-gray-300">
                              {display ?? <span className="italic text-gray-300 dark:text-gray-600">null</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
