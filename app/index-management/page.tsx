'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database,
  Plus,
  RefreshCw,
  Trash2,
  Info,
  Search,
  Filter,
  Zap,
  Table,
  Clock,
  HardDrive,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useSchemaMetadata } from '../lib/hooks/useSchemaMetadata';
import { useToast } from '../components/ToastContext';
import CreateIndexDialog from '../components/index/CreateIndexDialog';

interface IndexInfo {
  schema: string;
  table: string;
  indexName: string;
  columns: string[];
  indexType: string;
  isUnique: boolean;
  isPrimary: boolean;
  method: string;
}

export default function IndexManagementPage() {
  const router = useRouter();
  const activeConnection = useActiveConnection();
  const { schemas } = useSchemaMetadata();
  const { success, error: showError } = useToast();

  const [indexes, setIndexes] = useState<IndexInfo[]>([]);
  const [filteredIndexes, setFilteredIndexes] = useState<IndexInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'btree' | 'hash' | 'gist' | 'gin'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('');

  useEffect(() => {
    if (!activeConnection) {
      showError('No Connection', 'Please connect to a database first');
      router.push('/');
      return;
    }
    fetchIndexes();
  }, [activeConnection]);

  useEffect(() => {
    filterIndexes();
  }, [indexes, searchTerm, filterType]);

  const fetchIndexes = async () => {
    if (!activeConnection) return;

    setLoading(true);
    try {
      // Query to get all indexes from information_schema
      const query = `
        SELECT
          t.table_schema,
          t.table_name,
          i.indexname as index_name,
          i.indexdef
        FROM pg_indexes i
        JOIN information_schema.tables t
          ON t.table_name = i.tablename
          AND t.table_schema = i.schemaname
        WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema', 'sys')
        ORDER BY t.table_schema, t.table_name, i.indexname
      `;

      const result = await activeConnection.client.query(query);

      const indexList: IndexInfo[] = result.rows.map((row: any[]) => {
        const schema = row[0];
        const table = row[1];
        const indexName = row[2];
        const indexDef = row[3] || '';

        // Parse index definition to extract details
        const isUnique = indexDef.toLowerCase().includes('unique');
        const isPrimary = indexName.toLowerCase().includes('_pkey');

        // Extract method (btree, hash, gist, gin)
        let method = 'btree';
        if (indexDef.toLowerCase().includes('using hash')) method = 'hash';
        else if (indexDef.toLowerCase().includes('using gist')) method = 'gist';
        else if (indexDef.toLowerCase().includes('using gin')) method = 'gin';

        // Extract columns from index definition
        const columnsMatch = indexDef.match(/\((.*?)\)/);
        const columns = columnsMatch ? columnsMatch[1].split(',').map((c: string) => c.trim()) : [];

        return {
          schema,
          table,
          indexName,
          columns,
          indexType: isPrimary ? 'PRIMARY KEY' : isUnique ? 'UNIQUE' : 'INDEX',
          isUnique,
          isPrimary,
          method
        };
      });

      setIndexes(indexList);
    } catch (err: any) {
      console.error('Failed to fetch indexes:', err);
      showError('Failed to Load Indexes', err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterIndexes = () => {
    let filtered = indexes;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(idx =>
        idx.indexName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idx.table.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idx.columns.some(col => col.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(idx => idx.method === filterType);
    }

    setFilteredIndexes(filtered);
  };

  const handleDeleteIndex = async (indexInfo: IndexInfo) => {
    if (indexInfo.isPrimary) {
      showError('Cannot Delete', 'Primary key indexes cannot be deleted');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to drop index "${indexInfo.indexName}" on table "${indexInfo.schema}.${indexInfo.table}"?`
    );

    if (!confirmed) return;

    try {
      await activeConnection?.client.query(
        `DROP INDEX ${indexInfo.schema}.${indexInfo.indexName}`
      );
      success('Index Dropped', `Successfully dropped index ${indexInfo.indexName}`);
      fetchIndexes();
    } catch (err: any) {
      console.error('Failed to drop index:', err);
      showError('Failed to Drop Index', err.message);
    }
  };

  const getIndexTypeColor = (indexInfo: IndexInfo) => {
    if (indexInfo.isPrimary) return 'text-purple-600 bg-purple-100 border-purple-300';
    if (indexInfo.isUnique) return 'text-blue-600 bg-blue-100 border-blue-300';
    return 'text-gray-600 bg-gray-100 border-gray-300';
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'btree': return <Database className="h-4 w-4" />;
      case 'hash': return <Zap className="h-4 w-4" />;
      case 'gist': return <TrendingUp className="h-4 w-4" />;
      case 'gin': return <Search className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  // Calculate statistics
  const totalIndexes = indexes.length;
  const primaryKeys = indexes.filter(idx => idx.isPrimary).length;
  const uniqueIndexes = indexes.filter(idx => idx.isUnique && !idx.isPrimary).length;
  const regularIndexes = indexes.filter(idx => !idx.isUnique && !idx.isPrimary).length;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Index Management
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create, view, and manage database indexes for optimal query performance
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchIndexes}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Index
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:border-gray-700 dark:from-blue-900/20 dark:to-blue-800/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Indexes</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalIndexes}</p>
              </div>
              <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-purple-50 to-purple-100 p-4 dark:border-gray-700 dark:from-purple-900/20 dark:to-purple-800/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Primary Keys</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{primaryKeys}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-green-50 to-green-100 p-4 dark:border-gray-700 dark:from-green-900/20 dark:to-green-800/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unique Indexes</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{uniqueIndexes}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:border-gray-700 dark:from-gray-700 dark:to-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Regular Indexes</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{regularIndexes}</p>
              </div>
              <HardDrive className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search indexes, tables, or columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Methods</option>
              <option value="btree">B-Tree</option>
              <option value="hash">Hash</option>
              <option value="gist">GiST</option>
              <option value="gin">GIN</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredIndexes.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-gray-500">
            <Database className="h-16 w-16 opacity-50" />
            <p className="mt-4 text-lg font-medium">No indexes found</p>
            <p className="text-sm">Create an index to improve query performance</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredIndexes.map((idx, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {getMethodIcon(idx.method)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                            {idx.indexName}
                          </h3>
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getIndexTypeColor(idx)}`}>
                            {idx.indexType}
                          </span>
                          <span className="rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {idx.method.toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Table className="h-3 w-3" />
                          <span className="font-mono">{idx.schema}.{idx.table}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {idx.columns.map((col, j) => (
                            <span
                              key={j}
                              className="rounded bg-blue-100 px-2 py-0.5 text-xs font-mono text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            >
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!idx.isPrimary && (
                      <button
                        onClick={() => handleDeleteIndex(idx)}
                        className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-600 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                        title="Drop index"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="border-t border-gray-200 bg-blue-50 p-4 dark:border-gray-700 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-semibold">Index Performance Tips:</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>Use B-Tree indexes for most general-purpose queries (default)</li>
              <li>Use Hash indexes for exact equality comparisons only</li>
              <li>Use GiST indexes for geometric data and full-text search</li>
              <li>Use GIN indexes for array and JSONB columns</li>
              <li>Create indexes on columns used frequently in WHERE, JOIN, and ORDER BY clauses</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Index Dialog */}
      {showCreateDialog && (
        <CreateIndexDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            fetchIndexes();
          }}
        />
      )}
    </div>
  );
}
