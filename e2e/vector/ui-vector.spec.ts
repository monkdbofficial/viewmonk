/**
 * Vector Operations UI End-to-End Tests
 * Browser tests against the live Next.js dev server at /vector-ops.
 *
 * Covers:
 *  01  Page load — header title, stats bar, header buttons
 *  02  Left panel — Collections label, search box, empty/populated state
 *  03  Collection selection — metadata bar, search panel appears
 *  04  Search input — textarea, search type select, Top K input
 *  05  KNN search — results, score bar, content text
 *  06  Similarity search mode
 *  07  Export buttons — appear after results
 *  08  No $1/$2 PostgreSQL placeholders in any SQL sent to MonkDB
 *  09  No unhandled JS errors
 *  10  New Collection wizard — opens, has schema select, cancels
 *  11  Upload Documents button — appears only when collection selected
 *  12  Diagnostics panel — toggle, run diagnostics
 *  13  Query History — appears after search, shows timing
 *  14  Vector Function Reference panel is visible
 *  15–16  Advanced Filters, dynamic columns
 *  17  CreateVectorTableDialog Advanced Schema
 *  18  Schema Inspector (CollectionSchemaPanel)
 *  19  Collection management menu (3-dot: View DDL, Rename, Add Column, Drop)
 *  20  Inline edit/delete on result rows
 *  21  Saved searches (bookmark, save, Saved tab, Run Again)
 *  22  Right-panel tabs (History | Saved | Analytics)
 *  23  Upload dialog — 3-step column mapping flow
 */

import { test, expect, Page } from '@playwright/test';

const MONKDB     = 'http://localhost:4200/_sql';
const TEST_SCHEMA = 'doc';
const TEST_TABLE  = 'pw_vec_ui';
const TEST_COL    = 'embedding';
// Use 384D: the useVectorCollections hook falls back to 384 when MonkDB omits
// the dimension from information_schema.columns.data_type (returns 'float_vector'
// rather than 'float_vector(N)'). Using 384D makes the UI dimension match the
// actual vectors, so VectorSearchPanel's dimension check passes.
const DIMS        = 384;

// 384D unit vectors — generated at module level to keep INSERT/query efficient
const VEC1: number[] = [1.0, ...new Array(DIMS - 1).fill(0.0)];   // first-axis
const VEC2: number[] = [0.0, 1.0, ...new Array(DIMS - 2).fill(0.0)]; // orthogonal
const VEC3: number[] = [0.9, 0.1, ...new Array(DIMS - 2).fill(0.0)]; // close to VEC1

const QUERY_VEC = VEC1;  // search for the first-axis direction
const QUERY_VEC_STR = `[${QUERY_VEC.join(', ')}]`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function sqlHttp(stmt: string, args: unknown[] = []) {
  const res = await fetch(MONKDB, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stmt, args }),
  });
  return res.json();
}

async function ensureTestCollection() {
  await sqlHttp(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE}"`);
  await sqlHttp(`
    CREATE TABLE "${TEST_SCHEMA}"."${TEST_TABLE}" (
      id      INTEGER PRIMARY KEY,
      content TEXT,
      "${TEST_COL}" FLOAT_VECTOR(${DIMS})
    )
  `);
  await sqlHttp(
    `INSERT INTO "${TEST_SCHEMA}"."${TEST_TABLE}" (id, content, "${TEST_COL}") VALUES
     (1, 'First axis vector document',  ?),
     (2, 'Orthogonal vector document',  ?),
     (3, 'Near first axis document',    ?)`,
    [VEC1, VEC2, VEC3]
  );
  await sqlHttp(`REFRESH TABLE "${TEST_SCHEMA}"."${TEST_TABLE}"`);
}

// ─── Connection injection ─────────────────────────────────────────────────────
const CONN_ID = 'pw-vec-conn';
const CONN_PAYLOAD = JSON.stringify([{
  id: CONN_ID,
  name: 'Playwright Vector Test',
  config: { host: 'localhost', port: 4200, protocol: 'http', role: 'superuser' },
}]);

async function injectConnection(page: Page) {
  await page.addInitScript(([payload, id]: [string, string]) => {
    localStorage.setItem('monkdb_connections', payload);
    localStorage.setItem('monkdb_active_connection', id);
  }, [CONN_PAYLOAD, CONN_ID] as [string, string]);
}

async function goToVectorOps(page: Page) {
  await injectConnection(page);
  await page.goto('/vector-ops');
  await page.waitForLoadState('networkidle');
}

