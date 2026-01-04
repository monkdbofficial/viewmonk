'use client';

import { useState, useEffect } from 'react';

interface Shortcut {
  keys: string[];
  description: string;
  category: 'general' | 'navigation' | 'editor' | 'data';
}

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  const [search, setSearch] = useState('');
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const shortcuts: Shortcut[] = [
    // General
    { keys: ['⌘', 'K'], description: 'Open command palette', category: 'general' },
    { keys: ['?'], description: 'Show keyboard shortcuts', category: 'general' },
    { keys: ['Esc'], description: 'Close modal/dialog', category: 'general' },
    { keys: ['⌘', 'S'], description: 'Save current work', category: 'general' },
    { keys: ['⌘', 'Z'], description: 'Undo last action', category: 'general' },
    { keys: ['⌘', 'Shift', 'Z'], description: 'Redo last action', category: 'general' },
    { keys: ['⌘', '/'], description: 'Toggle theme (dark/light)', category: 'general' },

    // Navigation
    { keys: ['⌘', '1'], description: 'Go to Overview', category: 'navigation' },
    { keys: ['⌘', '2'], description: 'Go to Dashboard', category: 'navigation' },
    { keys: ['⌘', '3'], description: 'Go to Query Editor', category: 'navigation' },
    { keys: ['⌘', '4'], description: 'Go to Data Browser', category: 'navigation' },
    { keys: ['⌘', '5'], description: 'Go to API Playground', category: 'navigation' },
    { keys: ['⌘', 'B'], description: 'Toggle sidebar', category: 'navigation' },
    { keys: ['⌘', 'N'], description: 'New connection', category: 'navigation' },

    // Editor
    { keys: ['⌘', 'Enter'], description: 'Execute query', category: 'editor' },
    { keys: ['⌘', 'E'], description: 'Focus query editor', category: 'editor' },
    { keys: ['⌘', 'D'], description: 'Duplicate line', category: 'editor' },
    { keys: ['⌘', 'L'], description: 'Select line', category: 'editor' },
    { keys: ['⌘', 'F'], description: 'Find in editor', category: 'editor' },
    { keys: ['⌘', 'H'], description: 'Find and replace', category: 'editor' },
    { keys: ['⌘', '['], description: 'Decrease indent', category: 'editor' },
    { keys: ['⌘', ']'], description: 'Increase indent', category: 'editor' },

    // Data
    { keys: ['⌘', 'R'], description: 'Refresh data', category: 'data' },
    { keys: ['⌘', 'P'], description: 'Export data', category: 'data' },
    { keys: ['⌘', 'I'], description: 'Import data', category: 'data' },
    { keys: ['⌘', 'Shift', 'F'], description: 'Filter data', category: 'data' },
    { keys: ['⌘', 'Shift', 'S'], description: 'Sort data', category: 'data' },
    { keys: ['⌘', 'G'], description: 'Go to line/record', category: 'data' },
  ];

  const categoryLabels: Record<string, { title: string; icon: string }> = {
    general: { title: 'General', icon: '⚙️' },
    navigation: { title: 'Navigation', icon: '🧭' },
    editor: { title: 'Query Editor', icon: '💻' },
    data: { title: 'Data Operations', icon: '📊' },
  };

  const filteredShortcuts = shortcuts.filter(
    (shortcut) =>
      shortcut.description.toLowerCase().includes(search.toLowerCase()) ||
      shortcut.keys.some((key) => key.toLowerCase().includes(search.toLowerCase()))
  );

  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  const formatKey = (key: string) => {
    if (!isMac) {
      // Replace Mac symbols with Windows equivalents
      return key
        .replace('⌘', 'Ctrl')
        .replace('⌥', 'Alt')
        .replace('⇧', 'Shift')
        .replace('⌃', 'Ctrl');
    }
    return key.replace('⌘', '⌘').replace('⌥', '⌥').replace('⇧', 'Shift');
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        // This will be triggered from parent component
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⌨️</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Press <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">?</kbd> anytime to view this
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-gray-200 px-6 py-3 dark:border-gray-700">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No shortcuts found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                <div key={category}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-2xl">{categoryLabels[category].icon}</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {categoryLabels[category].title}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <span key={keyIndex} className="flex items-center">
                              <kbd className="inline-flex h-7 min-w-[28px] items-center justify-center rounded border border-gray-300 bg-white px-2 text-sm font-semibold text-gray-800 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                                {formatKey(key)}
                              </kbd>
                              {keyIndex < shortcut.keys.length - 1 && (
                                <span className="mx-1 text-gray-400">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Shortcuts shown for {isMac ? 'macOS' : 'Windows/Linux'}</span>
            <span className="flex items-center gap-1">
              Press <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">Esc</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
