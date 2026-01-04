'use client';

import { useState, useEffect, useRef } from 'react';
import { unifiedDatabases, DatabaseType, databaseProfiles } from '../lib/databaseTypes';
import DatabaseTypeSelector from './DatabaseTypeSelector';
import {
  Search,
  RefreshCw,
  Download,
  Database,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  HardDrive
} from 'lucide-react';

export default function UnifiedDataBrowser() {
  const [selectedType, setSelectedType] = useState<DatabaseType | 'all'>('all');
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;

  const database = unifiedDatabases[0];
  const filteredCollections = database.collections
    .filter((c) => (selectedType === 'all' ? true : c.type === selectedType))
    .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const collection = filteredCollections.find((c) => c.name === selectedCollection);
  const displayData = collection?.data || [];

  const totalPages = Math.ceil(displayData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = displayData.slice(startIndex, endIndex);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const getTypeProfile = (type: DatabaseType) => {
    return databaseProfiles.find((p) => p.type === type);
  };

  const exportToJSON = () => {
    if (!collection) return;

    const dataStr = JSON.stringify(displayData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${collection.name}-export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToCSV = () => {
    if (!collection || displayData.length === 0) return;

    const headers = Object.keys(displayData[0]);
    const csvRows = [
      headers.join(','),
      ...displayData.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row];
          const stringValue = typeof value === 'object'
            ? JSON.stringify(value).replace(/"/g, '""')
            : String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        }).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${collection.name}-export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <div className="flex h-full gap-6 p-6">
      {/* Database Type Selector */}
      <div className="w-80">
        <DatabaseTypeSelector selectedType={selectedType} onTypeChange={setSelectedType} />
      </div>

      {/* Collections List */}
      <div className="w-80 space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Collections</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredCollections.length} {filteredCollections.length === 1 ? 'collection' : 'collections'} available
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search collections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
            />
          </div>

          {/* Collections List */}
          <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
            {filteredCollections.length === 0 ? (
              <div className="py-8 text-center">
                <Database className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  No collections found
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              filteredCollections.map((coll) => {
                const profile = getTypeProfile(coll.type);
                return (
                  <button
                    key={coll.name}
                    onClick={() => {
                      setSelectedCollection(coll.name);
                      setCurrentPage(1);
                    }}
                    className={`group flex w-full items-center justify-between rounded-lg border p-3 text-sm transition-all hover:shadow-md ${
                      selectedCollection === coll.name
                        ? 'border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-900/30'
                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl transition-transform group-hover:scale-110">{profile?.icon}</span>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-white">{coll.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{profile?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {coll.documentCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">records</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Data Viewer */}
      <div className="flex-1 space-y-4">
        {collection ? (
          <>
            {/* Header Section */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {collection.name}
                    </h2>
                    <div
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm"
                      style={{
                        backgroundColor: `${getTypeProfile(collection.type)?.color}15`,
                        color: getTypeProfile(collection.type)?.color
                      }}
                    >
                      <span>{getTypeProfile(collection.type)?.icon}</span>
                      <span>{getTypeProfile(collection.type)?.name}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-5 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{collection.documentCount.toLocaleString()}</span>
                      <span>records</span>
                    </div>
                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      <span>{collection.size}</span>
                    </div>
                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Last updated today</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:shadow dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                  <div className="relative" ref={exportMenuRef}>
                    <button
                      className="flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 hover:shadow-md dark:border-blue-500 dark:bg-blue-500"
                      onClick={() => setShowExportMenu(!showExportMenu)}
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </button>

                    {showExportMenu && (
                      <div className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 z-10">
                        <div className="p-2">
                          <button
                            onClick={exportToJSON}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            <FileText className="h-4 w-4" />
                            <div className="text-left">
                              <p className="font-semibold">Export as JSON</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {displayData.length} records
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={exportToCSV}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            <FileText className="h-4 w-4" />
                            <div className="text-left">
                              <p className="font-semibold">Export as CSV</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {displayData.length} records
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                    <tr>
                      {paginatedData.length > 0 &&
                        Object.keys(paginatedData[0])
                          .slice(0, 6)
                          .map((key) => (
                            <th
                              key={key}
                              className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                            >
                              {key}
                            </th>
                          ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-16 text-center"
                        >
                          <Database className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" />
                          <p className="mt-4 text-base font-medium text-gray-500 dark:text-gray-400">
                            No data available
                          </p>
                          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                            This collection is currently empty
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          {Object.entries(row)
                            .slice(0, 6)
                            .map(([key, value], i) => (
                              <td key={i} className="px-6 py-4 text-sm">
                                {typeof value === 'object' ? (
                                  <code className="inline-block rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                    {JSON.stringify(value).substring(0, 50)}...
                                  </code>
                                ) : (
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {String(value)}
                                  </span>
                                )}
                              </td>
                            ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Showing{' '}
                  <span className="font-bold text-gray-900 dark:text-white">{startIndex + 1}</span>
                  {' '}-{' '}
                  <span className="font-bold text-gray-900 dark:text-white">
                    {Math.min(endIndex, displayData.length)}
                  </span>
                  {' '}of{' '}
                  <span className="font-bold text-gray-900 dark:text-white">
                    {displayData.length}
                  </span>
                  {' '}records
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:shadow-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:disabled:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 dark:border-gray-600 dark:bg-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Page
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {currentPage}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    of {totalPages}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:shadow-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:disabled:hover:bg-gray-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="text-center px-6 py-12">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Database className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
                No Collection Selected
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Choose a collection from the sidebar to view and explore its data
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {filteredCollections.length} {filteredCollections.length === 1 ? 'collection' : 'collections'} available
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