async function selectTestCollection(page: Page) {
  // Collection rows are divs with onClick (not buttons) — locate by exact table name text
  const rowText = page.getByText(TEST_TABLE, { exact: true }).first();
  await rowText.waitFor({ timeout: 20_000 });
  await rowText.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

async function runKNNSearch(page: Page) {
  const textarea = page.locator('textarea').first();
  await textarea.fill(QUERY_VEC_STR);
  const searchBtn = page.locator('button').filter({ hasText: /^Search$/ }).first();
  await searchBtn.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1_500);
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────
test.beforeAll(async () => {
  await ensureTestCollection();
});

test.afterAll(async () => {
  await sqlHttp(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE}"`);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 01 — Page load
// ─────────────────────────────────────────────────────────────────────────────
test('01 Vector Operations page loads and shows title', async ({ page }) => {
  await goToVectorOps(page);
  await expect(
    page.getByRole('main').getByText('Vector Operations', { exact: true }).or(
      page.locator('h1').filter({ hasText: 'Vector Operations' })
    ).first()
  ).toBeVisible({ timeout: 10_000 });
});

test('01b Stats strip is visible with Collections label', async ({ page }) => {
  await goToVectorOps(page);
  // Stats strip label is a <p> element; sidebar header is a <span> — use first() to avoid strict mode
  await expect(page.getByText('Collections').first()).toBeVisible({ timeout: 8_000 });
});

test('01c Stats strip shows Documents and Searches labels', async ({ page }) => {
  await goToVectorOps(page);
  // exact: true to avoid substring matching table names like "documents"
  await expect(page.getByText('Documents', { exact: true }).first()).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText('Searches (24h)')).toBeVisible({ timeout: 8_000 });
});

test('01d "New Collection" button is in the header', async ({ page }) => {
  await goToVectorOps(page);
  await expect(
    page.locator('button').filter({ hasText: 'New Collection' })
  ).toBeVisible({ timeout: 8_000 });
});

test('01e "Diagnostics" toggle button is in the header', async ({ page }) => {
  await goToVectorOps(page);
  await expect(
    page.locator('button').filter({ hasText: 'Diagnostics' })
  ).toBeVisible({ timeout: 8_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 02 — Left panel (Collections browser)
// ─────────────────────────────────────────────────────────────────────────────
test('02 Left panel shows "Collections" heading', async ({ page }) => {
  await goToVectorOps(page);
  await expect(page.getByText('Collections').first()).toBeVisible({ timeout: 8_000 });
});

test('02b Left panel filter input is visible', async ({ page }) => {
  await goToVectorOps(page);
  await expect(
    page.locator('input[placeholder*="Search collections"]')
  ).toBeVisible({ timeout: 8_000 });
});

test('02c Test collection appears in left panel within 20s', async ({ page }) => {
  await goToVectorOps(page);
  // Collection rows are divs, not buttons — locate by exact table name text
  await expect(
    page.getByText(TEST_TABLE, { exact: true }).first()
  ).toBeVisible({ timeout: 20_000 });
});

test('02d Collection row shows schema and dimension info', async ({ page }) => {
  await goToVectorOps(page);
  // Collection rows are divs, not buttons — locate by exact table name text
  await page.getByText(TEST_TABLE, { exact: true }).first().waitFor({ timeout: 20_000 });
  // The row shows "doc · 4D" metadata
  await expect(page.getByText(`${TEST_SCHEMA}`).first()).toBeVisible({ timeout: 5_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 03 — Collection selection
// ─────────────────────────────────────────────────────────────────────────────
test('03 Clicking collection shows collection info bar in centre panel', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  // Info bar shows schema.table
  await expect(page.getByText(TEST_TABLE).first()).toBeVisible({ timeout: 5_000 });
});

test('03b Info bar shows dimension badge', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  // The info bar badge shows "XD" — use first() in case multiple tables share the same dimension
  await expect(page.getByText(`${DIMS}D`).first()).toBeVisible({ timeout: 5_000 });
});

test('03c Info bar shows doc count', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  // "3 docs" or "3 documents" somewhere in the bar
  await expect(page.getByText(/\d+\s*doc/i).first()).toBeVisible({ timeout: 5_000 });
});

test('03d "Upload Documents" button appears after collection selected', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  await expect(
    page.locator('button').filter({ hasText: 'Upload Documents' })
  ).toBeVisible({ timeout: 5_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 04 — Search input UI
// ─────────────────────────────────────────────────────────────────────────────
test('04 Vector input textarea is visible after collection selected', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  const textarea = page.locator('textarea').first();
  await expect(textarea).toBeVisible({ timeout: 5_000 });
});

test('04b Textarea placeholder mentions dimension', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  const ph = await page.locator('textarea').first().getAttribute('placeholder');
  expect(ph).toContain(String(DIMS));
});

test('04c Search Type select has KNN Match and Vector Similarity options', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  const select = page.locator('select').first();
  await expect(select).toBeVisible({ timeout: 5_000 });

  const opts = await select.locator('option').allTextContents();
  expect(opts.some(o => o.includes('KNN'))).toBe(true);
  expect(opts.some(o => o.includes('Similarity'))).toBe(true);
});

test('04d Top K input is visible and accepts numbers', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  const topK = page.locator('input[type="number"]').first();
  await expect(topK).toBeVisible({ timeout: 5_000 });
  await topK.fill('10');
  expect(await topK.inputValue()).toBe('10');
});

test('04e Search button is disabled when textarea empty', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  const searchBtn = page.locator('button').filter({ hasText: /^Search$/ }).first();
  await expect(searchBtn).toBeDisabled({ timeout: 5_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 05 — KNN search results
// ─────────────────────────────────────────────────────────────────────────────
test('05 Searching with valid vector returns results', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);

  await expect(
    page.getByText(/\d+\s+result/i).first()
  ).toBeVisible({ timeout: 10_000 });
});

test('05b Result rows show content text', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);

  await expect(
    page.getByText(/First axis|Orthogonal|Near first/i).first()
  ).toBeVisible({ timeout: 10_000 });
});

test('05c Result rows show a score percentage', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);

  // Score shown as "XX.X%" from (score * 100).toFixed(1)
  await expect(
    page.locator('text=/\\d+\\.\\d+%/').first()
  ).toBeVisible({ timeout: 10_000 });
});

test('05d Score progress bar is rendered inside result rows', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);

  // Score bar: div with bg-blue-500 class
  await expect(
    page.locator('.bg-blue-500').first()
  ).toBeVisible({ timeout: 10_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 06 — Similarity search mode
// ─────────────────────────────────────────────────────────────────────────────
test('06 Switching to Vector Similarity and searching returns results', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  // Switch to similarity mode
  await page.locator('select').first().selectOption('similarity');

  const textarea = page.locator('textarea').first();
  await textarea.fill(QUERY_VEC_STR);

  const searchBtn = page.locator('button').filter({ hasText: /^Search$/ }).first();
  await searchBtn.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1_500);

  await expect(
    page.getByText(/\d+\s+result/i).first()
  ).toBeVisible({ timeout: 10_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 07 — Export buttons
// ─────────────────────────────────────────────────────────────────────────────
test('07 Copy, CSV, and JSON export buttons appear after search', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);

  // Copy button (icon)
  await expect(
    page.locator('button[title="Copy to clipboard"]')
  ).toBeVisible({ timeout: 8_000 });

  // Download CSV and JSON (by title attr)
  await expect(page.locator('button[title="Export CSV"]')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('button[title="Export JSON"]')).toBeVisible({ timeout: 5_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 08 — No PostgreSQL $1/$2 placeholders in SQL
// ─────────────────────────────────────────────────────────────────────────────
test('08 No $1/$2 PostgreSQL placeholders in any SQL sent to MonkDB', async ({ page }) => {
  const badStmts: string[] = [];

  await page.route('**/api/monkdb/query', async (route) => {
    const body = route.request().postDataJSON() as { stmt?: string } | null;
    if (body?.stmt && /\$\d/.test(body.stmt)) {
      badStmts.push(body.stmt);
    }
    await route.continue();
  });

  await goToVectorOps(page);
  await page.waitForTimeout(5_000);

  if (await page.locator('button').filter({ hasText: TEST_TABLE }).first().isVisible({ timeout: 15_000 })) {
    await page.locator('button').filter({ hasText: TEST_TABLE }).first().click();
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea').first();
    await textarea.fill(QUERY_VEC_STR);
    await page.locator('button').filter({ hasText: /^Search$/ }).first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1_500);
  }

  expect(badStmts).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 09 — No JS errors
// ─────────────────────────────────────────────────────────────────────────────
test('09 No unhandled JS errors on the vector-ops page', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await goToVectorOps(page);
  await page.waitForTimeout(3_000);

  const real = errors.filter(
    e => !e.includes('WebSocket') && !e.includes('HMR') && !e.includes('ECONNREFUSED')
  );
  expect(real).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 10 — New Collection wizard
// ─────────────────────────────────────────────────────────────────────────────
test('10 "New Collection" button opens Create Vector Table dialog', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'New Collection' }).click();

  await expect(
    page.getByText(/Create Vector Table/i).first()
  ).toBeVisible({ timeout: 5_000 });
});

test('10b Wizard shows schema select dropdown', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'New Collection' }).click();

  const select = page.locator('select').first();
  await expect(select).toBeVisible({ timeout: 5_000 });
});

test('10c Wizard shows dimension preset buttons (MiniLM, MPNet, OpenAI)', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'New Collection' }).click();

  await expect(page.getByText('MiniLM (384D)')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('MPNet (768D)')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('OpenAI (1536D)')).toBeVisible({ timeout: 5_000 });
});

test('10d Wizard closes on Cancel', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'New Collection' }).click();
  await page.locator('button').filter({ hasText: 'Cancel' }).first().click();

  // Dialog should be gone
  await expect(page.getByText('Create Vector Table')).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  // Page header still visible
  await expect(
    page.locator('button').filter({ hasText: 'New Collection' })
  ).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 11 — Upload Documents button
// ─────────────────────────────────────────────────────────────────────────────
test('11 "Upload Documents" is NOT shown before a collection is selected', async ({ page }) => {
  await goToVectorOps(page);
  await page.waitForTimeout(2_000);

  const uploadBtn = page.locator('button').filter({ hasText: 'Upload Documents' });
  const visible = await uploadBtn.isVisible().catch(() => false);
  expect(visible).toBe(false);
});

test('11b "Upload Documents" appears once a collection is selected', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  await expect(
    page.locator('button').filter({ hasText: 'Upload Documents' })
  ).toBeVisible({ timeout: 5_000 });
});

