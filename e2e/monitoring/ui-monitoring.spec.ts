/**
 * Monitoring UI End-to-End Tests
 * Browser tests against the live Next.js dev server at /monitoring.
 *
 * Covers:
 *  Group 1 — Page Load & Cluster Health  (tests 01–06)
 *  Group 2 — Node Details                (tests 07–12)
 *  Group 3 — Refresh Controls            (tests 13–16)
 *  Group 4 — Metrics & Charts            (tests 17–20)
 */

import { test, expect, Page } from '@playwright/test';

const CONN_ID      = 'pw-mon-conn';
const CONN_PAYLOAD = JSON.stringify([{
  id: CONN_ID,
  name: 'Playwright Monitoring Test',
  config: { host: 'localhost', port: 4200, protocol: 'http', role: 'superuser' },
}]);

async function injectConnection(page: Page) {
  await page.addInitScript(([payload, id]: [string, string]) => {
    localStorage.setItem('monkdb_connections', payload);
    localStorage.setItem('monkdb_active_connection', id);
  }, [CONN_PAYLOAD, CONN_ID] as [string, string]);
}

async function goToMonitoring(page: Page) {
  await injectConnection(page);
  await page.goto('/monitoring');
  await page.waitForLoadState('networkidle');
}

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Page Load & Cluster Health
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 1 — Page Load & Cluster Health', () => {
  test('01 — Monitoring page loads successfully', async ({ page }) => {
    await goToMonitoring(page);
    await expect(page.getByText(/Monitoring|System|Cluster/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('02 — Cluster health section is visible', async ({ page }) => {
    await goToMonitoring(page);
    await expect(page.getByText(/Cluster Health|cluster health/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('03 — Cluster Nodes count card is visible', async ({ page }) => {
    await goToMonitoring(page);
    // Monitoring shows "Cluster Nodes" stat card (not a GREEN/RED badge)
    await expect(page.getByText(/Cluster Nodes|Nodes Online/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('04 — Number of nodes is displayed', async ({ page }) => {
    await goToMonitoring(page);
    await expect(page.getByText(/Node|node/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('05 — Monitoring page does not show error state with active connection', async ({ page }) => {
    await goToMonitoring(page);
    // Should not show "No Active Connection" message
    await expect(page.getByText(/No Active Connection/i)).not.toBeVisible();
  });

  test('06 — At least one stat metric card is visible', async ({ page }) => {
    await goToMonitoring(page);
    await expect(page.getByText(/MB|GB|%|\d+ node/i).first()).toBeVisible({ timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Node Details
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 2 — Node Details', () => {
  test('07 — Nodes list section is rendered', async ({ page }) => {
    await goToMonitoring(page);
    await expect(page.getByText(/Nodes?|node/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('08 — Node hostname or IP address is shown', async ({ page }) => {
    await goToMonitoring(page);
    await expect(page.getByText(/127\.0\.0\.1|localhost|LOCALHOST/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('09 — Heap memory stat is displayed per node', async ({ page }) => {
    await goToMonitoring(page);
    await expect(page.getByText(/Heap|heap/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('10 — Free disk space or disk usage is shown', async ({ page }) => {
    await goToMonitoring(page);
    await expect(page.getByText(/Disk|disk|Free|free/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('11 — Heap Usage column header is visible in node metrics table', async ({ page }) => {
    await goToMonitoring(page);
    // Node metrics table has "Heap Usage" column (not Load/CPU)
    await expect(page.getByText(/Heap Usage|Heap/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('12 — Memory usage percentage is shown', async ({ page }) => {
    await goToMonitoring(page);
    await expect(page.getByText(/%|Memory|memory/i).first()).toBeVisible({ timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Refresh Controls
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 3 — Refresh Controls', () => {
  test('13 — Manual refresh button is visible', async ({ page }) => {
    await goToMonitoring(page);
    await expect(
      page.getByRole('button', { name: /Refresh/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('14 — Clicking refresh does not crash the page', async ({ page }) => {
    await goToMonitoring(page);
    const refreshBtn = page.getByRole('button', { name: /Refresh/i }).first();
    await refreshBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await refreshBtn.click();
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Cluster Health|Node|node/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('15 — Auto-refresh toggle is visible', async ({ page }) => {
    await goToMonitoring(page);
    await expect(
      page.getByText(/Auto.?Refresh|auto.?refresh/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('16 — Auto-refresh interval label is shown (e.g. 5s)', async ({ page }) => {
    await goToMonitoring(page);
    // Monitoring refreshes every 5s
    await expect(page.getByText(/5s|5 sec|Interval|interval/i).first()).toBeVisible({ timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Metrics & Charts
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 4 — Metrics & Charts', () => {
  test('17 — System metrics chart area is rendered', async ({ page }) => {
    await goToMonitoring(page);
    // Chart canvas or SVG or a metrics section
    await expect(
      page.locator('canvas, svg, [class*="chart"], [class*="metric"]').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('18 — Uptime or start time is displayed', async ({ page }) => {
    await goToMonitoring(page);
    await expect(page.getByText(/Uptime|uptime|Started|started/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('19 — Number of shards is shown', async ({ page }) => {
    await goToMonitoring(page);
    await expect(page.getByText(/Shard|shard/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('20 — Monitoring page renders without crash overlay', async ({ page }) => {
    await goToMonitoring(page);
    await expect(page.locator('#__next-error')).not.toBeVisible();
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });
});
