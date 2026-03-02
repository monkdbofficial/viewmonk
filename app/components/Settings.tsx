'use client';

import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { useToast } from './ToastContext';
import { Settings as SettingsIcon, Save, RotateCcw } from 'lucide-react';

const DEFAULT_SETTINGS = {
  autoSave: true,
  queryTimeout: 30,
  maxResults: 1000,
  enableNotifications: true,
  enableTelemetry: false,
};

const SETTINGS_STORAGE_KEY = 'monkdb-workbench-settings';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch {
      // parse error — keep defaults
    }
  }, []);

  // Track unsaved changes
  const updateSetting = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
    setHasUnsavedChanges(true);
  };

  // Save settings to localStorage
  const handleSave = () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      setHasUnsavedChanges(false);
      toast.success('Settings Saved', 'Your preferences have been saved successfully');
    } catch {
      toast.error('Save Failed', 'Failed to save settings. Please try again.');
    }
  };

  // Reset to default settings
  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      setSettings(DEFAULT_SETTINGS);
      setHasUnsavedChanges(true);
      toast.info('Settings Reset', 'All settings have been reset to defaults. Click Save to apply.');
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
              <SettingsIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Settings
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Manage your workbench preferences and configuration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-4">
      {/* Appearance */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Appearance
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900 dark:text-white">
                Theme
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose between light and dark mode
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            >
              {theme === 'light' ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </div>

      {/* Editor Settings */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Editor
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900 dark:text-white">
                Auto Save
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Automatically save queries as you type
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => updateSetting('autoSave', e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700 dark:after:border-gray-600"></div>
            </label>
          </div>

          <div>
            <label className="block font-medium text-gray-900 dark:text-white">
              Query Timeout (seconds)
            </label>
            <input
              type="number"
              value={settings.queryTimeout}
              onChange={(e) => updateSetting('queryTimeout', parseInt(e.target.value) || 30)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-900 dark:text-white">
              Maximum Results
            </label>
            <input
              type="number"
              value={settings.maxResults}
              onChange={(e) => updateSetting('maxResults', parseInt(e.target.value) || 1000)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900 dark:text-white">
                Enable Notifications
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive notifications for important events
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700 dark:after:border-gray-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Privacy & Security
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900 dark:text-white">
                Send Telemetry Data
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Help improve MonkDB by sending anonymous usage data
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.enableTelemetry}
                onChange={(e) => updateSetting('enableTelemetry', e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700 dark:after:border-gray-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        {hasUnsavedChanges && (
          <span className="text-xs text-orange-600 dark:text-orange-400">
            You have unsaved changes
          </span>
        )}
        <div className="ml-auto flex gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