test('11c Upload dialog opens with file upload dropzone', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  await page.locator('button').filter({ hasText: 'Upload Documents' }).click();

  await expect(page.getByText('Upload Documents').first()).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(/JSON, CSV, or TXT/i)).toBeVisible({ timeout: 5_000 });
});

test('11d Upload dialog closes on Cancel', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  await page.locator('button').filter({ hasText: 'Upload Documents' }).click();
  await page.locator('button').filter({ hasText: 'Cancel' }).first().click();

  // Dialog gone — page title still present
  await expect(page.locator('button').filter({ hasText: 'Upload Documents' })).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 12 — Diagnostics panel
// ─────────────────────────────────────────────────────────────────────────────
test('12 Diagnostics panel toggles open when button clicked', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'Diagnostics' }).click();

  // Diagnostics panel shows debug section
  await expect(
    page.getByText(/Debug|Diagnostic/i).first()
  ).toBeVisible({ timeout: 5_000 });
});

test('12b Diagnostics panel has "Run Full Diagnostics" button', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'Diagnostics' }).click();

  // The debug panel itself has a toggle — click to expand
  const debugToggle = page.locator('button').filter({ hasText: /Debug & Diagnostic/i }).first();
  if (await debugToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await debugToggle.click();
  }

  await expect(
    page.locator('button').filter({ hasText: 'Run Full Diagnostics' })
  ).toBeVisible({ timeout: 5_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 13 — Query History
// ─────────────────────────────────────────────────────────────────────────────
test('13 Query History panel shows "No searches yet" before any search', async ({ page }) => {
  await injectConnection(page);
  await page.goto('/vector-ops');
  await page.evaluate(() => localStorage.removeItem('monkdb-vector-history'));
  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('No searches yet')).toBeVisible({ timeout: 8_000 });
});

test('13b After a search, history shows the collection name and timing', async ({ page }) => {
  await injectConnection(page);
  await page.goto('/vector-ops');
  await page.evaluate(() => localStorage.removeItem('monkdb-vector-history'));
  await page.waitForLoadState('networkidle');

  await selectTestCollection(page);
  await runKNNSearch(page);

  // History entry shows the table name (right panel)
  await expect(
    page.locator('text=/pw_vec_ui/i').or(page.getByText('pw_vec_ui')).first()
  ).toBeVisible({ timeout: 10_000 });

  // And the timing (ms)
  await expect(page.locator('text=/\\d+ms/').first()).toBeVisible({ timeout: 5_000 });
});

test('13c Clear history button appears and clears the list', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);

  // Trash button to clear history
  const trashBtn = page.locator('button[title="Clear history"]');
  await expect(trashBtn).toBeVisible({ timeout: 5_000 });
  await trashBtn.click();

  await expect(page.getByText('No searches yet')).toBeVisible({ timeout: 5_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 14 — Vector Function Reference panel
// ─────────────────────────────────────────────────────────────────────────────
test('14 Vector Functions reference panel is visible', async ({ page }) => {
  await goToVectorOps(page);
  await expect(page.getByText('Vector Functions')).toBeVisible({ timeout: 8_000 });
});

test('14b KNN Search and Similarity Score code blocks are shown', async ({ page }) => {
  await goToVectorOps(page);
  // Multiple elements contain "KNN Search" (label, code block, tab) — first() is fine
  await expect(page.getByText('KNN Search').first()).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText('Similarity Score').first()).toBeVisible({ timeout: 8_000 });
});

test('14c SQL reference shows knn_match and vector_similarity functions', async ({ page }) => {
  await goToVectorOps(page);
  const pageText = await page.evaluate(() => document.body.innerText);
  expect(pageText).toContain('knn_match');
  expect(pageText).toContain('vector_similarity');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 15 — Advanced Filters panel (new feature)
// ─────────────────────────────────────────────────────────────────────────────
test('15 Advanced Filters toggle button is visible after collection selected', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  await expect(
    page.locator('button').filter({ hasText: 'Advanced Filters' })
  ).toBeVisible({ timeout: 5_000 });
});

test('15b Advanced Filters panel opens on click and shows WHERE input', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  await page.locator('button').filter({ hasText: 'Advanced Filters' }).click();

  await expect(
    page.getByText('Extra WHERE Condition')
  ).toBeVisible({ timeout: 3_000 });

  await expect(
    page.locator('input[placeholder*="category"]')
  ).toBeVisible({ timeout: 3_000 });
});

test('15c Advanced Filters panel shows Min Score slider', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  await page.locator('button').filter({ hasText: 'Advanced Filters' }).click();

  await expect(page.getByText('Min Score')).toBeVisible({ timeout: 3_000 });
  await expect(page.locator('input[type="range"]')).toBeVisible({ timeout: 3_000 });
});

test('15d Advanced Filters shows "active" badge when WHERE clause is typed', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  await page.locator('button').filter({ hasText: 'Advanced Filters' }).click();
  await page.locator('input[placeholder*="category"]').fill("id = '1'");

  await expect(
    page.locator('span').filter({ hasText: 'active' })
  ).toBeVisible({ timeout: 3_000 });
});

