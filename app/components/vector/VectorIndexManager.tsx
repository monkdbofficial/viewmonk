'use client';

import { useState, useEffect } from 'react';
import { Database, AlertCircle, X, ChevronDown, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';

interface VectorIndex {
  schema: string;
  table: string;
  column: string;
  indexName: string;
  indexType: string;
  parameters?: {
    m?: number;
    efConstruction?: number;
    efSearch?: number;
  };
  stats?: {
    numVectors?: number;
    dimensions?: number;
    size?: string;
  };
}

export default function VectorIndexManager() {
  const client = useMonkDBClient();
  const [indexes, setIndexes] = useState<VectorIndex[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      loadIndexes();
    }
  }, [client]);

  const loadIndexes = async () => {
    if (!client) return;

    setLoading(true);
    setError(null);

    try {
      // MonkDB doesn't expose index metadata via information_schema.indexes
      // Instead, we'll check for tables with FLOAT_VECTOR columns which indicate vector capability
      const query = `
        SELECT
          table_schema,
          table_name,
          column_name,
          data_type
        FROM information_schema.columns
        WHERE data_type LIKE '%float_vector%'
        ORDER BY table_schema, table_name, column_name
      `;

      const response = await client.query(query);

      // Transform results - each vector column represents a potential vector search capability
      const indexList: VectorIndex[] = response.rows.map((row) => ({
        schema: row[0],
        table: row[1],
        column: row[2],
        indexName: `${row[1]}_${row[2]}_vector`, // Synthetic index name
        indexType: 'Vector Column', // MonkDB handles vector operations automatically
      }));

      setIndexes(indexList);
    } catch (err) {
      // If the query fails, show a helpful message
      console.error('Failed to load vector columns:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vector columns');
      setIndexes([]);
    } finally {
      setLoading(false);
    }
  };

  // Note: MonkDB doesn't support CREATE INDEX for vectors
  // Vector operations (knn_match, vector_similarity) work automatically on FLOAT_VECTOR columns
  // This function is kept for reference but is no longer actively used

  // Note: MonkDB doesn't support DROP INDEX for vectors
  // Vector columns are regular table columns and can only be removed via ALTER TABLE
  // This function is kept for reference but is no longer actively used

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Vector Columns
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View tables with FLOAT_VECTOR columns. MonkDB automatically optimizes vector operations.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadIndexes}
            disabled={loading || !client}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={!client}
            className="flex items-center gap-2 rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700"
          >
            <AlertCircle className="h-4 w-4" />
            About Vector Search
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Error</p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Vector Search Information */}
      {showCreateForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              How Vector Search Works in MonkDB
            </h4>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                No Explicit Index Creation Required
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                MonkDB doesn't require explicit HNSW index creation. Vector operations like knn_match() and vector_similarity() work automatically on FLOAT_VECTOR columns.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Step 1: Create a Table with Vector Column
                </h5>
                <div className="rounded bg-gray-100 p-3 dark:bg-gray-900">
                  <code className="text-xs text-gray-800 dark:text-gray-200">
                    CREATE TABLE doc.documents (<br />
                    &nbsp;&nbsp;id TEXT PRIMARY KEY,<br />
                    &nbsp;&nbsp;content TEXT,<br />
                    &nbsp;&nbsp;embedding FLOAT_VECTOR(384)<br />
                    );
                  </code>
                </div>
              </div>

              <div>
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Step 2: Use Vector Search Functions
                </h5>
                <div className="rounded bg-gray-100 p-3 dark:bg-gray-900">
                  <code className="text-xs text-gray-800 dark:text-gray-200">
                    -- KNN Search<br />
                    SELECT id, content, _score<br />
                    FROM doc.documents<br />
                    WHERE knn_match(embedding, [0.1, 0.2, ...], 10)<br />
                    ORDER BY _score DESC;
                  </code>
                </div>
              </div>

              <div>
                <div className="rounded bg-gray-100 p-3 dark:bg-gray-900">
                  <code className="text-xs text-gray-800 dark:text-gray-200">
                    -- Similarity Search<br />
                    SELECT id, content, vector_similarity(embedding, [0.1, 0.2, ...]) AS similarity<br />
                    FROM doc.documents<br />
                    ORDER BY similarity DESC<br />
                    LIMIT 10;
                  </code>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                For more details, see the MonkDB vector search documentation
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Indexes List */}
      {loading && indexes.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12 dark:border-gray-700 dark:bg-gray-800">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : indexes.length > 0 ? (
        <div className="space-y-3">
          {indexes.map((index) => {
            const indexKey = `${index.schema}.${index.table}.${index.indexName}`;
            const isExpanded = expandedIndex === indexKey;

            return (
              <div
                key={indexKey}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex flex-1 items-center gap-3">
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? null : indexKey)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                    <Database className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {index.indexName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {index.schema}.{index.table} ({index.column})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {index.indexType}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Schema
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {index.schema}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Table
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {index.table}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Column
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {index.column}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No Vector Columns Found
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No tables with FLOAT_VECTOR columns were found. Create a table with a FLOAT_VECTOR column to enable vector search.
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Example: CREATE TABLE docs (id TEXT, embedding FLOAT_VECTOR(384))
          </p>
        </div>
      )}
    </div>
  );
}
