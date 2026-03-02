'use client';

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Eye } from 'lucide-react';
import { TableDesign } from './TableDesignerWizard';
import ShardVisualization from './ShardVisualization';

interface TableSQLPreviewProps {
  design: TableDesign;
  connectionId: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface CreateTableResponse {
  success: boolean;
  table_name: string;
  sql: string;
  message: string;
}

export default function TableSQLPreview({
  design,
  connectionId,
  onSuccess,
  onClose,
}: TableSQLPreviewProps) {
  const [sql, setSql] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVisualization, setShowVisualization] = useState(false);

  useEffect(() => {
    generateSQL();
    validateDesign();
  }, []);

  const generateSQL = async () => {
    try {
      setLoading(true);
      const generatedSql = await invoke<string>('generate_table_sql', {
        request: {
          schema_name: design.schema_name,
          table_name: design.table_name,
          columns: design.columns,
          sharding_config: design.sharding_config,
          partition_config: design.partition_config?.enabled ? design.partition_config : null,
          replication_config: design.replication_config,
        },
      });
      setSql(generatedSql);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const validateDesign = async () => {
    try {
      const result = await invoke<ValidationResult>('validate_table_design', {
        request: {
          connection_id: connectionId,
          schema_name: design.schema_name,
          table_name: design.table_name,
          columns: design.columns,
          sharding_config: design.sharding_config,
          partition_config: design.partition_config?.enabled ? design.partition_config : null,
          replication_config: design.replication_config,
        },
      });
      setValidation(result);
    } catch {
      // validation unavailable — user can still view SQL and proceed
    }
  };

  const handleCreate = async () => {
    if (!validation?.valid) return;

    try {
      setCreating(true);
      const response = await invoke<CreateTableResponse>('create_table_advanced', {
        request: {
          connection_id: connectionId,
          schema_name: design.schema_name,
          table_name: design.table_name,
          columns: design.columns,
          sharding_config: design.sharding_config,
          partition_config: design.partition_config?.enabled ? design.partition_config : null,
          replication_config: design.replication_config,
        },
      });

      if (response.success) {
        onSuccess();
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Generating SQL...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Review & Create Table
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review the generated SQL and validation results before creating the table
        </p>
      </div>

      {/* Validation Results */}
      {validation && (
        <div className="space-y-3">
          {/* Valid */}
          {validation.valid && (
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-300">
                  Validation Passed
                </p>
                <p className="mt-1 text-sm text-green-800 dark:text-green-400">
                  Table design is valid and ready to be created
                </p>
              </div>
            </div>
          )}

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-300">
                    Validation Errors
                  </p>
                  <ul className="mt-2 space-y-1">
                    {validation.errors.map((error, index) => (
                      <li
                        key={index}
                        className="text-sm text-red-800 dark:text-red-400"
                      >
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                    Warnings
                  </p>
                  <ul className="mt-2 space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li
                        key={index}
                        className="text-sm text-yellow-800 dark:text-yellow-400"
                      >
                        • {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shard Visualization */}
      {design.sharding_config && design.sharding_config.shard_count > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Shard Distribution
            </h4>
            <button
              onClick={() => setShowVisualization(!showVisualization)}
              className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
            >
              <Eye className="h-4 w-4" />
              {showVisualization ? 'Hide' : 'Show'} Visualization
            </button>
          </div>

          {showVisualization && (
            <ShardVisualization
              shardCount={design.sharding_config.shard_count}
              replicaCount={design.replication_config?.number_of_replicas || 0}
            />
          )}
        </div>
      )}

      {/* SQL Preview */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Generated SQL
        </h4>
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="bg-slate-100 dark:bg-gray-900 p-4">
            <pre className="overflow-x-auto text-sm text-slate-800 dark:text-gray-100">
              <code className="language-sql">{sql}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Configuration Summary
        </h4>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-900 dark:text-white">Table Name</dt>
            <dd className="mt-1 text-gray-600 dark:text-gray-400">
              {design.schema_name}.{design.table_name}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900 dark:text-white">Columns</dt>
            <dd className="mt-1 text-gray-600 dark:text-gray-400">
              {design.columns.length}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900 dark:text-white">Shards</dt>
            <dd className="mt-1 text-gray-600 dark:text-gray-400">
              {design.sharding_config?.shard_count || 'Default'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900 dark:text-white">Partitioning</dt>
            <dd className="mt-1 text-gray-600 dark:text-gray-400">
              {design.partition_config?.enabled
                ? `by "${design.partition_config.partition_column}"`
                : 'Disabled'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900 dark:text-white">Replicas</dt>
            <dd className="mt-1 text-gray-600 dark:text-gray-400">
              {design.replication_config?.number_of_replicas || 0}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900 dark:text-white">Storage Tier</dt>
            <dd className="mt-1 text-gray-600 dark:text-gray-400">
              {design.replication_config?.tier_allocation || 'Default'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-900 dark:text-red-300">
            Error Creating Table
          </p>
          <p className="mt-1 text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!validation?.valid || creating}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Table...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Create Table
            </>
          )}
        </button>
      </div>
    </div>
  );
}
