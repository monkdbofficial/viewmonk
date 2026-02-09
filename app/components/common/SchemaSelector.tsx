/**
 * SchemaSelector Component
 * Enterprise-grade: Allows users to switch between accessible schemas
 * Shows current schema and available options
 */

'use client';

import React from 'react';
import { Database, ChevronDown } from 'lucide-react';
import { useSchema } from '../../contexts/schema-context';
import { useAccessibleSchemas } from '../../hooks/useAccessibleSchemas';

export function SchemaSelector() {
  const { activeSchema, setActiveSchema } = useSchema();
  const { schemas, loading } = useAccessibleSchemas();

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
        <Database className="h-4 w-4 text-gray-400" />
        <span className="text-gray-500 dark:text-gray-400">Loading schemas...</span>
      </div>
    );
  }

  if (schemas.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
        <Database className="h-4 w-4 text-gray-400" />
        <span className="text-gray-500 dark:text-gray-400">No schemas accessible</span>
      </div>
    );
  }

  // If only one schema, show it as read-only
  if (schemas.length === 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
        <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="font-medium text-gray-900 dark:text-white">
          {schemas[0].name}
        </span>
      </div>
    );
  }

  // Multiple schemas - show selector
  return (
    <div className="relative">
      <select
        value={activeSchema || schemas[0].name}
        onChange={(e) => setActiveSchema(e.target.value)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white pl-9 pr-10 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
      >
        {schemas.map((schema) => (
          <option key={schema.name} value={schema.name}>
            {schema.name}
          </option>
        ))}
      </select>
      <Database className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600 dark:text-blue-400" />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

export default SchemaSelector;
