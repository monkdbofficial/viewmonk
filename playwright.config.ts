import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
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
      // Covers both e2e/fts/sql-compat.spec.ts and e2e/vector/sql-compat.spec.ts
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
  ],
});
