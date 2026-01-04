'use client';

interface ShardVisualizationProps {
  shardCount: number;
  replicaCount: number;
}

export default function ShardVisualization({ shardCount, replicaCount }: ShardVisualizationProps) {
  const totalShards = Math.min(shardCount, 16); // Limit visualization to 16 shards
  const totalNodes = totalShards * (replicaCount + 1); // primary + replicas

  const getShardColor = (index: number, isPrimary: boolean) => {
    if (isPrimary) {
      return '#9333ea'; // Purple for primary
    }
    return '#10b981'; // Green for replicas
  };

  const calculatePosition = (index: number, total: number) => {
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;
    return { x: col * 120 + 60, y: row * 100 + 60 };
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <h4 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
        Shard & Replica Distribution
      </h4>

      <svg
        width="100%"
        height={Math.ceil(Math.sqrt(totalShards)) * 100 + 20}
        viewBox={`0 0 ${Math.ceil(Math.sqrt(totalShards)) * 120 + 20} ${Math.ceil(Math.sqrt(totalShards)) * 100 + 20}`}
        className="mx-auto"
      >
        {/* Draw primary shards */}
        {Array.from({ length: totalShards }).map((_, i) => {
          const pos = calculatePosition(i, totalShards);

          return (
            <g key={`primary-${i}`}>
              {/* Primary shard */}
              <rect
                x={pos.x - 40}
                y={pos.y - 30}
                width="80"
                height="60"
                rx="8"
                fill={getShardColor(i, true)}
                stroke="#7c3aed"
                strokeWidth="2"
              />
              <text
                x={pos.x}
                y={pos.y - 5}
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
              >
                P{i + 1}
              </text>
              <text
                x={pos.x}
                y={pos.y + 10}
                textAnchor="middle"
                fill="white"
                fontSize="10"
              >
                Primary
              </text>

              {/* Replica badges */}
              {replicaCount > 0 && (
                <g>
                  {Array.from({ length: Math.min(replicaCount, 3) }).map((_, r) => (
                    <circle
                      key={`replica-${i}-${r}`}
                      cx={pos.x - 30 + r * 30}
                      cy={pos.y + 40}
                      r="8"
                      fill={getShardColor(i, false)}
                      stroke="#059669"
                      strokeWidth="1.5"
                    />
                  ))}
                  {replicaCount > 3 && (
                    <text
                      x={pos.x + 30}
                      y={pos.y + 44}
                      fontSize="10"
                      fill="#6b7280"
                      fontWeight="bold"
                    >
                      +{replicaCount - 3}
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 rounded bg-purple-600" />
          <span className="text-gray-700 dark:text-gray-300">Primary Shard</span>
        </div>
        {replicaCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-green-600" />
            <span className="text-gray-700 dark:text-gray-300">Replica</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {totalShards}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Primary Shards</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {replicaCount}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Replicas per Shard</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalNodes}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Nodes</p>
        </div>
      </div>

      {shardCount > 16 && (
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Showing first 16 of {shardCount} shards
        </p>
      )}
    </div>
  );
}
