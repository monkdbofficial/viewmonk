'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, FileText, Filter, Download, TrendingUp } from 'lucide-react';
import { useBlobStorage, AuditLogEntry, AuditAction } from '../../lib/blob-context';

interface AuditLogViewerProps {
  onClose: () => void;
}

export default function AuditLogViewer({ onClose }: AuditLogViewerProps) {
  const { currentTable, getAuditLogs, getAuditSummary } = useBlobStorage();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Filters
  const [filterAction, setFilterAction] = useState<AuditAction | ''>('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterSuccess, setFilterSuccess] = useState<boolean | null>(null);
  const [limit, setLimit] = useState(50);

  const loadAuditData = useCallback(async () => {
    if (!currentTable) return;

    setLoading(true);
    try {
      const filters: any = { limit };
      if (filterAction) filters.action = filterAction;
      if (filterUserId) filters.userId = filterUserId;

      const [auditLogs, auditSummary] = await Promise.all([
        getAuditLogs(currentTable, filters),
        getAuditSummary(currentTable),
      ]);

      // Apply success filter on client side
      let filteredLogs = auditLogs;
      if (filterSuccess !== null) {
        filteredLogs = auditLogs.filter((log) => log.success === filterSuccess);
      }

      setLogs(filteredLogs);
      setSummary(auditSummary);
    } catch (error) {
      console.error('Failed to load audit data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentTable, filterAction, filterUserId, filterSuccess, limit, getAuditLogs, getAuditSummary]);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Action', 'User', 'File', 'Success', 'Error'].join(','),
      ...logs.map((log) =>
        [
          log.timestamp,
          log.action,
          log.user_id,
          log.filename || 'N/A',
          log.success ? 'Yes' : 'No',
          log.error_message || '',
        ]
          .map((v) => `"${v}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_log_${currentTable}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getActionBadgeColor = (action: AuditAction) => {
    const colors: Record<AuditAction, string> = {
      upload: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      download: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      restore: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      rename: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      update_tags: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      update_description: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      toggle_favorite: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      share: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
      unshare: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      access_shared: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Audit Log</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Summary</h3>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Events</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {summary.total_events || 0}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Success Rate</p>
                <p className="text-lg font-semibold text-green-600">
                  {summary.success_rate?.toFixed(1) || 0}%
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Unique Users</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {summary.unique_users || 0}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Failed Events</p>
                <p className="text-lg font-semibold text-red-600">
                  {summary.failed_events || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value as AuditAction | '')}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
            >
              <option value="">All Actions</option>
              <option value="upload">Upload</option>
              <option value="download">Download</option>
              <option value="delete">Delete</option>
              <option value="restore">Restore</option>
              <option value="rename">Rename</option>
              <option value="share">Share</option>
            </select>

            <input
              type="text"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              placeholder="Filter by user..."
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
            />

            <select
              value={filterSuccess === null ? '' : filterSuccess.toString()}
              onChange={(e) =>
                setFilterSuccess(e.target.value === '' ? null : e.target.value === 'true')
              }
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
            >
              <option value="">All Results</option>
              <option value="true">Success Only</option>
              <option value="false">Failed Only</option>
            </select>

            <button
              onClick={exportLogs}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto p-6">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No audit logs found
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`border rounded-lg p-4 ${
                    log.success
                      ? 'border-gray-200 dark:border-gray-700'
                      : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                        {!log.success && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded text-xs font-medium">
                            FAILED
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {log.filename || 'System operation'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>User: {log.user_id}</span>
                        <span>Role: {log.user_role}</span>
                        <span>{formatTimestamp(log.timestamp)}</span>
                      </div>
                      {log.error_message && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                          Error: {log.error_message}
                        </p>
                      )}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                            Show details
                          </summary>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {logs.length} of {summary?.total_events || 0} events
            </p>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm"
            >
              <option value={50}>50 events</option>
              <option value={100}>100 events</option>
              <option value={200}>200 events</option>
              <option value={500}>500 events</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