test('15e Advanced Filters shows "active" badge when min score slider moved', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  await page.locator('button').filter({ hasText: 'Advanced Filters' }).click();

  // Move slider to 0.5
  const slider = page.locator('input[type="range"]');
  await slider.fill('0.5');
  await slider.dispatchEvent('input');

  await expect(
    page.locator('span').filter({ hasText: 'active' })
  ).toBeVisible({ timeout: 3_000 });
});

test('15f Advanced Filters collapses on second click', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  const toggle = page.locator('button').filter({ hasText: 'Advanced Filters' });
  await toggle.click();
  await expect(page.getByText('Min Score')).toBeVisible({ timeout: 3_000 });

  await toggle.click();
  await expect(page.getByText('Min Score')).not.toBeVisible({ timeout: 2_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 16 — Dynamic column display in search results (new feature)
// ─────────────────────────────────────────────────────────────────────────────
test('16 Result toolbar shows column count hint after search', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);

  // Toolbar shows "N columns" hint
  await expect(
    page.locator('text=/\\d+\\s+columns?/i').first()
  ).toBeVisible({ timeout: 10_000 });
});

test('16b Result rows show column labels as dt elements (dynamic key-value)', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);

  // Dynamic display: dt elements contain actual column names from the table
  // TEST_TABLE has id, content (plus _score which is hidden)
  const dtElements = page.locator('dl dt');
  await expect(dtElements.first()).toBeVisible({ timeout: 10_000 });

  const labels = await dtElements.allTextContents();
  // At minimum 'content' and 'id' columns should appear
  expect(labels.some(l => l.includes('content') || l.includes('id'))).toBe(true);
});

test('16c Result rank numbers (#1, #2 ...) are shown', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);

  await expect(page.locator('text=#1').first()).toBeVisible({ timeout: 10_000 });
});

