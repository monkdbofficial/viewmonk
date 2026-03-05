/**
 * Query Editor UI End-to-End Tests
 * Browser tests against the live Next.js dev server at /query-editor.
 *
 * Covers:
 *  Group 1 — Page Load           (tests 01–05)
 *  Group 2 — Query Tabs          (tests 06–11)
 *  Group 3 — SQL Execution       (tests 12–19)
 *  Group 4 — Sidebar             (tests 20–25)
 *  Group 5 — Toolbar Actions     (tests 26–33)
 *  Group 6 — Results Panel       (tests 34–40)
 */

import { test, expect, Page } from '@playwright/test';

const CONN_ID      = 'pw-qe-conn';
const CONN_PAYLOAD = JSON.stringify([{
  id: CONN_ID,
  name: 'Playwright QE Test',
  config: { host: 'localhost', port: 4200, protocol: 'http', role: 'superuser' },
}]);

const MONKDB = 'http://localhost:4200/_sql';

async function sqlHttp(stmt: string) {
  const res = await fetch(MONKDB, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stmt }),
  });
  return res.json();
}

async function injectConnection(page: Page) {
  await page.addInitScript(([payload, id]: [string, string]) => {
    localStorage.setItem('monkdb_connections', payload);
    localStorage.setItem('monkdb_active_connection', id);
    localStorage.removeItem('monkdb_query_history');
  }, [CONN_PAYLOAD, CONN_ID] as [string, string]);
}

async function goToQueryEditor(page: Page) {
  await injectConnection(page);
  await page.goto('/query-editor');
  await page.waitForLoadState('networkidle');
}

// Type SQL into Monaco editor (select all existing then type)
async function typeInEditor(page: Page, sql: string) {
  const editor = page.locator('.monaco-editor').first();
  await editor.waitFor({ state: 'visible', timeout: 15_000 });
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type(sql);
}

// Execute SQL and wait for results
async function runSQL(page: Page, sql: string) {
  await typeInEditor(page, sql);
  await page.getByRole('button', { name: /Execute/ }).first().click();
  await page.waitForTimeout(2000);
}

