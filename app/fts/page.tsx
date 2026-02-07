'use client';

import { useState } from 'react';
import {
  Search,
  Database,
  Plus,
  Code,
  TrendingUp,
  BookOpen,
  Zap,
  Settings,
  Copy,
  Play,
  CheckCircle,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import SchemaSelector from '../components/common/SchemaSelector';

interface SearchResult {
  [key: string]: any;
  _score?: number;
}

export default function FullTextSearchPage() {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  // Index creation state
  const [showIndexCreator, setShowIndexCreator] = useState(false);
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<string[]>(['']);
  const [indexName, setIndexName] = useState('');
  const [analyzer, setAnalyzer] = useState('english');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  // Search state
  const [searchTable, setSearchTable] = useState('');
  const [searchColumns, setSearchColumns] = useState('content');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [executionTime, setExecutionTime] = useState(0);

  // Field boosting
  const [boostingEnabled, setBoostingEnabled] = useState(false);
  const [fieldBoosts, setFieldBoosts] = useState<Record<string, number>>({});

  // BM25 parameters
  const [showBM25Tuning, setShowBM25Tuning] = useState(false);
  const [k1Parameter, setK1Parameter] = useState(1.2);
  const [bParameter, setBParameter] = useState(0.75);

  const analyzers = [
    { value: 'standard', label: 'Standard' },
    { value: 'english', label: 'English' },
    { value: 'german', label: 'German' },
    { value: 'french', label: 'French' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'arabic', label: 'Arabic' },
    { value: 'keyword', label: 'Keyword (No tokenization)' },
  ];

  const handleAddColumn = () => {
    setColumns([...columns, '']);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index: number, value: string) => {
    const newColumns = [...columns];
    newColumns[index] = value;
    setColumns(newColumns);
  };

  const generateIndexCreationSQL = () => {
    const validColumns = columns.filter((c) => c.trim() !== '');
    if (validColumns.length === 0) return '';

    if (validColumns.length === 1) {
      // Single column index
      return `CREATE TABLE ${tableName} (
  id INTEGER PRIMARY KEY,
  ${validColumns[0]} TEXT INDEX USING FULLTEXT WITH (analyzer = '${analyzer}')
);`;
    } else {
      // Composite index
      return `CREATE TABLE ${tableName} (
  id INTEGER PRIMARY KEY,
  ${validColumns.map((col) => `${col} TEXT`).join(',\n  ')},
  INDEX ${indexName || 'ft_idx'} USING FULLTEXT (${validColumns.join(', ')}) WITH (analyzer = '${analyzer}')
);`;
    }
  };

  const generateSearchSQL = () => {
    if (!searchTable || !searchColumns || !searchTerm) return '';

    let matchClause = '';
    if (boostingEnabled && Object.keys(fieldBoosts).length > 0) {
      // Build boosted match clause
      const boostedFields = Object.entries(fieldBoosts)
        .map(([field, boost]) => `${field} ${boost}`)
        .join(', ');
      matchClause = `MATCH((${boostedFields}), ?)`;
    } else {
      matchClause = `MATCH(${searchColumns}, ?)`;
    }

    return `SELECT *, _score
FROM ${searchTable}
WHERE ${matchClause}
ORDER BY _score DESC
LIMIT 50;`;
  };

  const handleSearch = async () => {
    if (!activeConnection || !searchTable || !searchTerm) {
      toast.error('Missing Fields', 'Please fill in all search fields and ensure you are connected');
      return;
    }

    setSearching(true);
    setSearchResults([]);

    try {
      const sql = generateSearchSQL();
      const startTime = performance.now();

      const result = await activeConnection.client.query(sql, [searchTerm]);

      const endTime = performance.now();
      setExecutionTime(endTime - startTime);

      if (result && result.rows) {
        setSearchResults(result.rows);
        toast.success('Search Complete', `Found ${result.rows.length} results in ${(endTime - startTime).toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search Failed', (error as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const copySQL = (sql: string) => {
    navigator.clipboard.writeText(sql);
    toast.success('SQL Copied', 'Query copied to clipboard');
  };

  const handleCopyTemplate = (template: string, templateName: string) => {
    navigator.clipboard.writeText(template);
    setCopiedTemplate(templateName);
    toast.success('Template Copied', 'SQL template copied to clipboard');
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <Database className="mx-auto h-20 w-20 text-blue-600 dark:text-blue-400" />
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
            No Active Connection
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Connect to MonkDB to use Full-Text Search features
          </p>
          <a
            href="/connections"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Manage Connections
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Full-Text Search (FTS)
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                BM25-based full-text search with inverted index and relevance scoring
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Schema Selector */}
            <SchemaSelector />

            {/* Connection Status */}
            <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 dark:border-green-900/50 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Connected
              </span>
            </div>
            <button
              onClick={() => setShowIndexCreator(!showIndexCreator)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              Create Index
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-4">
          {/* Setup Instructions */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
              <AlertTriangle className="h-4 w-4" />
              Full-Text Search Requirements
            </h3>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
              <p><strong>To use full-text search, you need:</strong></p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>A table with TEXT columns for searchable content</li>
                <li>Create a FULLTEXT index on the columns you want to search</li>
                <li>Use the <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">MATCH()</code> function in WHERE clause</li>
                <li>MonkDB uses <strong>BM25 ranking</strong> algorithm with <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">_score</code> for relevance</li>
                <li>Supports multiple analyzers: english, german, french, spanish, arabic, standard, keyword</li>
              </ol>
              <p className="mt-2 border-t border-blue-300 pt-2 dark:border-blue-700">
                <strong>Example:</strong> <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">CREATE TABLE docs (id INTEGER, content TEXT INDEX USING FULLTEXT WITH (analyzer = 'english'))</code>
              </p>
            </div>
          </div>

        {/* BM25 Info Card */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300">
                About BM25 Ranking
              </h3>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-400">
                MonkDB uses <strong>Okapi BM25</strong> (Best Matching 25) with <strong>Inverted Index (IVF)</strong> for probabilistic ranking.
                Documents are scored based on term frequency, inverse document frequency, and document length normalization.
              </p>
              <div className="mt-2 flex gap-4 text-xs text-blue-700 dark:text-blue-500">
                <span>Default k₁: {k1Parameter} (term saturation)</span>
                <span>Default b: {bParameter} (length normalization)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Index Creator */}
        {showIndexCreator && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Database className="h-5 w-5 text-blue-600" />
              Create Fulltext Index
            </h2>

            <div className="space-y-4">
              {/* Table Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Table Name
                </label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="example_table"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {/* Columns */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Columns (TEXT type)
                  </label>
                  <button
                    onClick={handleAddColumn}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <Plus className="h-4 w-4" />
                    Add Column
                  </button>
                </div>
                {columns.map((col, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={col}
                      onChange={(e) => handleColumnChange(idx, e.target.value)}
                      placeholder="column_name"
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                    {columns.length > 1 && (
                      <button
                        onClick={() => handleRemoveColumn(idx)}
                        className="rounded-lg bg-red-100 px-3 py-2 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Index Name (for composite) */}
              {columns.filter((c) => c.trim()).length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Index Name (for composite index)
                  </label>
                  <input
                    type="text"
                    value={indexName}
                    onChange={(e) => setIndexName(e.target.value)}
                    placeholder="ft_idx"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Analyzer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Analyzer
                </label>
                <select
                  value={analyzer}
                  onChange={(e) => setAnalyzer(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  {analyzers.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Generated SQL */}
              {tableName && columns.some((c) => c.trim()) && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Generated SQL
                    </label>
                    <button
                      onClick={() => copySQL(generateIndexCreationSQL())}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-green-400">
                    {generateIndexCreationSQL()}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Interface */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Search className="h-5 w-5 text-blue-600" />
            Search Interface
          </h2>

          <div className="space-y-4">
            {/* Table Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Table Name
                </label>
                <input
                  type="text"
                  value={searchTable}
                  onChange={(e) => setSearchTable(e.target.value)}
                  placeholder="my_table"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Column(s) to Search
                </label>
                <input
                  type="text"
                  value={searchColumns}
                  onChange={(e) => setSearchColumns(e.target.value)}
                  placeholder="content or title, description"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Search Term */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Search Query
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="AI machine learning"
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {searching ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Search
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Field Boosting */}
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="boosting"
                  checked={boostingEnabled}
                  onChange={(e) => setBoostingEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="boosting" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Field Boosting
                </label>
              </div>
              {boostingEnabled && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-gray-500">
                    Example: title=2.0 (double weight), description=1.0 (normal weight)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Field name"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Boost"
                      className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Generated SQL */}
            {searchTable && searchColumns && searchTerm && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Generated Query
                  </label>
                  <button
                    onClick={() => copySQL(generateSearchSQL())}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-green-400">
                  {generateSearchSQL()}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Search Results ({searchResults.length})
              </h2>
              <span className="text-sm text-gray-500">
                Executed in {executionTime.toFixed(2)}ms
              </span>
            </div>

            <div className="space-y-3">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Result #{idx + 1}
                    </span>
                    {result._score !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Relevance Score:</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className="h-full bg-blue-600"
                              style={{ width: `${Math.min(result._score * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-blue-600">
                            {result._score.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <pre className="overflow-x-auto text-xs text-gray-700 dark:text-gray-300">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SQL Templates */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            SQL Query Templates (Replace placeholders)
          </h3>

          <div className="space-y-3">
            {/* Basic FTS Template */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Basic Full-Text Search
                </p>
                <button
                  onClick={() => handleCopyTemplate(
                    `-- Basic full-text search\n-- Replace 'your_schema.your_table' and column names with actual values\nSELECT id, title, content, _score\nFROM your_schema.your_table\nWHERE MATCH(content, 'AI machine learning')\nORDER BY _score DESC\nLIMIT 10;`,
                    'basic'
                  )}
                  className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {copiedTemplate === 'basic' ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-900">
                <code className="text-gray-800 dark:text-gray-200">
{`-- Basic full-text search
-- Replace 'your_schema.your_table' and column names with actual values
SELECT id, title, content, _score
FROM your_schema.your_table
WHERE MATCH(content, 'AI machine learning')
ORDER BY _score DESC
LIMIT 10;`}
                </code>
              </pre>
            </div>

            {/* Multi-Field Boosting Template */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Multi-Field Search with Boosting
                </p>
                <button
                  onClick={() => handleCopyTemplate(
                    `-- Multi-field search with field boosting\nSELECT id, title, description, _score\nFROM your_schema.your_table\nWHERE MATCH((title 2.0, description), 'smartphone')\nORDER BY _score DESC;`,
                    'boosting'
                  )}
                  className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {copiedTemplate === 'boosting' ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-900">
                <code className="text-gray-800 dark:text-gray-200">
{`-- Multi-field search with field boosting
SELECT id, title, description, _score
FROM your_schema.your_table
WHERE MATCH((title 2.0, description), 'smartphone')
ORDER BY _score DESC;`}
                </code>
              </pre>
            </div>

            {/* Index Creation Template */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Composite Fulltext Index Creation
                </p>
                <button
                  onClick={() => handleCopyTemplate(
                    `-- Create table with composite FULLTEXT index\nCREATE TABLE your_schema.your_table (\n  id INTEGER PRIMARY KEY,\n  title TEXT,\n  description TEXT,\n  INDEX title_desc_ft USING FULLTEXT (title, description)\n  WITH (analyzer = 'english')\n);`,
                    'index'
                  )}
                  className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {copiedTemplate === 'index' ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-900">
                <code className="text-gray-800 dark:text-gray-200">
{`-- Create table with composite FULLTEXT index
CREATE TABLE your_schema.your_table (
  id INTEGER PRIMARY KEY,
  title TEXT,
  description TEXT,
  INDEX title_desc_ft USING FULLTEXT (title, description)
  WITH (analyzer = 'english')
);`}
                </code>
              </pre>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="text-xs text-blue-800 dark:text-blue-400">
              <strong>Note:</strong> Replace <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">your_schema.your_table</code> with your actual table name.
              Choose the appropriate analyzer for your language (english, german, french, spanish, arabic, standard, keyword).
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
