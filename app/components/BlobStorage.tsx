'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Database, FolderOpen, Upload, Grid, List, Search, RefreshCw, Plus, Info, BookOpen, BarChart3, Trash2, MoreVertical, Trash, X, AlertTriangle, ChevronDown, Check } from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { BlobProvider, useBlobStorage } from '../lib/blob-context';
import BlobUploader from './blob/BlobUploader';
import BlobBrowser from './blob/BlobBrowser';
import BlobFilters, { BlobFilters as BlobFiltersType } from './blob/BlobFilters';
import CreateTableDialog from './blob/CreateTableDialog';
import MigrateTableDialog from './blob/MigrateTableDialog';

function BlobStorageContent() {
  const router = useRouter();
  const activeConnection = useActiveConnection();
  const {
    currentTable,
    setCurrentTable,
    currentFolder,
    setCurrentFolder,
    blobs,
    loading,
    loadBlobs,
    createMetadataTable,
    showTrashed,
    setShowTrashed,
    totalCount,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
  } = useBlobStorage();

  const [tables, setTables] = useState<string[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [showCreateTableDialog, setShowCreateTableDialog] = useState(false);
  const [showSupportedTypesModal, setShowSupportedTypesModal] = useState(false);
  const [showSqlGuideModal, setShowSqlGuideModal] = useState(false);
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<BlobFiltersType>({
    fileTypes: [],
    sizeMin: null,
    sizeMax: null,
    dateFrom: null,
    dateTo: null,
  });
  const [tableFeatures, setTableFeatures] = useState<Record<string, boolean>>({});
  const [showTableMenu, setShowTableMenu] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState('');

  // Check if table has enterprise features
  const checkTableFeatures = async (table: string): Promise<boolean> => {
    if (!activeConnection) return false;

    try {
      const metadataTable = `${table}_blob_metadata`;
      const sql = `SELECT column_name FROM information_schema.columns
        WHERE table_name = '${metadataTable}'
        AND table_schema = 'doc'
        AND column_name IN ('is_favorite', 'tags', 'deleted_at')`;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: sql }),
      });

      if (response.ok) {
        const data = await response.json();
        // If we found at least 2 of the 3 key columns, consider it enterprise-enabled
        return (data.rows && data.rows.length >= 2);
      }
    } catch (error) {
      console.error('[BlobStorage] Error checking table features:', error);
    }

    return false;
  };

  // Load actual blob metadata tables from database
  useEffect(() => {
    const loadBlobTables = async () => {
      if (!activeConnection) {
        setTables([]);
        return;
      }

      try {
        console.log('[BlobStorage] Loading actual blob metadata tables from database...');

        // Query to get all tables ending with _blob_metadata
        const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'doc' AND table_name LIKE '%_blob_metadata'`;

        const response = await fetch('/api/sql?t=' + Date.now(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
          body: JSON.stringify({ stmt: sql }),
          cache: 'no-store',
        });

        if (!response.ok) {
          console.error('[BlobStorage] Failed to load tables');
          setTables([]);
          return;
        }

        const data = await response.json();
        console.log('[BlobStorage] Tables query result:', data);

        // Extract base table names (remove _blob_metadata suffix)
        const tableNames = (data.rows || [])
          .map((row: any[]) => row[0]) // Get table_name from first column
          .filter((name: string) => name.endsWith('_blob_metadata'))
          .map((name: string) => name.replace('_blob_metadata', ''))
          .sort();

        console.log('[BlobStorage] Found blob tables:', tableNames);
        setTables(tableNames);

        // Check which tables have enterprise features
        const featuresMap: Record<string, boolean> = {};
        for (const table of tableNames) {
          featuresMap[table] = await checkTableFeatures(table);
        }
        setTableFeatures(featuresMap);
        console.log('[BlobStorage] Table enterprise features:', featuresMap);

        // Auto-select first table if none selected
        if (tableNames.length > 0 && !currentTable) {
          setCurrentTable(tableNames[0]);
        }
      } catch (error) {
        console.error('[BlobStorage] Error loading tables:', error);
        setTables([]);
      }
    };

    loadBlobTables();
  }, [activeConnection]);

  // Load blobs when table or folder changes
  useEffect(() => {
    if (currentTable) {
      loadBlobs(currentTable, currentFolder || undefined);
    }
  }, [currentTable, currentFolder, loadBlobs]);

  const handleTableSelect = (table: string) => {
    setCurrentTable(table);
    setCurrentFolder(null);
    setShowTableDropdown(false);
    setTableSearchQuery('');
  };

  // Filter tables based on search query
  const filteredTables = useMemo(() => {
    if (!tableSearchQuery.trim()) return tables;
    const query = tableSearchQuery.toLowerCase();
    return tables.filter(table => table.toLowerCase().includes(query));
  }, [tables, tableSearchQuery]);

  const handleDeleteTable = async (tableName: string) => {
    if (!activeConnection) return;

    try {
      console.log('[BlobStorage] Deleting table:', tableName);

      // Delete metadata table first
      const deleteMetadataSql = `DROP TABLE IF EXISTS "${tableName}_blob_metadata"`;
      const metadataResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: deleteMetadataSql }),
      });

      if (!metadataResponse.ok) {
        const error = await metadataResponse.text();
        throw new Error(`Failed to delete metadata table: ${error}`);
      }

      // Delete BLOB table
      const deleteBlobSql = `DROP BLOB TABLE IF EXISTS "${tableName}"`;
      const blobResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: deleteBlobSql }),
      });

      if (!blobResponse.ok) {
        const error = await blobResponse.text();
        throw new Error(`Failed to delete BLOB table: ${error}`);
      }

      // Update tables list
      const updatedTables = tables.filter(t => t !== tableName);
      setTables(updatedTables);

      // Remove from table features
      setTableFeatures(prev => {
        const updated = { ...prev };
        delete updated[tableName];
        return updated;
      });

      // If deleted table was selected, select first available table
      if (currentTable === tableName) {
        if (updatedTables.length > 0) {
          setCurrentTable(updatedTables[0]);
          loadBlobs(updatedTables[0]);
        } else {
          setCurrentTable(null);
        }
      }

      console.log('[BlobStorage] Table deleted successfully');
    } catch (error: any) {
      console.error('[BlobStorage] Failed to delete table:', error);
      alert(`Failed to delete table: ${error.message}`);
    }
  };

  const handleCreateTable = async (tableName: string) => {
    if (!activeConnection) return;

    try {
      console.log('[BlobStorage] Creating new table:', tableName);
      await createMetadataTable(tableName);

      // Reload the actual table list from database to ensure it's in sync
      const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'doc' AND table_name LIKE '%_blob_metadata'`;

      const response = await fetch('/api/sql?t=' + Date.now(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify({ stmt: sql }),
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        const tableNames = (data.rows || [])
          .map((row: any[]) => row[0])
          .filter((name: string) => name.endsWith('_blob_metadata'))
          .map((name: string) => name.replace('_blob_metadata', ''))
          .sort();

        console.log('[BlobStorage] Updated table list:', tableNames);
        setTables(tableNames);

        // Mark the new table as having enterprise features
        // (new tables are created with all enterprise columns)
        setTableFeatures(prev => ({
          ...prev,
          [tableName]: true
        }));
      }

      // Select the newly created table
      setCurrentTable(tableName);
      console.log('[BlobStorage] Table created successfully:', tableName);
    } catch (error) {
      console.error('[BlobStorage] Failed to create table:', error);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      fileTypes: [],
      sizeMin: null,
      sizeMax: null,
      dateFrom: null,
      dateTo: null,
    });
  };

  // Apply filters and sorting to blobs
  const filteredBlobs = useMemo(() => {
    let filtered = blobs.filter((blob) => {
      // Search query filter
      if (searchQuery && !blob.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // File type filter
      if (filters.fileTypes.length > 0) {
        const matchesType = filters.fileTypes.some((type) =>
          blob.content_type.startsWith(type) || blob.content_type.includes(type)
        );
        if (!matchesType) return false;
      }

      // Size filter
      if (filters.sizeMin !== null && blob.file_size < filters.sizeMin) {
        return false;
      }
      if (filters.sizeMax !== null && blob.file_size > filters.sizeMax) {
        return false;
      }

      // Date filter - handle both Unix timestamps and ISO strings
      if (filters.dateFrom || filters.dateTo) {
        let uploadDate: Date;

        // Check if uploaded_at is a Unix timestamp (number as string)
        if (/^\d+$/.test(blob.uploaded_at)) {
          // It's a Unix timestamp in milliseconds
          uploadDate = new Date(parseInt(blob.uploaded_at));
        } else {
          // It's an ISO date string
          uploadDate = new Date(blob.uploaded_at);
        }

        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (uploadDate < fromDate) return false;
        }

        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999); // Include the entire day
          if (uploadDate > toDate) return false;
        }
      }

      return true;
    });

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'name') {
        comparison = a.filename.localeCompare(b.filename);
      } else if (sortBy === 'size') {
        comparison = a.file_size - b.file_size;
      } else if (sortBy === 'date') {
        // Handle both Unix timestamps and ISO strings
        const getTimestamp = (dateStr: string) => {
          if (/^\d+$/.test(dateStr)) {
            return parseInt(dateStr);
          }
          return new Date(dateStr).getTime();
        };
        comparison = getTimestamp(a.uploaded_at) - getTimestamp(b.uploaded_at);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [blobs, searchQuery, filters, sortBy, sortOrder]);

  // Show no connection state
  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
            <Database className="h-10 w-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
            No Active Connection
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please connect to a MonkDB database to manage BLOB storage.
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
      <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <FolderOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                BLOB Storage
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentTable ? `Table: ${currentTable}` : 'Select a table to get started'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSupportedTypesModal(true)}
              className="rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
              title="Supported File Types"
            >
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </button>

            <button
              onClick={() => setShowSqlGuideModal(true)}
              className="rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
              title="SQL Guide - Create Tables Directly"
            >
              <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
            </button>

            {currentTable && (
              <button
                onClick={() => setShowMigrateDialog(true)}
                className="rounded-lg border border-orange-300 bg-orange-50 p-2 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/20 dark:hover:bg-orange-900/30"
                title="Upgrade Table - Add Enterprise Features"
              >
                <Database className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </button>
            )}

            {currentTable && (
              <>
                <button
                  onClick={() => router.push(`/blob-analytics?table=${currentTable}`)}
                  className="rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                  title="Storage Analytics - View Comprehensive Dashboard"
                >
                  <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </button>

                <button
                  onClick={() => setShowTrashed(!showTrashed)}
                  className={`rounded-lg border p-2 ${
                    showTrashed
                      ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400'
                      : 'border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700'
                  }`}
                  title={showTrashed ? 'Show Active Files' : 'Show Trash'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}

            {currentTable && (
              <>
                <button
                  onClick={() => setShowUploader(true)}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                >
                  <Upload className="h-4 w-4" />
                  Upload Files
                </button>

                <button
                  onClick={() => loadBlobs(currentTable, currentFolder || undefined)}
                  className="rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Table Selector - Dropdown with Search */}
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <button
              onClick={() => setShowTableDropdown(!showTableDropdown)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:border-purple-600"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-semibold">{currentTable || 'Select a table'}</span>
                {currentTable && tableFeatures[currentTable] && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 px-2 py-0.5 text-xs font-semibold text-green-700 shadow-sm dark:from-green-900/40 dark:to-emerald-900/40 dark:text-green-300"
                    title="Enterprise features enabled">
                    ✓ Pro
                  </span>
                )}
                {currentTable && tableFeatures[currentTable] === false && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 px-2 py-0.5 text-xs font-semibold text-orange-700 shadow-sm dark:from-orange-900/40 dark:to-amber-900/40 dark:text-orange-300"
                    title="Legacy table - Upgrade available">
                    ⚡ Legacy
                  </span>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${showTableDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Panel */}
            {showTableDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTableDropdown(false)} />
                <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
                  style={{ animation: 'slideDown 0.2s ease-out' }}>
                  {/* Search Input */}
                  <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white p-3 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                      <input
                        type="text"
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        placeholder="Search tables..."
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all duration-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500 dark:focus:border-purple-500 dark:focus:ring-purple-500/30"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Table List */}
                  <div className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent dark:scrollbar-thumb-gray-600">
                    {filteredTables.length > 0 ? (
                      <>
                        {filteredTables.map((table, index) => (
                          <div key={table} className="relative">
                            <div
                              className={`group flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-sm transition-all duration-150 hover:bg-gradient-to-r dark:border-gray-700/50 ${
                                currentTable === table
                                  ? 'bg-gradient-to-r from-purple-50 to-purple-50/30 text-purple-900 dark:from-purple-900/30 dark:to-purple-900/10 dark:text-purple-200'
                                  : 'text-gray-700 hover:from-gray-50 hover:to-white dark:text-gray-300 dark:hover:from-gray-700/50 dark:hover:to-gray-800'
                              }`}
                            >
                              <button
                                onClick={() => handleTableSelect(table)}
                                className="flex flex-1 items-center gap-3 text-left"
                              >
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
                                  currentTable === table
                                    ? 'bg-purple-200 dark:bg-purple-800/50'
                                    : 'bg-gray-100 group-hover:bg-purple-100 dark:bg-gray-700 dark:group-hover:bg-purple-900/30'
                                }`}>
                                  <Database className={`h-4 w-4 ${
                                    currentTable === table
                                      ? 'text-purple-700 dark:text-purple-300'
                                      : 'text-gray-500 group-hover:text-purple-600 dark:text-gray-400 dark:group-hover:text-purple-400'
                                  }`} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold leading-tight">{table}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {tableFeatures[table] ? 'Enterprise' : 'Legacy'}
                                  </span>
                                </div>
                                {tableFeatures[table] && (
                                  <span className="inline-flex items-center rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                    title="Enterprise features enabled">
                                    ✓
                                  </span>
                                )}
                                {tableFeatures[table] === false && (
                                  <span className="inline-flex items-center rounded-md bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                    title="Legacy table">
                                    ⚡
                                  </span>
                                )}
                              </button>
                              <div className="flex items-center gap-2 pl-2">
                                {currentTable === table && (
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 dark:bg-purple-500">
                                    <Check className="h-3.5 w-3.5 text-white" />
                                  </div>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowTableMenu(showTableMenu === table ? null : table);
                                  }}
                                  className="rounded-lg p-1.5 transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-gray-600"
                                  title="More actions"
                                >
                                  <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                </button>
                              </div>
                            </div>

                            {/* Table Actions Menu */}
                            {showTableMenu === table && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowTableMenu(null)} />
                                <div className="absolute right-2 top-full z-40 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
                                  style={{ animation: 'slideDown 0.15s ease-out' }}>
                                  <button
                                    onClick={() => {
                                      setShowDeleteDialog(table);
                                      setDeleteConfirmText('');
                                      setShowTableMenu(null);
                                      setShowTableDropdown(false);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                  >
                                    <Trash className="h-4 w-4" />
                                    Delete Table
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center px-4 py-12">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                          <Search className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-400">No tables found</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                          No tables match "{tableSearchQuery}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Create New Table Button */}
                  <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white p-3 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
                    <button
                      onClick={() => {
                        setShowCreateTableDialog(true);
                        setShowTableDropdown(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-purple-500 dark:hover:bg-purple-900/20 dark:hover:text-purple-300"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Table
                    </button>
                  </div>
                </div>

                <style jsx>{`
                  @keyframes slideDown {
                    from {
                      opacity: 0;
                      transform: translateY(-10px);
                    }
                    to {
                      opacity: 1;
                      transform: translateY(0);
                    }
                  }
                `}</style>
              </>
            )}
          </div>
        </div>

        {/* Search and View Controls */}
        {currentTable && (
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-') as ['name' | 'size' | 'date', 'asc' | 'desc'];
                setSortBy(by);
                setSortOrder(order);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="date-desc">📅 Newest First</option>
              <option value="date-asc">📅 Oldest First</option>
              <option value="name-asc">🔤 Name (A-Z)</option>
              <option value="name-desc">🔤 Name (Z-A)</option>
              <option value="size-asc">📊 Size (Small-Large)</option>
              <option value="size-desc">📊 Size (Large-Small)</option>
            </select>

            <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded p-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
                title="Grid View"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded p-1.5 ${
                  viewMode === 'list'
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!currentTable ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <FolderOpen className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                Select a Table
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Choose a table above or create a new one to manage BLOBs
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <BlobFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={handleClearFilters}
              blobs={blobs}
            />

            {/* Results count */}
            {filteredBlobs.length !== blobs.length && (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  Showing {filteredBlobs.length} of {blobs.length} files
                </p>
              </div>
            )}

            {/* Browser */}
            <BlobBrowser
              blobs={filteredBlobs}
              loading={loading}
              viewMode={viewMode}
              currentFolder={currentFolder}
              onFolderChange={setCurrentFolder}
            />
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploader && currentTable && (
        <BlobUploader
          table={currentTable}
          folder={currentFolder}
          onClose={() => {
            setShowUploader(false);
            // Reload the blob list to show newly uploaded files
            loadBlobs(currentTable, currentFolder || undefined);
          }}
        />
      )}

      {/* Create Table Dialog */}
      {showCreateTableDialog && (
        <CreateTableDialog
          onClose={() => setShowCreateTableDialog(false)}
          onCreate={handleCreateTable}
        />
      )}


      {/* Migrate Table Dialog */}
      {showMigrateDialog && currentTable && (
        <MigrateTableDialog
          table={currentTable}
          onClose={() => setShowMigrateDialog(false)}
          onComplete={async () => {
            // Reload the page to refresh everything
            if (currentTable) {
              // Recheck if table now has enterprise features
              const hasFeatures = await checkTableFeatures(currentTable);
              setTableFeatures(prev => ({
                ...prev,
                [currentTable]: hasFeatures
              }));

              // Reload blobs
              loadBlobs(currentTable);
            }
          }}
        />
      )}

      {/* Supported File Types Modal */}
      {showSupportedTypesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSupportedTypesModal(false)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Supported File Types</h2>
              </div>
              <button
                onClick={() => setShowSupportedTypesModal(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            <p className="mb-6 text-gray-600 dark:text-gray-300">
              MonkDB BLOB Storage supports previewing the following file types in the browser:
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Images */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">🖼️</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Images</h3>
                </div>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• PNG, JPG, JPEG, GIF</li>
                  <li>• WebP, SVG</li>
                  <li>• BMP, ICO</li>
                  <li>✓ Full zoom and navigation controls</li>
                </ul>
              </div>

              {/* Videos */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">🎬</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Videos</h3>
                </div>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• MP4, WebM, OGG</li>
                  <li>• MOV, AVI (browser dependent)</li>
                  <li>✓ Built-in video player</li>
                  <li>✓ Play, pause, volume controls</li>
                </ul>
              </div>

              {/* Audio */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">🎵</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Audio</h3>
                </div>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• MP3, WAV, OGG</li>
                  <li>• AAC, FLAC, M4A</li>
                  <li>✓ Beautiful audio player UI</li>
                  <li>✓ Autoplay with controls</li>
                </ul>
              </div>

              {/* Documents */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">📄</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Documents</h3>
                </div>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• PDF (native browser viewer)</li>
                  <li>• Word (.docx)</li>
                  <li>• Excel (.xlsx)</li>
                  <li>• Text files (.txt, .log)</li>
                </ul>
              </div>

              {/* Data Files */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Files</h3>
                </div>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• CSV (interactive table view)</li>
                  <li>• JSON (with syntax highlighting)</li>
                  <li>• XML (formatted display)</li>
                  <li>✓ Sortable and scrollable tables</li>
                </ul>
              </div>

              {/* Code Files */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">💻</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Code Files</h3>
                </div>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• JavaScript, TypeScript, Python</li>
                  <li>• Java, C, C++, Go, Rust</li>
                  <li>• SQL, HTML, CSS, PHP</li>
                  <li>✓ Beautiful syntax highlighting</li>
                </ul>
              </div>

              {/* Markdown */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">📝</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Markdown</h3>
                </div>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• .md, .markdown files</li>
                  <li>✓ Fully rendered HTML</li>
                  <li>✓ Supports headers, lists, links</li>
                  <li>✓ Code blocks with highlighting</li>
                </ul>
              </div>

              {/* Archives */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">📦</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Archives</h3>
                </div>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• ZIP files</li>
                  <li>✓ Browse file list</li>
                  <li>✓ View folder structure</li>
                  <li>✓ File count and hierarchy</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>💡 Note:</strong> For unsupported file types or legacy Office formats (.doc, .xls, .ppt),
                you can download the file to view it locally.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SQL Guide Modal */}
      {showSqlGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSqlGuideModal(false)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">SQL Guide - Direct Table Management</h2>
              </div>
              <button
                onClick={() => setShowSqlGuideModal(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            <p className="mb-6 text-gray-600 dark:text-gray-300">
              You can create and manage BLOB tables directly using SQL queries in the Query Editor.
              Here are the CRUD operations:
            </p>

            <div className="space-y-6">
              {/* CREATE */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    CREATE
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create BLOB Table</h3>
                </div>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                  Create a BLOB table to store binary files:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
{`-- Create BLOB table
CREATE BLOB TABLE my_files
CLUSTERED INTO 4 SHARDS
WITH (number_of_replicas = 0);

-- Create metadata table to track uploads
CREATE TABLE my_files_blob_metadata (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  sha1_hash TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  folder TEXT,
  INDEX filename_idx USING FULLTEXT (filename)
);`}
                </pre>
              </div>

              {/* INSERT (Upload) */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    INSERT
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Files via REST API</h3>
                </div>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                  Upload files using CrateDB's BLOB REST API:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
{`# Upload a file using curl
curl -X PUT 'http://localhost:4200/_blobs/my_files/<SHA1_HASH>' \\
  --data-binary @file.jpg

# Then insert metadata
INSERT INTO my_files_blob_metadata (
  id, filename, content_type, file_size, sha1_hash, folder
) VALUES (
  gen_random_text_uuid(),
  'file.jpg',
  'image/jpeg',
  1024000,
  '<SHA1_HASH>',
  null
);`}
                </pre>
              </div>

              {/* SELECT (Read) */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                    SELECT
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Query BLOB Metadata</h3>
                </div>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                  Search and filter your uploaded files:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
{`-- List all files
SELECT * FROM my_files_blob_metadata
ORDER BY uploaded_at DESC;

-- Search by filename
SELECT * FROM my_files_blob_metadata
WHERE filename LIKE '%report%';

-- Filter by file type
SELECT * FROM my_files_blob_metadata
WHERE content_type LIKE 'image/%';

-- Filter by size (files > 1MB)
SELECT * FROM my_files_blob_metadata
WHERE file_size > 1048576;

-- Download URL for a file
-- http://localhost:4200/_blobs/my_files/<sha1_hash>`}
                </pre>
              </div>

              {/* UPDATE */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    UPDATE
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Update Metadata</h3>
                </div>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                  Update file metadata (filename, folder, etc.):
                </p>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
{`-- Rename a file
UPDATE my_files_blob_metadata
SET filename = 'new_name.jpg'
WHERE id = 'file-id-123';

-- Move to a folder
UPDATE my_files_blob_metadata
SET folder = 'documents/reports'
WHERE id = 'file-id-123';

-- Update content type
UPDATE my_files_blob_metadata
SET content_type = 'image/png'
WHERE id = 'file-id-123';`}
                </pre>
              </div>

              {/* DELETE */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    DELETE
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Files</h3>
                </div>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                  Remove files from BLOB storage:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
{`-- Delete a specific file's metadata
DELETE FROM my_files_blob_metadata
WHERE id = 'file-id-123';

-- Delete the BLOB itself via REST API
curl -X DELETE 'http://localhost:4200/_blobs/my_files/<SHA1_HASH>'

-- Delete all files in a folder
DELETE FROM my_files_blob_metadata
WHERE folder = 'temp';

-- Drop entire BLOB table
DROP BLOB TABLE my_files;
DROP TABLE my_files_blob_metadata;`}
                </pre>
              </div>

              {/* Tips */}
              <div className="rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-4 dark:from-purple-900/20 dark:to-blue-900/20">
                <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <span>💡</span> Pro Tips
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>• <strong>SHA1 Hash:</strong> Calculate using <code className="rounded bg-white px-1 py-0.5 dark:bg-gray-900">sha1sum file.jpg</code> in terminal</li>
                  <li>• <strong>Access BLOBs:</strong> Use <code className="rounded bg-white px-1 py-0.5 dark:bg-gray-900">http://localhost:4200/_blobs/table_name/hash</code></li>
                  <li>• <strong>Metadata sync:</strong> Always update metadata after BLOB operations</li>
                  <li>• <strong>Performance:</strong> Use CLUSTERED tables and appropriate shard counts for large datasets</li>
                  <li>• <strong>Search:</strong> Add FULLTEXT indexes on filename for fast searching</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Table Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md w-full rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Delete Table
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {showDeleteDialog}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteDialog(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 mb-4 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                  ⚠️ Warning: This action cannot be undone!
                </p>
                <p className="text-xs text-red-800 dark:text-red-300">
                  This will permanently delete:
                </p>
                <ul className="mt-2 text-xs text-red-800 dark:text-red-300 list-disc list-inside">
                  <li>The BLOB table <strong>{showDeleteDialog}</strong></li>
                  <li>The metadata table <strong>{showDeleteDialog}_blob_metadata</strong></li>
                  <li>All files and metadata stored in this table</li>
                </ul>
              </div>

              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type <strong className="font-mono text-red-600 dark:text-red-400">{showDeleteDialog}</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={`Type "${showDeleteDialog}" to confirm`}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteDialog(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteDialog && deleteConfirmText === showDeleteDialog) {
                    handleDeleteTable(showDeleteDialog);
                    setShowDeleteDialog(null);
                  }
                }}
                disabled={deleteConfirmText !== showDeleteDialog}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlobStorage() {
  return <BlobStorageContent />;
}
