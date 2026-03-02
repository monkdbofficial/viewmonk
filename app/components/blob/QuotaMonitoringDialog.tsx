'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, HardDrive, Users, AlertCircle, Settings, Save } from 'lucide-react';
import { useBlobStorage, QuotaUsage, UserQuotaUsage, QuotaSettings } from '../../lib/blob-context';
import { useUser } from '../../lib/user-context';

interface QuotaMonitoringDialogProps {
  onClose: () => void;
}

export default function QuotaMonitoringDialog({ onClose }: QuotaMonitoringDialogProps) {
  const {
    currentTable,
    getTableQuotaUsage,
    getAllUsersQuotaUsage,
    getQuotaSettings,
    setQuotaSettings,
  } = useBlobStorage();
  const { role } = useUser();

  const [loading, setLoading] = useState(true);
  const [tableUsage, setTableUsage] = useState<QuotaUsage | null>(null);
  const [userUsages, setUserUsages] = useState<UserQuotaUsage[]>([]);
  const [settings, setSettings] = useState<QuotaSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Settings form state
  const [maxSizeGB, setMaxSizeGB] = useState<string>('');
  const [unlimited, setUnlimited] = useState(true);
  const [warningThreshold, setWarningThreshold] = useState(80);
  const [criticalThreshold, setCriticalThreshold] = useState(90);
  const [enableAlerts, setEnableAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadQuotaData = useCallback(async () => {
    if (!currentTable) return;

    setLoading(true);
    try {
      const [usage, users, config] = await Promise.all([
        getTableQuotaUsage(currentTable),
        getAllUsersQuotaUsage(currentTable),
        getQuotaSettings(currentTable),
      ]);

      setTableUsage(usage);
      setUserUsages(users);
      setSettings(config);

      if (config) {
        setUnlimited(config.maxSizeBytes === null);
        setMaxSizeGB(config.maxSizeBytes ? (config.maxSizeBytes / 1024 / 1024 / 1024).toFixed(2) : '');
        setWarningThreshold(config.warningThresholdPercent);
        setCriticalThreshold(config.criticalThresholdPercent);
        setEnableAlerts(config.enableAlerts);
      }
    } catch {
      // load failure — quota data unavailable
    } finally {
      setLoading(false);
    }
  }, [currentTable, getTableQuotaUsage, getAllUsersQuotaUsage, getQuotaSettings]);

  useEffect(() => {
    loadQuotaData();
  }, [loadQuotaData]);

  const handleSaveSettings = async () => {
    if (!currentTable) return;

    setSaving(true);
    try {
      const newSettings: QuotaSettings = {
        maxSizeBytes: unlimited ? null : Math.round(parseFloat(maxSizeGB) * 1024 * 1024 * 1024),
        warningThresholdPercent: warningThreshold,
        criticalThresholdPercent: criticalThreshold,
        enableAlerts,
      };

      await setQuotaSettings(currentTable, newSettings);
      setShowSettings(false);
      await loadQuotaData();
    } catch {
      // settings save failed — retry or check connection
    } finally {
      setSaving(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getAlertColor = (level: string | null) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    }
  };

  const getProgressBarColor = (level: string | null) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-green-500';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">Loading quota data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Storage Quota Monitoring
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {showSettings && role === 'admin' ? (
            /* Settings Form */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Quota Settings
              </h3>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <input
                    type="checkbox"
                    checked={unlimited}
                    onChange={(e) => setUnlimited(e.target.checked)}
                    className="rounded"
                  />
                  Unlimited Storage
                </label>
              </div>

              {!unlimited && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Storage (GB)
                  </label>
                  <input
                    type="number"
                    value={maxSizeGB}
                    onChange={(e) => setMaxSizeGB(e.target.value)}
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Warning Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={warningThreshold}
                    onChange={(e) => setWarningThreshold(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Critical Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={criticalThreshold}
                    onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={enableAlerts}
                    onChange={(e) => setEnableAlerts(e.target.checked)}
                    className="rounded"
                  />
                  Enable Quota Alerts
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Overall Usage */}
              {tableUsage && (
                <div className={`border rounded-lg p-4 ${getAlertColor(tableUsage.alertLevel)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold">Overall Storage Usage</h3>
                      <p className="text-sm opacity-80 mt-1">
                        {formatBytes(tableUsage.currentSizeBytes)}
                        {tableUsage.maxSizeBytes && ` / ${formatBytes(tableUsage.maxSizeBytes)}`}
                      </p>
                    </div>
                    {tableUsage.alertLevel && (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>

                  {tableUsage.maxSizeBytes && (
                    <>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getProgressBarColor(tableUsage.alertLevel)}`}
                          style={{ width: `${Math.min(tableUsage.usagePercent || 0, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-sm font-medium">
                        {tableUsage.usagePercent?.toFixed(1)}% used
                        {tableUsage.remainingBytes !== null &&
                          ` • ${formatBytes(tableUsage.remainingBytes)} remaining`}
                      </p>
                    </>
                  )}

                  <p className="text-sm mt-2">{tableUsage.fileCount} files</p>
                </div>
              )}

              {/* Admin Settings Button */}
              {role === 'admin' && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Configure Quota Settings
                </button>
              )}

              {/* Per-User Usage */}
              {role === 'admin' && userUsages.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Per-User Usage
                  </h3>
                  <div className="space-y-3">
                    {userUsages.map((user) => (
                      <div
                        key={user.userId}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {user.username}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {user.fileCount} files
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {formatBytes(user.currentSizeBytes)}
                          {user.usagePercent !== null && ` (${user.usagePercent.toFixed(1)}%)`}
                        </p>
                        {user.maxSizeBytes && (
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getProgressBarColor(user.alertLevel)}`}
                              style={{ width: `${Math.min(user.usagePercent || 0, 100)}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
