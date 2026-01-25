'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Copy, Download, Upload, FolderOpen, Save, Edit2, Check, X } from 'lucide-react';

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  widgets: any[];
  globalTimeRange?: {
    start: Date;
    end: Date;
  };
  autoRefreshInterval?: number;
  theme?: 'light' | 'dark';
}

interface DashboardManagerProps {
  onSelectDashboard: (dashboard: Dashboard | null) => void;
  currentDashboard: Dashboard | null;
}

export default function DashboardManager({
  onSelectDashboard,
  currentDashboard,
}: DashboardManagerProps) {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [showManager, setShowManager] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowManager(false);
      }
    }

    if (showManager) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showManager]);

  // Load dashboards from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('timeseries-dashboards');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDashboards(parsed.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt),
        })));
      } catch (e) {
        console.error('Failed to load dashboards:', e);
      }
    }
  }, []);

  // Save dashboards to localStorage
  useEffect(() => {
    if (dashboards.length > 0) {
      localStorage.setItem('timeseries-dashboards', JSON.stringify(dashboards));
    }
  }, [dashboards]);

  const createNewDashboard = () => {
    const newDashboard: Dashboard = {
      id: `dashboard-${Date.now()}`,
      name: `Dashboard ${dashboards.length + 1}`,
      description: 'New dashboard',
      createdAt: new Date(),
      updatedAt: new Date(),
      widgets: [],
      autoRefreshInterval: 0,
      theme: 'light',
    };

    setDashboards([...dashboards, newDashboard]);
    onSelectDashboard(newDashboard);
    setShowManager(false);
  };

  const duplicateDashboard = (dashboard: Dashboard) => {
    const duplicated: Dashboard = {
      ...dashboard,
      id: `dashboard-${Date.now()}`,
      name: `${dashboard.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setDashboards([...dashboards, duplicated]);
  };

  const deleteDashboard = (id: string) => {
    if (confirm('Are you sure you want to delete this dashboard?')) {
      setDashboards(dashboards.filter(d => d.id !== id));
      if (currentDashboard?.id === id) {
        onSelectDashboard(null);
      }
    }
  };

  const renameDashboard = (id: string, newName: string) => {
    setDashboards(dashboards.map(d =>
      d.id === id ? { ...d, name: newName, updatedAt: new Date() } : d
    ));
    setEditingId(null);
  };

  const exportDashboard = (dashboard: Dashboard) => {
    const dataStr = JSON.stringify(dashboard, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dashboard.name.replace(/\s+/g, '_')}_dashboard.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importDashboard = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const newDashboard: Dashboard = {
          ...imported,
          id: `dashboard-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setDashboards([...dashboards, newDashboard]);
      } catch (error) {
        alert('Failed to import dashboard. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Dashboard Selector - Icon Only */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setShowManager(!showManager)}
          className="group relative p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all"
          title={currentDashboard ? currentDashboard.name : 'Select Dashboard'}
        >
          <FolderOpen className="h-4 w-4" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {currentDashboard ? currentDashboard.name : 'Dashboards'}
          </span>
        </button>

        <button
          onClick={createNewDashboard}
          className="group relative p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md transition-all"
          title="New Dashboard"
        >
          <Plus className="h-4 w-4" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            New Dashboard
          </span>
        </button>
      </div>

      {/* Dashboard Manager Modal */}
      {showManager && (
        <div className="absolute left-0 top-full mt-2 w-[600px] rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800" style={{ zIndex: 9999 }}>
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Dashboard Manager
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage your saved dashboards
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto p-4">
            {dashboards.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No dashboards yet. Create your first dashboard!
              </div>
            ) : (
              <div className="space-y-2">
                {dashboards.map((dashboard) => (
                  <div
                    key={dashboard.id}
                    className={`rounded-lg border p-3 transition-all ${
                      currentDashboard?.id === dashboard.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {editingId === dashboard.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  renameDashboard(dashboard.id, editName);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                }
                              }}
                              className="flex-1 rounded border border-blue-500 px-2 py-1 text-sm"
                              autoFocus
                            />
                            <button
                              onClick={() => renameDashboard(dashboard.id, editName)}
                              className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              onSelectDashboard(dashboard);
                              setShowManager(false);
                            }}
                            className="text-left w-full"
                          >
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {dashboard.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {dashboard.widgets.length} widgets • Updated {dashboard.updatedAt.toLocaleDateString()}
                            </p>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(dashboard.id);
                            setEditName(dashboard.name);
                          }}
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Rename"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => duplicateDashboard(dashboard)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="Duplicate"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => exportDashboard(dashboard)}
                          className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                          title="Export"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteDashboard(dashboard.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
              <Upload className="h-4 w-4" />
              Import Dashboard
              <input
                type="file"
                accept=".json"
                onChange={importDashboard}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
