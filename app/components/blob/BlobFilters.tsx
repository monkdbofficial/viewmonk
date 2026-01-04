'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';

export interface BlobFilters {
  fileTypes: string[];
  sizeMin: number | null;
  sizeMax: number | null;
  dateFrom: string | null;
  dateTo: string | null;
}

interface BlobFiltersProps {
  filters: BlobFilters;
  onFiltersChange: (filters: BlobFilters) => void;
  onClearFilters: () => void;
}

const FILE_TYPE_OPTIONS = [
  { value: 'image/', label: 'Images', icon: '🖼️' },
  { value: 'application/pdf', label: 'PDFs', icon: '📄' },
  { value: 'text/', label: 'Text Files', icon: '📝' },
  { value: 'video/', label: 'Videos', icon: '🎥' },
  { value: 'audio/', label: 'Audio', icon: '🎵' },
  { value: 'application/zip', label: 'Archives', icon: '📦' },
];

const SIZE_PRESETS = [
  { label: 'Small (< 1MB)', min: 0, max: 1024 * 1024 },
  { label: 'Medium (1-10MB)', min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { label: 'Large (10-100MB)', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
  { label: 'Very Large (> 100MB)', min: 100 * 1024 * 1024, max: null },
];

export default function BlobFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: BlobFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFileTypeToggle = (type: string) => {
    const newTypes = filters.fileTypes.includes(type)
      ? filters.fileTypes.filter((t) => t !== type)
      : [...filters.fileTypes, type];
    onFiltersChange({ ...filters, fileTypes: newTypes });
  };

  const handleSizePreset = (min: number, max: number | null) => {
    onFiltersChange({ ...filters, sizeMin: min, sizeMax: max });
  };

  const hasActiveFilters =
    filters.fileTypes.length > 0 ||
    filters.sizeMin !== null ||
    filters.sizeMax !== null ||
    filters.dateFrom !== null ||
    filters.dateTo !== null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white">Filters</span>
          {hasActiveFilters && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearFilters();
              }}
              className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600"
            >
              Clear All
            </button>
          )}
          <ChevronDown
            className={`h-5 w-5 text-gray-500 transition-transform dark:text-gray-400 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Filters Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <div className="space-y-6">
            {/* File Type Filter */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                File Type
              </label>
              <div className="flex flex-wrap gap-2">
                {FILE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFileTypeToggle(option.value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      filters.fileTypes.includes(option.value)
                        ? 'border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-400 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size Filter */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                File Size
              </label>

              {/* Size Presets */}
              <div className="mb-3 flex flex-wrap gap-2">
                {SIZE_PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handleSizePreset(preset.min, preset.max)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      filters.sizeMin === preset.min && filters.sizeMax === preset.max
                        ? 'border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-400 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload Date
              </label>
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
