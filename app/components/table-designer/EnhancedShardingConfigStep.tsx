'use client';

import { useState, useEffect } from 'react';
import {
  Info,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Database,
  Zap,
  Target,
  BarChart3,
  Layers,
  ArrowRight,
  Lightbulb,
  Shield,
  Clock,
} from 'lucide-react';
import { TableDesign } from './TableDesignerWizard';
import ShardVisualization from './ShardVisualization';

interface EnhancedShardingConfigStepProps {
  design: TableDesign;
  setDesign: (design: TableDesign) => void;
}

// Preset configurations for different use cases
const SHARD_PRESETS = [
  {
    id: 'small',
    name: 'Small Dataset',
    shards: 4,
    description: '< 1M rows',
    useCase: 'Startups, small applications, testing',
    performance: 'Excellent',
    overhead: 'Minimal',
    icon: Database,
  },
  {
    id: 'medium',
    name: 'Medium Dataset',
    shards: 6,
    description: '1M - 10M rows',
    useCase: 'Growing applications, moderate traffic',
    performance: 'Very Good',
    overhead: 'Low',
    icon: TrendingUp,
    recommended: true,
  },
  {
    id: 'large',
    name: 'Large Dataset',
    shards: 12,
    description: '10M - 100M rows',
    useCase: 'High-traffic applications, analytics',
    performance: 'Good',
    overhead: 'Moderate',
    icon: Layers,
  },
  {
    id: 'xlarge',
    name: 'Very Large Dataset',
    shards: 24,
    description: '100M+ rows',
    useCase: 'Enterprise scale, big data',
    performance: 'Optimized',
    overhead: 'Higher',
    icon: Shield,
  },
];

// Performance metrics for different shard counts
const getPerformanceMetrics = (shards: number, estimatedRows: number = 1000000) => {
  const rowsPerShard = Math.ceil(estimatedRows / shards);
  const querySpeedup = Math.min(shards, 16); // Diminishing returns after 16
  const overhead = Math.ceil((shards / 32) * 100);

  return {
    rowsPerShard,
    querySpeedup: querySpeedup.toFixed(1),
    parallelization: `${querySpeedup}x`,
    overhead: `${overhead}%`,
    scanTime: `${(1000 / querySpeedup).toFixed(0)}ms`,
  };
};

