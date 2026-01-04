'use client';

import { TableDesign } from './TableDesignerWizard';

interface PartitionConfigStepProps {
  design: TableDesign;
  setDesign: (design: TableDesign) => void;
}

const PARTITION_TYPES = [
  {
    value: 'RANGE' as const,
    label: 'Range Partitioning',
    description: 'Partition by value ranges (e.g., dates, numbers)',
    example: 'Split by date ranges: 2023-Q1, 2023-Q2, etc.',
    bestFor: 'Time-series data, sequential IDs',
  },
  {
    value: 'LIST' as const,
    label: 'List Partitioning',
    description: 'Partition by discrete values (e.g., categories)',
    example: 'Split by country: US, UK, DE, etc.',
    bestFor: 'Categorical data, regions, types',
  },
  {
    value: 'HASH' as const,
    label: 'Hash Partitioning',
    description: 'Automatic even distribution using hash function',
    example: 'Evenly distribute across partitions by hashing column value',
    bestFor: 'Even distribution without specific ranges',
  },
];

export default function PartitionConfigStep({ design, setDesign }: PartitionConfigStepProps) {
  const enabled = design.partition_config?.enabled || false;
  const partitionType = design.partition_config?.partition_type;
  const partitionColumn = design.partition_config?.partition_column;

  const toggleEnabled = () => {
    setDesign({
      ...design,
      partition_config: {
        enabled: !enabled,
        partition_type: !enabled ? 'RANGE' : undefined,
        partition_column: !enabled ? undefined : partitionColumn,
      },
    });
  };

  const updatePartitionType = (type: 'RANGE' | 'LIST' | 'HASH') => {
    setDesign({
      ...design,
      partition_config: {
        ...design.partition_config!,
        partition_type: type,
      },
    });
  };

  const updatePartitionColumn = (column: string) => {
    setDesign({
      ...design,
      partition_config: {
        ...design.partition_config!,
        partition_column: column || undefined,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Partitioning Configuration
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Optional: Partition your table for improved query performance and data management
        </p>
      </div>

      {/* Enable/Disable Partitioning */}
      <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <input
          type="checkbox"
          id="enable-partitioning"
          checked={enabled}
          onChange={toggleEnabled}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
        <div className="flex-1">
          <label
            htmlFor="enable-partitioning"
            className="block text-sm font-medium text-gray-900 dark:text-white"
          >
            Enable Table Partitioning
          </label>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Partition this table by a column value for better query performance on large datasets
          </p>
        </div>
      </div>

      {enabled && (
        <>
          {/* Partition Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Partition Type <span className="text-red-600">*</span>
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              {PARTITION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => updatePartitionType(type.value)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    partitionType === type.value
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {type.label}
                    </h4>
                    {partitionType === type.value && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600">
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    {type.description}
                  </p>
                  <div className="mt-3 rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      Best for: {type.bestFor}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Partition Column Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Partition Column <span className="text-red-600">*</span>
            </label>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Select the column to partition by. This column will be used to split data across partitions.
            </p>

            <select
              value={partitionColumn || ''}
              onChange={(e) => updatePartitionColumn(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select a column...</option>
              {design.columns.map((column) => (
                <option key={column.name} value={column.name}>
                  {column.name} ({column.column_type})
                </option>
              ))}
            </select>

            {partitionColumn && partitionType && (
              <div className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <h5 className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  Partitioning Preview: {PARTITION_TYPES.find((t) => t.value === partitionType)?.label}
                </h5>
                <p className="mt-2 text-sm text-blue-800 dark:text-blue-400">
                  {PARTITION_TYPES.find((t) => t.value === partitionType)?.example}
                </p>
                <p className="mt-2 text-xs text-blue-700 dark:text-blue-500">
                  Column: <strong>{partitionColumn}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Column Recommendations */}
          {partitionType && (
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Recommended Columns for {PARTITION_TYPES.find((t) => t.value === partitionType)?.label}:
              </h4>
              <div className="flex flex-wrap gap-2">
                {design.columns
                  .filter((col) => {
                    if (partitionType === 'RANGE') {
                      return ['TIMESTAMP', 'DATE', 'INTEGER', 'LONG'].includes(col.column_type);
                    }
                    if (partitionType === 'LIST') {
                      return ['TEXT', 'VARCHAR', 'INTEGER'].includes(col.column_type);
                    }
                    return true; // HASH can use any column
                  })
                  .map((col) => (
                    <button
                      key={col.name}
                      onClick={() => updatePartitionColumn(col.name)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                        partitionColumn === col.name
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {col.name} ({col.column_type})
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Benefits of Partitioning:
            </h4>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• <strong>Faster queries</strong>: Only scan relevant partitions instead of full table</li>
              <li>• <strong>Easier maintenance</strong>: Drop old partitions instead of deleting rows</li>
              <li>• <strong>Better organization</strong>: Logical data separation (e.g., by date or region)</li>
              <li>• <strong>Improved performance</strong>: Parallel processing of different partitions</li>
            </ul>
          </div>
        </>
      )}

      {!enabled && (
        <div className="rounded-lg border border-gray-200 p-8 text-center dark:border-gray-700">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
            </svg>
          </div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Partitioning is Optional
          </h4>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Enable partitioning if you have a large dataset and want to improve query performance.
            For small to medium tables, partitioning may not be necessary.
          </p>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            You can skip this step and continue to the next.
          </p>
        </div>
      )}
    </div>
  );
}
