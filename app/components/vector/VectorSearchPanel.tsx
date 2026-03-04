'use client';

import { useState, useEffect } from 'react';
import {
  Search, Loader2, Download, Copy, Check, Filter, ChevronDown, ChevronUp,
  Pencil, Trash2, Bookmark, X, Save,
} from 'lucide-react';
import { VectorCollection } from '@/app/hooks/useVectorCollections';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useToast } from '@/app/components/ToastContext';

export interface SavedSearchParams {
  searchType: 'knn' | 'similarity';
  vector: string;
  topK: number;
  whereClause: string;
}

interface VectorSearchPanelProps {
  collection: VectorCollection | null;
  onAddToHistory: (query: {
    collection: string;
    query: string;
    resultCount: number;
    executionTime: number;
  }) => void;
  onSaveSearch?: (label: string, params: SavedSearchParams) => void;
  loadedSearch?: (SavedSearchParams & { collection: string }) | null;
}

interface SearchResult {
  score: number;
  [key: string]: unknown;
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  const str = String(v);
  return str.length > 200 ? str.slice(0, 200) + '…' : str;
}

function escapeCSV(v: unknown): string {
  const str = fmtValue(v);
  if (str === '—') return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function VectorSearchPanel({
  collection,
  onAddToHistory,
  onSaveSearch,
  loadedSearch,
}: VectorSearchPanelProps) {
  const client = useMonkDBClient();
  const toast = useToast();

  const [manualVector, setManualVector] = useState('');
  const [searchType, setSearchType] = useState<'knn' | 'similarity'>('knn');
  const [topK, setTopK] = useState(5);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultCols, setResultCols] = useState<string[]>([]);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [whereClause, setWhereClause] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // PK detection (for edit/delete)
  const [pkCol, setPkCol] = useState('');

  // Inline edit state
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [mutating, setMutating] = useState(false);

  // Delete confirmation
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  // Save search
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');

  // Reset search state when collection changes
  useEffect(() => {
    setResults([]);
    setResultCols([]);
    setExecutionTime(0);
    setEditingIdx(null);
    setDeletingIdx(null);
    setPkCol('');
  }, [collection]);

  // Detect PK column when collection changes
  useEffect(() => {
    if (!client || !collection) return;
    client
      .query(
        `SELECT kcu.column_name
         FROM information_schema.key_column_usage kcu
         JOIN information_schema.table_constraints tc
           ON kcu.constraint_name = tc.constraint_name
           AND kcu.table_schema = tc.table_schema
           AND kcu.table_name = tc.table_name
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND kcu.table_schema = ?
           AND kcu.table_name = ?
         LIMIT 1`,
        [collection.schema, collection.table]
      )
      .then((r) => {
        if (r.rows.length > 0) setPkCol(String(r.rows[0][0]));
      })
      .catch(() => {});
  }, [client, collection]);

  // Load saved search params
  useEffect(() => {
    if (!loadedSearch) return;
    setSearchType(loadedSearch.searchType);
    setManualVector(loadedSearch.vector);
    setTopK(loadedSearch.topK);
    setWhereClause(loadedSearch.whereClause);
    if (loadedSearch.whereClause) setShowFilters(true);
  }, [loadedSearch]);

  const vectorCol = collection?.columnName ?? '';
  const displayCols = resultCols.filter(c => c !== '_score' && c !== vectorCol);
  const filteredResults = minScore > 0 ? results.filter(r => r.score >= minScore) : results;
  const filtersActive = whereClause.trim() !== '' || minScore > 0;

  const handleManualSearch = async () => {
    if (!client || !collection || !manualVector.trim()) return;

    setSearching(true);
    const startTime = Date.now();

    try {
      const vectorStr = manualVector.trim().replace(/^\[|\]$/g, '');
      const vector = vectorStr.split(',').map((v) => parseFloat(v.trim()));

      if (vector.length !== collection.dimension) {
        throw new Error(
          `Vector dimension mismatch. Expected ${collection.dimension}, got ${vector.length}`
        );
      }
      if (vector.some((v) => isNaN(v))) {
        throw new Error('Invalid vector format. All values must be numbers');
      }

      const colRef = `"${collection.columnName.replace(/"/g, '""')}"`;
      const extraWhere = whereClause.trim() ? `AND (${whereClause.trim()})` : '';

      let query: string;
      let args: unknown[];
      if (searchType === 'knn') {
        query = `
          SELECT *, _score
          FROM "${collection.schema}"."${collection.table}"
          WHERE knn_match(${colRef}, ?, ${topK})
          ${extraWhere}
          ORDER BY _score DESC
        `;
        args = [vector];
      } else {
        query = `
          SELECT *, vector_similarity(${colRef}, ?) AS _score
          FROM "${collection.schema}"."${collection.table}"
          WHERE 1=1 ${extraWhere}
          ORDER BY _score DESC LIMIT ${topK}
        `;
        args = [vector];
      }

      const result = await client.query(query, args);
      const duration = Date.now() - startTime;

      setResultCols(result.cols);
      setResults(
        result.rows.map((row: unknown[]) => {
          const obj: Record<string, unknown> = {};
          result.cols.forEach((col: string, i: number) => { obj[col] = row[i]; });
          return { ...obj, score: parseFloat(String(obj._score ?? 0)) } as SearchResult;
        })
      );
      setExecutionTime(duration);
      setEditingIdx(null);
      setDeletingIdx(null);

      onAddToHistory({
        collection: `${collection.schema}.${collection.table}`,
        query: `${searchType === 'knn' ? 'KNN' : 'Similarity'} (${collection.dimension}D)${whereClause ? ' + filter' : ''}`,
        resultCount: result.rows.length,
        executionTime: duration,
      });

      toast.success('Search Complete', `Found ${result.rows.length} results in ${duration}ms`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      toast.error('Search Failed', message);
    } finally {
      setSearching(false);
    }
  };

  // ── Edit / Delete ────────────────────────────────────────────────────────────
  const editableCols = (result: SearchResult) =>
    displayCols.filter(c => c !== pkCol && c !== vectorCol);

  const startEdit = (idx: number, result: SearchResult) => {
    const data: Record<string, string> = {};
    editableCols(result).forEach(c => {
      const v = fmtValue(result[c]);
      data[c] = v === '—' ? '' : v;
    });
    setEditData(data);
    setEditingIdx(idx);
    setDeletingIdx(null);
  };

  const saveEdit = async (result: SearchResult) => {
    if (!client || !collection || !pkCol) return;
    setMutating(true);
    try {
      const cols = editableCols(result);
      const qi = (n: string) => `"${n.replace(/"/g, '""')}"`;
      const setClauses = cols.map(c => `${qi(c)} = ?`).join(', ');
      const vals = cols.map(c => editData[c] ?? '');
      await client.query(
        `UPDATE ${qi(collection.schema)}.${qi(collection.table)} SET ${setClauses} WHERE ${qi(pkCol)} = ?`,
        [...vals, result[pkCol]]
      );
      toast.success('Updated', 'Document updated successfully');
      // Reflect edit in local results
      setResults(prev =>
        prev.map((r, i) => i === editingIdx! ? { ...r, ...editData } : r)
      );
      setEditingIdx(null);
    } catch (err) {
      toast.error('Update Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setMutating(false);
    }
  };

  const confirmDelete = async (result: SearchResult) => {
    if (!client || !collection || !pkCol) return;
    setMutating(true);
    try {
      const qi = (n: string) => `"${n.replace(/"/g, '""')}"`;
      await client.query(
        `DELETE FROM ${qi(collection.schema)}.${qi(collection.table)} WHERE ${qi(pkCol)} = ?`,
        [result[pkCol]]
      );
      toast.success('Deleted', 'Document deleted successfully');
      setResults(prev => prev.filter((_, i) => i !== deletingIdx));
      setDeletingIdx(null);
    } catch (err) {
      toast.error('Delete Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setMutating(false);
    }
  };

  // ── Exports ──────────────────────────────────────────────────────────────────
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const data = JSON.stringify(filteredResults, null, 2);
    triggerDownload(new Blob([data], { type: 'application/json' }), `vector-search-${Date.now()}.json`);
    toast.success('Export Complete', 'Results exported to JSON');
  };

  const exportToCSV = () => {
    if (filteredResults.length === 0) return;
    const headers = [...displayCols, '_score'];
    const rows = filteredResults.map(r => [
      ...displayCols.map(c => escapeCSV(r[c])),
      r.score,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(new Blob([csv], { type: 'text/csv' }), `vector-search-${Date.now()}.csv`);
    toast.success('Export Complete', 'Results exported to CSV');
  };

  const copyResults = () => {
    const text = filteredResults
      .map((r, i) =>
        `#${i + 1} [${(r.score * 100).toFixed(1)}%] ${displayCols.map(c => `${c}: ${r[c] ?? ''}`).join(' | ')}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied', 'Results copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSearch = () => {
    if (!onSaveSearch || !saveLabel.trim()) return;
    onSaveSearch(saveLabel.trim(), { searchType, vector: manualVector, topK, whereClause });
    setSaveLabel('');
    setShowSaveForm(false);
    toast.success('Saved', `Search saved as "${saveLabel.trim()}"`);
  };

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Select a collection to start searching</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Vector Input */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Vector Array <span className="normal-case font-normal text-gray-400">({collection.dimension} dimensions)</span>
        </label>
        <textarea
          value={manualVector}
          onChange={(e) => setManualVector(e.target.value)}
          placeholder={`[0.1, 0.2, 0.3, ... ${collection.dimension} numbers total]`}
          className="w-full h-20 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
          disabled={searching}
        />
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Paste a JSON array of {collection.dimension} numbers
        </p>
      </div>

      {/* Search Options + Button */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Search Type</label>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'knn' | 'similarity')}
            disabled={searching}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="knn">KNN Match</option>
            <option value="similarity">Vector Similarity</option>
          </select>
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Top K</label>
          <input
            type="number"
            value={topK}
            onChange={(e) => setTopK(parseInt(e.target.value, 10) || 5)}
            min="1"
            max="500"
            disabled={searching}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleManualSearch}
            disabled={searching || !manualVector.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {searching ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Searching...</>
            ) : (
              <><Search className="h-4 w-4" />Search</>
            )}
          </button>
          {/* Save search button */}
          {onSaveSearch && manualVector.trim() && (
            <button
              onClick={() => setShowSaveForm(v => !v)}
              className={`rounded-lg border p-2 transition-colors ${
                showSaveForm
                  ? 'border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                  : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:text-gray-300'
              }`}
              title="Save search"
            >
              <Bookmark className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Save search form */}
      {showSaveForm && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 px-3 py-2">
          <input
            type="text"
            value={saveLabel}
            onChange={(e) => setSaveLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSearch(); if (e.key === 'Escape') setShowSaveForm(false); }}
            placeholder="Search label..."
            autoFocus
            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSaveSearch}
            disabled={!saveLabel.trim()}
            className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-3 w-3" /> Save
          </button>
          <button
            onClick={() => { setShowSaveForm(false); setSaveLabel(''); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Advanced Filters */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowFilters(f => !f)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            Advanced Filters
            {filtersActive && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                active
              </span>
            )}
          </div>
          {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showFilters && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-3 space-y-3 bg-gray-50/50 dark:bg-gray-800/50">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Extra WHERE Condition
              </label>
              <input
                type="text"
                value={whereClause}
                onChange={(e) => setWhereClause(e.target.value)}
                placeholder="e.g. category = 'news' AND year > 2023"
                disabled={searching}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 font-mono text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
              />
              <p className="mt-0.5 text-xs text-gray-400">Added as AND (...) in the query</p>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Min Score</label>
                <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{minScore.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={minScore}
                onChange={(e) => setMinScore(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <p className="mt-0.5 text-xs text-gray-400">Client-side filter — hides results below this score</p>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {executionTime > 0 && !searching && (
        <div className="space-y-2">
          {/* Results toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {minScore > 0
                  ? `${filteredResults.length}/${results.length} results`
                  : `${results.length} results`}
              </span>
              <span className="text-xs text-gray-400">{executionTime}ms</span>
              {displayCols.length > 0 && (
                <span className="text-xs text-gray-400">{displayCols.length} columns</span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={copyResults}
                disabled={filteredResults.length === 0}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                title="Copy to clipboard"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={exportToCSV}
                disabled={filteredResults.length === 0}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                title="Export CSV"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={exportToJSON}
                disabled={filteredResults.length === 0}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                title="Export JSON"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Empty / filtered states */}
          {results.length === 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No results found for this query</p>
            </div>
          )}
          {filteredResults.length === 0 && results.length > 0 && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-4 text-center">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                All {results.length} results filtered by min score ({minScore.toFixed(2)}). Lower the threshold.
              </p>
            </div>
          )}

          {/* Result rows */}
          {filteredResults.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              {filteredResults.map((result, idx) => (
                <div
                  key={idx}
                  className="border-b border-gray-100 px-3 py-2.5 last:border-b-0 dark:border-gray-700/60"
                >
                  {/* Rank + score bar + actions */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs text-gray-400">#{idx + 1}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="h-1.5 flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(result.score * 100, 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {(result.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    {/* Edit / Delete buttons (only if PK detected) */}
                    {pkCol && editingIdx !== idx && deletingIdx !== idx && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => startEdit(idx, result)}
                          disabled={mutating}
                          className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                          title="Edit document"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => { setDeletingIdx(idx); setEditingIdx(null); }}
                          disabled={mutating}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Delete confirmation */}
                  {deletingIdx === idx && (
                    <div className="mb-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-3 py-2">
                      <p className="mb-2 text-xs text-red-700 dark:text-red-300">
                        Delete this document? This cannot be undone.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => confirmDelete(result)}
                          disabled={mutating}
                          className="flex items-center gap-1 rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {mutating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingIdx(null)}
                          disabled={mutating}
                          className="rounded border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline edit form */}
                  {editingIdx === idx ? (
                    <div className="space-y-2">
                      {/* Show PK as read-only */}
                      {pkCol && (
                        <div className="flex gap-2 text-xs">
                          <dt className="w-24 flex-shrink-0 font-mono text-amber-500 truncate pt-px">{pkCol} (PK)</dt>
                          <dd className="text-gray-500 dark:text-gray-400 break-words min-w-0">{fmtValue(result[pkCol])}</dd>
                        </div>
                      )}
                      {/* Editable fields */}
                      {editableCols(result).map(col => (
                        <div key={col} className="flex items-center gap-2 text-xs">
                          <label className="w-24 flex-shrink-0 font-mono text-gray-400 truncate pt-px">{col}</label>
                          <input
                            type="text"
                            value={editData[col] ?? ''}
                            onChange={(e) => setEditData(d => ({ ...d, [col]: e.target.value }))}
                            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-0.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => saveEdit(result)}
                          disabled={mutating}
                          className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {mutating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          Save
                        </button>
                        <button
                          onClick={() => setEditingIdx(null)}
                          disabled={mutating}
                          className="rounded border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Dynamic column key–value list */
                    <dl className="space-y-0.5">
                      {displayCols.map(col => (
                        <div key={col} className="flex gap-2 text-xs">
                          <dt className={`w-24 flex-shrink-0 font-mono truncate pt-px ${
                            col === pkCol ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'
                          }`}>{col}</dt>
                          <dd className="text-gray-800 dark:text-gray-200 break-words min-w-0">{fmtValue(result[col])}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