export default function EnhancedShardingConfigStep({
  design,
  setDesign,
}: EnhancedShardingConfigStepProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('medium');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [estimatedRows, setEstimatedRows] = useState<number>(1000000);
  const [showVisualization, setShowVisualization] = useState(true);

  const shardCount = design.sharding_config?.shard_count || 6;
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

  const applyPreset = (preset: typeof SHARD_PRESETS[0]) => {
    setSelectedPreset(preset.id);
    updateShardCount(preset.shards);
  };

  const getShardHealthStatus = () => {
    if (shardCount <= 4) {
      return {
        color: 'green',
        status: 'Optimal',
        message: 'Excellent for small to medium datasets',
        icon: CheckCircle,
      };
    }
    if (shardCount <= 12) {
      return {
        color: 'blue',
        status: 'Good',
        message: 'Well-balanced for most production workloads',
        icon: TrendingUp,
      };
    }
    if (shardCount <= 20) {
      return {
        color: 'yellow',
        status: 'High',
        message: 'Suitable for large-scale applications',
        icon: Info,
      };
    }
    return {
      color: 'orange',
      status: 'Very High',
      message: 'Enterprise-scale configuration',
      icon: AlertTriangle,
    };
  };

  const getColumnRecommendation = (column: any) => {
    const isPrimaryKey = column.constraints.includes('PRIMARY KEY');
    const isUnique = column.constraints.includes('UNIQUE');
    const type = column.column_type.toUpperCase();

    let score = 0;
    let reasons = [];

    if (isPrimaryKey) {
      score += 40;
      reasons.push('Primary Key (high cardinality)');
    }
    if (isUnique) {
      score += 30;
      reasons.push('Unique constraint');
    }
    if (['INTEGER', 'LONG', 'TEXT', 'VARCHAR'].includes(type)) {
      score += 20;
      reasons.push('Good distribution type');
    }
    if (type === 'BOOLEAN') {
      score -= 50;
      reasons.push('Low cardinality (avoid)');
    }

    return { score, reasons };
  };

  const healthStatus = getShardHealthStatus();
  const StatusIcon = healthStatus.icon;
  const metrics = getPerformanceMetrics(shardCount, estimatedRows);

  // Get recommended columns
  const columnsWithScores = design.columns.map((col) => ({
    ...col,
    recommendation: getColumnRecommendation(col),
  }));
  const recommendedColumns = columnsWithScores
    .filter((c) => c.recommendation.score > 0)
    .sort((a, b) => b.recommendation.score - a.recommendation.score);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-6 dark:border-purple-800 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-purple-600 shadow-lg">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Sharding Strategy Configuration
            </h3>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              Distribute data across multiple shards for horizontal scalability and optimal query
              performance
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                <Zap className="h-3 w-3" />
                Performance Critical
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <Target className="h-3 w-3" />
                Production Ready
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Quick Configuration Presets
        </h4>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {SHARD_PRESETS.map((preset) => {
            const PresetIcon = preset.icon;
            const isSelected = selectedPreset === preset.id;

            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 shadow-lg dark:border-purple-500 dark:bg-purple-900/30'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-purple-700'
                }`}
              >
                {preset.recommended && (
                  <div className="absolute right-2 top-2">
                    <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <Lightbulb className="h-3 w-3" />
                      Recommended
                    </span>
                  </div>
                )}

                <div className="mb-3 flex items-center gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-purple-100 group-hover:text-purple-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <PresetIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-bold text-gray-900 dark:text-white">
                      {preset.name}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {preset.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Shards:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {preset.shards}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Performance:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {preset.performance}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Overhead:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {preset.overhead}
                    </span>
                  </div>
                </div>

                <p className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  {preset.useCase}
                </p>

                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Configuration */}
      <div className="rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Advanced Shard Configuration
            </span>
          </div>
          <ArrowRight
            className={`h-5 w-5 text-gray-400 transition-transform ${
              showAdvanced ? 'rotate-90' : ''
            }`}
          />
        </button>

        {showAdvanced && (
          <div className="border-t border-gray-200 p-4 space-y-4 dark:border-gray-700">
            {/* Custom Shard Count */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Number of Shards
                </label>
                <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {shardCount}
                </span>
              </div>

              {/* Slider with gradient */}
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="32"
                  value={shardCount}
                  onChange={(e) => {
                    updateShardCount(parseInt(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  className="h-3 w-full cursor-pointer appearance-none rounded-lg"
                  style={{
                    background: `linear-gradient(to right,
                      rgb(147, 51, 234) 0%,
                      rgb(147, 51, 234) ${((shardCount - 1) / 31) * 100}%,
                      rgb(229, 231, 235) ${((shardCount - 1) / 31) * 100}%,
                      rgb(229, 231, 235) 100%)`,
                  }}
                />
                <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>1</span>
                  <span>8</span>
                  <span>16</span>
                  <span>24</span>
                  <span>32</span>
                </div>
              </div>

              {/* Status Badge */}
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg border-2 p-3 ${
                  healthStatus.color === 'green'
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    : healthStatus.color === 'blue'
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                      : healthStatus.color === 'yellow'
                        ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                        : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
                }`}
              >
                <StatusIcon
                  className={`h-5 w-5 ${
                    healthStatus.color === 'green'
                      ? 'text-green-600 dark:text-green-400'
                      : healthStatus.color === 'blue'
                        ? 'text-blue-600 dark:text-blue-400'
                        : healthStatus.color === 'yellow'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-orange-600 dark:text-orange-400'
                  }`}
                />
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      healthStatus.color === 'green'
                        ? 'text-green-900 dark:text-green-300'
                        : healthStatus.color === 'blue'
                          ? 'text-blue-900 dark:text-blue-300'
                          : healthStatus.color === 'yellow'
                            ? 'text-yellow-900 dark:text-yellow-300'
                            : 'text-orange-900 dark:text-orange-300'
                    }`}
                  >
                    {healthStatus.status} Configuration
                  </p>
                  <p
                    className={`text-xs ${
                      healthStatus.color === 'green'
                        ? 'text-green-700 dark:text-green-400'
                        : healthStatus.color === 'blue'
                          ? 'text-blue-700 dark:text-blue-400'
                          : healthStatus.color === 'yellow'
                            ? 'text-yellow-700 dark:text-yellow-400'
                            : 'text-orange-700 dark:text-orange-400'
                    }`}
                  >
                    {healthStatus.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
                <BarChart3 className="h-4 w-4" />
                Performance Projection
              </h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-400">Query Speedup</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                    {metrics.parallelization}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-400">Overhead</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                    {metrics.overhead}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-400">Avg Scan Time</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                    {metrics.scanTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-400">Rows/Shard</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                    {(metrics.rowsPerShard / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clustering Column (Routing Key) */}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Clustering Column (Routing Key)
            </h4>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Select a column to control data distribution. Rows with the same value will be stored
              on the same shard, improving query performance.
            </p>
          </div>
        </div>

        <select
          value={clusteringColumn || ''}
          onChange={(e) => updateClusteringColumn(e.target.value)}
          className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium transition-all focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">🎲 No clustering column (random distribution)</option>
          {design.columns.map((column, index) => {
            const rec = getColumnRecommendation(column);
            const emoji = rec.score > 50 ? '⭐' : rec.score > 20 ? '✓' : '⚠️';
            return (
              <option key={`column-${index}-${column.name}`} value={column.name}>
                {emoji} {column.name} ({column.column_type})
                {rec.score > 50 ? ' - Recommended' : ''}
              </option>
            );
          })}
        </select>

        {/* Column Recommendations */}
        {recommendedColumns.length > 0 && !clusteringColumn && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <h5 className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-900 dark:text-green-300">
              <Lightbulb className="h-4 w-4" />
              Recommended Clustering Columns
            </h5>
            <div className="space-y-2">
              {recommendedColumns.slice(0, 3).map((col, idx) => (
                <button
                  key={idx}
                  onClick={() => updateClusteringColumn(col.name)}
                  className="flex w-full items-center justify-between rounded-md border border-green-200 bg-white p-2 text-left text-xs transition-all hover:border-green-400 hover:shadow-sm dark:border-green-700 dark:bg-gray-800"
                >
                  <div className="flex-1">
                    <p className="font-mono font-semibold text-gray-900 dark:text-white">
                      {col.name}
                    </p>
                    <p className="text-green-700 dark:text-green-400">
                      {col.recommendation.reasons.join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600 dark:text-green-400">
                      {col.recommendation.score}%
                    </div>
                    <div className="text-green-600 dark:text-green-400">match</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Column Info */}
        {clusteringColumn && (
          <div className="mt-4 rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                  Smart Routing Enabled
                </p>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                  Rows with the same <span className="font-mono font-bold">{clusteringColumn}</span>{' '}
                  value will be co-located on the same shard. Queries filtering by this column will
                  be up to {metrics.querySpeedup}x faster!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shard Visualization */}
      {showVisualization && (
        <ShardVisualization
          shardCount={Math.min(shardCount, 16)}
          replicaCount={design.replication_config?.number_of_replicas || 0}
        />
      )}

      {/* Best Practices */}
      <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-5 dark:border-purple-800 dark:bg-purple-900/20">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-purple-900 dark:text-purple-300">
          <Shield className="h-5 w-5" />
          Production Best Practices
        </h4>
        <ul className="space-y-2 text-xs text-purple-800 dark:text-purple-300">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-purple-600 dark:text-purple-400" />
            <span>
              <strong>4-12 shards</strong> optimal for most production workloads
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-purple-600 dark:text-purple-400" />
            <span>
              <strong>Clustering column</strong> should have high cardinality (many unique values)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-purple-600 dark:text-purple-400" />
            <span>
              <strong>Primary keys</strong> are excellent clustering candidates
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-purple-600 dark:text-purple-400" />
            <span>
              <strong>Avoid boolean columns</strong> for clustering (only 2 values)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-purple-600 dark:text-purple-400" />
            <span>
              <strong>More shards</strong> = more parallelization but higher overhead
            </span>
          </li>
        </ul>
      </div>

      {/* Warnings */}
      {shardCount > 20 && (
        <div className="rounded-lg border-2 border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-sm font-bold text-orange-900 dark:text-orange-300">
                High Shard Count Warning
              </p>
              <p className="mt-1 text-xs text-orange-800 dark:text-orange-400">
                Using {shardCount} shards significantly increases cluster overhead. This
                configuration is recommended only for very large datasets (100M+ rows) with proven
                performance bottlenecks. Consider starting with 12 shards and scaling up as needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {!clusteringColumn && design.columns.length > 0 && (
        <div className="rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-sm font-bold text-yellow-900 dark:text-yellow-300">
                Clustering Column Recommended
              </p>
              <p className="mt-1 text-xs text-yellow-800 dark:text-yellow-400">
                Consider selecting a clustering column to improve query performance by up to{' '}
                {metrics.querySpeedup}x. The primary key column is often an excellent choice for
                routing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
