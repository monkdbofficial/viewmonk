'use client';

import { TableDesign } from './TableDesignerWizard';

interface ShardingConfigStepProps {
  design: TableDesign;
  setDesign: (design: TableDesign) => void;
}

export default function ShardingConfigStep({ design, setDesign }: ShardingConfigStepProps) {
  const shardCount = design.sharding_config?.shard_count || 4;
  const clusteringColumn = design.sharding_config?.clustering_column;

  const updateShardCount = (count: number) => {
    setDesign({
      ...design,
      sharding_config: {
        ...design.sharding_config!,
        shard_count: count,
      },
    });
  };

  const updateClusteringColumn = (column: string) => {
    setDesign({
      ...design,
      sharding_config: {
        ...design.sharding_config!,
        clustering_column: column || undefined,
      },
    });
  };

  const getShardsPerformance = () => {
    if (shardCount <= 4) return { color: 'green', label: 'Optimal', description: 'Good for small to medium datasets' };
    if (shardCount <= 16) return { color: 'yellow', label: 'Moderate', description: 'Good for large datasets' };
    return { color: 'orange', label: 'High', description: 'May impact query performance for small datasets' };
  };

  const performance = getShardsPerformance();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Sharding Configuration
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Distribute data across multiple shards for horizontal scalability
        </p>
      </div>

      {/* Shard Count */}
      <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <label className="mb-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Number of Shards: <span className="text-2xl font-bold text-purple-600">{shardCount}</span>
        </label>

        {/* Slider */}
        <input
          type="range"
          min="1"
          max="32"
          value={shardCount}
          onChange={(e) => updateShardCount(parseInt(e.target.value))}
          className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
          style={{
            background: `linear-gradient(to right, rgb(147, 51, 234) 0%, rgb(147, 51, 234) ${((shardCount - 1) / 31) * 100}%, rgb(229, 231, 235) ${((shardCount - 1) / 31) * 100}%, rgb(229, 231, 235) 100%)`,
          }}
        />

        <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>1 shard</span>
          <span>16 shards</span>
          <span>32 shards</span>
        </div>

        {/* Performance Indicator */}
        <div className={`mt-4 rounded-lg border p-4 ${
          performance.color === 'green'
            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
            : performance.color === 'yellow'
              ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
              : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${
              performance.color === 'green'
                ? 'bg-green-600'
                : performance.color === 'yellow'
                  ? 'bg-yellow-600'
                  : 'bg-orange-600'
            }`} />
            <span className={`text-sm font-medium ${
              performance.color === 'green'
                ? 'text-green-900 dark:text-green-300'
                : performance.color === 'yellow'
                  ? 'text-yellow-900 dark:text-yellow-300'
                  : 'text-orange-900 dark:text-orange-300'
            }`}>
              {performance.label} Performance
            </span>
          </div>
          <p className={`mt-1 text-sm ${
            performance.color === 'green'
              ? 'text-green-800 dark:text-green-400'
              : performance.color === 'yellow'
                ? 'text-yellow-800 dark:text-yellow-400'
                : 'text-orange-800 dark:text-orange-400'
          }`}>
            {performance.description}
          </p>
        </div>
      </div>

      {/* Clustering Column */}
      <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Clustering Column (Routing Key)
        </label>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Select a column to determine which shard each row is stored in. This improves query performance for shard-specific queries.
        </p>

        <select
          value={clusteringColumn || ''}
          onChange={(e) => updateClusteringColumn(e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">No clustering column (random distribution)</option>
          {design.columns.map((column) => (
            <option key={column.name} value={column.name}>
              {column.name} ({column.column_type})
            </option>
          ))}
        </select>

        {clusteringColumn && (
          <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              ✓ Rows with the same <strong>{clusteringColumn}</strong> value will be stored in the same shard
            </p>
          </div>
        )}
      </div>

      {/* Visual Representation */}
      <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <h4 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          Shard Distribution Preview
        </h4>
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: Math.min(shardCount, 32) }).map((_, i) => (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-lg bg-purple-100 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
            >
              S{i + 1}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Each square represents a shard. Data will be distributed across these {shardCount} shard{shardCount > 1 ? 's' : ''}.
        </p>
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Understanding Sharding:
        </h4>
        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>• <strong>More shards</strong>: Better distribution for large datasets, but more overhead</li>
          <li>• <strong>Fewer shards</strong>: Lower overhead, sufficient for most use cases</li>
          <li>• <strong>Clustering column</strong>: Groups related rows together on the same shard</li>
          <li>• Choose a clustering column with high cardinality (many unique values) for even distribution</li>
          <li>• Primary key columns are often good candidates for clustering</li>
        </ul>
      </div>

      {/* Warnings */}
      {shardCount > 16 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <p className="text-sm font-medium text-orange-900 dark:text-orange-300">
            ⚠️ High Shard Count Warning
          </p>
          <p className="mt-1 text-sm text-orange-800 dark:text-orange-400">
            Using more than 16 shards may impact query performance and increase overhead.
            This is recommended only for very large datasets (100M+ rows).
          </p>
        </div>
      )}

      {!clusteringColumn && design.columns.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
            💡 Recommendation
          </p>
          <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-400">
            Consider selecting a clustering column for better query performance.
            The primary key column is often a good choice.
          </p>
        </div>
      )}
    </div>
  );
}
