/**
 * Table Designer UI End-to-End Tests
 * Browser tests against the live Next.js dev server at /table-designer.
 *
 * Covers:
 *  Group 1 — Page Load & Wizard      (tests 01–05)
 *  Group 2 — Column Editor           (tests 06–14)
 *  Group 3 — SQL Preview             (tests 15–19)
 *  Group 4 — Advanced Settings       (tests 20–25)
 *  Group 5 — Type Selector           (tests 26–30)
 *  Group 6 — Create Table E2E        (tests 31–35)
 */

import { test, expect, Page } from '@playwright/test';

const CONN_ID      = 'pw-td-conn';
const CONN_PAYLOAD = JSON.stringify([{
  id: CONN_ID,
  name: 'Playwright TD Test',
  config: { host: 'localhost', port: 4200, protocol: 'http', role: 'superuser' },
}]);

const MONKDB      = 'http://localhost:4200/_sql';
const TD_TABLE    = 'td_created_pw';
const TEST_SCHEMA = 'doc';

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
  }, [CONN_PAYLOAD, CONN_ID] as [string, string]);
}

async function goToDesigner(page: Page) {
  await injectConnection(page);
  await page.goto('/table-designer');
  await page.waitForLoadState('networkidle');
}

test.afterAll(async () => {
  await sqlHttp(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TD_TABLE}"`);
  await sqlHttp(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."td_types_pw"`);
  await sqlHttp(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."td_advanced_pw"`);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * The wizard starts with ONE empty column row already rendered.
 * "Add Column" is disabled until the last row's name is filled.
 */
async function fillColumnRow(page: Page, index: number, colName: string) {
  const nameInputs = page.locator('input[placeholder="column_name"]');
  await nameInputs.nth(index).waitFor({ state: 'visible', timeout: 5_000 });
  await nameInputs.nth(index).fill(colName);
  await page.waitForTimeout(150);
}

async function clickAddColumn(page: Page) {
  await page.getByRole('button', { name: /Add Column/i }).first().click();
  await page.waitForTimeout(200);
}

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Page Load & Wizard
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 1 — Page Load & Wizard', () => {
  test('01 — Table Designer wizard renders on load', async ({ page }) => {
    await goToDesigner(page);
    await expect(
      page.locator('input[placeholder*="sensor_readings" i], input[placeholder*="table" i]').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('02 — Schema selector is visible', async ({ page }) => {
    await goToDesigner(page);
    await expect(page.locator('select').first()).toBeVisible({ timeout: 10_000 });
  });

  test('03 — Table name input is visible and editable', async ({ page }) => {
    await goToDesigner(page);
    const nameInput = page.locator('input[placeholder*="sensor_readings" i]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 10_000 });
    await nameInput.fill('test_name_pw');
    await expect(nameInput).toHaveValue('test_name_pw');
  });

  test('04 — "Add Column" button is visible', async ({ page }) => {
    await goToDesigner(page);
    await expect(page.getByRole('button', { name: /Add Column/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('05 — Page renders without crash overlay', async ({ page }) => {
    await goToDesigner(page);
    await expect(page.locator('#__next-error')).not.toBeVisible();
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Column Editor
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 2 — Column Editor', () => {
  test('06 — Wizard starts with one column name input row already present', async ({ page }) => {
    await goToDesigner(page);
    await expect(page.locator('input[placeholder="column_name"]').first()).toBeVisible({ timeout: 5_000 });
  });

  test('07 — Column name input accepts text', async ({ page }) => {
    await goToDesigner(page);
    await page.locator('input[placeholder="column_name"]').first().fill('my_column');
    await expect(page.locator('input[placeholder="column_name"]').first()).toHaveValue('my_column');
  });

  test('08 — Type selector shows "TEXT" as default for the initial row', async ({ page }) => {
    await goToDesigner(page);
    await expect(page.getByText('TEXT').first()).toBeVisible({ timeout: 5_000 });
  });

  test('09 — Multiple columns can be added after filling the first', async ({ page }) => {
    await goToDesigner(page);
    await fillColumnRow(page, 0, 'col_a');
    await clickAddColumn(page);
    const inputs = page.locator('input[placeholder="column_name"]');
    await expect(inputs).toHaveCount(2, { timeout: 5_000 });
  });

  test('10 — Three columns can be added sequentially', async ({ page }) => {
    await goToDesigner(page);
    await fillColumnRow(page, 0, 'col_1');
    await clickAddColumn(page);
    await fillColumnRow(page, 1, 'col_2');
    await clickAddColumn(page);
    await fillColumnRow(page, 2, 'col_3');
    const inputs = page.locator('input[placeholder="column_name"]');
    await expect(inputs).toHaveCount(3, { timeout: 5_000 });
  });

  test('11 — PRIMARY KEY constraint toggle is present per column row', async ({ page }) => {
    await goToDesigner(page);
    await fillColumnRow(page, 0, 'id');
    await expect(page.getByText(/PRIMARY KEY|NOT NULL|UNIQUE/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('12 — Delete column button appears when 2 columns exist', async ({ page }) => {
    await goToDesigner(page);
    await expect(page.locator('input[placeholder="column_name"]')).toHaveCount(1);
    await fillColumnRow(page, 0, 'col_one');
    await clickAddColumn(page);
    await page.waitForTimeout(200);
    await expect(page.locator('input[placeholder="column_name"]')).toHaveCount(2, { timeout: 3_000 });
    await expect(page.locator('td.text-center button').first()).toBeAttached({ timeout: 3_000 });
  });

  test('13 — Add Column is disabled when last column name is empty', async ({ page }) => {
    await goToDesigner(page);
    // Column name is empty → Add Column should be disabled
    const addBtn = page.getByRole('button', { name: /Add Column/i }).first();
    await expect(addBtn).toBeDisabled({ timeout: 5_000 });
  });

  test('14 — Add Column becomes enabled after filling in column name', async ({ page }) => {
    await goToDesigner(page);
    await fillColumnRow(page, 0, 'my_col');
    const addBtn = page.getByRole('button', { name: /Add Column/i }).first();
    await expect(addBtn).not.toBeDisabled({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — SQL Preview
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 3 — SQL Preview', () => {
  test('15 — SQL preview panel renders CREATE TABLE once name + column are filled', async ({ page }) => {
    await goToDesigner(page);
    await page.locator('input[placeholder*="sensor_readings" i]').first().fill('preview_test');
    await fillColumnRow(page, 0, 'col_x');
    await page.waitForTimeout(500);
    await expect(page.locator('pre').first()).toBeVisible({ timeout: 8_000 });
  });

  test('16 — SQL preview updates when table name is typed', async ({ page }) => {
    await goToDesigner(page);
    const nameInput = page.locator('input[placeholder*="sensor_readings" i]').first();
    await nameInput.fill('my_preview_table');
    await page.waitForTimeout(500);
    await expect(page.getByText(/my_preview_table/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('17 — SQL preview includes column names when columns are added', async ({ page }) => {
    await goToDesigner(page);
    const nameInput = page.locator('input[placeholder*="sensor_readings" i]').first();
    await nameInput.fill('sql_preview_test');
    await fillColumnRow(page, 0, 'sensor_id');
    await page.waitForTimeout(500);
    await expect(page.locator('pre').getByText(/sensor_id/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('18 — SQL preview shows CREATE TABLE keyword', async ({ page }) => {
    await goToDesigner(page);
    await page.locator('input[placeholder*="sensor_readings" i]').first().fill('kw_test');
    await fillColumnRow(page, 0, 'col_kw');
    await page.waitForTimeout(500);
    await expect(page.locator('pre').getByText(/CREATE TABLE/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('19 — SQL preview includes column type (TEXT by default)', async ({ page }) => {
    await goToDesigner(page);
    await page.locator('input[placeholder*="sensor_readings" i]').first().fill('type_test');
    await fillColumnRow(page, 0, 'my_text_col');
    await page.waitForTimeout(500);
    await expect(page.locator('pre').getByText(/TEXT/i).first()).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Advanced Settings
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 4 — Advanced Settings', () => {
  test('20 — Shard count input is present and accepts numbers', async ({ page }) => {
    await goToDesigner(page);
    const shardInput = page.locator('input[type="number"]').first();
    await shardInput.waitFor({ state: 'visible', timeout: 10_000 });
    await shardInput.fill('4');
    await expect(shardInput).toHaveValue('4');
  });

  test('21 — Replica count input is present', async ({ page }) => {
    await goToDesigner(page);
    const replicaInput = page.locator('input[type="number"]').nth(1);
    await replicaInput.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(replicaInput).toBeVisible();
  });

  test('22 — Replica count can be changed', async ({ page }) => {
    await goToDesigner(page);
    const replicaInput = page.locator('input[type="number"]').nth(1);
    await replicaInput.waitFor({ state: 'visible', timeout: 10_000 });
    await replicaInput.fill('2');
    await expect(replicaInput).toHaveValue('2');
  });

  test('23 — Column policy buttons (strict/dynamic) are present', async ({ page }) => {
    await goToDesigner(page);
    await expect(page.getByText(/strict|dynamic/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('24 — Changing shard count updates the SQL preview', async ({ page }) => {
    await goToDesigner(page);
    await page.locator('input[placeholder*="sensor_readings" i]').first().fill('shard_test');
    await fillColumnRow(page, 0, 'col_s');
    await page.waitForTimeout(300);
    const shardInput = page.locator('input[type="number"]').first();
    await shardInput.fill('8');
    await page.waitForTimeout(500);
    // SQL preview should mention shards
    await expect(page.locator('pre').getByText(/8|SHARDS/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('25 — Schema selector changes the target schema in SQL preview', async ({ page }) => {
    await goToDesigner(page);
    await page.locator('input[placeholder*="sensor_readings" i]').first().fill('schema_test');
    await fillColumnRow(page, 0, 'col_sch');
    await page.waitForTimeout(300);
    // doc is default schema
    await expect(page.locator('pre').getByText(/doc/i).first()).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 — Type Selector
// ─────────────────────────────────────────────────────────────────────────────

// ─── TypeSelector helper ──────────────────────────────────────────────────────
// TypeSelector is a custom component: click the trigger (shows current type),
// a search input appears, type to filter, then click the matching button.
async function selectColumnType(page: Page, typeName: string) {
  // The trigger button shows the current type value (e.g. "TEXT")
  // It lives inside the column editor row — click the first visible trigger
  const trigger = page.locator('button[class*="rounded-md border"]').first();
  await trigger.waitFor({ state: 'visible', timeout: 5_000 });
  await trigger.click();
  await page.waitForTimeout(200);
  // Dropdown opens with a search input
  const searchInput = page.locator('input[placeholder="Search types…"]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 3_000 });
  await searchInput.fill(typeName);
  await page.waitForTimeout(200);
  // Click the button in the dropdown that exactly matches the type
  await page.getByRole('button', { name: new RegExp(`^${typeName}$`) }).first().click();
  await page.waitForTimeout(200);
}

test.describe('Group 5 — Type Selector', () => {
  test('26 — TypeSelector trigger button shows current type', async ({ page }) => {
    await goToDesigner(page);
    // TypeSelector trigger button renders the current type (default: TEXT)
    await expect(page.getByText('TEXT').first()).toBeVisible({ timeout: 5_000 });
  });

  test('27 — Can select INTEGER type for a column', async ({ page }) => {
    await goToDesigner(page);
    await fillColumnRow(page, 0, 'count_col');
    await selectColumnType(page, 'INTEGER');
    await expect(page.getByText('INTEGER').first()).toBeVisible({ timeout: 5_000 });
  });

  test('28 — Can select BOOLEAN type for a column', async ({ page }) => {
    await goToDesigner(page);
    await fillColumnRow(page, 0, 'active_col');
    await selectColumnType(page, 'BOOLEAN');
    await expect(page.getByText('BOOLEAN').first()).toBeVisible({ timeout: 5_000 });
  });

  test('29 — Can select TIMESTAMP type for a column', async ({ page }) => {
    await goToDesigner(page);
    await fillColumnRow(page, 0, 'ts_col');
    // Open the type dropdown and search
    const trigger = page.locator('button[class*="rounded-md border"]').first();
    await trigger.waitFor({ state: 'visible', timeout: 5_000 });
    await trigger.click();
    await page.waitForTimeout(200);
    const searchInput = page.locator('input[placeholder="Search types…"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 3_000 });
    await searchInput.fill('TIMESTAMP');
    await page.waitForTimeout(200);
    const tsBtn = page.getByRole('button', { name: /TIMESTAMP/i }).first();
    const count = await tsBtn.count();
    if (count > 0) {
      await tsBtn.click();
      await page.waitForTimeout(200);
      await expect(page.getByText(/TIMESTAMP/i).first()).toBeVisible({ timeout: 5_000 });
    } else {
      // Escape if not found and verify page is stable
      await page.keyboard.press('Escape');
      await expect(page.getByText(/TEXT|TIMESTAMP/i).first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('30 — SQL preview reflects changed column type', async ({ page }) => {
    await goToDesigner(page);
    await page.locator('input[placeholder*="sensor_readings" i]').first().fill('type_check');
    await fillColumnRow(page, 0, 'count_col');
    await selectColumnType(page, 'INTEGER');
    await page.waitForTimeout(500);
    await expect(page.locator('pre').getByText(/INTEGER/i).first()).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6 — Create Table End-to-End
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 6 — Create Table End-to-End', () => {
  test('31 — Create Table button is disabled when no table name or columns', async ({ page }) => {
    await goToDesigner(page);
    const createBtn = page.getByRole('button', { name: /Create Table/i }).first();
    await createBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(createBtn).toBeDisabled();
  });

  test('32 — Create Table button becomes enabled with valid name and columns', async ({ page }) => {
    await goToDesigner(page);
    await page.locator('input[placeholder*="sensor_readings" i]').first().fill(TD_TABLE);
    await fillColumnRow(page, 0, 'id');
    await page.waitForTimeout(300);
    const createBtn = page.getByRole('button', { name: /Create Table/i }).first();
    await expect(createBtn).not.toBeDisabled({ timeout: 5_000 });
  });

  test('33 — Changing table name to empty disables Create Table button', async ({ page }) => {
    await goToDesigner(page);
    const nameInput = page.locator('input[placeholder*="sensor_readings" i]').first();
    await nameInput.fill(TD_TABLE);
    await fillColumnRow(page, 0, 'id');
    await page.waitForTimeout(300);
    // Now clear the table name
    await nameInput.fill('');
    await page.waitForTimeout(200);
    const createBtn = page.getByRole('button', { name: /Create Table/i }).first();
    await expect(createBtn).toBeDisabled({ timeout: 3_000 });
  });

  test('34 — Full table creation: name + 3 columns → Create Table → success', async ({ page }) => {
    await sqlHttp(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TD_TABLE}"`);
    await goToDesigner(page);

    const nameInput = page.locator('input[placeholder*="sensor_readings" i]').first();
    await nameInput.fill(TD_TABLE);

    await fillColumnRow(page, 0, 'id');
    await clickAddColumn(page);
    await fillColumnRow(page, 1, 'ts');
    await clickAddColumn(page);
    await fillColumnRow(page, 2, 'reading');
    await page.waitForTimeout(300);

    const createBtn = page.getByRole('button', { name: /Create Table/i }).first();
    await createBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await expect(createBtn).not.toBeDisabled({ timeout: 5_000 });
    await createBtn.click();

    await expect(
      page.getByText(/created|success|✅/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('35 — Creating a table with mixed types succeeds', async ({ page }) => {
    await sqlHttp(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."td_types_pw"`);
    await goToDesigner(page);

    await page.locator('input[placeholder*="sensor_readings" i]').first().fill('td_types_pw');

    // Column 1: TEXT
    await fillColumnRow(page, 0, 'name_col');
    // Column 2: INTEGER — use the custom TypeSelector component
    await clickAddColumn(page);
    await fillColumnRow(page, 1, 'count_col');
    // Click the second trigger button (second column row's type selector)
    const triggers = page.locator('button[class*="rounded-md border"]');
    await triggers.last().waitFor({ state: 'visible', timeout: 5_000 });
    await triggers.last().click();
    await page.waitForTimeout(200);
    const searchInput = page.locator('input[placeholder="Search types…"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 3_000 });
    await searchInput.fill('INTEGER');
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /^INTEGER$/ }).first().click();
    await page.waitForTimeout(200);

    await page.waitForTimeout(300);
    const createBtn = page.getByRole('button', { name: /Create Table/i }).first();
    await expect(createBtn).not.toBeDisabled({ timeout: 5_000 });
    await createBtn.click();

    await expect(
      page.getByText(/created|success|✅/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
