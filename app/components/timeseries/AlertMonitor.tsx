'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, AlertTriangle, CheckCircle, X, Settings, Plus, TrendingUp, TrendingDown } from 'lucide-react';

export interface Alert {
  id: string;
  name: string;
  widgetId: string;
  widgetName: string;
  metric: string;
  condition: 'above' | 'below' | 'equals';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  triggered: boolean;
  lastTriggered?: Date;
  currentValue?: number;
  notifyEmail?: boolean;
  notifySlack?: boolean;
}

interface AlertMonitorProps {
  visualizations: any[];
  onCreateAlert: (alert: Omit<Alert, 'id' | 'triggered'>) => void;
  alerts: Alert[];
  onUpdateAlert: (id: string, updates: Partial<Alert>) => void;
  onDeleteAlert: (id: string) => void;
}

export default function AlertMonitor({ visualizations, onCreateAlert, alerts, onUpdateAlert, onDeleteAlert }: AlertMonitorProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [newAlert, setNewAlert] = useState({
    name: '',
    widgetId: '',
    widgetName: '',
    metric: '',
    condition: 'above' as 'above' | 'below' | 'equals',
    threshold: 0,
    severity: 'warning' as 'info' | 'warning' | 'critical',
    enabled: true,
    notifyEmail: false,
    notifySlack: false,
  });

  const activeAlerts = alerts.filter(a => a.enabled && a.triggered);
  const totalAlerts = alerts.length;

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    }

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPanel]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'from-red-600 to-red-700';
      case 'warning': return 'from-yellow-600 to-yellow-700';
      case 'info': return 'from-blue-600 to-blue-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800';
      case 'info': return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800';
    }
  };

  const handleCreateAlert = () => {
    if (!newAlert.name || !newAlert.widgetId || !newAlert.metric) {
      alert('Please fill all required fields');
      return;
    }

    const selectedViz = visualizations.find(v => v.id === newAlert.widgetId);
    onCreateAlert({
      ...newAlert,
      widgetName: selectedViz?.name || '',
    });

    setNewAlert({
      name: '',
      widgetId: '',
      widgetName: '',
      metric: '',
      condition: 'above',
      threshold: 0,
      severity: 'warning',
      enabled: true,
      notifyEmail: false,
      notifySlack: false,
    });
    setShowCreateForm(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Alert Bell Button - Icon Only */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`group relative p-2.5 rounded-lg border transition-all shadow-sm hover:shadow-md ${
          activeAlerts.length > 0
            ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        title="Alerts"
      >
        {activeAlerts.length > 0 ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {activeAlerts.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-red-700 text-xs font-bold text-white shadow-lg animate-pulse">
            {activeAlerts.length}
          </span>
        )}
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Alerts {activeAlerts.length > 0 && `(${activeAlerts.length})`}
        </span>
      </button>

      {/* Alert Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[600px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95 max-h-[600px] overflow-hidden flex flex-col" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-orange-600 shadow-lg">
                  <BellRing className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Alert Monitor
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {activeAlerts.length} active • {totalAlerts} total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                  title="Create alert"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Create Alert Form */}
          {showCreateForm && (
            <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Create New Alert</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Alert name"
                  value={newAlert.name}
                  onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newAlert.widgetId}
                    onChange={(e) => setNewAlert({ ...newAlert, widgetId: e.target.value })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="">Select Widget</option>
                    {visualizations.map(viz => (
                      <option key={viz.id} value={viz.id}>{viz.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Metric column"
                    value={newAlert.metric}
                    onChange={(e) => setNewAlert({ ...newAlert, metric: e.target.value })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={newAlert.condition}
                    onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value as any })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                    <option value="equals">Equals</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Threshold"
                    value={newAlert.threshold}
                    onChange={(e) => setNewAlert({ ...newAlert, threshold: Number(e.target.value) })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                  <select
                    value={newAlert.severity}
                    onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value as any })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newAlert.notifyEmail}
                      onChange={(e) => setNewAlert({ ...newAlert, notifyEmail: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newAlert.notifySlack}
                      onChange={(e) => setNewAlert({ ...newAlert, notifySlack: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Slack
                  </label>
                </div>
                <button
                  onClick={handleCreateAlert}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold shadow-lg transition-all"
                >
                  Create Alert
                </button>
              </div>
            </div>
          )}

          {/* Alerts List */}
          <div className="flex-1 overflow-y-auto p-6">
            {alerts.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No alerts configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-4 transition-all ${getSeverityBg(alert.severity)} ${
                      alert.triggered ? 'shadow-lg' : 'shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={alert.enabled}
                          onChange={() => onUpdateAlert(alert.id, { enabled: !alert.enabled })}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{alert.name}</h4>
                            {alert.triggered && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getSeverityColor(alert.severity)}`}>
                                <AlertTriangle className="h-3 w-3" />
                                TRIGGERED
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {alert.widgetName} • {alert.metric} {alert.condition} {alert.threshold}
                            {alert.currentValue && (
                              <span className="ml-2 font-semibold">
                                Current: {alert.currentValue.toFixed(2)}
                                {alert.currentValue > alert.threshold ? (
                                  <TrendingUp className="inline h-3 w-3 ml-1 text-red-600" />
                                ) : (
                                  <TrendingDown className="inline h-3 w-3 ml-1 text-green-600" />
                                )}
                              </span>
                            )}
                          </div>
                          {alert.lastTriggered && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Last: {new Date(alert.lastTriggered).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
