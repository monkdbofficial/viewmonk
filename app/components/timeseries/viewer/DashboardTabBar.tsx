'use client';
import { Home, X, LayoutGrid, Plus } from 'lucide-react';

export interface DashboardTab {
  dashboardId: string;
  name: string;
}

interface DashboardTabBarProps {
  tabs: DashboardTab[];
  activeDashboardId: string | null;
  /** True when showing the home screen as the active "tab" */
  homeActive?: boolean;
  onSelectTab: (dashboardId: string) => void;
  onCloseTab: (dashboardId: string) => void;
  onGoHome: () => void;
}

export default function DashboardTabBar({
  tabs, activeDashboardId, homeActive = false,
  onSelectTab, onCloseTab, onGoHome,
}: DashboardTabBarProps) {
  return (
    <div className="flex flex-shrink-0 items-end gap-0 overflow-x-auto border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Home tab */}
      <button
        onClick={onGoHome}
        className={`group flex flex-shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
          homeActive
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
        }`}
        title="Go to dashboards home"
      >
        <Home className="h-3.5 w-3.5" />
        Home
      </button>

      {/* Separator pip */}
      {tabs.length > 0 && (
        <div className="mx-1 h-4 w-px flex-shrink-0 self-center bg-gray-200 dark:bg-gray-700" />
      )}

      {/* Open dashboard tabs */}
      {tabs.map((tab) => {
        const isActive = tab.dashboardId === activeDashboardId && !homeActive;
        return (
          <div
            key={tab.dashboardId}
            className={`group relative flex flex-shrink-0 items-center gap-1.5 border-b-2 pl-3 pr-1.5 py-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-blue-500 bg-blue-50/60 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300'
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100'
            }`}
          >
            {/* Tab icon */}
            <LayoutGrid className="h-3 w-3 flex-shrink-0 opacity-60" />

            {/* Name — clickable area */}
            <button
              onClick={() => onSelectTab(tab.dashboardId)}
              className="max-w-[140px] truncate text-xs font-medium"
              title={tab.name}
            >
              {tab.name}
            </button>

            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); onCloseTab(tab.dashboardId); }}
              className={`ml-0.5 flex-shrink-0 rounded p-0.5 transition-colors ${
                isActive
                  ? 'opacity-60 hover:opacity-100 hover:bg-blue-100 dark:hover:bg-blue-500/20'
                  : 'opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
              title="Close tab"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {/* + New tab — hidden when already on home (would be a no-op) */}
      {!homeActive && (
        <button
          onClick={onGoHome}
          className="ml-1 flex flex-shrink-0 items-center justify-center rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300 self-center mb-0.5"
          title="Open another dashboard"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
