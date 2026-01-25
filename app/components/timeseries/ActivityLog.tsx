'use client';

import { useState, useRef, useEffect } from 'react';
import { Activity, User, Clock, Database, Eye, Trash2, Plus, RefreshCw, Settings, Download, X } from 'lucide-react';

export interface ActivityEntry {
  id: string;
  timestamp: Date;
  user: string;
  action: 'created' | 'updated' | 'deleted' | 'viewed' | 'exported' | 'refreshed';
  resourceType: 'widget' | 'dashboard' | 'alert' | 'filter' | 'settings';
  resourceName: string;
  details?: string;
  severity?: 'info' | 'warning' | 'error';
}

interface ActivityLogProps {
  activities: ActivityEntry[];
  onClear?: () => void;
}

export default function ActivityLog({ activities, onClear }: ActivityLogProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const panelRef = useRef<HTMLDivElement>(null);

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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <Plus className="h-4 w-4" />;
      case 'updated': return <Settings className="h-4 w-4" />;
      case 'deleted': return <Trash2 className="h-4 w-4" />;
      case 'viewed': return <Eye className="h-4 w-4" />;
      case 'exported': return <Download className="h-4 w-4" />;
      case 'refreshed': return <RefreshCw className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'from-green-600 to-green-700';
      case 'updated': return 'from-blue-600 to-blue-700';
      case 'deleted': return 'from-red-600 to-red-700';
      case 'viewed': return 'from-purple-600 to-purple-700';
      case 'exported': return 'from-orange-600 to-orange-700';
      case 'refreshed': return 'from-teal-600 to-teal-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getActionBg = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-50 dark:bg-green-950/20';
      case 'updated': return 'bg-blue-50 dark:bg-blue-950/20';
      case 'deleted': return 'bg-red-50 dark:bg-red-950/20';
      case 'viewed': return 'bg-purple-50 dark:bg-purple-950/20';
      case 'exported': return 'bg-orange-50 dark:bg-orange-950/20';
      case 'refreshed': return 'bg-teal-50 dark:bg-teal-950/20';
      default: return 'bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => a.action === filter);

  const recentActivities = filteredActivities.slice(0, 50);

  return (
    <div className="relative" ref={panelRef}>
      {/* Activity Button - Icon Only */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="group relative p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all"
        title="Activity Log"
      >
        <Activity className="h-4 w-4" />
        {activities.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-xs font-bold text-white shadow-lg">
            {activities.length > 99 ? '99+' : activities.length}
          </span>
        )}
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Activity Log
        </span>
      </button>

      {/* Activity Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[700px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95 max-h-[600px] overflow-hidden flex flex-col" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Activity Log
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Audit trail of all dashboard actions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onClear && activities.length > 0 && (
                  <button
                    onClick={onClear}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-semibold transition-all"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/30">
            <div className="flex gap-2 overflow-x-auto">
              {['all', 'created', 'updated', 'deleted', 'viewed', 'exported', 'refreshed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    filter === f
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Activities List */}
          <div className="flex-1 overflow-y-auto p-6">
            {recentActivities.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No activities yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity, idx) => (
                  <div
                    key={activity.id}
                    className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${getActionBg(activity.action)} hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r ${getActionColor(activity.action)} flex-shrink-0 shadow-md`}>
                        {getActionIcon(activity.action)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">
                              {activity.user} {activity.action} {activity.resourceType}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {activity.resourceName}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500 flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        {activity.details && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600">
                            {activity.details}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 bg-gray-50 dark:bg-gray-900/30">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div>
                Showing {recentActivities.length} of {activities.length} activities
              </div>
              <div className="flex items-center gap-4">
                <span>Created: {activities.filter(a => a.action === 'created').length}</span>
                <span>Updated: {activities.filter(a => a.action === 'updated').length}</span>
                <span>Deleted: {activities.filter(a => a.action === 'deleted').length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
