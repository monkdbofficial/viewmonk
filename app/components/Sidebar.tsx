'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

// Check if running in Electron - will be checked at runtime

interface SidebarProps {}

export default function Sidebar({}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const nextPathname = usePathname();
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [, forceUpdate] = useState({});

  // Force update on pathname changes
  useEffect(() => {
    const updatePath = () => {
      if (typeof window === 'undefined') return;

      // Get pathname and normalize (remove trailing slash)
      let path = window.location.pathname;
      // Remove trailing slash except for root
      if (path !== '/' && path.endsWith('/')) {
        path = path.slice(0, -1);
      }

      setCurrentPath(path);
      forceUpdate({}); // Force re-render
    };

    // Initial update
    updatePath();

    // Poll very frequently for changes
    const interval = setInterval(updatePath, 100);

    // Listen to all possible navigation events
    window.addEventListener('popstate', updatePath);
    window.addEventListener('hashchange', updatePath);

    // Listen to click events on the document to catch Link clicks
    const handleClick = () => setTimeout(updatePath, 10);
    document.addEventListener('click', handleClick);

    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', updatePath);
      window.removeEventListener('hashchange', updatePath);
      document.removeEventListener('click', handleClick);
    };
  }, [nextPathname]);

  // Determine the active pathname - prefer window.location in all cases
  // Normalize by removing trailing slash
  let pathname = currentPath || nextPathname || '/';
  if (pathname !== '/' && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      href: '/unified-browser',
      label: 'Schema Viewer',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      )
    },
    {
      href: '/query-editor',
      label: 'Query Editor',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    },
    {
      href: '/table-designer',
      label: 'Table Designer',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      href: '/timeseries',
      label: 'Time-Series',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      )
    },
    {
      href: '/geospatial',
      label: 'Geospatial',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    {
      href: '/vector-ops',
      label: 'Vector Search',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      )
    },
    {
      href: '/fts',
      label: 'Full-Text Search',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      href: '/blob-storage',
      label: 'BLOB Storage',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    },
    {
      href: '/connections',
      label: 'Connections',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
  ];

  const devTools = [
    {
      href: '/api-playground',
      label: 'API Playground',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
  ];

  const systemItems = [
    {
      href: '/monitoring',
      label: 'Monitoring',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
  ];

  // Navigation is handled by Next.js Link component - works in both web and Electron

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-72'
      } border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800/50 dark:bg-[#0A1929]`}
    >
      <div className="flex h-full flex-col">
        {/* Toggle Button */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-gray-200/50 px-4 py-5 dark:border-gray-700/50`}>
          {!isCollapsed && (
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Workbench
            </h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isCollapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'}
              />
            </svg>
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {/* Main Menu */}
          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-500/20 dark:text-blue-300 dark:shadow-blue-500/10'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-0 h-full w-1 rounded-r bg-blue-600 dark:bg-blue-400" />
                  )}
                  <span className={isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300'}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="truncate">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Developer Tools */}
          {!isCollapsed && (
            <div className="mt-8">
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Developer Tools
              </p>
              <div className="space-y-0.5">
                {devTools.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-purple-50 text-purple-700 shadow-sm dark:bg-purple-500/20 dark:text-purple-300 dark:shadow-purple-500/10'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-0 h-full w-1 rounded-r bg-purple-600 dark:bg-purple-400" />
                      )}
                      <span className={isActive ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* System */}
          {!isCollapsed && (
            <div className="mt-8">
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                System
              </p>
              <div className="space-y-0.5">
                {systemItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gray-100 text-gray-900 shadow-sm dark:bg-gray-700/50 dark:text-white dark:shadow-gray-500/10'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-0 h-full w-1 rounded-r bg-gray-600 dark:bg-gray-400" />
                      )}
                      <span className={isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsed Icons */}
          {isCollapsed && (
            <>
              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
              <div className="space-y-0.5">
                {devTools.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex w-full items-center justify-center rounded-lg px-3 py-2.5 transition-all ${
                        isActive
                          ? 'bg-purple-50 text-purple-700 shadow-sm dark:bg-purple-500/20 dark:text-purple-300 dark:shadow-purple-500/10'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                      }`}
                      title={item.label}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-0 h-full w-1 rounded-r bg-purple-600 dark:bg-purple-400" />
                      )}
                      {item.icon}
                    </Link>
                  );
                })}
              </div>
              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
              <div className="space-y-0.5">
                {systemItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex w-full items-center justify-center rounded-lg px-3 py-2.5 transition-all ${
                        isActive
                          ? 'bg-gray-100 text-gray-900 shadow-sm dark:bg-gray-700/50 dark:text-white dark:shadow-gray-500/10'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                      }`}
                      title={item.label}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-0 h-full w-1 rounded-r bg-gray-600 dark:bg-gray-400" />
                      )}
                      {item.icon}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>
      </div>
    </aside>
  );
}