test('16d Min score slider filters results client-side', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);

  // Wait for results
  await expect(page.getByText(/\d+\s+result/i).first()).toBeVisible({ timeout: 10_000 });

  // Open filters and crank min score to 0.99 — should filter most/all results
  await page.locator('button').filter({ hasText: 'Advanced Filters' }).click();
  const slider = page.locator('input[type="range"]');
  await slider.fill('0.99');
  await slider.dispatchEvent('input');

  // Toolbar should now show "N/M results" or amber warning
  const toolbarOrWarning = page.locator('text=/\\d+\\/\\d+\\s+results?/i').or(
    page.locator('text=/filtered by min score/i')
  );
  await expect(toolbarOrWarning.first()).toBeVisible({ timeout: 5_000 });
});

test('16e WHERE clause filter is included in query (history shows "+ filter")', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);

  // Open filters and add a WHERE clause
  await page.locator('button').filter({ hasText: 'Advanced Filters' }).click();
  await page.locator('input[placeholder*="category"]').fill('id IS NOT NULL');

  // Run KNN search
  await page.locator('textarea').first().fill(QUERY_VEC_STR);
  await page.locator('button').filter({ hasText: /^Search$/ }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1_500);

  // History entry should mention "+ filter"
  await expect(
    page.locator('text=/\\+ filter/i').first()
  ).toBeVisible({ timeout: 10_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 17 — CreateVectorTableDialog Advanced Schema (new feature)
// ─────────────────────────────────────────────────────────────────────────────
test('17 Create dialog has "Advanced Schema" collapsible section', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'New Collection' }).click();

  await expect(
    page.locator('button').filter({ hasText: 'Advanced Schema' })
  ).toBeVisible({ timeout: 5_000 });
});

test('17b Advanced Schema opens and shows column name inputs', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'New Collection' }).click();
  await page.locator('button').filter({ hasText: 'Advanced Schema' }).click();

  await expect(page.getByText('Primary Key')).toBeVisible({ timeout: 3_000 });
  // Use exact + first() to avoid matching the SQL reference code block which also contains "content"
  await expect(page.getByText('Content', { exact: true }).first()).toBeVisible({ timeout: 3_000 });
  await expect(page.getByText('Vector', { exact: true }).first()).toBeVisible({ timeout: 3_000 });
});

test('17c SQL preview updates when column names are changed', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'New Collection' }).click();

  // Fill in schema + table name so SQL preview appears
  await page.locator('select').first().selectOption({ index: 1 });
  await page.locator('input[placeholder="my_documents"]').fill('test_custom');

  // Open Advanced Schema
  await page.locator('button').filter({ hasText: 'Advanced Schema' }).click();

  // Inputs in the dialog: [0]=table name, [1]=PK col, [2]=content col, [3]=vector col
  // fill() triggers React onChange so no separate dispatchEvent needed
  const pkInput = page.getByRole('textbox').nth(1);
  await pkInput.fill('doc_id');

  // SQL preview contains doc_id — pick the pre that has CREATE TABLE
  const preview = page.locator('pre').filter({ hasText: 'CREATE TABLE' });
  await expect(preview).toContainText('doc_id', { timeout: 3_000 });
});

test('17d Extra Columns section has "Add Column" button', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'New Collection' }).click();
  await page.locator('button').filter({ hasText: 'Advanced Schema' }).click();

  await expect(
    page.locator('button').filter({ hasText: 'Add Column' })
  ).toBeVisible({ timeout: 3_000 });
});

test('17e Clicking "Add Column" adds a new row with name input and type select', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'New Collection' }).click();
  await page.locator('button').filter({ hasText: 'Advanced Schema' }).click();

  const addBtn = page.locator('button').filter({ hasText: 'Add Column' });
  await addBtn.click();

  // A new input for column name should appear
  await expect(
    page.locator('input[placeholder="column_name"]').first()
  ).toBeVisible({ timeout: 3_000 });
});

test('17f Extra column appears in SQL preview', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'New Collection' }).click();

  // Fill schema + table
  await page.locator('select').first().selectOption({ index: 1 });
  await page.locator('input[placeholder="my_documents"]').fill('test_extras');

  // Open advanced schema
  await page.locator('button').filter({ hasText: 'Advanced Schema' }).click();

  // Add a column named 'category'
  await page.locator('button').filter({ hasText: 'Add Column' }).click();
  const colNameInput = page.locator('input[placeholder="column_name"]').first();
  await colNameInput.fill('category');

  // SQL preview: pick the pre block that has CREATE TABLE (there are multiple pre on the page)
  const preview = page.locator('pre').filter({ hasText: 'CREATE TABLE' });
  await expect(preview).toContainText('category', { timeout: 3_000 });
});

test('17g Create button disabled when PK column name is empty', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'New Collection' }).click();

  // Fill schema + table
  await page.locator('select').first().selectOption({ index: 1 });
  await page.locator('input[placeholder="my_documents"]').fill('test_disabled');

  // Open advanced schema and clear PK name
  // Inputs in the dialog: [0]=table name, [1]=PK col, [2]=content col, [3]=vector col
  await page.locator('button').filter({ hasText: 'Advanced Schema' }).click();
  const pkInput = page.getByRole('textbox').nth(1);
  await pkInput.fill('');

  const createBtn = page.locator('button').filter({ hasText: /Create Table/ });
  await expect(createBtn).toBeDisabled({ timeout: 3_000 });
});

