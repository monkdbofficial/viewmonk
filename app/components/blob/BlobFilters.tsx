'use client';

import { useState, useMemo } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';

export interface BlobFilters {
  fileTypes: string[];
  sizeMin: number | null;
  sizeMax: number | null;
  dateFrom: string | null;
  dateTo: string | null;
}

interface BlobMetadata {
  content_type: string;
  file_size: number;
  [key: string]: any;
}

interface BlobFiltersProps {
  filters: BlobFilters;
  onFiltersChange: (filters: BlobFilters) => void;
  onClearFilters: () => void;
  blobs: BlobMetadata[]; // Add blobs to detect available types
}

const ALL_FILE_TYPE_OPTIONS = [
  { value: 'image/', label: 'Images', icon: '🖼️' },
  { value: 'application/pdf', label: 'PDFs', icon: '📄' },
  { value: 'text/', label: 'Text Files', icon: '📝' },
  { value: 'video/', label: 'Videos', icon: '🎥' },
  { value: 'audio/', label: 'Audio', icon: '🎵' },
  { value: 'application/zip', label: 'Archives', icon: '📦' },
  { value: 'application/', label: 'Applications', icon: '⚙️' },
];

const SIZE_PRESETS = [
  { label: 'Small (< 1MB)', min: 0, max: 1024 * 1024 },
  { label: 'Medium (1-10MB)', min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { label: 'Large (10-100MB)', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
  { label: 'Very Large (> 100MB)', min: 100 * 1024 * 1024, max: null },
];

const getDatePresets = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 7);

  const last30Days = new Date(today);
  last30Days.setDate(last30Days.getDate() - 30);

  const last90Days = new Date(today);
  last90Days.setDate(last90Days.getDate() - 90);

  return [
    { label: 'Today', from: today.toISOString().split('T')[0], to: today.toISOString().split('T')[0] },
    { label: 'Yesterday', from: yesterday.toISOString().split('T')[0], to: yesterday.toISOString().split('T')[0] },
    { label: 'Last 7 days', from: last7Days.toISOString().split('T')[0], to: today.toISOString().split('T')[0] },
    { label: 'Last 30 days', from: last30Days.toISOString().split('T')[0], to: today.toISOString().split('T')[0] },
    { label: 'Last 90 days', from: last90Days.toISOString().split('T')[0], to: today.toISOString().split('T')[0] },
  ];
};

export default function BlobFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  blobs,
}: BlobFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Dynamically detect available file types from actual blobs
  const availableFileTypes = useMemo(() => {
    if (blobs.length === 0) return [];

    const typesInData = new Set<string>();
    blobs.forEach(blob => {
      const contentType = blob.content_type;

      // Check which predefined types match
      ALL_FILE_TYPE_OPTIONS.forEach(option => {
        if (contentType.startsWith(option.value) || contentType.includes(option.value)) {
          typesInData.add(option.value);
        }
      });
    });

    // Only return file type options that exist in the data
    return ALL_FILE_TYPE_OPTIONS.filter(option => typesInData.has(option.value));
  }, [blobs]);

  // Dynamically calculate size range from actual data
  const sizeStats = useMemo(() => {
    if (blobs.length === 0) return { min: 0, max: 0, hasFiles: false };

    const sizes = blobs.map(b => b.file_size);
    return {
      min: Math.min(...sizes),
      max: Math.max(...sizes),
      hasFiles: true,
    };
  }, [blobs]);

  // Filter size presets to only show relevant ones
  const relevantSizePresets = useMemo(() => {
    if (!sizeStats.hasFiles) return [];

    return SIZE_PRESETS.filter(preset => {
      // Show preset if any files fall in that range
      return blobs.some(blob => {
        const size = blob.file_size;
        if (preset.max === null) {
          return size >= preset.min;
        }
        return size >= preset.min && size <= preset.max;
      });
    });
  }, [blobs, sizeStats]);

  const handleFileTypeToggle = (type: string) => {
    const newTypes = filters.fileTypes.includes(type)
      ? filters.fileTypes.filter((t) => t !== type)
      : [...filters.fileTypes, type];
    onFiltersChange({ ...filters, fileTypes: newTypes });
  };

  const handleSizePreset = (min: number, max: number | null) => {
    onFiltersChange({ ...filters, sizeMin: min, sizeMax: max });
  };

  const handleDatePreset = (from: string, to: string) => {
    onFiltersChange({ ...filters, dateFrom: from, dateTo: to });
  };

  const datePresets = getDatePresets();

  const activeFilterCount =
    filters.fileTypes.length +
    (filters.sizeMin !== null || filters.sizeMax !== null ? 1 : 0) +
    (filters.dateFrom !== null || filters.dateTo !== null ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex w-full items-center justify-between p-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex flex-1 items-center gap-2 text-left hover:opacity-80"
        >
          <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white">Filters</span>
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={`ml-auto h-5 w-5 text-gray-500 transition-transform dark:text-gray-400 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filters Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <div className="space-y-6">
            {/* File Type Filter */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                File Type
              </label>
              {availableFileTypes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableFileTypes.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFileTypeToggle(option.value)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        filters.fileTypes.includes(option.value)
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No files to filter</p>
              )}
            </div>

            {/* Size Filter */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                File Size
              </label>

              {/* Size Presets */}
              {relevantSizePresets.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {relevantSizePresets.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => handleSizePreset(preset.min, preset.max)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        filters.sizeMin === preset.min && filters.sizeMax === preset.max
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Custom Size Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                    Min Size (MB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={filters.sizeMin ? (filters.sizeMin / (1024 * 1024)).toFixed(1) : ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) * 1024 * 1024 : null;
                      onFiltersChange({ ...filters, sizeMin: value });
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                    Max Size (MB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={filters.sizeMax ? (filters.sizeMax / (1024 * 1024)).toFixed(1) : ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) * 1024 * 1024 : null;
                      onFiltersChange({ ...filters, sizeMax: value });
                    }}
                    placeholder="∞"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload Date
              </label>

              {/* Date Presets */}
              <div className="mb-3 flex flex-wrap gap-2">
                {datePresets.map((preset, index) => {
                  const isActive = filters.dateFrom === preset.from && filters.dateTo === preset.to;
                  return (
                    <button
                      key={index}
                      onClick={() => handleDatePreset(preset.from, preset.to)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        isActive
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                    From
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, dateFrom: e.target.value || null })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                    To
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, dateTo: e.target.value || null })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
