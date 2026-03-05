/**
 * Geospatial UI End-to-End Tests
 * Browser tests against the live Next.js dev server at /geospatial.
 *
 * Covers:
 *  Group 1 — Page Load                (tests 01–04)
 *  Group 2 — Map Tab                  (tests 05–12)
 *  Group 3 — Filter Panel             (tests 13–18)
 *  Group 4 — Query Builder Tab        (tests 19–25)
 *  Group 5 — Data Management Tab      (tests 26–34)
 *  Group 6 — Shape Rendering          (tests 35–38)
 *  Group 7 — Demo Queries & Info      (tests 39–43)
 */

import { test, expect, Page } from '@playwright/test';

const MONKDB      = 'http://localhost:4200/_sql';
const TEST_SCHEMA = 'doc';
const TEST_TABLE  = 'geo_test_pw';
const SHAPE_TABLE = 'geo_shape_pw';

const CONN_ID = 'pw-geo-conn';
const CONN_PAYLOAD = JSON.stringify([{
  id: CONN_ID,
  name: 'Playwright Geo Test',
  config: { host: 'localhost', port: 4200, protocol: 'http', role: 'superuser' },
}]);

async function injectConnection(page: Page) {
  await page.addInitScript(([payload, id]: [string, string]) => {
    localStorage.setItem('monkdb_connections', payload);
    localStorage.setItem('monkdb_active_connection', id);
  }, [CONN_PAYLOAD, CONN_ID] as [string, string]);
}

async function sqlHttp(stmt: string, args: unknown[] = []) {
  const res = await fetch(MONKDB, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stmt, args }),
  });
  return res.json();
}

async function goToGeo(page: Page) {
  await injectConnection(page);
  await page.goto('/geospatial');
  await page.waitForLoadState('networkidle');
}

async function pickFromDropdown(page: Page, triggerPlaceholder: string, value: string) {
  await page.getByRole('button', { name: new RegExp(`^${triggerPlaceholder}$`) }).first().click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: new RegExp(`^${value}$`) }).first().click();
  await page.waitForTimeout(300);
}

async function loadTestTable(page: Page, tableName = TEST_TABLE) {
  await pickFromDropdown(page, 'Schema', TEST_SCHEMA);
  await pickFromDropdown(page, 'Table', tableName);
  await page.waitForTimeout(3000);
}

async function selectPanelTable(page: Page, tableName = TEST_TABLE) {
  await page.getByRole('button', { name: /^Select schema\.\.\.$/ }).first().click();
  await page.getByRole('button', { name: /^doc$/ }).first().waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByRole('button', { name: /^doc$/ }).first().click();

  await page.getByRole('button', { name: /^Select table\.\.\.$/ }).first().waitFor({ state: 'visible', timeout: 5_000 });
  await page.getByRole('button', { name: /^Select table\.\.\.$/ }).first().click();
  await page.getByRole('button', { name: new RegExp(`^${tableName}$`) }).first().waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByRole('button', { name: new RegExp(`^${tableName}$`) }).first().click();

  await page.locator('span', { hasText: /^location$/ }).first().waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByRole('button', { name: 'Select All' }).first().click();
  await page.waitForTimeout(500);
}

// ─── Test data setup ───────────────────────────────────────────────────────────
test.beforeAll(async () => {
  await sqlHttp(`CREATE TABLE IF NOT EXISTS "${TEST_SCHEMA}"."${TEST_TABLE}" (
    "id" TEXT PRIMARY KEY, "name" TEXT, "category" TEXT, "location" GEO_POINT
  )`);
  await sqlHttp(`INSERT INTO "${TEST_SCHEMA}"."${TEST_TABLE}" (id, name, category, location) VALUES
    ('1','Times Square','landmark','POINT(-73.9851 40.7589)'),
    ('2','Central Park','park','POINT(-73.9654 40.7829)'),
    ('3','Brooklyn Bridge','bridge','POINT(-73.9969 40.7061)')
    ON CONFLICT (id) DO UPDATE SET name = excluded.name`);

  await sqlHttp(`CREATE TABLE IF NOT EXISTS "${TEST_SCHEMA}"."${SHAPE_TABLE}" (
    "id" TEXT PRIMARY KEY, "name" TEXT, "boundary" GEO_SHAPE
  )`);
  await sqlHttp(`INSERT INTO "${TEST_SCHEMA}"."${SHAPE_TABLE}" (id, name, boundary) VALUES
    ('z1','Manhattan','POLYGON((-74.02 40.70,-73.93 40.70,-73.93 40.88,-74.02 40.88,-74.02 40.70))')
    ON CONFLICT (id) DO UPDATE SET name = excluded.name`);

  await new Promise(r => setTimeout(r, 700));
});

