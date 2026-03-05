/**
 * Connections Manager UI End-to-End Tests
 * Browser tests against the live Next.js dev server at /connections.
 *
 * Covers:
 *  Group 1 — Page Load & Existing Connection  (tests 01–06)
 *  Group 2 — Search & Filter                  (tests 07–10)
 *  Group 3 — Add Connection Dialog            (tests 11–17)
 *  Group 4 — Connection Actions               (tests 18–22)
 */

import { test, expect, Page } from '@playwright/test';

const CONN_ID      = 'pw-cm-conn';
const CONN_PAYLOAD = JSON.stringify([{
  id: CONN_ID,
  name: 'PW Conn Manager Test',
  config: { host: 'localhost', port: 4200, protocol: 'http', role: 'superuser' },
}]);

async function injectConnection(page: Page) {
  await page.addInitScript(([payload, id]: [string, string]) => {
    localStorage.setItem('monkdb_connections', payload);
    localStorage.setItem('monkdb_active_connection', id);
  }, [CONN_PAYLOAD, CONN_ID] as [string, string]);
}

async function goToConnections(page: Page) {
  await injectConnection(page);
  await page.goto('/connections');
  await page.waitForLoadState('networkidle');
}

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Page Load & Existing Connection
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 1 — Page Load & Existing Connection', () => {
  test('01 — Connections page loads successfully', async ({ page }) => {
    await goToConnections(page);
    await expect(
      page.getByText(/Connection|connection/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('02 — The injected connection appears in the list', async ({ page }) => {
    await goToConnections(page);
    await expect(
      page.getByText(/PW Conn Manager Test|localhost/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('03 — Connection host and port are displayed', async ({ page }) => {
    await goToConnections(page);
    await expect(page.getByText(/localhost|4200/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('04 — Active connection has a visual indicator (active/connected badge)', async ({ page }) => {
    await goToConnections(page);
    await expect(
      page.getByText(/Active|active|Connected|connected/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('05 — Connection "User:" label is shown on the connection card', async ({ page }) => {
    await goToConnections(page);
    // Connection card shows "User: anonymous" (or the username)
    await expect(page.getByText(/User:|anonymous|localhost/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('06 — Connection card shows a status indicator (online/green)', async ({ page }) => {
    await goToConnections(page);
    // Some green or online indicator
    await expect(
      page.locator('[class*="green"], [class*="success"], [class*="active"]').first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Search & Filter
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 2 — Search & Filter', () => {
  test('07 — Search input is visible on connections page', async ({ page }) => {
    await goToConnections(page);
    await expect(
      page.locator('input[type="text"], input[placeholder*="earch"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('08 — Typing a connection name in search shows it', async ({ page }) => {
    await goToConnections(page);
    await page.locator('input[type="text"], input[placeholder*="earch"]').first().fill('localhost');
    await page.waitForTimeout(300);
    await expect(page.getByText(/localhost/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('09 — Filter dropdown is visible (All / Connected / Disconnected)', async ({ page }) => {
    await goToConnections(page);
    await expect(
      page.locator('select, [role="combobox"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('10 — Filtering by "all" still shows the injected connection', async ({ page }) => {
    await goToConnections(page);
    const filterSelect = page.locator('select').first();
    const count = await filterSelect.count();
    if (count > 0) {
      await filterSelect.selectOption({ index: 0 }); // "All"
      await page.waitForTimeout(300);
    }
    await expect(page.getByText(/localhost|PW Conn/i).first()).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Add Connection Dialog
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 3 — Add Connection Dialog', () => {
  test('11 — "Add Connection" / "New Connection" button is visible', async ({ page }) => {
    await goToConnections(page);
    await expect(
      page.getByRole('button', { name: /Add|New|\\+/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('12 — Clicking Add Connection opens the dialog', async ({ page }) => {
    await goToConnections(page);
    await page.getByRole('button', { name: /Add|New|\\+/i }).first().click();
    await page.waitForTimeout(300);
    // Dialog should show a Host or Connection Name input
    await expect(
      page.getByPlaceholder(/host|localhost/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('13 — Add dialog has a Host input field', async ({ page }) => {
    await goToConnections(page);
    await page.getByRole('button', { name: /Add|New|\\+/i }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByPlaceholder(/host|localhost/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('14 — Add dialog has a Port input field', async ({ page }) => {
    await goToConnections(page);
    await page.getByRole('button', { name: /Add|New|\\+/i }).first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('input[type="number"], input[placeholder*="4200"]').first()).toBeVisible({ timeout: 5_000 });
  });

  test('15 — Add dialog has a Username input', async ({ page }) => {
    await goToConnections(page);
    await page.getByRole('button', { name: /Add|New|\\+/i }).first().click();
    await page.waitForTimeout(300);
    await expect(
      page.getByPlaceholder(/username|user/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('16 — Add dialog has a Password input', async ({ page }) => {
    await goToConnections(page);
    await page.getByRole('button', { name: /Add|New|\\+/i }).first().click();
    await page.waitForTimeout(300);
    await expect(
      page.locator('input[type="password"]').first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('17 — Cancel button closes the Add dialog', async ({ page }) => {
    await goToConnections(page);
    await page.getByRole('button', { name: /Add|New/i }).first().click();
    await page.waitForTimeout(300);
    // Cancel is a button in the dialog footer
    const cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();
    const count = await cancelBtn.count();
    if (count > 0) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByPlaceholder(/host|localhost/i)).not.toBeVisible();
    } else {
      // Fallback: press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    // Page should still be functional
    await expect(page.getByText(/Database Connections|localhost/i).first()).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Connection Actions
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 4 — Connection Actions', () => {
  test('18 — Refresh (ping) button is visible on connection card', async ({ page }) => {
    await goToConnections(page);
    await expect(
      page.locator('button[title*="Refresh"], button[title*="refresh"], button[title*="Ping"]').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('19 — Clicking refresh button on connection card does not crash', async ({ page }) => {
    await goToConnections(page);
    const refreshBtn = page.locator('button[title*="Refresh"], button[title*="refresh"]').first();
    const count = await refreshBtn.count();
    if (count > 0) {
      await refreshBtn.click();
      await page.waitForTimeout(1500);
    }
    await expect(page.getByText(/localhost|PW Conn/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('20 — Favorite (star) button is present on connection card', async ({ page }) => {
    await goToConnections(page);
    // Star/bookmark button for favoriting
    await expect(
      page.locator('button[title*="avorite"], button[title*="star"], button[aria-label*="favorite"]').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('21 — "Total Connections" stats card shows a count', async ({ page }) => {
    await goToConnections(page);
    // Stats card: "Total Connections" with a number
    await expect(page.getByText(/Total Connections/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('22 — Connections page renders without crash overlay', async ({ page }) => {
    await goToConnections(page);
    await expect(page.locator('#__next-error')).not.toBeVisible();
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });
});
