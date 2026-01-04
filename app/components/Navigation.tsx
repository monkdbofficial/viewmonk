'use client';

import { useTheme } from './ThemeProvider';
import { useEffect, useState } from 'react';
import { useMonkDB } from '../lib/monkdb-context';
import NotificationCenter from './NotificationCenter';
import Link from 'next/link';
import Image from 'next/image';

export default function Navigation() {
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { activeConnection } = useMonkDB();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Render loading state before fully mounted
  if (!mounted) {
    return (
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-[#001E2B]">
        <div className="px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-white/10"></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-white/10"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#001E2B]">
      <div className="px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <Image
              src={theme === 'light' ? '/logo-light.svg' : '/logo-dark.svg'}
              alt="MonkDB"
              width={128}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Search Icon - Enterprise Grade with Tooltip */}
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', {
                  key: 'k',
                  metaKey: true,
                  ctrlKey: true,
                });
                window.dispatchEvent(event);
              }}
              className="group relative rounded p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
              aria-label="Open command palette (⌘K or Ctrl+K)"
              title="Command Palette"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {/* Keyboard Shortcut Hint - Shows on Hover */}
              <div className="absolute right-0 top-full mt-2 hidden whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white shadow-lg group-hover:block dark:bg-gray-700">
                <div className="flex items-center gap-2">
                  <span>Command Palette</span>
                  <kbd className="rounded bg-gray-800 px-2 py-1 font-mono text-[10px] dark:bg-gray-600">
                    ⌘K
                  </kbd>
                </div>
                {/* Tooltip Arrow */}
                <div className="absolute -top-1 right-3 h-2 w-2 rotate-45 bg-gray-900 dark:bg-gray-700"></div>
              </div>
            </button>

            {/* Notifications */}
            <NotificationCenter />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === 'light' ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {/* Connection Status - Enterprise Grade Display */}
            {activeConnection && (
              <div className="hidden items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5 dark:bg-green-900/20 lg:flex">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse flex-shrink-0"></div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400 leading-none">
                    {activeConnection.config.username || activeConnection.name || 'Anonymous'}
                  </span>
                  <span className="text-[10px] text-green-600 dark:text-green-500 leading-none">
                    {activeConnection.config.host}:{activeConnection.config.port}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
