'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  Copy,
  Check,
  Code,
  Play,
  Info,
} from 'lucide-react';
import { TableDesign } from './TableDesignerWizard';
import ShardVisualization from './ShardVisualization';
import { generateCreateTableSQL, validateTableDesign, ValidationResult } from './SQLGenerator';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';

interface EnhancedTableSQLPreviewProps {
  design: TableDesign;
  connectionId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function EnhancedTableSQLPreview({
  design,
  connectionId,
  onSuccess,
  onClose,
}: EnhancedTableSQLPreviewProps) {
  const activeConnection = useActiveConnection();
  const { success: showSuccess, error: showError } = useToast();

  const [sql, setSql] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showVisualization, setShowVisualization] = useState(true);

  useEffect(() => {
    generateSQL();
    performValidation();
  }, []);

  const generateSQL = () => {
    try {
      setLoading(true);
      const generatedSql = generateCreateTableSQL(design);
      setSql(generatedSql);
    } catch (err: any) {
      showError('SQL Generation Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const performValidation = () => {
    try {
      const result = validateTableDesign(design);
      setValidation(result);
    } catch (err: any) {
      console.error('Validation error:', err);
      showError('Validation Failed', err.message);
    }
  };

  const handleCreate = async () => {
    if (!validation?.valid || !activeConnection) return;

    try {
      setCreating(true);

      console.log('Generated SQL:', sql);
      console.log('Table Design:', JSON.stringify(design, null, 2));

      // Execute the CREATE TABLE statement
      await activeConnection.client.query(sql);

      showSuccess(
        'Table Created Successfully',
        `Table "${design.schema_name}.${design.table_name}" has been created`
      );

      onSuccess();
    } catch (err: any) {
      console.error('Failed to create table:', err);
      console.error('SQL that failed:', sql);

      // Show more detailed error
      const errorMsg = err.message || 'Unknown error occurred';
      showError(
        'Failed to Create Table',
        `${errorMsg}\n\nPlease check the browser console for the SQL statement that failed.`
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    showSuccess('Copied!', 'SQL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Generating SQL...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 dark:border-green-800 dark:from-green-900/20 dark:to-emerald-900/20">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-green-600 shadow-lg">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Review & Create Table
            </h3>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              Review the generated SQL and validation results before creating your production-ready
              table
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <Code className="h-3 w-3" />
                {design.schema_name}.{design.table_name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {design.columns.length} Columns
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                {design.sharding_config?.shard_count || 6} Shards
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {validation && (
        <div className="space-y-3">
          {/* Valid */}
          {validation.valid && (
            <div className="flex items-start gap-3 rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900 dark:text-green-300">
                  Validation Passed ✓
                </p>
                <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                  Your table configuration is valid and ready to be created
                </p>
              </div>
            </div>
          )}

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                    Validation Errors ({validation.errors.length})
                  </p>
                  <ul className="mt-2 space-y-1">
                    {validation.errors.map((error, idx) => (
                      <li key={idx} className="text-xs text-red-800 dark:text-red-400">
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
            <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                    Warnings ({validation.warnings.length})
                  </p>
                  <ul className="mt-2 space-y-1">
                    {validation.warnings.map((warning, idx) => (
                      <li key={idx} className="text-xs text-yellow-800 dark:text-yellow-400">
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

      {/* SQL Preview */}
      <div className="rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Generated SQL
            </h4>
          </div>
          <button
            onClick={handleCopySQL}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy SQL
              </>
            )}
          </button>
        </div>
        <div className="p-4">
          <pre className="overflow-x-auto rounded-lg bg-slate-100 dark:bg-gray-900 p-4 text-sm text-slate-800 dark:text-gray-100">
            <code>{sql}</code>
          </pre>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Table Name</p>
          <p className="mt-1 font-mono text-lg font-bold text-blue-900 dark:text-blue-200">
            {design.schema_name}.{design.table_name}
          </p>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-xs font-medium text-green-600 dark:text-green-400">Columns</p>
          <p className="mt-1 text-lg font-bold text-green-900 dark:text-green-200">
            {design.columns.length}
          </p>
        </div>

        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
          <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Shards</p>
          <p className="mt-1 text-lg font-bold text-purple-900 dark:text-purple-200">
            {design.sharding_config?.shard_count || 6}
          </p>
        </div>

        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Replicas</p>
          <p className="mt-1 text-lg font-bold text-orange-900 dark:text-orange-200">
            {design.replication_config?.number_of_replicas ?? 2}
          </p>
        </div>
      </div>

      {/* Shard Visualization */}
      {showVisualization && (
        <ShardVisualization
          shardCount={Math.min(design.sharding_config?.shard_count || 6, 16)}
          replicaCount={design.replication_config?.number_of_replicas || 0}
        />
      )}

      {/* Column Details */}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          Column Configuration
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="pb-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                  Column
                </th>
                <th className="pb-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                  Type
                </th>
                <th className="pb-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                  Constraints
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {design.columns.map((col, idx) => (
                <tr key={idx}>
                  <td className="py-2 font-mono text-gray-900 dark:text-white">{col.name}</td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">{col.column_type}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {col.constraints.map((constraint, cidx) => (
                        <span
                          key={cidx}
                          className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          {constraint}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 rounded-lg border-2 border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Ready to create your table?
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            This will execute the SQL statement and create the table in your database
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border-2 border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!validation?.valid || creating}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-green-700 hover:to-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Table...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Create Table
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Message */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <p className="font-semibold mb-1">What happens next?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>The CREATE TABLE statement will be executed on your MonkDB cluster</li>
              <li>Table will be created with {design.sharding_config?.shard_count || 6} shards distributed across nodes</li>
              <li>
                {design.replication_config?.number_of_replicas || 2} replica copies will be
                maintained for fault tolerance
              </li>
              <li>You can start inserting data immediately after creation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
