'use client';

import { useState, useEffect, useRef } from 'react';

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  category: 'navigation' | 'action' | 'database' | 'settings';
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export default function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    // Navigation
    { id: 'nav-dashboard', title: 'Go to Dashboard', icon: '📊', category: 'navigation', action: () => onNavigate('dashboard'), keywords: ['home', 'overview'] },
    { id: 'nav-database', title: 'Database Types', icon: '🎯', category: 'navigation', action: () => onNavigate('overview'), keywords: ['types', 'databases'] },
    { id: 'nav-unified', title: 'Unified Browser', icon: '🗂️', category: 'navigation', action: () => onNavigate('unified'), keywords: ['browse', 'data'] },
    { id: 'nav-query', title: 'Query Editor', icon: '⚡', category: 'navigation', action: () => onNavigate('query'), keywords: ['sql', 'execute'] },
    { id: 'nav-api', title: 'API Playground', icon: '🚀', category: 'navigation', action: () => onNavigate('api'), keywords: ['rest', 'test'] },
    { id: 'nav-codegen', title: 'Code Generator', icon: '💻', category: 'navigation', action: () => onNavigate('codegen'), keywords: ['generate', 'code'] },
    { id: 'nav-schema', title: 'Schema Designer', icon: '🏗️', category: 'navigation', action: () => onNavigate('schema'), keywords: ['design', 'model'] },

    // Actions
    { id: 'action-new-query', title: 'Create New Query', subtitle: 'Start a fresh query', icon: '➕', category: 'action', action: () => onNavigate('query') },
    { id: 'action-export', title: 'Export Data', subtitle: 'Download current view', icon: '📤', category: 'action', action: () => alert('Export initiated') },
    { id: 'action-import', title: 'Import Data', subtitle: 'Upload data files', icon: '📥', category: 'action', action: () => alert('Import dialog') },
    { id: 'action-refresh', title: 'Refresh All Data', subtitle: 'Reload connections', icon: '🔄', category: 'action', action: () => window.location.reload() },

    // Database
    { id: 'db-connect', title: 'New Connection', subtitle: 'Add database connection', icon: '🔌', category: 'database', action: () => onNavigate('connections') },
    { id: 'db-disconnect', title: 'Disconnect All', subtitle: 'Close all connections', icon: '⛔', category: 'database', action: () => alert('Disconnecting...') },

    // Settings
    { id: 'settings-theme', title: 'Toggle Theme', subtitle: 'Switch dark/light mode', icon: '🌓', category: 'settings', action: () => alert('Theme toggled') },
    { id: 'settings-shortcuts', title: 'Keyboard Shortcuts', subtitle: 'View all shortcuts', icon: '⌨️', category: 'settings', action: () => alert('Shortcuts modal') },
    { id: 'settings-preferences', title: 'Preferences', subtitle: 'Configure settings', icon: '⚙️', category: 'settings', action: () => onNavigate('settings') },
  ];

  const filteredCommands = commands.filter(cmd => {
    const searchLower = search.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(searchLower) ||
      cmd.subtitle?.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some(k => k.includes(searchLower)) ||
      cmd.category.includes(searchLower)
    );
  });

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
        setSearch('');
      }
    } else if (e.key === 'Escape') {
      onClose();
      setSearch('');
    }
  };

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    action: 'Actions',
    database: 'Database',
    settings: 'Settings',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[10vh]">
      <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <span className="text-2xl">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-lg outline-none dark:text-white"
          />
          <kbd className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No commands found</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="mb-4">
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {categoryLabels[category]}
                </p>
                {cmds.map((cmd, idx) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        onClose();
                        setSearch('');
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`flex w-full items-center gap-4 rounded-lg px-3 py-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-2xl">{cmd.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {cmd.title}
                        </p>
                        {cmd.subtitle && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {cmd.subtitle}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <kbd className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">↑</kbd>
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">↵</kbd>
              Select
            </span>
          </div>
          <span>Press <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">⌘K</kbd> to open</span>
        </div>
      </div>
    </div>
  );
}
