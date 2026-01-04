'use client';

import { databaseProfiles, DatabaseType } from '../lib/databaseTypes';
import { Layers } from 'lucide-react';

interface DatabaseTypeSelectorProps {
  selectedType: DatabaseType | 'all';
  onTypeChange: (type: DatabaseType | 'all') => void;
}

export default function DatabaseTypeSelector({ selectedType, onTypeChange }: DatabaseTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Database Types
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Unified multi-model platform
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => onTypeChange('all')}
        className={`group w-full rounded-xl border p-4 text-left transition-all hover:shadow-md ${
          selectedType === 'all'
            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm dark:border-blue-400 dark:from-blue-900/30 dark:to-blue-800/20'
            : 'border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg transition-all ${
            selectedType === 'all'
              ? 'bg-blue-500 shadow-md'
              : 'bg-gray-100 group-hover:bg-blue-100 dark:bg-gray-700 dark:group-hover:bg-blue-900/30'
          }`}>
            <Layers className={`h-6 w-6 ${
              selectedType === 'all'
                ? 'text-white'
                : 'text-gray-600 group-hover:text-blue-600 dark:text-gray-400'
            }`} />
          </div>
          <div className="flex-1">
            <p className={`font-bold ${
              selectedType === 'all'
                ? 'text-blue-900 dark:text-blue-100'
                : 'text-gray-900 dark:text-white'
            }`}>
              All Types
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">View all databases</p>
          </div>
        </div>
      </button>

      <div className="space-y-3">
        {databaseProfiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => onTypeChange(profile.type)}
            className={`group w-full rounded-xl border p-4 text-left transition-all hover:shadow-md ${
              selectedType === profile.type
                ? 'shadow-sm'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            }`}
            style={
              selectedType === profile.type
                ? {
                    borderColor: profile.color,
                    backgroundColor: `${profile.color}10`,
                    borderWidth: '2px'
                  }
                : {}
            }
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl shadow-sm transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: `${profile.color}20`,
                }}
              >
                {profile.icon}
              </div>
              <div className="flex-1">
                <p className={`font-bold ${
                  selectedType === profile.type
                    ? 'dark:text-white'
                    : 'text-gray-900 dark:text-white'
                }`}
                style={selectedType === profile.type ? { color: profile.color } : {}}>
                  {profile.name}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                  {profile.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.features.slice(0, 2).map((feature, idx) => (
                    <span
                      key={idx}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        selectedType === profile.type
                          ? 'text-gray-700 dark:text-gray-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                      style={selectedType === profile.type ? {
                        backgroundColor: `${profile.color}20`,
                        color: profile.color
                      } : {}}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
