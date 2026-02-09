'use client';

import { useState } from 'react';
import { ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import { useMonkDBClient } from '../lib/monkdb-context';
import ConnectionPrompt from '../components/common/ConnectionPrompt';
import VectorCollectionBrowser from '../components/vector/VectorCollectionBrowser';
import VectorSearchPanel from '../components/vector/VectorSearchPanel';
import CreateVectorTableDialog from '../components/vector/CreateVectorTableDialog';
import DocumentUploadDialog from '../components/vector/DocumentUploadDialog';
import VectorStatsCards from '../components/vector/VectorStatsCards';
import VectorDebugPanel from '../components/vector/VectorDebugPanel';
import { VectorCollection } from '../hooks/useVectorCollections';

interface QueryHistoryItem {
  id: string;
  timestamp: number;
  collection: string;
  query: string;
  resultCount: number;
  executionTime: number;
}

export default function VectorOperationsPage() {
  const client = useMonkDBClient();
  const [selectedCollection, setSelectedCollection] = useState<VectorCollection | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);

  const handleAddToHistory = (query: {
    collection: string;
    query: string;
    resultCount: number;
    executionTime: number;
  }) => {
    const item: QueryHistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...query,
    };

    setQueryHistory((prev) => [item, ...prev].slice(0, 50));

    // Persist to localStorage
    try {
      const stored = localStorage.getItem('monkdb-vector-history') || '[]';
      const history = JSON.parse(stored);
      history.unshift(item);
      localStorage.setItem('monkdb-vector-history', JSON.stringify(history.slice(0, 50)));
    } catch (err) {
      console.error('Failed to save query history:', err);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Vector Operations
            </h1>
          </div>
          <ConnectionPrompt
            message="Connect to a database to use vector operations"
            onConnect={() => {}}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1800px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Vector Operations
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                AI-powered semantic search with vector embeddings
              </p>
            </div>
          </div>

          {selectedCollection && (
            <button
              onClick={() => setShowUploadDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Documents
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <VectorStatsCards />

        {/* Debug Panel */}
        <div className="mb-6">
          <VectorDebugPanel />
        </div>

        {/* Three-Column Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Collection Browser */}
          <div className="col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sticky top-6">
              <VectorCollectionBrowser
                selectedCollection={selectedCollection}
                onSelectCollection={setSelectedCollection}
                onCreateTable={() => setShowCreateDialog(true)}
              />
            </div>
          </div>

          {/* Middle: Search Panel */}
          <div className="col-span-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Search
              </h2>
              <VectorSearchPanel
                collection={selectedCollection}
                onAddToHistory={handleAddToHistory}
              />
            </div>
          </div>

          {/* Right: Query History */}
          <div className="col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sticky top-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Query History
              </h3>

              {queryHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No queries yet
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Execute a search to see history
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {queryHistory.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                          {item.collection}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 truncate mb-2">
                        {item.query}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                        <span>{item.resultCount} results</span>
                        <span>•</span>
                        <span>{item.executionTime}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateVectorTableDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            // Refresh collections list
            window.location.reload();
          }}
        />
      )}

      {showUploadDialog && selectedCollection && (
        <DocumentUploadDialog
          collection={selectedCollection}
          onClose={() => setShowUploadDialog(false)}
          onSuccess={() => {
            setShowUploadDialog(false);
            // Optionally refresh collection stats
          }}
        />
      )}
    </div>
  );
}
