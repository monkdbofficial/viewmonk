'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, CheckCircle, AlertCircle, Info, XCircle, X, Trash2 } from 'lucide-react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export default function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}: NotificationCenterProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

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

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5" />;
      case 'error': return <XCircle className="h-5 w-5" />;
      case 'warning': return <AlertCircle className="h-5 w-5" />;
      case 'info': return <Info className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'from-green-600 to-green-700';
      case 'error': return 'from-red-600 to-red-700';
      case 'warning': return 'from-yellow-600 to-yellow-700';
      case 'info': return 'from-blue-600 to-blue-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
      case 'error': return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
      case 'info': return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Notification Bell Button - Icon Only */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`group relative p-2.5 rounded-lg border transition-all shadow-sm hover:shadow-md ${
          unreadCount > 0
            ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        title="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-xs font-bold text-white shadow-lg">
            {unreadCount}
          </span>
        )}
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </span>
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[500px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95 max-h-[600px] overflow-hidden flex flex-col" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                  <BellRing className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {unreadCount} unread • {notifications.length} total
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-3 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'unread'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-semibold transition-all"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-semibold transition-all"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-xl border p-4 transition-all hover:shadow-md ${
                      notification.read
                        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                        : `${getTypeBg(notification.type)}`
                    }`}
                    onClick={() => !notification.read && onMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r ${getTypeColor(notification.type)} flex-shrink-0 shadow-md`}>
                        {getTypeIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {new Date(notification.timestamp).toLocaleString()}
                          </span>
                          <div className="flex items-center gap-2">
                            {notification.action && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  notification.action!.onClick();
                                }}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-semibold transition-all"
                              >
                                {notification.action.label}
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(notification.id);
                              }}
                              className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
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
