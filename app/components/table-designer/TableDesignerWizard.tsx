'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import ColumnDefinitionStep from './ColumnDefinitionStep';
import ShardingConfigStep from './ShardingConfigStep';
import PartitionConfigStep from './PartitionConfigStep';
import ReplicationConfigStep from './ReplicationConfigStep';
import TableSQLPreview from './TableSQLPreview';
import { useSchema } from '../../contexts/schema-context';

export interface ColumnDefinition {
  name: string;
  column_type: string;
  constraints: string[];
  default_value?: string;
  description?: string;
}

export interface ShardingConfig {
  shard_count: number;
  clustering_column?: string;
}

export interface PartitionConfig {
  enabled: boolean;
  partition_type?: 'RANGE' | 'LIST' | 'HASH';
  partition_column?: string;
}

export interface ReplicationConfig {
  number_of_replicas: number;
  tier_allocation?: 'hot' | 'warm' | 'cold';
}

export interface TableDesign {
  schema_name: string;
  table_name: string;
  columns: ColumnDefinition[];
  sharding_config?: ShardingConfig;
  partition_config?: PartitionConfig;
  replication_config?: ReplicationConfig;
}

interface TableDesignerWizardProps {
  connectionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = [
  {
    id: 1,
    name: 'Schema & Columns',
    description: 'Define table structure and column definitions',
    helpText: 'Configure table name, schema, and column specifications with appropriate data types and constraints'
  },
  {
    id: 2,
    name: 'Sharding Strategy',
    description: 'Configure horizontal data distribution',
    helpText: 'Distribute data across shards for scalability. Recommended: 4-8 shards per node for balanced performance'
  },
  {
    id: 3,
    name: 'Partitioning',
    description: 'Optional: Time-series or categorical partitioning',
    helpText: 'Partition large tables by date/time or category for improved query performance and data lifecycle management'
  },
  {
    id: 4,
    name: 'Replication & HA',
    description: 'Configure data redundancy and availability',
    helpText: 'Set replica count for fault tolerance. Production recommendation: minimum 2 replicas for high availability'
  },
  {
    id: 5,
    name: 'Review & Deploy',
    description: 'Validate configuration and create table',
    helpText: 'Review generated SQL and deploy your production-ready table configuration'
  },
];

export default function TableDesignerWizard({
  connectionId,
  onClose,
  onSuccess,
}: TableDesignerWizardProps) {
  const { activeSchema } = useSchema();
  const [currentStep, setCurrentStep] = useState(1);
  const [design, setDesign] = useState<TableDesign>({
    schema_name: activeSchema || 'doc', // Use active schema from context
    table_name: '',
    columns: [],
    sharding_config: {
      shard_count: 6, // Production default: 6 shards for better distribution
      clustering_column: undefined,
    },
    partition_config: {
      enabled: false,
      partition_type: undefined,
      partition_column: undefined,
    },
    replication_config: {
      number_of_replicas: 2, // Production default: 2 replicas for HA
      tier_allocation: 'hot', // Hot tier for active data
    },
  });

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getValidationMessage = (): string | null => {
    switch (currentStep) {
      case 1: // Columns
        if (!design.table_name.trim()) {
          return 'Table name is required';
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(design.table_name)) {
          return 'Table name must start with a letter and contain only letters, numbers, and underscores';
        }
        if (design.columns.length === 0) {
          return 'At least one column is required';
        }
        const invalidColumn = design.columns.find((col) => !col.name.trim());
        if (invalidColumn) {
          return 'All columns must have a name';
        }
        return null;
      case 2: // Sharding
        if (!design.sharding_config) {
          return 'Sharding configuration is required';
        }
        if (design.sharding_config.shard_count < 1) {
          return 'Shard count must be at least 1';
        }
        if (design.sharding_config.shard_count > 32) {
          return 'Shard count cannot exceed 32 (recommended: 4-12 for production)';
        }
        return null;
      case 3: // Partitioning
        if (design.partition_config?.enabled) {
          if (!design.partition_config.partition_type) {
            return 'Partition type is required when partitioning is enabled';
          }
          if (!design.partition_config.partition_column) {
            return 'Partition column is required when partitioning is enabled';
          }
        }
        return null;
      case 4: // Replication
        if (!design.replication_config) {
          return 'Replication configuration is required';
        }
        if (design.replication_config.number_of_replicas < 0) {
          return 'Number of replicas cannot be negative';
        }
        if (design.replication_config.number_of_replicas > 5) {
          return 'Number of replicas cannot exceed 5';
        }
        if (design.replication_config.number_of_replicas === 0) {
          return '⚠️ Warning: 0 replicas means no fault tolerance. Production recommendation: minimum 2 replicas';
        }
        return null;
      default:
        return null;
    }
  };

  const canProceed = (): boolean => {
    return getValidationMessage() === null || (currentStep === 4 && design.replication_config?.number_of_replicas === 0);
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex h-full flex-col bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 p-6 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-600 p-2">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Enterprise Table Designer
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Design production-ready tables with advanced sharding, partitioning, and high availability configuration
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Best Practices Built-in
                </span>
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                  <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Production-Ready
                </span>
                <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  Enterprise-Grade
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              title="Close Designer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex flex-1 items-center">
                <div className="flex items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                      currentStep === step.id
                        ? 'border-purple-600 bg-purple-600 text-white'
                        : currentStep > step.id
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-gray-300 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step.id}</span>
                    )}
                  </div>
                  <div className="ml-3">
                    <p
                      className={`text-sm font-medium ${
                        currentStep >= step.id
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                      title={step.helpText}
                    >
                      {step.name}
                    </p>
                    <p
                      className="text-xs text-gray-500 dark:text-gray-400"
                      title={step.helpText}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`mx-4 h-0.5 flex-1 ${
                      currentStep > step.id
                        ? 'bg-green-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <ColumnDefinitionStep design={design} setDesign={setDesign} />
          )}
          {currentStep === 2 && (
            <ShardingConfigStep design={design} setDesign={setDesign} />
          )}
          {currentStep === 3 && (
            <PartitionConfigStep design={design} setDesign={setDesign} />
          )}
          {currentStep === 4 && (
            <ReplicationConfigStep design={design} setDesign={setDesign} />
          )}
          {currentStep === 5 && (
            <TableSQLPreview
              design={design}
              connectionId={connectionId}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Validation Message */}
          {getValidationMessage() && (
            <div className={`border-b px-6 py-3 ${
              getValidationMessage()?.startsWith('⚠️')
                ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            }`}>
              <div className="flex items-start gap-2">
                <svg
                  className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                    getValidationMessage()?.startsWith('⚠️')
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className={`text-sm font-medium ${
                  getValidationMessage()?.startsWith('⚠️')
                    ? 'text-yellow-800 dark:text-yellow-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {getValidationMessage()}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-6">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Step
            </button>

            <div className="flex flex-col items-center gap-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Step {currentStep} of {STEPS.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {STEPS[currentStep - 1].name}
              </div>
            </div>

            {currentStep < STEPS.length ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 text-sm font-medium text-white shadow-lg transition-all hover:from-purple-700 hover:to-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 disabled:opacity-50 disabled:shadow-none"
                title={!canProceed() ? getValidationMessage() || undefined : 'Continue to next step'}
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="w-32"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
