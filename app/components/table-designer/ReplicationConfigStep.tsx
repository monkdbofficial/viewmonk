'use client';

import { Server, HardDrive, Archive } from 'lucide-react';
import { TableDesign } from './TableDesignerWizard';

interface ReplicationConfigStepProps {
  design: TableDesign;
  setDesign: (design: TableDesign) => void;
}

const TIERS = [
  {
    value: 'hot' as const,
    label: 'Hot Tier',
    icon: Server,
    color: 'red',
    description: 'High-performance storage for frequently accessed data',
    features: ['Fastest access', 'SSD-backed', 'Higher cost'],
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-900 dark:text-red-300',
  },
  {
    value: 'warm' as const,
    label: 'Warm Tier',
    icon: HardDrive,
    color: 'yellow',
    description: 'Balanced storage for moderately accessed data',
    features: ['Good performance', 'HDD-backed', 'Moderate cost'],
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-900 dark:text-yellow-300',
  },
  {
    value: 'cold' as const,
    label: 'Cold Tier',
    icon: Archive,
    color: 'blue',
    description: 'Cost-effective storage for infrequently accessed data',
    features: ['Slower access', 'Archive storage', 'Lowest cost'],
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-900 dark:text-blue-300',
  },
];

export default function ReplicationConfigStep({ design, setDesign }: ReplicationConfigStepProps) {
  const replicaCount = design.replication_config?.number_of_replicas ?? 1;
  const tierAllocation = design.replication_config?.tier_allocation || 'hot';

  const updateReplicaCount = (count: number) => {
    setDesign({
      ...design,
      replication_config: {
        ...design.replication_config!,
        number_of_replicas: count,
      },
    });
  };

  const updateTierAllocation = (tier: 'hot' | 'warm' | 'cold') => {
    setDesign({
      ...design,
      replication_config: {
        ...design.replication_config!,
        tier_allocation: tier,
      },
    });
  };

  const getStorageEstimate = () => {
    const baseSize = 100; // Mock base size in GB
    const totalSize = baseSize * (replicaCount + 1); // Primary + replicas
    return totalSize;
  };

  const getReliabilityScore = () => {
    if (replicaCount === 0) return { score: 60, label: 'Basic', color: 'orange' };
    if (replicaCount === 1) return { score: 85, label: 'Good', color: 'green' };
    if (replicaCount >= 2) return { score: 95, label: 'Excellent', color: 'green' };
    return { score: 100, label: 'Maximum', color: 'green' };
  };

  const reliability = getReliabilityScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Replication & Storage Configuration
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure data redundancy and storage tier for high availability
        </p>
      </div>

      {/* Number of Replicas */}
      <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <label className="mb-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Number of Replicas: <span className="text-2xl font-bold text-purple-600">{replicaCount}</span>
        </label>

        {/* Slider */}
        <input
          type="range"
          min="0"
          max="5"
          value={replicaCount}
          onChange={(e) => updateReplicaCount(parseInt(e.target.value))}
          className="h-3 w-full cursor-pointer appearance-none rounded-lg"
          style={{
            background: `linear-gradient(to right, rgb(147, 51, 234) 0%, rgb(147, 51, 234) ${(replicaCount / 5) * 100}%, rgb(229, 231, 235) ${(replicaCount / 5) * 100}%, rgb(229, 231, 235) 100%)`,
          }}
        />

        <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>0 (no replicas)</span>
          <span>2 replicas</span>
          <span>5 replicas</span>
        </div>

        {/* Reliability Score */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Data Reliability
            </span>
            <span className={`text-lg font-bold ${
              reliability.color === 'green'
                ? 'text-green-600 dark:text-green-400'
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {reliability.score}% {reliability.label}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full ${
                reliability.color === 'green' ? 'bg-green-600' : 'bg-orange-600'
              }`}
              style={{ width: `${reliability.score}%` }}
            />
          </div>
        </div>

        {/* Storage Estimate */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
          <div>
            <p className="text-sm font-medium text-purple-900 dark:text-purple-300">
              Estimated Storage
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-400">
              1 primary + {replicaCount} replica{replicaCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            ~{getStorageEstimate()} GB
          </div>
        </div>
      </div>

      {/* Storage Tier Selection */}
      <div>
        <label className="mb-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Storage Tier
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const isSelected = tierAllocation === tier.value;

            return (
              <button
                key={tier.value}
                onClick={() => updateTierAllocation(tier.value)}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg p-2 ${tier.bgColor}`}>
                    <Icon className={`h-6 w-6 ${tier.textColor}`} />
                  </div>
                  {isSelected && (
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

                <h4 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                  {tier.label}
                </h4>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {tier.description}
                </p>

                <ul className="mt-3 space-y-1">
                  {tier.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300"
                    >
                      <div className="h-1 w-1 rounded-full bg-gray-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Representation */}
      <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <h4 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          Replication Architecture
        </h4>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {/* Primary Shard */}
          <div className="text-center">
            <div className="rounded-lg border-2 border-purple-600 bg-purple-100 p-4 dark:bg-purple-900/30">
              <Server className="mx-auto h-8 w-8 text-purple-600 dark:text-purple-400" />
              <p className="mt-2 text-xs font-medium text-purple-900 dark:text-purple-300">
                Primary
              </p>
            </div>
          </div>

          {replicaCount > 0 && (
            <>
              <div className="text-2xl text-gray-400">→</div>

              {/* Replicas */}
              {Array.from({ length: replicaCount }).map((_, i) => (
                <div key={i} className="text-center">
                  <div className="rounded-lg border-2 border-green-600 bg-green-100 p-4 dark:bg-green-900/30">
                    <Server className="mx-auto h-8 w-8 text-green-600 dark:text-green-400" />
                    <p className="mt-2 text-xs font-medium text-green-900 dark:text-green-300">
                      Replica {i + 1}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          {replicaCount === 0
            ? 'No replication - single point of failure'
            : `Data is replicated across ${replicaCount + 1} server${replicaCount + 1 > 1 ? 's' : ''} for high availability`}
        </p>
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Understanding Replication:
        </h4>
        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>• <strong>0 replicas</strong>: No redundancy - data loss if server fails</li>
          <li>• <strong>1 replica</strong>: Good balance - can survive 1 server failure</li>
          <li>• <strong>2+ replicas</strong>: High availability - can survive multiple failures</li>
          <li>• Replicas provide read scalability and fault tolerance</li>
          <li>• Choose storage tier based on access patterns and budget</li>
        </ul>
      </div>

      {/* Warnings */}
      {replicaCount === 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <p className="text-sm font-medium text-orange-900 dark:text-orange-300">
            ⚠️ No Replication Warning
          </p>
          <p className="mt-1 text-sm text-orange-800 dark:text-orange-400">
            With 0 replicas, your data has no redundancy. If the server fails, data may be lost.
            We recommend at least 1 replica for production use.
          </p>
        </div>
      )}

      {replicaCount > 3 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
            💡 High Replica Count
          </p>
          <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-400">
            More than 3 replicas consumes significant storage.
            Ensure you have sufficient disk space and budget for this configuration.
          </p>
        </div>
      )}
    </div>
  );
}
