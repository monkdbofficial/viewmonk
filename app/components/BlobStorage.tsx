'use client';

import { useState, useEffect, useMemo } from 'react';
import { Database, FolderOpen, Upload, Grid, List, Search, RefreshCw, Plus } from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { BlobProvider, useBlobStorage } from '../lib/blob-context';
import BlobUploader from './blob/BlobUploader';
import BlobBrowser from './blob/BlobBrowser';
import BlobFilters, { BlobFilters as BlobFiltersType } from './blob/BlobFilters';

function BlobStorageContent() {
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
  } = useBlobStorage();

  const [tables, setTables] = useState<string[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<BlobFiltersType>({
    fileTypes: [],
    sizeMin: null,
    sizeMax: null,
    dateFrom: null,
    dateTo: null,
  });

  // Load tables when connection changes
  useEffect(() => {
    if (activeConnection) {
      // TODO: Load actual tables from database
      setTables(['documents', 'images', 'videos']);
    }
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
  };

  const handleCreateTable = async () => {
    const tableName = prompt('Enter table name for BLOB storage:');
    if (tableName && activeConnection) {
      await createMetadataTable(tableName);
      setTables((prev) => [...prev, tableName]);
      setCurrentTable(tableName);
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

  // Apply filters to blobs
  const filteredBlobs = useMemo(() => {
    return blobs.filter((blob) => {
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

      // Date filter
      if (filters.dateFrom) {
        const uploadDate = new Date(blob.uploaded_at);
        const fromDate = new Date(filters.dateFrom);
        if (uploadDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const uploadDate = new Date(blob.uploaded_at);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire day
        if (uploadDate > toDate) return false;
      }

      return true;
    });
  }, [blobs, searchQuery, filters]);

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

        {/* Table Selector */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-wrap gap-2">
            {tables.map((table) => (
              <button
                key={table}
                onClick={() => handleTableSelect(table)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  currentTable === table
                    ? 'bg-purple-600 text-white dark:bg-purple-500'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {table}
              </button>
            ))}
            <button
              onClick={handleCreateTable}
              className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <Plus className="h-4 w-4" />
              New Table
            </button>
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
          onClose={() => setShowUploader(false)}
        />
      )}
    </div>
  );
}

export default function BlobStorage() {
  return (
    <BlobProvider>
      <BlobStorageContent />
    </BlobProvider>
  );
}
