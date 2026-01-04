'use client';

import { useRouter } from 'next/navigation';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  action: () => void;
}

export default function QuickActions() {
  const router = useRouter();
  const actions: QuickAction[] = [
    {
      id: 'new-query',
      label: 'Query Editor',
      icon: '⚡',
      description: 'Execute SQL queries',
      color: 'from-blue-500 to-blue-600',
      action: () => router.push('/query-editor'),
    },
    {
      id: 'schema-viewer',
      label: 'Schema Viewer',
      icon: '🗂️',
      description: 'Browse database schemas',
      color: 'from-green-500 to-green-600',
      action: () => router.push('/unified-browser'),
    },
    {
      id: 'api-playground',
      label: 'API Playground',
      icon: '🚀',
      description: 'Test MonkDB API endpoints',
      color: 'from-purple-500 to-purple-600',
      action: () => router.push('/api-playground'),
    },
    {
      id: 'connections',
      label: 'Connections',
      icon: '🔌',
      description: 'Manage database connections',
      color: 'from-orange-500 to-orange-600',
      action: () => router.push('/connections'),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.action}
          className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-left transition-all hover:scale-105 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <div className={`absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-10 ${action.color}`}></div>
          <div className="relative">
            <div className="mb-3 text-4xl">{action.icon}</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{action.label}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{action.description}</p>
          </div>
          <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}
