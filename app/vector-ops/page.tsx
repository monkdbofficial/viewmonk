'use client';

import { useState } from 'react';
import { Search, Target, Database, AlertCircle, CheckCircle, Copy, Check, AlertTriangle } from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import VectorSearchPanel from '../components/vector/VectorSearchPanel';
import VectorSimilarityPanel from '../components/vector/VectorSimilarityPanel';
import VectorIndexManager from '../components/vector/VectorIndexManager';

type TabType = 'search' | 'similarity' | 'indexes';

export default function VectorOperationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const activeConnection = useActiveConnection();
  const toast = useToast();
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const handleCopyTemplate = (template: string, templateName: string) => {
    navigator.clipboard.writeText(template);
    setCopiedTemplate(templateName);
    toast.success('Template Copied', 'SQL template copied to clipboard');
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const tabs = [
    {
      id: 'search' as TabType,
      label: 'KNN Search',
      icon: Search,
      description: 'Find K nearest neighbors using vector embeddings',
    },
    {
      id: 'similarity' as TabType,
      label: 'Similarity Search',
      icon: Target,
      description: 'Search by similarity threshold',
    },
    {
      id: 'indexes' as TabType,
      label: 'Index Management',
      icon: Database,
      description: 'Manage HNSW vector indexes',
    },
  ];

  // Show no connection state
  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
            <Database className="h-10 w-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
            No Active Connection
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please connect to a MonkDB database to use vector operations.
          </p>
          <a
            href="/connections"
            className="mt-6 inline-block rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Search className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Vector Operations
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Perform vector search and similarity operations with MonkDB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 dark:border-green-900/50 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Connected
              </span>
            </div>
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
              Vector Search Requirements
            </h3>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
              <p><strong>To use vector search, you need:</strong></p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>A table with a <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">FLOAT_VECTOR</code> column for storing embeddings</li>
                <li>Vector embeddings generated from your data (use Sentence Transformers, OpenAI, or Cohere)</li>
                <li>Optional: HNSW index on the vector column for faster searches</li>
                <li>Use <strong>knn_match()</strong> for K-nearest neighbors or <strong>vector_similarity()</strong> for similarity threshold</li>
              </ol>
              <p className="mt-2 border-t border-blue-300 pt-2 dark:border-blue-700">
                <strong>Example:</strong> <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">CREATE TABLE docs (id INTEGER, content TEXT, embedding FLOAT_VECTOR(384))</code>
              </p>
            </div>
          </div>

        {/* Tabs */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-1 p-2" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="hidden md:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {/* Tab Description */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tabs.find((t) => t.id === activeTab)?.description}
              </p>
            </div>

            {/* Tab Panels */}
            {activeTab === 'search' && <VectorSearchPanel />}
            {activeTab === 'similarity' && <VectorSimilarityPanel />}
            {activeTab === 'indexes' && <VectorIndexManager />}
          </div>
        </div>

        {/* SQL Templates Reference */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            SQL Query Templates (Replace placeholders)
          </h3>

          <div className="space-y-3">
            {/* KNN Search Template */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  KNN Search
                </p>
                <button
                  onClick={() => handleCopyTemplate(
                    `-- Find K nearest neighbors\n-- Replace 'your_schema.your_table' and 'embedding' with actual names\nSELECT id, content, _score\nFROM your_schema.your_table\nWHERE knn_match(embedding, ?, ?)\nORDER BY _score DESC;`,
                    'knn'
                  )}
                  className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {copiedTemplate === 'knn' ? (
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
{`-- Find K nearest neighbors
-- Replace 'your_schema.your_table' and 'embedding' with actual names
SELECT id, content, _score
FROM your_schema.your_table
WHERE knn_match(embedding, ?, ?)
ORDER BY _score DESC;`}
                </code>
              </pre>
            </div>

            {/* Similarity Search Template */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Similarity Search
                </p>
                <button
                  onClick={() => handleCopyTemplate(
                    `-- Find vectors above similarity threshold\nSELECT id, content, vector_similarity(embedding, ?) AS similarity\nFROM your_schema.your_table\nWHERE vector_similarity(embedding, ?) >= ?\nORDER BY similarity DESC\nLIMIT ?;`,
                    'similarity'
                  )}
                  className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {copiedTemplate === 'similarity' ? (
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
{`-- Find vectors above similarity threshold
SELECT id, content, vector_similarity(embedding, ?) AS similarity
FROM your_schema.your_table
WHERE vector_similarity(embedding, ?) >= ?
ORDER BY similarity DESC
LIMIT ?;`}
                </code>
              </pre>
            </div>

            {/* Create Index Template */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Create HNSW Index
                </p>
                <button
                  onClick={() => handleCopyTemplate(
                    `-- Create HNSW vector index\nCREATE INDEX idx_your_table_embedding_hnsw\nON your_schema.your_table (embedding)\nUSING HNSW\nWITH (\n  m = 16,\n  ef_construction = 200,\n  ef_search = 100\n);`,
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
{`-- Create HNSW vector index
CREATE INDEX idx_your_table_embedding_hnsw
ON your_schema.your_table (embedding)
USING HNSW
WITH (
  m = 16,
  ef_construction = 200,
  ef_search = 100
);`}
                </code>
              </pre>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="text-xs text-blue-800 dark:text-blue-400">
              <strong>Note:</strong> Replace <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">your_schema.your_table</code> with your actual table name.
              Vector dimensions must match your embedding model (e.g., 384 for sentence-transformers, 1536 for OpenAI).
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
