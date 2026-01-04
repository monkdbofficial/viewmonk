'use client';

import { databaseProfiles, unifiedDatabases } from '../lib/databaseTypes';

export default function DatabaseTypesOverview() {
  const database = unifiedDatabases[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Unified Multi-Database Platform
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Supporting 8 database types with SQL protocol and OLAP analytics
        </p>
      </div>

      {/* Protocol & Features */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 dark:border-gray-700 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {databaseProfiles.length}
          </div>
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Database Types
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-green-50 to-green-100 p-6 dark:border-gray-700 dark:from-green-900/20 dark:to-green-800/20">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">SQL</div>
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Protocol Support
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6 dark:border-gray-700 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">OLAP</div>
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Analytics Engine
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100 p-6 dark:border-gray-700 dark:from-orange-900/20 dark:to-orange-800/20">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {database.collections.length}
          </div>
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Active Collections
          </p>
        </div>
      </div>

      {/* Database Type Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {databaseProfiles.map((profile) => {
          const collection = database.collections.find((c) => c.type === profile.type);

          return (
            <div
              key={profile.id}
              className="group cursor-pointer overflow-hidden rounded-lg border-2 border-gray-200 bg-white transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
              style={{
                borderColor: profile.color + '40'
              }}
            >
              {/* Header */}
              <div
                className="p-6"
                style={{
                  background: `linear-gradient(135deg, ${profile.color}15 0%, ${profile.color}05 100%)`
                }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-4xl">{profile.icon}</span>
                  <div
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: profile.color + '20',
                      color: profile.color
                    }}
                  >
                    {collection?.documentCount.toLocaleString() || 0}
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                  {profile.name}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {profile.description}
                </p>
              </div>

              {/* Details */}
              <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Protocol:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {profile.protocol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Query:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {profile.queryLanguage}
                    </span>
                  </div>
                  {collection && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Size:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {collection.size}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-1">
                  {profile.features.slice(0, 3).map((feature, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-white px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Platform Features */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Platform Capabilities
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <div className="mb-2 text-2xl">🔄</div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Unified Interface</h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Single interface for all database types with consistent query experience
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <div className="mb-2 text-2xl">⚡</div>
            <h4 className="font-semibold text-gray-900 dark:text-white">High Performance</h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Optimized query execution with intelligent caching and indexing
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <div className="mb-2 text-2xl">🔐</div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Enterprise Security</h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Role-based access control, encryption, and audit logging
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