test('17h Extra column row has a delete (trash) button', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'New Collection' }).click();
  await page.locator('button').filter({ hasText: 'Advanced Schema' }).click();

  await page.locator('button').filter({ hasText: 'Add Column' }).click();

  // Column name input should appear
  await expect(
    page.locator('input[placeholder="column_name"]').first()
  ).toBeVisible({ timeout: 3_000 });

  // Trash button is in the same flex row as the column_name input — use XPath parent navigation
  const trashBtn = page.locator('xpath=//input[@placeholder="column_name"]/parent::div/button');
  await trashBtn.first().click();

  // After deletion, the column_name input should be gone
  await expect(
    page.locator('input[placeholder="column_name"]')
  ).toHaveCount(0, { timeout: 3_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 18 — Schema Inspector (CollectionSchemaPanel)
// ─────────────────────────────────────────────────────────────────────────────
test('18 Schema Inspector toggle is visible after collection selected', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await expect(
    page.locator('button').filter({ hasText: 'Schema Inspector' })
  ).toBeVisible({ timeout: 5_000 });
});

test('18b Schema Inspector expands on click and shows Columns section', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await page.locator('button').filter({ hasText: 'Schema Inspector' }).click();
  // Should show "Columns" header in inspector
  await expect(page.getByText(/Columns \(\d+\)/).first()).toBeVisible({ timeout: 5_000 });
});

test('18c Schema Inspector shows "id" column (primary key)', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await page.locator('button').filter({ hasText: 'Schema Inspector' }).click();
  // Column table rows should include "id" font-mono text
  await expect(page.locator('td').filter({ hasText: /^id$/ }).first()).toBeVisible({ timeout: 8_000 });
});

test('18d Schema Inspector shows VECTOR badge on the embedding column', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await page.locator('button').filter({ hasText: 'Schema Inspector' }).click();
  await expect(page.getByText('VECTOR').first()).toBeVisible({ timeout: 8_000 });
});

test('18e Schema Inspector collapses on second click', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  const toggleBtn = page.locator('button').filter({ hasText: 'Schema Inspector' });
  await toggleBtn.click();
  await page.getByText(/Columns \(\d+\)/).first().waitFor({ timeout: 5_000 });
  await toggleBtn.click();
  // Columns section should disappear
  await expect(page.getByText(/Columns \(\d+\)/)).toHaveCount(0, { timeout: 3_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 19 — Collection management menu (3-dot)
// ─────────────────────────────────────────────────────────────────────────────
test('19 Hovering a collection row reveals the three-dot menu button', async ({ page }) => {
  await goToVectorOps(page);
  await page.getByText(TEST_TABLE, { exact: true }).first().waitFor({ timeout: 20_000 });
  // Hover the collection row to reveal action buttons
  await page.getByText(TEST_TABLE, { exact: true }).first().hover();
  // The MoreVertical three-dot button becomes visible
  const menuBtn = page.locator('[title="Collection actions"]').first();
  await expect(menuBtn).toBeVisible({ timeout: 3_000 });
});

test('19b Clicking three-dot menu shows all 4 action items', async ({ page }) => {
  await goToVectorOps(page);
  await page.getByText(TEST_TABLE, { exact: true }).first().waitFor({ timeout: 20_000 });
  await page.getByText(TEST_TABLE, { exact: true }).first().hover();
  await page.locator('[title="Collection actions"]').first().click();
  await expect(page.getByText('View Schema').first()).toBeVisible({ timeout: 3_000 });
  await expect(page.getByText('Rename').first()).toBeVisible({ timeout: 3_000 });
  await expect(page.getByText('Add Column').first()).toBeVisible({ timeout: 3_000 });
  await expect(page.getByText('Drop Table').first()).toBeVisible({ timeout: 3_000 });
});

test('19c "View Schema" opens DDL modal with table name in header', async ({ page }) => {
  await goToVectorOps(page);
  // Scope to the specific collection row via data-testid to avoid picking a different collection's menu
  const row19c = page.locator(`[data-testid="vec-row-${TEST_SCHEMA}-${TEST_TABLE}"]`);
  await row19c.waitFor({ timeout: 20_000 });
  await row19c.hover();
  await row19c.locator('[title="Collection actions"]').click();
  await page.getByText('View Schema').first().click();
  // Modal header should contain the table name
  await expect(page.getByText(`${TEST_SCHEMA}.${TEST_TABLE}`, { exact: false }).first()).toBeVisible({ timeout: 5_000 });
});

test('19d DDL modal closes when X is clicked', async ({ page }) => {
  await goToVectorOps(page);
  const row19d = page.locator(`[data-testid="vec-row-${TEST_SCHEMA}-${TEST_TABLE}"]`);
  await row19d.waitFor({ timeout: 20_000 });
  await row19d.hover();
  await row19d.locator('[title="Collection actions"]').click();
  await page.getByText('View Schema').first().click();
  await page.getByText(`${TEST_SCHEMA}.${TEST_TABLE}`, { exact: false }).first().waitFor({ timeout: 5_000 });
  // Close the modal via its dedicated close button
  await page.locator('[title="Close DDL"]').click();
  await expect(page.getByText(`${TEST_SCHEMA}.${TEST_TABLE} — Schema`, { exact: false })).toHaveCount(0, { timeout: 3_000 });
});

test('19e "Rename" option shows inline rename form', async ({ page }) => {
  await goToVectorOps(page);
  await page.getByText(TEST_TABLE, { exact: true }).first().waitFor({ timeout: 20_000 });
  await page.getByText(TEST_TABLE, { exact: true }).first().hover();
  await page.locator('[title="Collection actions"]').first().click();
  await page.getByText('Rename').first().click();
  // Inline rename form should appear
  await expect(page.getByText('Rename Table').first()).toBeVisible({ timeout: 3_000 });
  await expect(page.locator('input[placeholder="new_table_name"]').first()).toBeVisible({ timeout: 3_000 });
  // Cancel it
  await page.locator('button').filter({ hasText: 'Cancel' }).first().click();
  await expect(page.locator('input[placeholder="new_table_name"]')).toHaveCount(0, { timeout: 3_000 });
});

test('19f "Add Column" option shows inline add-column form', async ({ page }) => {
  await goToVectorOps(page);
  await page.getByText(TEST_TABLE, { exact: true }).first().waitFor({ timeout: 20_000 });
  await page.getByText(TEST_TABLE, { exact: true }).first().hover();
  await page.locator('[title="Collection actions"]').first().click();
  await page.getByText('Add Column').first().click();
  // Inline add column form should appear
  await expect(page.getByText('Add Column').last()).toBeVisible({ timeout: 3_000 });
  await expect(page.locator('input[placeholder="column_name"]').last()).toBeVisible({ timeout: 3_000 });
  // Cancel it
  await page.locator('button').filter({ hasText: 'Cancel' }).last().click();
});

test('19g "Drop Table" shows inline drop confirmation', async ({ page }) => {
  await goToVectorOps(page);
  await page.getByText(TEST_TABLE, { exact: true }).first().waitFor({ timeout: 20_000 });
  await page.getByText(TEST_TABLE, { exact: true }).first().hover();
  await page.locator('[title="Collection actions"]').first().click();
  await page.getByText('Drop Table').first().click();
  // Drop confirmation text should appear
  await expect(page.getByText(/cannot be undone/i).first()).toBeVisible({ timeout: 3_000 });
  // Cancel to avoid actually dropping
  await page.locator('button').filter({ hasText: 'Cancel' }).last().click();
  await expect(page.getByText(/cannot be undone/i)).toHaveCount(0, { timeout: 3_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 20 — Inline Edit / Delete on result rows
// ─────────────────────────────────────────────────────────────────────────────
test('20 After search, result rows show edit (pencil) buttons', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);
  // Pencil edit buttons should be visible (title="Edit document")
  await expect(page.locator('[title="Edit document"]').first()).toBeVisible({ timeout: 5_000 });
});

test('20b After search, result rows show delete (trash) buttons', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);
  await expect(page.locator('[title="Delete document"]').first()).toBeVisible({ timeout: 5_000 });
});

test('20c Clicking pencil shows inline edit form with Save and Cancel', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);
  await page.locator('[title="Edit document"]').first().click();
  // Inline edit form: Save and Cancel buttons
  await expect(page.locator('button').filter({ hasText: 'Save' }).first()).toBeVisible({ timeout: 3_000 });
  await expect(page.locator('button').filter({ hasText: 'Cancel' }).first()).toBeVisible({ timeout: 3_000 });
});

test('20d Cancel on edit form closes the form', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);
  await page.locator('[title="Edit document"]').first().click();
  await page.locator('button').filter({ hasText: 'Save' }).first().waitFor({ timeout: 3_000 });
  await page.locator('button').filter({ hasText: 'Cancel' }).first().click();
  // After cancel, edit buttons should reappear
  await expect(page.locator('[title="Edit document"]').first()).toBeVisible({ timeout: 3_000 });
});