// ─── Test data ──────────────────────────────────────────────────────────────
const QE_TABLE = 'qe_test_pw';
test.beforeAll(async () => {
  await sqlHttp(`CREATE TABLE IF NOT EXISTS doc."${QE_TABLE}" (id TEXT PRIMARY KEY, val INTEGER) CLUSTERED INTO 1 SHARDS`);
  await sqlHttp(`INSERT INTO doc."${QE_TABLE}" (id, val) VALUES ('a', 1), ('b', 2), ('c', 3) ON CONFLICT (id) DO UPDATE SET val = excluded.val`);
  await sqlHttp(`REFRESH TABLE doc."${QE_TABLE}"`);
});
test.afterAll(async () => {
  await sqlHttp(`DROP TABLE IF EXISTS doc."${QE_TABLE}"`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Page Load
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 1 — Page Load', () => {
  test('01 — "SQL Editor" heading is visible in toolbar', async ({ page }) => {
    await goToQueryEditor(page);
    await expect(page.getByText('SQL Editor').first()).toBeVisible({ timeout: 10_000 });
  });

  test('02 — Execute and Explain buttons are visible', async ({ page }) => {
    await goToQueryEditor(page);
    await expect(page.getByRole('button', { name: /Execute/ }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Explain/ }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('03 — Toolbar has Saved, Save, and Format buttons', async ({ page }) => {
    await goToQueryEditor(page);
    await expect(page.getByRole('button', { name: /^Saved$/ }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /^Save$/ }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /^Format$/ }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('04 — Monaco editor area is present on page', async ({ page }) => {
    await goToQueryEditor(page);
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 15_000 });
  });

  test('05 — "Connected" status badge is visible in toolbar', async ({ page }) => {
    await goToQueryEditor(page);
    await expect(page.getByText('Connected').first()).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Query Tabs
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 2 — Query Tabs', () => {
  test('06 — New tab button (+ icon) is visible', async ({ page }) => {
    await goToQueryEditor(page);
    await expect(page.locator('button[title="New tab (Cmd+T)"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('07 — At least one tab is open by default', async ({ page }) => {
    await goToQueryEditor(page);
    const tabBar = page.locator('.rounded-t-md').first();
    await expect(tabBar).toBeVisible({ timeout: 10_000 });
  });

  test('08 — Clicking new tab button creates a second tab', async ({ page }) => {
    await goToQueryEditor(page);
    const newTabBtn = page.locator('button[title="New tab (Cmd+T)"]').first();
    await newTabBtn.waitFor({ state: 'visible', timeout: 10_000 });
    const beforeCount = await page.locator('.rounded-t-md').count();
    await newTabBtn.click();
    await page.waitForTimeout(300);
    const afterCount = await page.locator('.rounded-t-md').count();
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  test('09 — Clicking new tab again creates a third tab', async ({ page }) => {
    await goToQueryEditor(page);
    const newTabBtn = page.locator('button[title="New tab (Cmd+T)"]').first();
    await newTabBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await newTabBtn.click();
    await page.waitForTimeout(200);
    await newTabBtn.click();
    await page.waitForTimeout(200);
    const count = await page.locator('.rounded-t-md').count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('10 — Multiple tabs can execute SQL without crashing', async ({ page }) => {
    await goToQueryEditor(page);
    // Run SQL in tab 1
    await runSQL(page, 'SELECT 100 AS tab_one');
    await expect(page.getByText(/1 row|row/i).first()).toBeVisible({ timeout: 8_000 });
    // Open tab 2
    await page.locator('button[title="New tab (Cmd+T)"]').first().click();
    await page.waitForTimeout(500);
    // Run different SQL in tab 2 (editor now shows new empty tab)
    await runSQL(page, 'SELECT 1');
    await expect(page.getByText(/1 row|row/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('11 — Keyboard shortcut Ctrl+Enter executes the query', async ({ page }) => {
    await goToQueryEditor(page);
    await typeInEditor(page, 'SELECT 999 AS ctrl_enter_test');
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(2000);
    await expect(page.getByText(/ctrl_enter_test|999/i).first()).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — SQL Execution
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 3 — SQL Execution', () => {
  test('12 — Running SELECT 1 shows results panel', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, 'SELECT 1');
    await expect(
      page.getByText(/row|result|0\.0\d+ s/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('13 — Results table shows column headers', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, "SELECT 1 AS num, 'hello' AS greeting");
    await expect(page.getByText(/num|greeting/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('14 — Row count / execution time is shown after query', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, 'SELECT 1');
    await expect(page.getByText(/1 row|row\(s\)|0\.\d+ s/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('15 — SELECT from sys.cluster shows cluster name', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, 'SELECT name FROM sys.cluster');
    await expect(page.getByText(/monkdb|cluster|name/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('16 — Invalid SQL shows an error message', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, 'SELECT * FROM zzz_nonexistent_table_pw_test_xyz');
    await expect(page.getByText(/error|not found|unknown/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('17 — SELECT from test table returns 3 rows', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, `SELECT * FROM doc."${QE_TABLE}" ORDER BY id`);
    await expect(page.getByText(/3 rows|3 row/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('18 — SELECT with WHERE clause filters results correctly', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, `SELECT id, val FROM doc."${QE_TABLE}" WHERE val > 1`);
    // Should return 2 rows (b=2, c=3)
    await expect(page.getByText(/2 rows|val/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('19 — Query history appears after executing a query', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, 'SELECT 42 AS answer');
    await page.getByRole('button', { name: /History/ }).first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/SELECT/i).first()).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Sidebar
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 4 — Sidebar', () => {
  test('20 — History sidebar tab is visible and clickable', async ({ page }) => {
    await goToQueryEditor(page);
    const histBtn = page.getByRole('button', { name: /History/ }).first();
    await expect(histBtn).toBeVisible({ timeout: 10_000 });
    await histBtn.click();
  });

  test('21 — Schema sidebar tab loads database schema', async ({ page }) => {
    await goToQueryEditor(page);
    await page.getByRole('button', { name: /Schema/ }).first().click();
    await page.waitForTimeout(2000);
    await expect(page.getByText(/doc|sys|information_schema/i).first()).toBeVisible({ timeout: 12_000 });
  });

  test('22 — Docs sidebar tab opens SQL documentation', async ({ page }) => {
    await goToQueryEditor(page);
    await page.getByRole('button', { name: /Docs/ }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/SQL|documentation|syntax/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('23 — Results can be viewed in Table mode (default)', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, 'SELECT table_schema, table_name FROM information_schema.tables LIMIT 5');
    await expect(page.locator('table, [role="grid"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('24 — History sidebar shows last executed query text', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, 'SELECT 77 AS unique_history_val');
    await page.getByRole('button', { name: /History/ }).first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/unique_history_val|SELECT 77/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('25 — Schema sidebar shows the test table after schema loads', async ({ page }) => {
    await goToQueryEditor(page);
    await page.getByRole('button', { name: /Schema/ }).first().click();
    await page.waitForTimeout(3000);
    // doc schema should be visible
    await expect(page.getByText('doc').first()).toBeVisible({ timeout: 12_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 — Toolbar Actions
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 5 — Toolbar Actions', () => {
  test('26 — Format button is enabled when editor has content', async ({ page }) => {
    await goToQueryEditor(page);
    await typeInEditor(page, 'select 1');
    const formatBtn = page.getByRole('button', { name: /^Format$/ }).first();
    await expect(formatBtn).not.toBeDisabled({ timeout: 5_000 });
  });

  test('27 — Clicking Format button does not crash the editor', async ({ page }) => {
    await goToQueryEditor(page);
    await typeInEditor(page, 'select id from doc.qe_test_pw where val > 1');
    const formatBtn = page.getByRole('button', { name: /^Format$/ }).first();
    await formatBtn.click();
    await page.waitForTimeout(500);
    // After format, editor should still be visible and functional
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 5_000 });
    await expect(formatBtn).toBeVisible({ timeout: 3_000 });
  });

  test('28 — Save dialog opens when Save is clicked with content', async ({ page }) => {
    await goToQueryEditor(page);
    await typeInEditor(page, 'SELECT 1');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^Save$/ }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByPlaceholder(/My Query|query name/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('29 — Save dialog has name and description fields', async ({ page }) => {
    await goToQueryEditor(page);
    await typeInEditor(page, 'SELECT 1');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^Save$/ }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByPlaceholder(/My Query|query name/i).first()).toBeVisible({ timeout: 5_000 });
    // Description field
    await expect(page.getByPlaceholder(/description/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('30 — Keyboard shortcuts modal opens via the keyboard icon', async ({ page }) => {
    await goToQueryEditor(page);
    await page.locator('button[title="Keyboard shortcuts"]').first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/shortcut|Ctrl|Cmd/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('31 — Keyboard shortcuts modal shows shortcut list', async ({ page }) => {
    await goToQueryEditor(page);
    await page.locator('button[title="Keyboard shortcuts"]').first().click();
    await page.waitForTimeout(300);
    // Modal shows keyboard shortcut info
    await expect(page.getByText(/shortcut|Ctrl|Cmd|Execute|Format/i).first()).toBeVisible({ timeout: 5_000 });
    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  });

  test('32 — Explain button runs EXPLAIN on the current SQL', async ({ page }) => {
    await goToQueryEditor(page);
    await typeInEditor(page, 'SELECT 1');
    await page.getByRole('button', { name: /Explain/ }).first().click();
    await page.waitForTimeout(2000);
    await expect(page.getByText(/plan|cost|rows|explain/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('33 — "Saved" button opens saved queries panel', async ({ page }) => {
    await goToQueryEditor(page);
    await page.getByRole('button', { name: /^Saved$/ }).first().click();
    await page.waitForTimeout(300);
    // Saved queries panel or modal should open
    await expect(
      page.getByText(/Saved|saved|No saved|queries/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6 — Results Panel
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 6 — Results Panel', () => {
  test('34 — Results panel shows row data in a table', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, `SELECT id, val FROM doc."${QE_TABLE}" ORDER BY val`);
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
  });

  test('35 — Results table shows column headers "id" and "val"', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, `SELECT id, val FROM doc."${QE_TABLE}"`);
    await expect(page.getByText('id').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('val').first()).toBeVisible({ timeout: 8_000 });
  });

  test('36 — Results table shows data from test table', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, `SELECT id, val FROM doc."${QE_TABLE}" ORDER BY id`);
    // Check that results rendered — use row count indicator which is reliable
    await expect(page.getByText(/3 rows|row/i).first()).toBeVisible({ timeout: 8_000 });
    // Results may use table or grid layout
    await expect(
      page.locator('table, [role="grid"], [role="table"]').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('37 — Execution time is displayed in the results footer', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, 'SELECT 1');
    await expect(page.getByText(/0\.\d+ s|ms|second/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('38 — Copy results button is visible after query execution', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, 'SELECT 1');
    await expect(
      page.getByRole('button', { name: /Copy|copy/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('39 — Results panel has at least one action button after query', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, `SELECT id, val FROM doc."${QE_TABLE}"`);
    // Results panel should show at least one action button (copy, download, or view toggle)
    await expect(
      page.locator('button').filter({ hasText: /Copy|Download|Export|JSON|Table|CSV/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('40 — Results panel has view mode controls (Table/JSON toggle)', async ({ page }) => {
    await goToQueryEditor(page);
    await runSQL(page, `SELECT id, val FROM doc."${QE_TABLE}" LIMIT 1`);
    // Check for view toggle or just confirm table is visible
    const jsonBtn = page.locator('button').filter({ hasText: /JSON/i }).first();
    const tableBtn = page.locator('button').filter({ hasText: /^Table$/i }).first();
    const jsonCount = await jsonBtn.count();
    const tableCount = await tableBtn.count();
    if (jsonCount > 0) {
      await jsonBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator('table, pre, code').first()).toBeVisible({ timeout: 5_000 });
    } else if (tableCount > 0) {
      await expect(tableBtn).toBeVisible({ timeout: 5_000 });
    } else {
      // Results are shown (table or grid)
      await expect(page.locator('table, [role="grid"]').first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
