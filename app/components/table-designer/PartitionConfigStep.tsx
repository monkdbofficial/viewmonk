'use client';

import { TableDesign } from './TableDesignerWizard';

interface PartitionConfigStepProps {
  design: TableDesign;
  setDesign: (design: TableDesign) => void;
}

export default function PartitionConfigStep({ design, setDesign }: PartitionConfigStepProps) {
  const enabled = design.partition_config?.enabled || false;
  const partitionColumn = design.partition_config?.partition_column;

  // MonkDB only supports value-based partitioning on primitive types
  const primitiveColumns = design.columns.filter(col => {
    const t = col.column_type.toUpperCase().split('(')[0].trim();
    return !['OBJECT', 'ARRAY', 'GEO_POINT', 'GEO_SHAPE', 'FLOAT_VECTOR'].includes(t)
      && !t.startsWith('ARRAY');
  });

  const toggleEnabled = () => {
    setDesign({
      ...design,
      partition_config: {
        enabled: !enabled,
        partition_column: !enabled ? undefined : partitionColumn,
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
          Optional: Partition your table by a column value for improved query performance on large datasets
        </p>
      </div>

      {/* MonkDB info callout */}
      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">MonkDB Value-Based Partitioning</p>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-400">
            MonkDB uses <strong>value-based partitioning</strong> — each distinct value in the partition column
            becomes its own partition. No manual range or list configuration is required.
            The partition column must be a primitive type (not OBJECT or ARRAY).
          </p>
        </div>
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
            Add a <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">PARTITIONED BY</code> clause to the
            CREATE TABLE statement. Useful for time-series, log, and event data.
          </p>
        </div>
      </div>

      {enabled && (
        <>
          {/* Partition Column Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Partition Column <span className="text-red-500">*</span>
            </label>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              MonkDB will create a new partition for each distinct value in this column.
              Only primitive types are allowed (TEXT, INTEGER, TIMESTAMP, DATE, BOOLEAN, etc.).
            </p>

            <select
              value={partitionColumn || ''}
              onChange={(e) => updatePartitionColumn(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select a column…</option>
              {primitiveColumns.map((column) => (
                <option key={column.name} value={column.name}>
                  {column.name} ({column.column_type})
                </option>
              ))}
            </select>

            {primitiveColumns.length === 0 && design.columns.length > 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                No valid partition columns found. Add a TEXT, INTEGER, TIMESTAMP, DATE, or BOOLEAN column first.
              </p>
            )}
          </div>

          {/* Suggested columns */}
          {primitiveColumns.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Suggested Columns
              </p>
              <div className="flex flex-wrap gap-2">
                {primitiveColumns.map((col) => {
                  const t = col.column_type.toUpperCase();
                  const isGood = t.includes('TIMESTAMP') || t.includes('DATE') || t === 'TEXT' || t.includes('VARCHAR');
                  return (
                    <button
                      key={col.name}
                      onClick={() => updatePartitionColumn(col.name)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        partitionColumn === col.name
                          ? 'bg-purple-600 text-white'
                          : isGood
                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {col.name}
                      <span className="ml-1 opacity-60">({col.column_type})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SQL preview */}
          {partitionColumn && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Generated Clause</p>
              <pre className="font-mono text-sm text-green-600 dark:text-green-400">
                {`PARTITIONED BY ("${partitionColumn}")`}
              </pre>
            </div>
          )}

          {/* Benefits */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Benefits of Partitioning
            </h4>
            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
              <li>• <strong>Partition pruning</strong>: Queries with a WHERE clause on the partition column scan only relevant partitions</li>
              <li>• <strong>Bulk delete</strong>: Drop entire partitions (e.g., old months) instantly without DELETE overhead</li>
              <li>• <strong>Lifecycle management</strong>: Easily archive or expire old data by partition</li>
              <li>• <strong>Parallel ingestion</strong>: MonkDB can write to multiple partitions simultaneously</li>
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
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Partitioning is Optional
          </h4>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Enable partitioning when you have a high-cardinality column (like a timestamp or category)
            that you frequently filter on. For small to medium tables it's often unnecessary.
          </p>
        </div>
      )}
    </div>
  );
}
