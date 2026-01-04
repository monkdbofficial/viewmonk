'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import ColumnDefinitionStep from './ColumnDefinitionStep';
import ShardingConfigStep from './ShardingConfigStep';
import PartitionConfigStep from './PartitionConfigStep';
import ReplicationConfigStep from './ReplicationConfigStep';
import TableSQLPreview from './TableSQLPreview';

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
  { id: 1, name: 'Columns', description: 'Define table columns and constraints' },
  { id: 2, name: 'Sharding', description: 'Configure data distribution' },
  { id: 3, name: 'Partitioning', description: 'Optional: Partition by column' },
  { id: 4, name: 'Replication', description: 'Set replica count and tier' },
  { id: 5, name: 'Review', description: 'Preview and create table' },
];

export default function TableDesignerWizard({
  connectionId,
  onClose,
  onSuccess,
}: TableDesignerWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [design, setDesign] = useState<TableDesign>({
    schema_name: 'public',
    table_name: '',
    columns: [],
    sharding_config: {
      shard_count: 4,
      clustering_column: undefined,
    },
    partition_config: {
      enabled: false,
      partition_type: undefined,
      partition_column: undefined,
    },
    replication_config: {
      number_of_replicas: 1,
      tier_allocation: 'hot',
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

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: // Columns
        return (
          design.table_name.trim().length > 0 &&
          design.columns.length > 0 &&
          design.columns.every((col) => col.name.trim().length > 0)
        );
      case 2: // Sharding
        return (
          design.sharding_config !== undefined &&
          design.sharding_config.shard_count > 0 &&
          design.sharding_config.shard_count <= 32
        );
      case 3: // Partitioning
        if (design.partition_config?.enabled) {
          return (
            design.partition_config.partition_type !== undefined &&
            design.partition_config.partition_column !== undefined
          );
        }
        return true;
      case 4: // Replication
        return (
          design.replication_config !== undefined &&
          design.replication_config.number_of_replicas >= 0 &&
          design.replication_config.number_of_replicas <= 5
        );
      default:
        return true;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="flex h-[90vh] w-[90vw] max-w-7xl flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Advanced Table Designer
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create a table with sharding, partitioning, and replication
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
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
                    >
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
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
        <div className="flex items-center justify-between border-t border-gray-200 p-6 dark:border-gray-700">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Step {currentStep} of {STEPS.length}
          </div>

          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="w-24"></div>
          )}
        </div>
      </div>
    </div>
  );
}