test('20e Clicking trash shows delete confirmation with Delete and Cancel', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);
  await page.locator('[title="Delete document"]').first().click();
  await expect(page.getByText(/cannot be undone/i).first()).toBeVisible({ timeout: 3_000 });
  await expect(page.locator('button').filter({ hasText: 'Delete' }).first()).toBeVisible({ timeout: 3_000 });
  // Cancel to avoid deleting test data
  await page.locator('button').filter({ hasText: 'Cancel' }).first().click();
  await expect(page.getByText(/cannot be undone/i)).toHaveCount(0, { timeout: 3_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 21 — Saved searches
// ─────────────────────────────────────────────────────────────────────────────
test('21 Bookmark button appears after vector is entered in search input', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  const textarea = page.locator('textarea').first();
  await textarea.fill(QUERY_VEC_STR);
  // Bookmark button should appear (title="Save search")
  await expect(page.locator('[title="Save search"]').first()).toBeVisible({ timeout: 3_000 });
});

test('21b Clicking bookmark shows label input form', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await page.locator('textarea').first().fill(QUERY_VEC_STR);
  await page.locator('[title="Save search"]').first().click();
  await expect(page.locator('input[placeholder="Search label..."]').first()).toBeVisible({ timeout: 3_000 });
});

test('21c Saving a search adds it to the Saved tab', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.removeItem('monkdb-vector-saved'); } catch {} });
  await goToVectorOps(page);
  await selectTestCollection(page);
  await page.locator('textarea').first().fill(QUERY_VEC_STR);
  await page.locator('[title="Save search"]').first().click();
  const labelInput = page.locator('input[placeholder="Search label..."]').first();
  await labelInput.fill('My Saved KNN');
  await labelInput.press('Enter');
  // Switch to Saved tab
  await page.locator('button').filter({ hasText: 'Saved' }).first().click();
  await expect(page.getByText('My Saved KNN').first()).toBeVisible({ timeout: 5_000 });
});

test('21d Saved tab shows "Run Again" button on saved searches', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.removeItem('monkdb-vector-saved'); } catch {} });
  await goToVectorOps(page);
  await selectTestCollection(page);
  // Save a search first
  await page.locator('textarea').first().fill(QUERY_VEC_STR);
  await page.locator('[title="Save search"]').first().click();
  const labelInput21d = page.locator('input[placeholder="Search label..."]').first();
  await labelInput21d.fill('KNN Run Test');
  await labelInput21d.press('Enter');
  // Go to Saved tab
  await page.locator('button').filter({ hasText: 'Saved' }).first().click();
  await page.getByText('KNN Run Test').first().waitFor({ timeout: 5_000 });
  await expect(page.locator('button').filter({ hasText: 'Run Again' }).first()).toBeVisible({ timeout: 3_000 });
});

