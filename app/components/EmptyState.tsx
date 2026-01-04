'use client';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  illustration?: 'data' | 'connection' | 'search' | 'query' | 'schema' | 'api';
}

export default function EmptyState({
  icon,
  title,
  description,
  actions,
  illustration = 'data',
}: EmptyStateProps) {
  const getIllustrationSvg = () => {
    switch (illustration) {
      case 'data':
        return (
          <svg className="h-48 w-48 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        );
      case 'connection':
        return (
          <svg className="h-48 w-48 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'search':
        return (
          <svg className="h-48 w-48 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'query':
        return (
          <svg className="h-48 w-48 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'schema':
        return (
          <svg className="h-48 w-48 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
          </svg>
        );
      case 'api':
        return (
          <svg className="h-48 w-48 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="max-w-md text-center">
        {/* Illustration */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            {getIllustrationSvg()}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl">{icon}</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h3>

        {/* Description */}
        <p className="mb-8 text-gray-600 dark:text-gray-400">
          {description}
        </p>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`rounded-lg px-6 py-3 font-semibold transition-all ${
                  action.primary
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Helper Text */}
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-500">
          <p>Need help? Press <kbd className="rounded bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-gray-700">?</kbd> for shortcuts</p>
        </div>
      </div>
    </div>
  );
}

// Preset Empty States for common scenarios
export function NoConnectionsEmptyState({ onAddConnection }: { onAddConnection: () => void }) {
  return (
    <EmptyState
      icon="🔌"
      illustration="connection"
      title="No Database Connections"
      description="Get started by connecting to your first database. We support MongoDB, PostgreSQL, MySQL, and more."
      actions={[
        { label: 'Add Connection', onClick: onAddConnection, primary: true },
        { label: 'View Documentation', onClick: () => window.open('https://docs.example.com', '_blank') },
      ]}
    />
  );
}

export function NoDataEmptyState({ onImportData, onCreateSample }: { onImportData: () => void; onCreateSample: () => void }) {
  return (
    <EmptyState
      icon="📦"
      illustration="data"
      title="No Data Found"
      description="This collection is empty. Import data from a file or create sample data to get started."
      actions={[
        { label: 'Import Data', onClick: onImportData, primary: true },
        { label: 'Generate Sample Data', onClick: onCreateSample },
      ]}
    />
  );
}

export function NoQueryHistoryEmptyState({ onCreateQuery }: { onCreateQuery: () => void }) {
  return (
    <EmptyState
      icon="⚡"
      illustration="query"
      title="No Query History"
      description="Your query history will appear here. Start by writing and executing your first query."
      actions={[
        { label: 'Create New Query', onClick: onCreateQuery, primary: true },
      ]}
    />
  );
}

export function NoSearchResultsEmptyState({ onClearSearch }: { onClearSearch: () => void }) {
  return (
    <EmptyState
      icon="🔍"
      illustration="search"
      title="No Results Found"
      description="We couldn't find any matches for your search. Try adjusting your search terms or filters."
      actions={[
        { label: 'Clear Search', onClick: onClearSearch, primary: true },
      ]}
    />
  );
}

export function NoSchemaEmptyState({ onCreateSchema }: { onCreateSchema: () => void }) {
  return (
    <EmptyState
      icon="🏗️"
      illustration="schema"
      title="No Schema Defined"
      description="Design your database schema to define the structure of your data and relationships between collections."
      actions={[
        { label: 'Design Schema', onClick: onCreateSchema, primary: true },
        { label: 'Import from Database', onClick: () => alert('Import schema') },
      ]}
    />
  );
}

export function NoAPIEndpointsEmptyState({ onCreateEndpoint }: { onCreateEndpoint: () => void }) {
  return (
    <EmptyState
      icon="🚀"
      illustration="api"
      title="No API Endpoints"
      description="Create and test API endpoints to interact with your database through RESTful APIs."
      actions={[
        { label: 'Create Endpoint', onClick: onCreateEndpoint, primary: true },
        { label: 'View API Docs', onClick: () => window.open('https://docs.example.com/api', '_blank') },
      ]}
    />
  );
}
