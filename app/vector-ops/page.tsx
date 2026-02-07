'use client';

import { useState, useEffect } from 'react';
import {
  Search, Target, Database, AlertCircle, CheckCircle, Copy, Check, AlertTriangle,
  TrendingUp, Activity, Clock, FileText, Download, Filter, Bookmark, History,
  Zap, ArrowLeft, Settings, BarChart3, Grid3x3
} from 'lucide-react';
import Link from 'next/link';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import VectorSearchPanel from '../components/vector/VectorSearchPanel';
import VectorSimilarityPanel from '../components/vector/VectorSimilarityPanel';
import VectorIndexManager from '../components/vector/VectorIndexManager';
import SchemaSelector from '../components/common/SchemaSelector';

type TabType = 'search' | 'similarity' | 'indexes' | 'analytics' | 'saved';

interface VectorStats {
  totalSearches: number;
  avgQueryTime: number;
  totalResults: number;
  cacheHitRate: number;
  activeIndexes: number;
}

export default function VectorOperationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const activeConnection = useActiveConnection();
  const toast = useToast();
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [stats, setStats] = useState<VectorStats>({
    totalSearches: 0,
    avgQueryTime: 0,
    totalResults: 0,
    cacheHitRate: 0,
    activeIndexes: 0
  });

  // Track search activity
  useEffect(() => {
    const updateStats = () => {
      // Simulated stats - in production, fetch from backend
      setStats({
        totalSearches: Math.floor(Math.random() * 1000) + 500,
        avgQueryTime: Math.random() * 100 + 50,
        totalResults: Math.floor(Math.random() * 10000) + 5000,
        cacheHitRate: Math.random() * 30 + 70,
        activeIndexes: Math.floor(Math.random() * 5) + 3
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 10000);
    return () => clearInterval(interval);
  }, []);

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
      gradient: 'from-blue-600 to-cyan-600'
    },
    {
      id: 'similarity' as TabType,
      label: 'Similarity Search',
      icon: Target,
      description: 'Search by similarity threshold',
      gradient: 'from-purple-600 to-pink-600'
    },
    {
      id: 'indexes' as TabType,
      label: 'Index Management',
      icon: Database,
      description: 'Manage HNSW vector indexes',
      gradient: 'from-green-600 to-teal-600'
    },
    {
      id: 'analytics' as TabType,
      label: 'Analytics',
      icon: BarChart3,
      description: 'Search performance and usage analytics',
      gradient: 'from-orange-600 to-red-600'
    },
    {
      id: 'saved' as TabType,
      label: 'Saved Queries',
      icon: Bookmark,
      description: 'Manage saved vector search queries',
      gradient: 'from-indigo-600 to-purple-600'
    },
  ];

  // Show no connection state
  if (!activeConnection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex h-screen items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border-2 border-dashed border-gray-300 bg-white/90 backdrop-blur-sm p-12 text-center dark:border-gray-700 dark:bg-gray-800/90 shadow-2xl">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
              <Database className="h-12 w-12 text-white" />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
              No Active Connection
            </h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Please connect to a MonkDB database to use enterprise vector operations.
            </p>
            <Link
              href="/connections"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:from-purple-700 hover:to-pink-700 hover:shadow-xl transition-all"
            >
              <Database className="h-4 w-4" />
              Manage Connections
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Back to Dashboard</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Enterprise Vector Operations
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AI-powered semantic search with vector embeddings
                  </p>
                </div>
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
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all text-sm font-medium">
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Searches</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSearches.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border-2 border-green-500 dark:border-green-600 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-green-700 dark:text-green-400 font-semibold">Avg Query Time</div>
                <div className="text-2xl font-bold text-green-800 dark:text-green-300">{stats.avgQueryTime.toFixed(1)}ms</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Results</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalResults.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.cacheHitRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Indexes</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeIndexes}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-6 pb-8">
        <div className="space-y-6">
          {/* Setup Instructions */}
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-3">
                  Enterprise Vector Search Requirements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
                  <div className="bg-white/50 dark:bg-gray-900/30 rounded-lg p-4">
                    <p className="font-semibold mb-2">📊 Data Requirements:</p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Table with <code className="rounded bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5">FLOAT_VECTOR</code> column</li>
                      <li>Vector embeddings (384-1536 dimensions)</li>
                      <li>Normalized vectors (L2 norm = 1)</li>
                    </ul>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-900/30 rounded-lg p-4">
                    <p className="font-semibold mb-2">⚡ Performance Tips:</p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Create HNSW indexes for faster searches</li>
                      <li>Use batch operations for multiple queries</li>
                      <li>Enable query caching for repeated searches</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Tabs */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm overflow-hidden shadow-2xl">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
              <nav className="flex space-x-2 p-4 overflow-x-auto" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`group flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg shadow-${tab.gradient.split('-')[1]}-500/50`
                          : 'text-gray-600 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                      <span>{tab.label}</span>
                      {isActive && (
                        <span className="ml-1 flex h-2 w-2">
                          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Tab Description */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {tabs.find((t) => t.id === activeTab)?.description}
                  </p>
                </div>
                {activeTab === 'search' && (
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all text-sm font-medium">
                      <History className="h-4 w-4" />
                      History
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all text-sm font-semibold shadow-lg">
                      <Download className="h-4 w-4" />
                      Export Results
                    </button>
                  </div>
                )}
              </div>

              {/* Tab Panels */}
              {activeTab === 'search' && <VectorSearchPanel />}
              {activeTab === 'similarity' && <VectorSimilarityPanel />}
              {activeTab === 'indexes' && <VectorIndexManager />}
              {activeTab === 'analytics' && (
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Analytics Dashboard Coming Soon
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track search performance, usage patterns, and optimization insights
                  </p>
                </div>
              )}
              {activeTab === 'saved' && (
                <div className="text-center py-12">
                  <Bookmark className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Saved Queries Coming Soon
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Save and reuse your favorite vector search queries
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SQL Templates Reference */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  SQL Query Templates
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Copy and customize these templates for your vector operations
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* KNN Search Template */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                      KNN Search
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyTemplate(
                      `-- Find K nearest neighbors\nSELECT id, content, _score\nFROM your_schema.your_table\nWHERE knn_match(embedding, ?, ?)\nORDER BY _score DESC;`,
                      'knn'
                    )}
                    className="flex items-center gap-1.5 rounded-lg bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  >
                    {copiedTemplate === 'knn' ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs">
                  <code className="text-gray-100">
{`SELECT id, content, _score
FROM your_schema.your_table
WHERE knn_match(embedding, ?, ?)
ORDER BY _score DESC;`}
                  </code>
                </pre>
              </div>

              {/* Similarity Search Template */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <p className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                      Similarity Search
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyTemplate(
                      `-- Find vectors above similarity threshold\nSELECT id, content, vector_similarity(embedding, ?) AS similarity\nFROM your_schema.your_table\nWHERE vector_similarity(embedding, ?) >= ?\nORDER BY similarity DESC\nLIMIT ?;`,
                      'similarity'
                    )}
                    className="flex items-center gap-1.5 rounded-lg bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 transition-all hover:bg-purple-50 dark:hover:bg-purple-900/30"
                  >
                    {copiedTemplate === 'similarity' ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs">
                  <code className="text-gray-100">
{`SELECT id, content,
  vector_similarity(embedding, ?) AS similarity
FROM your_schema.your_table
WHERE vector_similarity(embedding, ?) >= ?
ORDER BY similarity DESC LIMIT ?;`}
                  </code>
                </pre>
              </div>

              {/* Create Index Template */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-semibold text-green-900 dark:text-green-300">
                      Create HNSW Index
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyTemplate(
                      `-- Create HNSW vector index\nCREATE INDEX idx_embedding_hnsw\nON your_schema.your_table (embedding)\nUSING HNSW\nWITH (\n  m = 16,\n  ef_construction = 200,\n  ef_search = 100\n);`,
                      'index'
                    )}
                    className="flex items-center gap-1.5 rounded-lg bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 transition-all hover:bg-green-50 dark:hover:bg-green-900/30"
                  >
                    {copiedTemplate === 'index' ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs">
                  <code className="text-gray-100">
{`CREATE INDEX idx_embedding_hnsw
ON your_schema.your_table (embedding)
USING HNSW WITH (
  m = 16,
  ef_construction = 200,
  ef_search = 100
);`}
                  </code>
                </pre>
              </div>

              {/* Batch Search Template */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <p className="text-sm font-semibold text-orange-900 dark:text-orange-300">
                      Batch Search
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyTemplate(
                      `-- Batch vector search with multiple queries\nWITH query_vectors AS (\n  SELECT unnest(?) as query_vec\n)\nSELECT t.id, t.content, knn_match(t.embedding, q.query_vec, 10) as score\nFROM your_schema.your_table t\nCROSS JOIN query_vectors q\nORDER BY score DESC;`,
                      'batch'
                    )}
                    className="flex items-center gap-1.5 rounded-lg bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-700 px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 transition-all hover:bg-orange-50 dark:hover:bg-orange-900/30"
                  >
                    {copiedTemplate === 'batch' ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs">
                  <code className="text-gray-100">
{`WITH query_vectors AS (
  SELECT unnest(?) as query_vec
)
SELECT t.id, t.content,
  knn_match(t.embedding, q.query_vec, 10)
FROM your_table t
CROSS JOIN query_vectors q;`}
                  </code>
                </pre>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-semibold mb-2">💡 Pro Tips:</p>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li>Replace <code className="rounded bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5">your_schema.your_table</code> with actual table names</li>
                    <li>Vector dimensions must match your embedding model (384 for sentence-transformers, 1536 for OpenAI)</li>
                    <li>Use HNSW indexes for 10-100x faster searches on large datasets (&gt;100K vectors)</li>
                    <li>Batch operations can process multiple queries efficiently with a single database roundtrip</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
