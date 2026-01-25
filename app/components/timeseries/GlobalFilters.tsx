'use client';

import { useState, useRef, useEffect } from 'react';
import { Filter, Plus, X, Calendar, Database } from 'lucide-react';

export interface GlobalFilter {
  id: string;
  name: string;
  column: string;
  operator: string;
  value: string;
  enabled: boolean;
}

interface GlobalFiltersProps {
  filters: GlobalFilter[];
  onFiltersChange: (filters: GlobalFilter[]) => void;
  availableTables: any[];
}

export default function GlobalFilters({ filters, onFiltersChange, availableTables }: GlobalFiltersProps) {
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    }

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPanel]);

  const addFilter = () => {
    const newFilter: GlobalFilter = {
      id: `filter-${Date.now()}`,
      name: 'New Filter',
      column: '',
      operator: '=',
      value: '',
      enabled: true,
    };
    onFiltersChange([...filters, newFilter]);
  };

  const updateFilter = (id: string, updates: Partial<GlobalFilter>) => {
    onFiltersChange(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter(f => f.id !== id));
  };

  const toggleFilter = (id: string) => {
    onFiltersChange(filters.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Filter Button - Icon Only */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`group relative p-2.5 rounded-lg border transition-all shadow-sm hover:shadow-md ${
          filters.filter(f => f.enabled).length > 0
            ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        title="Global Filters"
      >
        <Filter className="h-4 w-4" />
        {filters.filter(f => f.enabled).length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-xs font-bold text-white shadow-lg">
            {filters.filter(f => f.enabled).length}
          </span>
        )}
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Global Filters
        </span>
      </button>

      {/* Filter Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[600px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95" style={{ zIndex: 9999 }}>
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5 rounded-t-2xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                  <Filter className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Global Dashboard Filters
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Filters apply to all widgets on this dashboard
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 max-h-96 overflow-y-auto">
            {filters.length === 0 ? (
              <div className="py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 mx-auto mb-4">
                  <Filter className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  No filters yet. Add a filter to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filters.map((filter) => (
                  <div
                    key={filter.id}
                    className={`rounded-xl border p-4 transition-all shadow-sm ${
                      filter.enabled
                        ? 'border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={filter.enabled}
                        onChange={() => toggleFilter(filter.id)}
                        className="mt-1.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <input
                        type="text"
                        value={filter.name}
                        onChange={(e) => updateFilter(filter.id, { name: e.target.value })}
                        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 transition-colors"
                        placeholder="Filter name"
                      />
                      <button
                        onClick={() => removeFilter(filter.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all hover:scale-110"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 ml-7">
                      <input
                        type="text"
                        value={filter.column}
                        onChange={(e) => updateFilter(filter.id, { column: e.target.value })}
                        placeholder="Column"
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 transition-colors"
                      >
                        <option value="=">=</option>
                        <option value="!=">!=</option>
                        <option value=">">{'>'}</option>
                        <option value="<">{'<'}</option>
                        <option value=">=">{'>='}</option>
                        <option value="<=">{'<='}</option>
                        <option value="LIKE">LIKE</option>
                        <option value="IN">IN</option>
                      </select>
                      <input
                        type="text"
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        placeholder="Value"
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700/50 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl flex gap-3">
            <button
              onClick={addFilter}
              className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Filter
            </button>
            <button
              onClick={() => setShowPanel(false)}
              className="px-6 py-3.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