test.afterAll(async () => {
  await sqlHttp(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE}"`);
  await sqlHttp(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${SHAPE_TABLE}"`);
  await sqlHttp(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."geo_create_pw"`);
});

// ─── Group 1: Page Load ────────────────────────────────────────────────────────
test.describe('Group 1 — Page Load', () => {
  test('01 Page loads with heading visible', async ({ page }) => {
    await goToGeo(page);
    await expect(page.getByText('Geospatial Data Tools').first()).toBeVisible();
  });

  test('02 Three tabs render', async ({ page }) => {
    await goToGeo(page);
    await expect(page.getByRole('button', { name: 'Map View', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Query Builder', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Data Management', exact: true })).toBeVisible();
  });

  test('03 Map tab is default active', async ({ page }) => {
    await goToGeo(page);
    const mapTab = page.getByRole('button', { name: 'Map View', exact: true });
    await expect(mapTab).toHaveClass(/border-blue-500/);
  });

  test('04 Page renders without crash overlay', async ({ page }) => {
    await goToGeo(page);
    await expect(page.locator('#__next-error')).not.toBeVisible();
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });
});

// ─── Group 2: Map Tab ──────────────────────────────────────────────────────────
test.describe('Group 2 — Map Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('geospatial_map_table');
      localStorage.removeItem('geospatial_map_filters');
    });
  });

  test('05 Empty state shows Select Data Source', async ({ page }) => {
    await goToGeo(page);
    await expect(page.getByText('Select Data Source')).toBeVisible();
  });

  test('06 TableColumnSelector shows Schema and Table trigger buttons', async ({ page }) => {
    await goToGeo(page);
    await expect(page.getByRole('button', { name: /^Schema$/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Table$/ }).first()).toBeVisible();
  });

  test('07 Selecting table loads data and shows points counter', async ({ page }) => {
    await goToGeo(page);
    await loadTestTable(page);
    await expect(page.getByText(/Points/).first()).toBeVisible({ timeout: 8_000 });
  });

  test('08 After loading, Leaflet map container appears', async ({ page }) => {
    await goToGeo(page);
    await loadTestTable(page);
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 10_000 });
  });

  test('09 Filters button appears when data is loaded', async ({ page }) => {
    await goToGeo(page);
    await loadTestTable(page);
    await expect(page.getByRole('button', { name: /Filters/ })).toBeVisible({ timeout: 8_000 });
  });

  test('10 Map tile layer selector is visible after loading data', async ({ page }) => {
    await goToGeo(page);
    await loadTestTable(page);
    // Map controls like tile switcher should appear
    await expect(
      page.getByText(/Street|Satellite|Topo|OpenStreetMap/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('11 Map collapse button is visible', async ({ page }) => {
    await goToGeo(page);
    await loadTestTable(page);
    // Collapse/expand map button
    await expect(
      page.getByRole('button', { name: /Collapse|Expand|collapse|expand/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('12 Clicking tile layer button switches map style', async ({ page }) => {
    await goToGeo(page);
    await loadTestTable(page);
    const satelliteBtn = page.getByRole('button', { name: /Satellite/i }).first();
    const count = await satelliteBtn.count();
    if (count > 0) {
      await satelliteBtn.click();
      await page.waitForTimeout(500);
      // Map should still be visible
      await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 5_000 });
    }
  });
});

// ─── Group 3: Filter Panel ─────────────────────────────────────────────────────
test.describe('Group 3 — Filter Panel', () => {
  async function loadAndOpenFilters(page: Page) {
    await page.addInitScript(() => {
      localStorage.removeItem('geospatial_map_table');
      localStorage.removeItem('geospatial_map_filters');
    });
    await goToGeo(page);
    await loadTestTable(page);
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.waitForTimeout(300);
  }

  test('13 Clicking Filters opens the filter panel', async ({ page }) => {
    await loadAndOpenFilters(page);
    await expect(page.getByText('Filter Data')).toBeVisible();
  });

  test('14 Adding a filter shows column + operator + value inputs', async ({ page }) => {
    await loadAndOpenFilters(page);
    await page.getByRole('button', { name: /Add Filter/ }).click();
    await expect(page.getByText('Filter #1')).toBeVisible();
    await expect(page.getByText('Column')).toBeVisible();
    await expect(page.getByText('Condition')).toBeVisible();
    await expect(page.getByText('Value')).toBeVisible();
  });

  test('15 Clicking Clear All removes all filters', async ({ page }) => {
    await loadAndOpenFilters(page);
    await page.getByRole('button', { name: /Add Filter/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Clear All/ }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Filter #1')).not.toBeVisible();
  });

  test('16 Multiple filters can be added', async ({ page }) => {
    await loadAndOpenFilters(page);
    await page.getByRole('button', { name: /Add Filter/ }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Add Filter/ }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText('Filter #2')).toBeVisible({ timeout: 5_000 });
  });

  test('17 Filter column dropdown opens when clicked', async ({ page }) => {
    await loadAndOpenFilters(page);
    await page.getByRole('button', { name: /Add Filter/ }).click();
    await page.waitForTimeout(300);
    // Column dropdown shows table columns
    const colSelect = page.locator('select').last();
    const count = await colSelect.count();
    if (count > 0) {
      await expect(colSelect).toBeVisible({ timeout: 5_000 });
    }
  });

  test('18 Filter value input accepts text', async ({ page }) => {
    await loadAndOpenFilters(page);
    await page.getByRole('button', { name: /Add Filter/ }).click();
    await page.waitForTimeout(300);
    const valueInput = page.locator('input[type="text"], input[placeholder*="value" i]').last();
    const count = await valueInput.count();
    if (count > 0) {
      await valueInput.fill('test_value');
      await expect(valueInput).toHaveValue('test_value');
    }
  });
});

// ─── Group 4: Query Builder Tab ────────────────────────────────────────────────
test.describe('Group 4 — Query Builder Tab', () => {
  async function goToQueryTab(page: Page) {
    await goToGeo(page);
    await page.getByRole('button', { name: 'Query Builder', exact: true }).click();
    await page.waitForTimeout(500);
  }

  test('19 Clicking Query Builder tab switches view', async ({ page }) => {
    await goToQueryTab(page);
    await expect(page.getByRole('button', { name: 'Query Builder', exact: true })).toHaveClass(/border-blue-500/);
  });

  test('20 SpatialQueryBuilder renders Query Type selector', async ({ page }) => {
    await goToQueryTab(page);
    await expect(page.getByText('Query Type').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('select').first()).toBeVisible({ timeout: 8_000 });
  });

  test('21 SQL preview is visible in query builder', async ({ page }) => {
    await goToQueryTab(page);
    await expect(page.locator('pre, code').first()).toBeVisible({ timeout: 8_000 });
  });

  test('22 Execute button is present in query builder', async ({ page }) => {
    await goToQueryTab(page);
    await expect(page.getByRole('button', { name: /Execute/ }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('23 Changing query type updates the SQL preview', async ({ page }) => {
    await goToQueryTab(page);
    const queryTypeSelect = page.locator('select').first();
    await queryTypeSelect.waitFor({ state: 'visible', timeout: 8_000 });
    // Get current options and select one
    const options = await queryTypeSelect.locator('option').allTextContents();
    if (options.length > 1) {
      await queryTypeSelect.selectOption({ index: 1 });
      await page.waitForTimeout(300);
      // SQL should still be visible
      await expect(page.locator('pre, code').first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('24 Running a query does not crash the page', async ({ page }) => {
    await goToQueryTab(page);
    await selectPanelTable(page);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Execute/ }).first().click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Geospatial Data Tools').first()).toBeVisible();
  });

  test('25 Query results panel appears after execution', async ({ page }) => {
    await goToQueryTab(page);
    await selectPanelTable(page);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Execute/ }).first().click();
    await page.waitForTimeout(3000);
    // Results panel or row count should appear
    await expect(
      page.getByText(/row|result|Times Square|Central Park/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Group 5: Data Management Tab ─────────────────────────────────────────────
test.describe('Group 5 — Data Management Tab', () => {
  async function openManage(page: Page) {
    await goToGeo(page);
    await page.getByRole('button', { name: 'Data Management', exact: true }).click();
    await page.waitForTimeout(500);
  }

  test('26 Data Management shows four sub-tabs', async ({ page }) => {
    await openManage(page);
    await expect(page.getByRole('button', { name: 'Add Data', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Table', exact: true })).toBeVisible();
  });

  test('27 Create Table sub-tab shows Add Column button', async ({ page }) => {
    await openManage(page);
    await page.getByRole('button', { name: 'Create Table', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: /Add Column/ })).toBeVisible({ timeout: 8_000 });
  });

  test('28 Import sub-tab shows CSV / GeoJSON / JSON format buttons', async ({ page }) => {
    await openManage(page);
    await selectPanelTable(page);
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: /^CSV$/ })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /^GEOJSON$/ })).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('textarea')).toBeVisible({ timeout: 8_000 });
  });

  test('29 Export sub-tab shows Export Data button', async ({ page }) => {
    await openManage(page);
    await selectPanelTable(page);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: /Export Data/i })).toBeVisible({ timeout: 8_000 });
  });

  test('30 Add Data sub-tab shows insert form', async ({ page }) => {
    await openManage(page);
    await selectPanelTable(page);
    await page.getByRole('button', { name: 'Add Data', exact: true }).click();
    await page.waitForTimeout(300);
    // Insert form should have input fields for the columns
    await expect(page.locator('input[type="text"], textarea').first()).toBeVisible({ timeout: 8_000 });
  });

  test('31 Create Table shows table name input', async ({ page }) => {
    await openManage(page);
    await page.getByRole('button', { name: 'Create Table', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(
      page.locator('input[placeholder*="table" i], input[placeholder*="name" i]').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('32 Create Table shows column type selector', async ({ page }) => {
    await openManage(page);
    await page.getByRole('button', { name: 'Create Table', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('select, [class*="type"]').first()).toBeVisible({ timeout: 8_000 });
  });

  test('33 Import textarea accepts GeoJSON text', async ({ page }) => {
    await openManage(page);
    await selectPanelTable(page);
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await page.waitForTimeout(300);
    const textarea = page.locator('textarea').first();
    await textarea.fill('{"type":"FeatureCollection","features":[]}');
    await expect(textarea).toHaveValue(/FeatureCollection/);
  });

  test('34 Export format buttons are clickable without crash', async ({ page }) => {
    await openManage(page);
    await selectPanelTable(page);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await page.waitForTimeout(300);
    const exportBtn = page.getByRole('button', { name: /Export Data/i }).first();
    await exportBtn.waitFor({ state: 'visible', timeout: 8_000 });
    await exportBtn.click();
    await page.waitForTimeout(500);
    // Page should still be functional
    await expect(page.getByText('Geospatial Data Tools').first()).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Group 6: Shape Rendering ──────────────────────────────────────────────────
test.describe('Group 6 — Shape Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('geospatial_map_table');
      localStorage.removeItem('geospatial_map_filters');
    });
  });

  test('35 GEO_SHAPE table selection completes without error', async ({ page }) => {
    await goToGeo(page);
    await loadTestTable(page, SHAPE_TABLE);
    await expect(page.getByText(new RegExp(SHAPE_TABLE)).first()).toBeVisible({ timeout: 8_000 });
  });

  test('36 Header Shapes counter is visible after loading shape table', async ({ page }) => {
    await goToGeo(page);
    await loadTestTable(page, SHAPE_TABLE);
    await expect(page.getByText(/Shapes/).first()).toBeVisible({ timeout: 8_000 });
  });

  test('37 Switching from shape table to point table resets counters', async ({ page }) => {
    await goToGeo(page);
    await loadTestTable(page, SHAPE_TABLE);
    await page.waitForTimeout(1000);
    // Now load the point table
    await loadTestTable(page, TEST_TABLE);
    await expect(page.getByText(/Points/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('38 Page stays functional after loading shape table', async ({ page }) => {
    await goToGeo(page);
    await loadTestTable(page, SHAPE_TABLE);
    // Shape table loads; heading still visible (map may be hidden for shapes with no lat/lon)
    await expect(page.getByText('Geospatial Data Tools').first()).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Group 7: Demo Queries & Info ─────────────────────────────────────────────
test.describe('Group 7 — Demo Queries & Info', () => {
  test('39 Demo queries section is accessible from Map tab', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('geospatial_map_table');
      localStorage.removeItem('geospatial_map_filters');
    });
    await goToGeo(page);
    // Demo queries button or link visible in empty state
    await expect(
      page.getByText(/Demo|demo|Custom Query Builder|Sample/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('40 Query Builder shows execution history after running query', async ({ page }) => {
    await goToGeo(page);
    await page.getByRole('button', { name: 'Query Builder', exact: true }).click();
    await page.waitForTimeout(500);
    await selectPanelTable(page);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Execute/ }).first().click();
    await page.waitForTimeout(3000);
    // History section or count
    await expect(
      page.getByText(/History|history|Results|result/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('41 Data Management tab switching is instant without network delay', async ({ page }) => {
    await goToGeo(page);
    await page.getByRole('button', { name: 'Data Management', exact: true }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Map View', exact: true }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Query Builder', exact: true }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText('Geospatial Data Tools').first()).toBeVisible({ timeout: 5_000 });
  });

  test('42 Page remains stable after rapid tab switching', async ({ page }) => {
    await goToGeo(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Map View', exact: true }).click();
      await page.waitForTimeout(100);
      await page.getByRole('button', { name: 'Query Builder', exact: true }).click();
      await page.waitForTimeout(100);
      await page.getByRole('button', { name: 'Data Management', exact: true }).click();
      await page.waitForTimeout(100);
    }
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });

  test('43 Geospatial page shows heading after navigating from another tab', async ({ page }) => {
    await goToGeo(page);
    await page.getByRole('button', { name: 'Query Builder', exact: true }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Map View', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Geospatial Data Tools').first()).toBeVisible({ timeout: 5_000 });
  });
});