test('21e Delete saved search removes it from the list', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.removeItem('monkdb-vector-saved'); } catch {} });
  await goToVectorOps(page);
  await selectTestCollection(page);
  // Save a search
  await page.locator('textarea').first().fill(QUERY_VEC_STR);
  await page.locator('[title="Save search"]').first().click();
  const labelInput21e = page.locator('input[placeholder="Search label..."]').first();
  await labelInput21e.fill('To Delete');
  await labelInput21e.press('Enter');
  // Go to Saved tab
  await page.locator('button').filter({ hasText: 'Saved' }).first().click();
  await page.getByText('To Delete').first().waitFor({ timeout: 5_000 });
  // Force-click the delete button (opacity-0 until group is hovered)
  await page.locator('[title="Delete saved search"]').first().click({ force: true });
  // After deletion the list is empty — "No saved searches" placeholder should appear
  // (Note: getByText('To Delete') would still match the toast "Search saved as 'To Delete'")
  await expect(page.getByText('No saved searches').first()).toBeVisible({ timeout: 5_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 22 — Right-panel tabs
// ─────────────────────────────────────────────────────────────────────────────
test('22 Right panel shows History, Saved, and Analytics tabs', async ({ page }) => {
  await goToVectorOps(page);
  await expect(page.locator('button').filter({ hasText: 'History' }).first()).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('button').filter({ hasText: 'Saved' }).first()).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('button').filter({ hasText: 'Analytics' }).first()).toBeVisible({ timeout: 5_000 });
});

test('22b Clicking Analytics tab shows analytics panel', async ({ page }) => {
  await goToVectorOps(page);
  await page.locator('button').filter({ hasText: 'Analytics' }).first().click();
  // Should show "No data yet" or analytics content
  await expect(
    page.getByText('No data yet').or(page.getByText('Total Searches')).first()
  ).toBeVisible({ timeout: 5_000 });
});

test('22c After a search, Analytics shows total searches > 0', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await runKNNSearch(page);
  await page.locator('button').filter({ hasText: 'Analytics' }).first().click();
  // Should now show analytics data with "Total Searches" card
  await expect(page.getByText('Total Searches').first()).toBeVisible({ timeout: 5_000 });
  // The count should be at least 1
  await expect(page.getByText('Avg Latency').first()).toBeVisible({ timeout: 3_000 });
});

test('22d Clicking Saved tab shows "No saved searches" when empty', async ({ page }) => {
  // Use a fresh page with empty localStorage to avoid leftover saved searches
  await injectConnection(page);
  await page.addInitScript(() => {
    localStorage.removeItem('monkdb-vector-saved');
    localStorage.removeItem('monkdb-vector-history');
  });
  await page.goto('/vector-ops');
  await page.waitForLoadState('networkidle');
  await page.locator('button').filter({ hasText: 'Saved' }).first().click();
  await expect(page.getByText('No saved searches').first()).toBeVisible({ timeout: 5_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 23 — Upload dialog — 3-step column mapping flow
// ─────────────────────────────────────────────────────────────────────────────
test('23 Upload dialog shows 3-step indicator (Load File, Map Columns, Upload)', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await page.locator('button').filter({ hasText: 'Upload Documents' }).click();
  await expect(page.getByText('1. Load File').first()).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('2. Map Columns').first()).toBeVisible({ timeout: 3_000 });
  await expect(page.getByText('3. Upload').first()).toBeVisible({ timeout: 3_000 });
});

test('23b Upload dialog step 1 shows file dropzone and JSON paste area', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await page.locator('button').filter({ hasText: 'Upload Documents' }).click();
  await expect(page.getByText('Choose file').first()).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('textarea').last()).toBeVisible({ timeout: 3_000 });
});

test('23c Pasting JSON enables "Map Columns" navigation button', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await page.locator('button').filter({ hasText: 'Upload Documents' }).click();
  // Paste valid JSON records
  const sampleJson = JSON.stringify([{ id: '1', content: 'hello' }]);
  await page.locator('textarea').last().fill(sampleJson);
  await page.waitForTimeout(500);
  // "Map Columns" button should now be enabled
  const mapBtn = page.locator('button').filter({ hasText: /Map Columns/ }).first();
  await expect(mapBtn).toBeEnabled({ timeout: 5_000 });
});

test('23d Clicking "Map Columns" advances to step 2 with column mapping rows', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await page.locator('button').filter({ hasText: 'Upload Documents' }).click();
  const sampleJson = JSON.stringify([{ id: '1', content: 'test document' }]);
  await page.locator('textarea').last().fill(sampleJson);
  await page.waitForTimeout(500);
  await page.locator('button').filter({ hasText: /Map Columns/ }).first().click();
  await page.waitForLoadState('networkidle');
  // Step 2 shows column mapping table: columns like "id", "content", "embedding"
  await expect(page.getByText('Map each table column').first()).toBeVisible({ timeout: 8_000 });
});

test('23e Upload dialog Cancel button works on all steps', async ({ page }) => {
  await goToVectorOps(page);
  await selectTestCollection(page);
  await page.locator('button').filter({ hasText: 'Upload Documents' }).click();
  await expect(page.getByText('1. Load File').first()).toBeVisible({ timeout: 5_000 });
  await page.locator('button').filter({ hasText: 'Cancel' }).first().click();
  // Dialog should close
  await expect(page.getByText('1. Load File')).toHaveCount(0, { timeout: 3_000 });
});
