'use client';

import { useState, useCallback } from 'react';
import {
  Search, RefreshCw, Clock, X, Plus, Download, Copy,
  Code2, BookOpen, Zap, Info, FileText, Loader2,
  AlertTriangle, SlidersHorizontal, Terminal, Tag,
  Database, ChevronRight, Pencil, Trash2, Lock,
} from 'lucide-react';
import { useMonkDBClient } from '../lib/monkdb-context';
import { useTheme } from '../components/ThemeProvider';
import { useToast } from '../components/ToastContext';
import ConnectionPrompt from '../components/common/ConnectionPrompt';
import { useFTSIndexes, FTSIndex } from '../hooks/useFTSIndexes';
import { buildMatchQuery, highlightMatches, validateFTSQuery } from '../lib/fts-utils';
import RefreshScheduleManager from '../components/fts/RefreshScheduleManager';
import CreateFTSIndexDialog from '../components/fts/CreateFTSIndexDialog';
import { getTableSchedule } from '../lib/fts/refresh-automation';



interface SearchResult {
  _score: number;
  [key: string]: any;
}

interface UserSnippet {
  id: string;
  label: string;
  code: string;
  desc: string;
}

function loadUserSnippets(): UserSnippet[] {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem('monkdb-fts-query-snippets');
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function persistUserSnippets(snippets: UserSnippet[]): void {
  try { localStorage.setItem('monkdb-fts-query-snippets', JSON.stringify(snippets)); } catch {}
}

const LIMIT_PRESETS = [10, 25, 50, 100, 500, 1000];

const QUERY_SYNTAX_TIPS = [
  { label: 'Single Term',  code: 'error',               desc: 'Match documents containing "error"' },
  { label: 'Phrase Match', code: '"connection timeout"', desc: 'Exact phrase in sequence' },
  { label: 'Boolean OR',  code: 'error OR warning',     desc: 'Either term must match' },
  { label: 'Must Include', code: '+database error',      desc: '"database" must be present' },
  { label: 'Must Exclude', code: 'error -warning',       desc: 'Exclude docs with "warning"' },
  { label: 'Prefix Match', code: 'conn*',                desc: 'Matches connect, connection…' },
  { label: 'Proximity',    code: '"db error"~5',         desc: 'Terms within 5 positions' },
];

const ANALYZER_DOCS = [
  { name: 'standard', desc: 'Tokenizes, lowercases, removes punctuation' },
  { name: 'english',  desc: 'Stemming + English stop-words (the, a, in…)' },
  { name: 'german',   desc: 'Stemming + German stop-words via snowball' },
  { name: 'french',   desc: 'Stemming + French stop-words via snowball' },
];

const SQL_SNIPPETS = [
  {
    label: 'Create FTS Table',
    sql: `CREATE TABLE t (\n  id INTEGER PRIMARY KEY,\n  title TEXT,\n  INDEX idx_fts USING FULLTEXT (title)\n  WITH (analyzer = 'english')\n);`,
  },
  {
    label: 'Multi-field with boost',
    sql: `WHERE MATCH(\n  (title 2.0, body 1.0),\n  'search query'\n)\nORDER BY _score DESC;`,
  },
  { label: 'Refresh before search', sql: `REFRESH TABLE schema.table;` },
];

export default function FullTextSearchPage() {
  const client = useMonkDBClient();
  const { theme } = useTheme();
  const D = theme === 'dark';
  const C = {
    bgApp:    D ? '#0f1f30' : '#f1f5f9',
    bgHeader: D ? '#0e1e2e' : '#ffffff',
    bgPanel:  D ? '#112233' : '#ffffff',
    bgInput:  D ? '#1a3048' : '#f8fafc',
    bgSub:    D ? '#0d1b2a' : '#f1f5f9',
    border:   D ? '#1a3050' : '#e2e8f0',
    borderSub: D ? 'rgba(148,163,184,0.10)' : 'rgba(0,0,0,0.07)',
    borderFocus: '#7c3aed',
    textPrimary:   D ? '#d1d5db' : '#1e293b',
    textSecondary: D ? '#9ca3af' : '#475569',
    textMuted:     D ? '#6b7280' : '#94a3b8',
    textLabel:     D ? '#9ca3af' : '#64748b',
    accent:      '#7c3aed',
    accentLight: '#8b5cf6',
    accentHover: '#a78bfa',
    accentText:  D ? '#c4b5fd' : '#6d28d9',
    accentBg:    D ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.07)',
    accentBorder: D ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.3)',
    success: '#4ade80',
    warning: '#fbbf24',
    warningBg: D ? 'rgba(251,191,36,0.10)' : 'rgba(251,191,36,0.06)',
    error: '#f87171',
  };
  const sBtnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
    cursor: 'pointer', border: `1px solid ${C.border}`,
    background: D ? 'rgba(148,163,184,0.05)' : 'rgba(0,0,0,0.03)', color: C.textSecondary,
    transition: 'all 0.1s',
  };
  const toast = useToast();
  const { indexes, loading: indexesLoading, refresh: refreshIndexes } = useFTSIndexes();

  const [selectedIndex, setSelectedIndex] = useState<FTSIndex | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [limit, setLimit] = useState(50);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [executionTime, setExecutionTime] = useState(0);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [showScheduleManager, setShowScheduleManager] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSQLPreview, setShowSQLPreview] = useState(false);

  // ── User-editable query snippets ─────────────────────────────────────────
  const [userSnippets, setUserSnippets] = useState<UserSnippet[]>(() => loadUserSnippets());
  const [editingId, setEditingId] = useState<string | null>(null); // 'new' | snippet id
  const [draftLabel, setDraftLabel] = useState('');
  const [draftCode, setDraftCode] = useState('');
  const [draftDesc, setDraftDesc] = useState('');

  const startAdd = () => { setEditingId('new'); setDraftLabel(''); setDraftCode(''); setDraftDesc(''); };
  const startEdit = (s: UserSnippet) => { setEditingId(s.id); setDraftLabel(s.label); setDraftCode(s.code); setDraftDesc(s.desc); };
  const cancelEdit = () => setEditingId(null);

  const commitSnippet = () => {
    if (!draftLabel.trim() || !draftCode.trim()) return;
    const updated = editingId === 'new'
      ? [...userSnippets, { id: crypto.randomUUID(), label: draftLabel.trim(), code: draftCode.trim(), desc: draftDesc.trim() }]
      : userSnippets.map(s => s.id === editingId ? { ...s, label: draftLabel.trim(), code: draftCode.trim(), desc: draftDesc.trim() } : s);
    setUserSnippets(updated);
    persistUserSnippets(updated);
    setEditingId(null);
  };

  const deleteSnippet = (id: string) => {
    const updated = userSnippets.filter(s => s.id !== id);
    setUserSnippets(updated);
    persistUserSnippets(updated);
  };

  const filteredIndexes = indexes.filter((idx) => {
    if (!tableSearchQuery.trim()) return true;
    const q = tableSearchQuery.toLowerCase();
    return (
      idx.table.toLowerCase().includes(q) ||
      idx.schema.toLowerCase().includes(q) ||
      idx.indexName.toLowerCase().includes(q) ||
      idx.columns.some((col) => col.toLowerCase().includes(q))
    );
  });

  const handleSelectIndex = (index: FTSIndex) => {
    setSelectedIndex(index);
    setSelectedColumns(index.columns);
    setResults([]);
    setNeedsRefresh(false);
  };

  const handleRefreshTable = async () => {
    if (!client || !selectedIndex) return;
    try {
      await client.query(`REFRESH TABLE "${selectedIndex.schema}"."${selectedIndex.table}"`);
      toast.success('Refreshed', 'Table index updated');
      setNeedsRefresh(false);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Failed to refresh');
    }
  };

  // MonkDB 6+: MATCH must use the named index, not column names
  const buildMatchClause = useCallback((): string => {
    if (!selectedIndex) return 'MATCH("index_name", ?)';
    return `MATCH("${selectedIndex.indexName.replace(/"/g, '""')}", ?)`;
  }, [selectedIndex]);

  const buildSQL = useCallback((): string => {
    if (!selectedIndex || !searchQuery.trim()) return '';
    return (
      `SELECT *, _score\n` +
      `FROM "${selectedIndex.schema}"."${selectedIndex.table}"\n` +
      `WHERE ${buildMatchClause()}\n` +
      `ORDER BY _score DESC\n` +
      `LIMIT ${limit}`
    );
  }, [selectedIndex, searchQuery, buildMatchClause, limit]);

  const handleSearch = async () => {
    if (!client || !selectedIndex || !searchQuery.trim()) return;
    const validation = validateFTSQuery(searchQuery);
    if (!validation.valid) { toast.error('Invalid Query', validation.error || 'Invalid syntax'); return; }
    setSearching(true);
    const startTime = Date.now();
    try {
      const matchClause = buildMatchQuery(selectedIndex.indexName);
      const sql = `SELECT *, _score FROM "${selectedIndex.schema}"."${selectedIndex.table}" WHERE ${matchClause} ORDER BY _score DESC LIMIT ${limit}`;
      const result = await client.query(sql, [searchQuery]);
      const rows = result.rows.map((row: any[]) => {
        const obj: any = {};
        result.cols.forEach((col: string, i: number) => { obj[col] = row[i]; });
        return obj;
      });
      setResults(rows);
      setExecutionTime(Date.now() - startTime);
      // If 0 results on a non-empty table, new inserts may not be visible yet
      setNeedsRefresh(rows.length === 0 && (selectedIndex.documentCount ?? 0) > 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      toast.error('Search Failed', msg);
    } finally { setSearching(false); }
  };

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!results.length) return;
    const cols = Object.keys(results[0]);
    const csv = [cols.join(','), ...results.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n');
    triggerDownload(URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), `fts-${Date.now()}.csv`);
  };

  const exportJSON = () => {
    if (!results.length) return;
    triggerDownload(URL.createObjectURL(new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })), `fts-${Date.now()}.json`);
  };

  const copyResults = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(results, null, 2));
      toast.success('Copied', 'Results copied to clipboard');
    } catch { toast.error('Error', 'Could not copy'); }
  };

  if (!client) {
    return (
      <div style={{ margin: '-2rem', height: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bgApp }}>
        <ConnectionPrompt message="Connect to a database to use full-text search" onConnect={() => {}} />
      </div>
    );
  }

  const maxScore = results.length > 0 ? Math.max(...results.map((r) => r._score)) : 1;

  return (
    <div style={{ margin: '-2rem', height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bgApp, color: C.textPrimary, fontFamily: 'var(--font-geist-sans), -apple-system, system-ui, sans-serif' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52, background: C.bgHeader, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accentBg, border: `1px solid ${C.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Search style={{ width: 15, height: 15, color: C.accentText }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, lineHeight: 1.2 }}>Full-Text Search</div>
            <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.2 }}>BM25-ranked search with field-level relevance weighting</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FBtn C={C} icon={<RefreshCw style={{ width: 13, height: 13 }} />} label="Refresh" onClick={refreshIndexes} />
          <FBtn C={C} icon={<Plus style={{ width: 13, height: 13 }} />} label="New FTS Index" onClick={() => setShowCreateDialog(true)} accent />
        </div>
      </div>

      {/* ── Three-column body ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── LEFT: Index Browser ─────────────────────────────────────────── */}
        <div style={{ width: 264, flexShrink: 0, display: 'flex', flexDirection: 'column', background: C.bgPanel, borderRight: `1px solid ${C.border}`, overflow: 'hidden' }}>

          {/* Sidebar header */}
          <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.textLabel }}>
                FTS Indexes
              </span>
              <span style={{ fontSize: 11, color: C.textMuted, background: 'rgba(148,163,184,0.08)', border: `1px solid ${C.borderSub}`, borderRadius: 10, padding: '1px 7px' }}>
                {filteredIndexes.length}
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: C.textMuted }} />
              <input
                type="text"
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                placeholder="Filter indexes…"
                style={{ width: '100%', background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 7, color: C.textPrimary, fontSize: 13, padding: '6px 28px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
                onBlur={e => e.currentTarget.style.borderColor = C.border}
              />
              {tableSearchQuery && (
                <button onClick={() => setTableSearchQuery('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 2, display: 'flex' }}>
                  <X style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
          </div>

          {/* Index list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {indexesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
                <Loader2 style={{ width: 22, height: 22, color: C.accentText, animation: 'spin 1s linear infinite' }} />
              </div>
            ) : indexes.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, gap: 8, textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.accentBg, border: `1px solid ${C.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database style={{ width: 20, height: 20, color: C.accentText }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>No FTS Indexes</p>
                  <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>Create a FULLTEXT index to enable search</p>
                </div>
                <button onClick={() => setShowCreateDialog(true)}
                  style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 7, color: C.accentText, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus style={{ width: 12, height: 12 }} /> Create FTS Index
                </button>
              </div>
            ) : filteredIndexes.length === 0 ? (
              <p style={{ textAlign: 'center', paddingTop: 32, fontSize: 13, color: C.textMuted }}>No matches for "{tableSearchQuery}"</p>
            ) : (
              filteredIndexes.map((index) => {
                const isActive = selectedIndex?.schema === index.schema && selectedIndex?.table === index.table;
                return (
                  <button
                    key={`${index.schema}.${index.table}.${index.indexName}`}
                    onClick={() => handleSelectIndex(index)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 9,
                      background: isActive ? C.accentBg : 'rgba(148,163,184,0.03)',
                      border: `1px solid ${isActive ? C.accentBorder : C.border}`,
                      cursor: 'pointer', transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(148,163,184,0.07)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(148,163,184,0.03)'; e.currentTarget.style.borderColor = C.border; } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? C.accentText : C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {index.table}
                      </span>
                      {index.analyzer && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#c4b5fd', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 4, padding: '1px 6px', flexShrink: 0, marginLeft: 6, fontFamily: 'var(--font-geist-mono), monospace' }}>
                          {index.analyzer}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 7, fontFamily: 'var(--font-geist-mono), monospace' }}>{index.schema}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                      {index.columns.slice(0, 3).map((col) => (
                        <span key={col} style={{ fontSize: 10, color: C.textSecondary, background: 'rgba(148,163,184,0.08)', border: `1px solid ${C.borderSub}`, borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--font-geist-mono), monospace' }}>
                          {col}
                        </span>
                      ))}
                      {index.columns.length > 3 && (
                        <span style={{ fontSize: 10, color: C.textMuted }}>+{index.columns.length - 3}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FileText style={{ width: 11, height: 11, color: C.textMuted }} />
                      <span style={{ fontSize: 11, color: C.textMuted }}>{(index.documentCount ?? 0).toLocaleString()} docs</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── MIDDLE: Search + Results ─────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bgApp }}>
          {!selectedIndex ? (
            /* Empty State */
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: C.accentBg, border: `1px solid ${C.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Search style={{ width: 26, height: 26, color: C.accentText }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>Select an FTS Index</h3>
              <p style={{ fontSize: 13, color: C.textSecondary, maxWidth: 340, lineHeight: 1.6 }}>
                Choose a full-text search index from the left panel to begin searching your documents
              </p>
              <div style={{ marginTop: 24, maxWidth: 420, width: '100%', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: C.bgHeader, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Terminal style={{ width: 13, height: 13, color: C.textMuted }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textMuted }}>MonkDB MATCH Syntax</span>
                </div>
                <pre style={{ margin: 0, padding: '14px 16px', fontFamily: 'var(--font-geist-mono), monospace', fontSize: 12, color: '#4ade80', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{`-- Single field
WHERE MATCH(content, 'query')

-- Multi-field with boosts
WHERE MATCH((title 2.0, description 1.0), 'query')

-- Sort by relevance
ORDER BY _score DESC`}</pre>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column', overflow: 'hidden' }}>

              {/* Index info bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 18px', height: 44, background: C.bgHeader, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Database style={{ width: 14, height: 14, flexShrink: 0, color: C.accentText }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: 'var(--font-geist-mono), monospace', whiteSpace: 'nowrap' }}>
                    {selectedIndex.schema}<span style={{ color: C.textMuted }}>.</span><span style={{ color: C.accentText }}>{selectedIndex.table}</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: C.textMuted }}>
                    <span>{(selectedIndex.documentCount ?? 0).toLocaleString()} docs</span>
                    <span style={{ color: C.border }}>·</span>
                    <span>{selectedIndex.columns.length} field{selectedIndex.columns.length !== 1 ? 's' : ''}</span>
                    {selectedIndex.analyzer && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#c4b5fd', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--font-geist-mono), monospace' }}>
                        {selectedIndex.analyzer}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {needsRefresh && (
                    <button onClick={handleRefreshTable}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: C.warningBg, border: `1px solid rgba(251,191,36,0.3)`, borderRadius: 6, color: C.warning, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      <AlertTriangle style={{ width: 12, height: 12 }} /> Refresh Required
                    </button>
                  )}
                  {(() => {
                    const schedule = getTableSchedule(selectedIndex.schema, selectedIndex.table);
                    return (
                      <button onClick={() => setShowScheduleManager(true)}
                        style={{ ...sBtnBase, fontSize: 11 }}>
                        {schedule?.enabled
                          ? <><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} /> Auto-refresh</>
                          : <><Clock style={{ width: 12, height: 12 }} /> Schedule</>
                        }
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Search form */}
              <div style={{ flexShrink: 0, padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: C.bgPanel, display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Query input row */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: 10, top: 11, width: 14, height: 14, color: C.textMuted, pointerEvents: 'none' }} />
                    <textarea
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSearch(); }}
                      placeholder='Enter search query…  e.g., "connection error" OR database'
                      rows={2}
                      disabled={searching}
                      style={{ width: '100%', resize: 'none', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgInput, color: C.textPrimary, fontSize: 13, padding: '8px 10px 8px 32px', outline: 'none', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', lineHeight: 1.6, boxSizing: 'border-box' }}
                      onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
                      onBlur={e => e.currentTarget.style.borderColor = C.border}
                    />
                    <span style={{ position: 'absolute', right: 10, bottom: 8, fontSize: 10, color: C.textMuted, pointerEvents: 'none', fontFamily: 'var(--font-geist-mono), monospace' }}>Ctrl+↵</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 18px', background: searching || !searchQuery.trim() ? 'rgba(124,58,237,0.06)' : C.accentBg, border: `1px solid ${searching || !searchQuery.trim() ? C.border : C.accentBorder}`, borderRadius: 8, color: searching || !searchQuery.trim() ? C.textMuted : C.accentText, fontSize: 13, fontWeight: 700, cursor: searching || !searchQuery.trim() ? 'not-allowed' : 'pointer', minWidth: 110, transition: 'all 0.1s' }}
                      onMouseEnter={e => { if (!searching && searchQuery.trim()) e.currentTarget.style.background = 'rgba(124,58,237,0.22)'; }}
                      onMouseLeave={e => { if (!searching && searchQuery.trim()) e.currentTarget.style.background = C.accentBg; }}>
                      {searching
                        ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Searching</>
                        : <><Search style={{ width: 14, height: 14 }} /> Search</>
                      }
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
                        style={{ flex: 1, background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSecondary, fontSize: 12, padding: '5px 8px', outline: 'none', cursor: 'pointer' }}>
                        {LIMIT_PRESETS.map((n) => <option key={n} value={n}>Top {n}</option>)}
                      </select>
                      <button onClick={() => setShowSQLPreview((v) => !v)} title="Toggle SQL preview"
                        style={{ padding: 6, borderRadius: 6, border: `1px solid ${showSQLPreview ? C.accentBorder : C.border}`, background: showSQLPreview ? C.accentBg : 'transparent', color: showSQLPreview ? C.accentText : C.textMuted, cursor: 'pointer', display: 'flex', transition: 'all 0.1s' }}>
                        <Code2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* SQL Preview */}
                {showSQLPreview && (
                  <div style={{ background: C.bgSub, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Terminal style={{ width: 12, height: 12, color: C.textMuted }} />
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.textMuted }}>Generated SQL</span>
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(buildSQL())}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 3, display: 'flex', borderRadius: 4 }}
                        onMouseEnter={e => e.currentTarget.style.color = C.textPrimary}
                        onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
                        <Copy style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                    <pre style={{ margin: 0, padding: '10px 14px', fontFamily: 'var(--font-geist-mono), monospace', fontSize: 12, color: '#4ade80', whiteSpace: 'pre-wrap', overflowX: 'auto', lineHeight: 1.7 }}>
                      {searchQuery.trim() ? buildSQL() : '-- Enter a search query to preview SQL'}
                    </pre>
                  </div>
                )}

                {/* Indexed columns info */}
                {selectedIndex && selectedColumns.length > 0 && (
                  <div style={{ background: C.bgSub, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: C.bgHeader, borderBottom: `1px solid ${C.border}` }}>
                      <SlidersHorizontal style={{ width: 14, height: 14, color: C.accentText }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Indexed Columns</span>
                      <span style={{ fontSize: 10, color: C.textMuted, background: 'rgba(148,163,184,0.08)', border: `1px solid ${C.borderSub}`, borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--font-geist-mono), monospace' }}>
                        {selectedIndex.indexName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 14px' }}>
                      {selectedColumns.map(col => (
                        <span key={col} style={{ fontSize: 11, fontFamily: 'var(--font-geist-mono), monospace', color: C.accentText, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 5, padding: '2px 8px' }}>
                          {col}
                        </span>
                      ))}
                    </div>
                    <div style={{ padding: '8px 14px', background: C.bgSub, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Terminal style={{ width: 11, height: 11, color: C.textMuted }} />
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textMuted }}>MATCH clause</span>
                      </div>
                      <code style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 12, color: '#4ade80' }}>
                        WHERE {buildMatchClause()}
                      </code>
                    </div>
                  </div>
                )}
              </div>

              {/* Results */}
              <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column', overflow: 'hidden' }}>
                {results.length > 0 ? (
                  <>
                    {/* Results toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', height: 42, background: C.bgHeader, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.accentText, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: '2px 10px' }}>
                          {results.length.toLocaleString()} result{results.length !== 1 ? 's' : ''}
                        </span>
                        <span style={{ fontSize: 12, color: C.textMuted }}>{executionTime}ms</span>
                        <span style={{ color: C.border }}>·</span>
                        <span style={{ fontSize: 12, color: C.textMuted }}>
                          Best: <span style={{ fontFamily: 'var(--font-geist-mono), monospace', color: C.textSecondary, fontWeight: 600 }}>{results[0]._score.toFixed(4)}</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {[
                          { icon: <Copy style={{ width: 12, height: 12 }} />, label: 'Copy', fn: copyResults },
                          { icon: <Download style={{ width: 12, height: 12 }} />, label: 'CSV', fn: exportCSV },
                          { icon: <Download style={{ width: 12, height: 12 }} />, label: 'JSON', fn: exportJSON },
                        ].map(b => (
                          <button key={b.label} onClick={b.fn} style={sBtnBase}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(148,163,184,0.10)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(148,163,184,0.05)'}>
                            {b.icon}{b.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Result cards */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      {results.map((result, idx) => {
                        const scorePct = Math.min((result._score / maxScore) * 100, 100);
                        return (
                          <div key={idx} style={{ padding: '14px 18px', borderBottom: `1px solid ${C.borderSub}`, transition: 'background 0.08s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.04)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                            {/* Rank + score bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                              <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', background: 'rgba(148,163,184,0.08)', border: `1px solid ${C.borderSub}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                                {idx + 1}
                              </span>
                              <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(148,163,184,0.08)', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${C.accent}, #6366f1)`, width: `${scorePct}%`, transition: 'width 0.3s' }} />
                                </div>
                                <span style={{ width: 58, textAlign: 'right', fontFamily: 'var(--font-geist-mono), monospace', fontSize: 12, fontWeight: 700, color: C.accentText, fontVariantNumeric: 'tabular-nums' }}>
                                  {result._score.toFixed(4)}
                                </span>
                                <span style={{ width: 32, textAlign: 'right', fontSize: 11, color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                                  {scorePct.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            {/* Field values */}
                            <div style={{ marginLeft: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {selectedColumns.map(
                                (col) => result[col] != null && (
                                  <div key={col}>
                                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.accentText }}>
                                      {col}
                                    </span>
                                    <div
                                      style={{ marginTop: 3, fontSize: 13, color: C.textPrimary, lineHeight: 1.6 }}
                                      dangerouslySetInnerHTML={{ __html: highlightMatches(String(result[col]), searchQuery) }}
                                    />
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    {searching ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <Loader2 style={{ width: 28, height: 28, color: C.accentText, animation: 'spin 1s linear infinite' }} />
                        <p style={{ fontSize: 13, color: C.textSecondary }}>Searching {(selectedIndex.documentCount ?? 0).toLocaleString()} documents…</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
                        <Search style={{ width: 36, height: 36, color: '#374151' }} />
                        <p style={{ fontSize: 13, fontWeight: 500, color: C.textSecondary }}>Enter a query and press Search</p>
                        <p style={{ fontSize: 11, color: C.textMuted, fontFamily: 'var(--font-geist-mono), monospace' }}>Ctrl+Enter to execute</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Reference Panel ──────────────────────────────────────── */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', background: C.bgPanel, borderLeft: `1px solid ${C.border}`, overflowY: 'auto' }}>
          <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Query Syntax */}
            <RefSection C={C} icon={<BookOpen style={{ width: 13, height: 13, color: C.accentText }} />} label="Query Syntax">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

                {/* ── Built-in tips (read-only) ── */}
                {QUERY_SYNTAX_TIPS.map((tip) => (
                  <div key={tip.label} style={{ background: 'rgba(148,163,184,0.04)', border: `1px solid ${C.borderSub}`, borderRadius: 7, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Lock style={{ width: 9, height: 9, color: C.textMuted, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{tip.label}</span>
                      </div>
                      {selectedIndex && (
                        <button onClick={() => setSearchQuery(tip.code)}
                          style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 600, color: C.accentText, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                          Use <ChevronRight style={{ width: 10, height: 10 }} />
                        </button>
                      )}
                    </div>
                    <code style={{ display: 'block', fontFamily: 'var(--font-geist-mono), monospace', fontSize: 11, color: C.accentText, marginBottom: 3 }}>{tip.code}</code>
                    <p style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5 }}>{tip.desc}</p>
                  </div>
                ))}

                {/* ── User snippets (editable) ── */}
                {userSnippets.map((s) => (
                  editingId === s.id ? (
                    <SnippetForm key={s.id} C={C}
                      label={draftLabel} code={draftCode} desc={draftDesc}
                      onLabel={setDraftLabel} onCode={setDraftCode} onDesc={setDraftDesc}
                      onSave={commitSnippet} onCancel={cancelEdit} />
                  ) : (
                    <div key={s.id} style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 7, padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.accentText, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 4 }}>
                          {selectedIndex && (
                            <button onClick={() => setSearchQuery(s.code)}
                              style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 600, color: C.accentText, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                              Use <ChevronRight style={{ width: 10, height: 10 }} />
                            </button>
                          )}
                          <button onClick={() => startEdit(s)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, padding: '1px 3px', display: 'flex', borderRadius: 3 }}
                            onMouseEnter={e => e.currentTarget.style.color = C.accentText}
                            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
                            <Pencil style={{ width: 11, height: 11 }} />
                          </button>
                          <button onClick={() => deleteSnippet(s.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, padding: '1px 3px', display: 'flex', borderRadius: 3 }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
                            <Trash2 style={{ width: 11, height: 11 }} />
                          </button>
                        </div>
                      </div>
                      <code style={{ display: 'block', fontFamily: 'var(--font-geist-mono), monospace', fontSize: 11, color: C.accentText, marginBottom: s.desc ? 3 : 0 }}>{s.code}</code>
                      {s.desc && <p style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5 }}>{s.desc}</p>}
                    </div>
                  )
                ))}

                {/* ── Add new snippet ── */}
                {editingId === 'new' ? (
                  <SnippetForm C={C}
                    label={draftLabel} code={draftCode} desc={draftDesc}
                    onLabel={setDraftLabel} onCode={setDraftCode} onDesc={setDraftDesc}
                    onSave={commitSnippet} onCancel={cancelEdit} />
                ) : (
                  <button onClick={startAdd}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: `1px dashed ${C.accentBorder}`, background: 'transparent', color: C.accentText, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 2 }}
                    onMouseEnter={e => e.currentTarget.style.background = C.accentBg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <Plus style={{ width: 12, height: 12 }} /> Add Snippet
                  </button>
                )}
              </div>
            </RefSection>

            {/* BM25 */}
            <RefSection C={C} icon={<Zap style={{ width: 13, height: 13, color: C.warning }} />} label="BM25 Scoring">
              <div style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.accentText, marginBottom: 6 }}>Best Match 25</p>
                <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, marginBottom: 10 }}>
                  Used by Elasticsearch & Lucene. Ranks by TF, IDF, and length normalization.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[['k1 = 1.2', 'Saturation'], ['b = 0.75', 'Length norm'], ['TF(t,D)', 'Term freq'], ['IDF(t)', 'Doc freq']].map(([k, v]) => (
                    <div key={k}>
                      <code style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 11, fontWeight: 700, color: C.accentText }}>{k}</code>
                      <p style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </RefSection>

            {/* Analyzers */}
            <RefSection C={C} icon={<Tag style={{ width: 13, height: 13, color: '#818cf8' }} />} label="Analyzers">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ANALYZER_DOCS.map((a) => (
                  <div key={a.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ flexShrink: 0, marginTop: 1, fontSize: 10, fontWeight: 700, color: '#c4b5fd', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--font-geist-mono), monospace' }}>{a.name}</span>
                    <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>{a.desc}</p>
                  </div>
                ))}
              </div>
            </RefSection>

            {/* SQL Reference */}
            <RefSection C={C} icon={<Terminal style={{ width: 13, height: 13, color: C.textMuted }} />} label="SQL Reference">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SQL_SNIPPETS.map((snip) => (
                  <div key={snip.label} style={{ background: C.bgSub, border: `1px solid ${C.border}`, borderRadius: 7, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textMuted }}>{snip.label}</span>
                      <button onClick={() => navigator.clipboard.writeText(snip.sql)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 2, display: 'flex', borderRadius: 3 }}
                        onMouseEnter={e => e.currentTarget.style.color = C.textPrimary}
                        onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
                        <Copy style={{ width: 11, height: 11 }} />
                      </button>
                    </div>
                    <pre style={{ margin: 0, padding: '8px 10px', fontFamily: 'var(--font-geist-mono), monospace', fontSize: 11, color: '#4ade80', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{snip.sql}</pre>
                  </div>
                ))}
              </div>
            </RefSection>

            {/* Field Weights */}
            <RefSection C={C} icon={<Info style={{ width: 13, height: 13, color: '#60a5fa' }} />} label="Field Weights">
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 11, color: '#93c5fd', lineHeight: 1.6, marginBottom: 8 }}>
                  Boosts are <strong>optional</strong>. Omit a value to use default weighting. Setting <code style={{ fontFamily: 'var(--font-geist-mono), monospace', fontWeight: 700 }}>title 2.0</code> makes title matches score twice as high as unweighted fields.
                </p>
                <code style={{ display: 'block', fontFamily: 'var(--font-geist-mono), monospace', fontSize: 11, color: '#93c5fd' }}>MATCH((title 2.0, description), ?)</code>
              </div>
            </RefSection>

          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateFTSIndexDialog onClose={() => setShowCreateDialog(false)} onSuccess={() => { setShowCreateDialog(false); refreshIndexes(); }} />
      )}
      {showScheduleManager && selectedIndex && (
        <RefreshScheduleManager schema={selectedIndex.schema} table={selectedIndex.table} onClose={() => setShowScheduleManager(false)} />
      )}

      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}

// ─── Small layout helpers ──────────────────────────────────────────────────────
type FC_colors = {
  border: string; accentBg: string; accentBorder: string; accentText: string;
  textSecondary: string; textPrimary: string; borderSub: string;
};

function FBtn({ icon, label, onClick, disabled, accent, C }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; accent?: boolean; C: FC_colors;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: accent ? 700 : 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, border: `1px solid ${accent ? C.accentBorder : C.border}`, background: accent ? C.accentBg : 'rgba(148,163,184,0.05)', color: accent ? C.accentText : C.textSecondary, transition: 'all 0.1s' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = accent ? 'rgba(124,58,237,0.22)' : 'rgba(148,163,184,0.10)'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = accent ? C.accentBg : 'rgba(148,163,184,0.05)'; }}>
      {icon}{label}
    </button>
  );
}

function SnippetForm({ C, label, code, desc, onLabel, onCode, onDesc, onSave, onCancel }: {
  C: FC_colors & { bgInput: string; textPrimary: string; borderFocus: string; border: string };
  label: string; code: string; desc: string;
  onLabel: (v: string) => void; onCode: (v: string) => void; onDesc: (v: string) => void;
  onSave: () => void; onCancel: () => void;
}) {
  const inp: React.CSSProperties = {
    width: '100%', background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.textPrimary, fontSize: 11, padding: '5px 8px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'var(--font-geist-mono), monospace',
  };
  return (
    <div style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 7, padding: '10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input placeholder="Label  e.g. My error search" value={label} onChange={e => onLabel(e.target.value)} style={inp}
        onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
        onBlur={e => e.currentTarget.style.borderColor = C.border} />
      <input placeholder="Query  e.g. +error -warning" value={code} onChange={e => onCode(e.target.value)} style={inp}
        onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
        onBlur={e => e.currentTarget.style.borderColor = C.border} />
      <input placeholder="Description (optional)" value={desc} onChange={e => onDesc(e.target.value)} style={inp}
        onFocus={e => e.currentTarget.style.borderColor = C.borderFocus}
        onBlur={e => e.currentTarget.style.borderColor = C.border} />
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onSave} disabled={!label.trim() || !code.trim()}
          style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: `1px solid ${C.accentBorder}`, background: C.accentBg, color: C.accentText, fontSize: 11, fontWeight: 700, cursor: !label.trim() || !code.trim() ? 'not-allowed' : 'pointer', opacity: !label.trim() || !code.trim() ? 0.45 : 1 }}>
          Save
        </button>
        <button onClick={onCancel}
          style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function RefSection({ icon, label, children, C }: { icon: React.ReactNode; label: string; children: React.ReactNode; C: FC_colors }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingBottom: 8, marginBottom: 10, borderBottom: `1px solid ${C.borderSub}` }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

