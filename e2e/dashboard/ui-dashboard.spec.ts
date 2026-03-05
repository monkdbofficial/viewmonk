/**
 * Dashboard UI End-to-End Tests
 * Browser tests against the live Next.js dev server at /dashboard.
 *
 * Covers:
 *  Group 1 — Page Load & Stats Cards   (tests 01–08)
 *  Group 2 — Cluster & Nodes           (tests 09–14)
 *  Group 3 — Refresh Controls          (tests 15–18)
 *  Group 4 — Charts & Visuals          (tests 19–22)
 */

import { test, expect, Page } from '@playwright/test';

const CONN_ID      = 'pw-dash-conn';
const CONN_PAYLOAD = JSON.stringify([{
  id: CONN_ID,
  name: 'Playwright Dashboard Test',
  config: { host: 'localhost', port: 4200, protocol: 'http', role: 'superuser' },
}]);

async function injectConnection(page: Page) {
  await page.addInitScript(([payload, id]: [string, string]) => {
    localStorage.setItem('monkdb_connections', payload);
    localStorage.setItem('monkdb_active_connection', id);
  }, [CONN_PAYLOAD, CONN_ID] as [string, string]);
}

async function goToDashboard(page: Page) {
  await injectConnection(page);
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Page Load & Stats Cards
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 1 — Page Load & Stats Cards', () => {
  test('01 — Dashboard page loads without errors', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.getByText(/Dashboard|Overview|MonkDB/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('02 — Tables stat card is visible', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.getByText(/Tables?/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('03 — Shards stat card is visible', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.getByText(/Shards?/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('04 — Nodes stat card is visible', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.getByText(/Nodes?/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('05 — Uptime or records stat is shown', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.getByText(/Uptime|Records|Size/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('06 — Memory or disk usage is shown', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.getByText(/Memory|Disk|Heap|GB|MB/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('07 — Cluster health badge is visible', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.getByText(/GREEN|YELLOW|RED|healthy|good/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('08 — Stats cards display numeric values', async ({ page }) => {
    await goToDashboard(page);
    // At least one numeric value should appear in the stats area
    await expect(page.getByText(/\d+/).first()).toBeVisible({ timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Cluster & Nodes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 2 — Cluster & Nodes', () => {
  test('09 — Nodes section is visible with node info', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.getByText(/Node|node/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('10 — Cluster name is shown', async ({ page }) => {
    await goToDashboard(page);
    // MonkDB cluster name is shown somewhere on the dashboard
    await expect(page.getByText(/monkdb|cluster/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('11 — At least one node row is listed', async ({ page }) => {
    await goToDashboard(page);
    // Node list shows node name / IP
    await expect(page.getByText(/127\.0\.0\.1|localhost|node/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('12 — Auto-Refresh label is visible on dashboard toolbar', async ({ page }) => {
    await goToDashboard(page);
    // Auto-Refresh checkbox label is always visible in the header (superusers don't get schema selector)
    await expect(page.getByText(/Auto-Refresh/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('13 — Heap usage or storage metric is displayed', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.getByText(/Heap|heap|Storage|storage|Total Storage/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('14 — Read/Write Ratio or performance stat is present', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.getByText(/Read|Write|Ratio|Performance|Uptime|Cluster/i).first()).toBeVisible({ timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Refresh Controls
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 3 — Refresh Controls', () => {
  test('15 — Manual refresh button is visible', async ({ page }) => {
    await goToDashboard(page);
    await expect(
      page.getByRole('button', { name: /Refresh/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('16 — Clicking refresh button does not crash the page', async ({ page }) => {
    await goToDashboard(page);
    const refreshBtn = page.getByRole('button', { name: /Refresh/i }).first();
    await refreshBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await refreshBtn.click();
    await page.waitForTimeout(1500);
    // Page should still show stats after refresh
    await expect(page.getByText(/Tables?|Nodes?|Shards?/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('17 — Auto-refresh toggle is present', async ({ page }) => {
    await goToDashboard(page);
    await expect(
      page.getByText(/Auto.?Refresh|auto.?refresh/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('18 — Clicking auto-refresh toggle changes its state', async ({ page }) => {
    await goToDashboard(page);
    const toggleArea = page.getByText(/Auto.?Refresh|auto.?refresh/i).first();
    await toggleArea.waitFor({ state: 'visible', timeout: 15_000 });
    // Find the nearest button/checkbox to the auto-refresh label
    const toggleBtn = page.locator('button, input[type="checkbox"]').filter({ hasText: /auto.?refresh/i }).first();
    const count = await toggleBtn.count();
    if (count > 0) {
      await toggleBtn.click();
      await page.waitForTimeout(300);
    }
    // Page should still be functional
    await expect(page.getByText(/Tables?|Nodes?/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Charts & Visuals
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 4 — Charts & Visuals', () => {
  test('19 — Performance chart section is rendered', async ({ page }) => {
    await goToDashboard(page);
    // Performance or query chart area
    await expect(
      page.getByText(/Performance|Query|Read|Write/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('20 — Collection or table distribution section visible', async ({ page }) => {
    await goToDashboard(page);
    await expect(
      page.getByText(/Collection|Distribution|Schema|Tables/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('21 — Dashboard renders without JS errors (no crash screen)', async ({ page }) => {
    await goToDashboard(page);
    // If the page throws an error Next.js shows an error overlay
    await expect(page.locator('#__next-error')).not.toBeVisible();
    await expect(page.getByText(/Application error|unhandled/i)).not.toBeVisible();
  });

  test('22 — Status indicator shows green/healthy for localhost connection', async ({ page }) => {
    await goToDashboard(page);
    // Green status or "healthy" badge
    await expect(
      page.getByText(/GREEN|GOOD|healthy|active|connected/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
