import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Retry once to handle transient resource-contention failures under parallel load
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  // Auto-start dev server for UI tests; reuse if already running
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 90_000,
  },

  projects: [
    {
      // SQL-only tests — no browser, hits MonkDB /_sql directly
      name: 'sql-compat',
      testMatch: '**/sql-compat.spec.ts',
    },
    {
      // Full browser tests for the FTS page UI
      name: 'ui-fts',
      testMatch: '**/ui-fts.spec.ts',
      use: { browserName: 'chromium', headless: true },
    },
    {
      // Full browser tests for the Vector Operations page UI
      name: 'vec-ui',
      testMatch: '**/ui-vector.spec.ts',
      use: { browserName: 'chromium', headless: true },
    },
    {
      // Full browser tests for the Geospatial page UI
      name: 'geo-ui',
      testMatch: '**/ui-geo.spec.ts',
      use: { browserName: 'chromium', headless: true },
    },
    {
      // Full browser tests for the Timeseries Studio UI
      name: 'ts-ui',
      testMatch: '**/ui-timeseries.spec.ts',
      use: { browserName: 'chromium', headless: true },
    },
    {
      // Full browser tests for the SQL Query Editor
      name: 'qe-ui',
      testMatch: '**/ui-query-editor.spec.ts',
      use: { browserName: 'chromium', headless: true },
    },
    {
      // Full browser tests for the Unified Browser / Schema Viewer
      name: 'ub-ui',
      testMatch: '**/ui-unified-browser.spec.ts',
      use: { browserName: 'chromium', headless: true },
    },
    {
      // Full browser tests for the Table Designer wizard
      name: 'td-ui',
      testMatch: '**/ui-table-designer.spec.ts',
      use: { browserName: 'chromium', headless: true },
    },
    {
      // Full browser tests for User Management
      name: 'um-ui',
      testMatch: '**/ui-user-management.spec.ts',
      use: { browserName: 'chromium', headless: true },
    },
    {
      // Full browser tests for the Dashboard
      name: 'dash-ui',
      testMatch: '**/ui-dashboard.spec.ts',
      use: { browserName: 'chromium', headless: true },
    },
    {
      // Full browser tests for Monitoring page
      name: 'mon-ui',
      testMatch: '**/ui-monitoring.spec.ts',
      use: { browserName: 'chromium', headless: true },
    },
    {
      // Full browser tests for Connections Manager
      name: 'conn-ui',
      testMatch: '**/ui-connections.spec.ts',
      use: { browserName: 'chromium', headless: true },
    },
  ],
});
