'use client';

import { useState, useEffect } from 'react';
import {
  X, Upload, Loader2, CheckCircle, AlertCircle,
  ArrowRight, ArrowLeft, ChevronRight,
} from 'lucide-react';
import { VectorCollection } from '@/app/hooks/useVectorCollections';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useToast } from '@/app/components/ToastContext';

interface DocumentUploadDialogProps {
  collection: VectorCollection;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'load' | 'map' | 'upload';

interface TableColumn {
  name: string;
  type: string;
  isVector: boolean;
}

export default function DocumentUploadDialog({
  collection,
  onClose,
  onSuccess,
}: DocumentUploadDialogProps) {
  const client = useMonkDBClient();
  const toast = useToast();

  const [step, setStep] = useState<Step>('load');

  // Step 1: Load
  const [rawRecords, setRawRecords] = useState<Record<string, unknown>[]>([]);
  const [fileFields, setFileFields] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  // Step 2: Map columns
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [colsLoading, setColsLoading] = useState(false);
  // mapping[tableColName] = fileFieldName | '__skip__' | '__auto__'
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Step 3: Upload
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  // Load table columns when entering map step
  useEffect(() => {
    if (step !== 'map' || !client) return;
    setColsLoading(true);
    client
      .query(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ?
         ORDER BY ordinal_position`,
        [collection.schema, collection.table]
      )
      .then((r) => {
        const cols: TableColumn[] = r.rows.map((row: unknown[]) => ({
          name: String(row[0]),
          type: String(row[1]),
          isVector: String(row[1]).toLowerCase().includes('float_vector'),
        }));
        setTableColumns(cols);

        // Auto-suggest mapping: exact name match, or skip
        const autoMap: Record<string, string> = {};
        cols.forEach((col) => {
          if (fileFields.includes(col.name)) {
            autoMap[col.name] = col.name;
          } else {
            autoMap[col.name] = '__skip__';
          }
        });
        setMapping(autoMap);
      })
      .catch(() => {
        toast.error('Schema Error', 'Could not load table columns');
      })
      .finally(() => setColsLoading(false));
  }, [step, client]);

  // ── Parse file ───────────────────────────────────────────────────────────────
  const parseFile = async (file: File) => {
    try {
      const text = await file.text();
      const ext = file.name.split('.').pop()?.toLowerCase();
      let records: Record<string, unknown>[] = [];

      if (ext === 'json') {
        const data = JSON.parse(text);
        const items: unknown[] = Array.isArray(data) ? data : data.documents || [];
        records = items.map((item, idx) => {
          if (typeof item === 'object' && item !== null) return item as Record<string, unknown>;
          return { _value: item, _idx: idx };
        });
      } else if (ext === 'csv') {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        records = lines.slice(1).map(line => {
          const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => { obj[h] = parts[i] ?? ''; });
          return obj;
        });
      } else if (ext === 'txt') {
        const lines = text.split('\n').filter(l => l.trim());
        records = lines.map((line, idx) => ({
          id: `doc_${Date.now()}_${idx}`,
          content: line.trim(),
        }));
      } else {
        throw new Error('Unsupported format. Use JSON, CSV, or TXT');
      }

      if (records.length === 0) throw new Error('No records found in file');

      // Collect all field names
      const fields = Array.from(new Set(records.flatMap(r => Object.keys(r))));
      setRawRecords(records);
      setFileFields(fields);
      setFileName(file.name);
      toast.success('File Loaded', `${records.length} records from ${file.name}`);
    } catch (err) {
      toast.error('Parse Failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await parseFile(file);
  };

  const handleTextPaste = (text: string) => {
    if (!text.trim()) { setRawRecords([]); setFileFields([]); return; }
    try {
      const data = JSON.parse(text);
      const items: unknown[] = Array.isArray(data) ? data : data.documents || [];
      const records: Record<string, unknown>[] = items.map((item, idx) => {
        if (typeof item === 'object' && item !== null) return item as Record<string, unknown>;
        return { id: `doc_${idx}`, content: String(item) };
      });
      const fields = Array.from(new Set(records.flatMap(r => Object.keys(r))));
      setRawRecords(records);
      setFileFields(fields);
      setFileName('pasted input');
      toast.success('Data Loaded', `${records.length} records from pasted JSON`);
    } catch {
      const lines = text.split('\n').filter(l => l.trim());
      const records = lines.map((line, idx) => ({ id: `doc_${Date.now()}_${idx}`, content: line.trim() }));
      const fields = ['id', 'content'];
      setRawRecords(records);
      setFileFields(fields);
      setFileName('pasted text');
      toast.success('Data Loaded', `${records.length} lines loaded`);
    }
  };

  // ── Upload ───────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!client || rawRecords.length === 0) return;

    // Build list of mapped columns
    const mappedCols = tableColumns.filter(
      c => mapping[c.name] && mapping[c.name] !== '__skip__'
    );

    if (mappedCols.length === 0) {
      toast.error('Mapping Error', 'Please map at least one column');
      return;
    }

    setUploading(true);
    setErrors([]);
    setProgress({ current: 0, total: rawRecords.length });
    setDone(false);

    const qi = (n: string) => `"${n.replace(/"/g, '""')}"`;
    const schema = qi(collection.schema);
    const table = qi(collection.table);
    const colNames = mappedCols.map(c => qi(c.name)).join(', ');
    const uploadErrors: string[] = [];

    // Batch insert in chunks of 100
    const CHUNK = 100;
    for (let i = 0; i < rawRecords.length; i += CHUNK) {
      const chunk = rawRecords.slice(i, Math.min(i + CHUNK, rawRecords.length));
      const placeholders = chunk.map(() => `(${mappedCols.map(() => '?').join(', ')})`).join(', ');
      const args: unknown[] = [];

      chunk.forEach(record => {
        mappedCols.forEach(col => {
          const fieldName = mapping[col.name];
          let val = fieldName === '__auto__' ? `${crypto.randomUUID()}` : record[fieldName] ?? null;
          // Parse vector fields
          if (col.isVector && typeof val === 'string') {
            try {
              val = JSON.parse(val);
            } catch {
              /* keep as-is */
            }
          }
          args.push(val);
        });
      });

      try {
        await client.query(
          `INSERT INTO ${schema}.${table} (${colNames}) VALUES ${placeholders}`,
          args
        );
      } catch (err) {
        uploadErrors.push(
          `Rows ${i + 1}–${i + chunk.length}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }

      setProgress({ current: Math.min(i + CHUNK, rawRecords.length), total: rawRecords.length });
    }

    setUploading(false);
    setErrors(uploadErrors);

    if (uploadErrors.length === 0) {
      setDone(true);
      toast.success('Upload Complete', `${rawRecords.length} records inserted into ${collection.table}`);
      onSuccess();
    } else {
      const ok = rawRecords.length - uploadErrors.length * CHUNK;
      toast.warning('Partial Upload', `${Math.max(0, ok)} records inserted, ${uploadErrors.length} batches failed`);
    }
  };

  const progressPercent = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const canGoToMap = rawRecords.length > 0;
  const canUpload = tableColumns.some(c => mapping[c.name] && mapping[c.name] !== '__skip__');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Upload Documents</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {collection.schema}.{collection.table} · {collection.dimension}D
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50">
          {(['load', 'map', 'upload'] as Step[]).map((s, i) => {
            const labels: Record<Step, string> = { load: '1. Load File', map: '2. Map Columns', upload: '3. Upload' };
            const active = step === s;
            const done2 = (['load', 'map', 'upload'] as Step[]).indexOf(step) > i;
            return (
              <div key={s} className="flex items-center gap-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  active
                    ? 'bg-blue-600 text-white'
                    : done2
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {labels[s]}
                </span>
                {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Step 1: Load ── */}
          {step === 'load' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload File</label>
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
                >
                  <Upload className="w-7 h-7 text-gray-400 mb-2" />
                  <p className="text-sm text-blue-600 dark:text-blue-400">Choose file</p>
                  <p className="text-xs text-gray-400 mt-1">JSON, CSV, or TXT</p>
                </label>
                <input
                  type="file"
                  id="file-upload"
                  accept=".json,.csv,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Or Paste JSON
                </label>
                <textarea
                  placeholder={`[{"id": "1", "content": "text", "embedding": [0.1, 0.2, ...]}, ...]`}
                  onChange={(e) => handleTextPaste(e.target.value)}
                  className="w-full h-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {rawRecords.length > 0 && (
                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-3">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    {rawRecords.length} records loaded from <span className="font-mono">{fileName}</span>
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Fields: {fileFields.join(', ')}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Step 2: Map ── */}
          {step === 'map' && (
            <>
              {colsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Map each table column to a field from your file. Choose <em>Skip</em> to omit a column.
                    Vector columns need a JSON array field (e.g. <code className="font-mono text-xs">[0.1, 0.2, ...]</code>).
                  </p>
                  <div className="space-y-2">
                    {tableColumns.map((col) => (
                      <div key={col.name} className="flex items-center gap-3">
                        <div className="w-40 flex-shrink-0">
                          <p className="text-xs font-mono font-medium text-gray-800 dark:text-gray-200">{col.name}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">{col.type}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-300 dark:text-gray-600" />
                        <select
                          value={mapping[col.name] ?? '__skip__'}
                          onChange={(e) => setMapping(m => ({ ...m, [col.name]: e.target.value }))}
                          className={`flex-1 rounded-md border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 ${
                            col.isVector
                              ? 'border-blue-200 dark:border-blue-800'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <option value="__skip__">— Skip —</option>
                          <option value="__auto__">⚡ Auto-generate ID</option>
                          {fileFields.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {rawRecords.length} records will be inserted.
                    {tableColumns.filter(c => c.isVector && mapping[c.name] === '__skip__').length > 0 && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">
                        Vector column is skipped — rows will have no embedding.
                      </span>
                    )}
                  </p>
                </>
              )}
            </>
          )}

          {/* ── Step 3: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      Inserting records...
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {done && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-4">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    Upload complete — {rawRecords.length} records inserted
                  </p>
                </div>
              )}

              {errors.length > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">
                      {errors.length} batch{errors.length > 1 ? 'es' : ''} failed
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-700 dark:text-red-300 font-mono">{e}</p>
                    ))}
                  </div>
                </div>
              )}

              {!uploading && !done && errors.length === 0 && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ready to insert <strong>{rawRecords.length}</strong> records into{' '}
                    <strong className="font-mono">{collection.table}</strong>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Mapped columns: {tableColumns.filter(c => mapping[c.name] && mapping[c.name] !== '__skip__').map(c => c.name).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
          <div>
            {step !== 'load' && (
              <button
                onClick={() => {
                  if (step === 'map') setStep('load');
                  if (step === 'upload') { setStep('map'); setErrors([]); setDone(false); }
                }}
                disabled={uploading}
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {done ? 'Close' : 'Cancel'}
            </button>

            {step === 'load' && (
              <button
                onClick={() => setStep('map')}
                disabled={!canGoToMap}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Map Columns <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {step === 'map' && (
              <button
                onClick={() => setStep('upload')}
                disabled={!canUpload || colsLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Review &amp; Upload <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {step === 'upload' && !done && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Uploading...</>
                ) : (
                  <><Upload className="h-4 w-4" />Upload {rawRecords.length} Records</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
