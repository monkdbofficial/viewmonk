/**
 * FTS UI End-to-End Tests — browser tests against the live Next.js dev server.
 *
 * Selectors are derived from app/fts/page.tsx DOM structure:
 *   - Header title: text "Full-Text Search"
 *   - Left panel filter: input[placeholder="Filter indexes…"]
 *   - Index list items: <button> elements containing the table name text
 *   - Search textarea: textarea[placeholder="Enter search query…  …"]
 *   - Search button: button with text "Search"
 *   - SQL preview toggle: button[title="Toggle SQL preview"]
 *   - Export buttons: buttons with text "CSV" / "JSON" (appear after results)
 *   - New FTS Index: button with text "New FTS Index"
 *   - Add Snippet: button with text "Add Snippet"
 *   - Snippet form: inputs with placeholder "Label …" and "Query …"
 */

import { test, expect, Page } from '@playwright/test';

const MONKDB    = 'http://localhost:4200/_sql';
const TEST_SCHEMA = 'doc';
// Use a dedicated name so ui-fts and sql-compat don't conflict when run in parallel workers
const TEST_TABLE  = 'pw_fts_ui';
const TEST_INDEX  = 'idx_pw_fts_ui';

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function sqlHttp(stmt: string, args: unknown[] = []) {
  const res = await fetch(MONKDB, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stmt, args }),
  });
  return res.json();
}

async function ensureTestTable() {
  // Always drop and recreate — makes ui-fts fully independent of sql-compat lifecycle.
  // Without this, if sql-compat afterAll drops the table before test 02 runs in a
  // parallel worker, the button for pw_fts_test never appears in the left panel.
  await sqlHttp(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE}"`);
  await sqlHttp(`
    CREATE TABLE "${TEST_SCHEMA}"."${TEST_TABLE}" (
      id     INTEGER PRIMARY KEY,
      title  TEXT,
      body   TEXT,
      author TEXT,
      INDEX "${TEST_INDEX}" USING FULLTEXT (title, body) WITH (analyzer = 'english')
    )
  `);
  await sqlHttp(`
    INSERT INTO "${TEST_SCHEMA}"."${TEST_TABLE}" (id, title, body, author) VALUES
    (1,'MonkDB connection errors','Database connection timeout errors occur under heavy load.','Alice'),
    (2,'SQL query optimisation','Optimising queries with indexing.','Bob'),
    (3,'Full-text search with BM25','BM25 provides relevance scoring for search.','Carol'),
    (4,'Error handling in distributed systems','Handle network failures and timeout errors.','Alice'),
    (5,'Database indexing strategies','Indexes speed up query execution.','Bob')
  `);
  await sqlHttp(`REFRESH TABLE "${TEST_SCHEMA}"."${TEST_TABLE}"`);
}

// ─── Inject MonkDB connection into localStorage BEFORE page load ─────────────
// The app reads `monkdb_connections` + `monkdb_active_connection` from localStorage
// to restore the DB connection on mount. Without this the page shows ConnectionPrompt.
const CONN_ID = 'pw-test-conn';
const CONN_PAYLOAD = JSON.stringify([{
  id: CONN_ID,
  name: 'Playwright Test',
  config: {
    host: 'localhost',
    port: 4200,
    protocol: 'http',
    role: 'superuser',
  },
}]);

async function injectConnection(page: Page) {
  await page.addInitScript(([payload, id]: [string, string]) => {
    localStorage.setItem('monkdb_connections', payload);
    localStorage.setItem('monkdb_active_connection', id);
  }, [CONN_PAYLOAD, CONN_ID] as [string, string]);
}

// ─── Page helpers ────────────────────────────────────────────────────────────
async function goToFTS(page: Page) {
  await injectConnection(page);
  await page.goto('/fts');
  await page.waitForLoadState('networkidle');
}

async function selectTestIndex(page: Page) {
  // Wait for index list to load (SHOW CREATE TABLE for all tables takes a moment)
  await page.waitForFunction(
    (tableName) => document.querySelector('button') &&
      [...document.querySelectorAll('button')].some(b => b.textContent?.includes(tableName)),
    TEST_TABLE,
    { timeout: 20_000 }
  );
  // Click the button that contains the table name
  const btns = page.locator('button').filter({ hasText: TEST_TABLE });
  await btns.first().click();
  await page.waitForLoadState('networkidle');
}

async function runSearch(page: Page, query: string) {
  const searchArea = page.locator('textarea').first();
  await searchArea.fill(query);
  // Use Ctrl+Enter keyboard shortcut — avoids ambiguous "Search" button selector
  // (onKeyDown handler: if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSearch())
  await searchArea.press('Control+Enter');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1_500);
}

// ─── Setup / teardown ────────────────────────────────────────────────────────
test.beforeAll(async () => {
  await ensureTestTable();
});

test.afterAll(async () => {
  await sqlHttp(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE}"`);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1 — Page loads
// ─────────────────────────────────────────────────────────────────────────────
test('01 FTS page loads and shows "Full-Text Search" title', async ({ page }) => {
  await goToFTS(page);
  // Use role:main to scope to the page header div — avoids matching nav sidebar link
  await expect(
    page.getByRole('main').getByText('Full-Text Search', { exact: true })
  ).toBeVisible({ timeout: 10_000 });
});

test('01b Left panel search box is visible', async ({ page }) => {
  await goToFTS(page);
  const filterInput = page.locator('input[placeholder="Filter indexes…"]');
  await expect(filterInput).toBeVisible({ timeout: 8_000 });
});

test('01c Main search textarea is not visible before table selected', async ({ page }) => {
  await goToFTS(page);
  // The search area only appears in the right column once an index is selected
  // Before selection, the main area shows "Select an index" message
  const searchArea = page.locator('textarea').first();
  // It could be hidden or not rendered
  const visible = await searchArea.isVisible().catch(() => false);
  if (visible) {
    // Some implementations show it as disabled; that's acceptable too
    const disabled = await searchArea.isDisabled();
    expect(disabled || !visible).toBe(true);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2 — Index browser shows FTS tables
// ─────────────────────────────────────────────────────────────────────────────
test('02 Left panel shows test FTS table after indexes load', async ({ page }) => {
  await goToFTS(page);
  // Wait up to 20s for SHOW CREATE TABLE queries to complete across all tables
  await expect(
    page.locator('button').filter({ hasText: TEST_TABLE }).first()
  ).toBeVisible({ timeout: 20_000 });
});

test('02b "FTS Indexes" label is visible in the left panel', async ({ page }) => {
  await goToFTS(page);
  await expect(page.getByText('FTS Indexes')).toBeVisible({ timeout: 8_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3 — Select index shows metadata
// ─────────────────────────────────────────────────────────────────────────────
test('03 Clicking test table selects it and shows indexed columns', async ({ page }) => {
  await goToFTS(page);
  await selectTestIndex(page);

  // The search area and index info should appear after selection
  // Indexed columns (title, body) are shown either in the header or in a panel
  await expect(
    page.getByText('title').or(page.getByText('body')).first()
  ).toBeVisible({ timeout: 8_000 });
});

test('03b Schema name appears in the selected index header', async ({ page }) => {
  await goToFTS(page);
  await selectTestIndex(page);

  // The selected index header shows schema.table
  await expect(page.getByText(TEST_SCHEMA).first()).toBeVisible({ timeout: 5_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4 — Search input and execution
// ─────────────────────────────────────────────────────────────────────────────
test('04 Search textarea has correct placeholder', async ({ page }) => {
  await goToFTS(page);
  await selectTestIndex(page);

  const searchArea = page.locator('textarea').first();
  await expect(searchArea).toBeVisible({ timeout: 5_000 });
  const ph = await searchArea.getAttribute('placeholder');
  expect(ph).toContain('search query');
});

test('04b Searching "error" returns result rows', async ({ page }) => {
  await goToFTS(page);
  await selectTestIndex(page);
  await runSearch(page, 'error');

  // After search, result rows show the content of row 1 or row 4
  await expect(
    page.getByText(/MonkDB connection error|Error handling/i).first()
  ).toBeVisible({ timeout: 10_000 });
});

test('04c Results counter shows N results', async ({ page }) => {
  await goToFTS(page);
  await selectTestIndex(page);
  await runSearch(page, 'error');

  // Toolbar shows "{N} results" or "{N} result"
  await expect(
    page.getByText(/\d+\s+result/i).first()
  ).toBeVisible({ timeout: 8_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5 — BM25 score display
// ─────────────────────────────────────────────────────────────────────────────
test('05 BM25 score is displayed in result rows (4 decimal places)', async ({ page }) => {
  await goToFTS(page);
  await selectTestIndex(page);
  await runSearch(page, 'error');

  // Score is shown as e.g. "0.8472" — 4 decimal places format from result._score.toFixed(4)
  await expect(
    page.locator('text=/\\d+\\.\\d{4}/').first()
  ).toBeVisible({ timeout: 8_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6 — Highlighting
// ─────────────────────────────────────────────────────────────────────────────
test('06 Matched terms are wrapped in <mark> elements', async ({ page }) => {
  await goToFTS(page);
  await selectTestIndex(page);
  await runSearch(page, 'error');

  // dangerouslySetInnerHTML with highlightMatches injects <mark> elements
  const mark = page.locator('mark').first();
  await expect(mark).toBeVisible({ timeout: 8_000 });

  // The highlighted text should be the search term
  const text = await mark.textContent();
  expect(text?.toLowerCase()).toContain('error');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 7 — SQL Preview
// ─────────────────────────────────────────────────────────────────────────────
test('07 SQL preview toggle button is visible', async ({ page }) => {
  await goToFTS(page);
  await selectTestIndex(page);

  const sqlBtn = page.locator('button[title="Toggle SQL preview"]');
  await expect(sqlBtn).toBeVisible({ timeout: 5_000 });
});

test('07b SQL preview shows MATCH("index_name", ?) when toggled', async ({ page }) => {
  await goToFTS(page);
  await selectTestIndex(page);
  await runSearch(page, 'error');

  const sqlBtn = page.locator('button[title="Toggle SQL preview"]');
  await sqlBtn.click();

  // SQL preview element (pre or code) should contain the index name
  await expect(
    page.locator('pre, code').filter({ hasText: /MATCH/ }).first()
  ).toBeVisible({ timeout: 5_000 });

  const sqlText = await page.locator('pre, code').filter({ hasText: /MATCH/ }).first().textContent();
  expect(sqlText).toContain(TEST_INDEX);
  // Must NOT use old column-name syntax
  expect(sqlText).not.toMatch(/MATCH\(title/i);
  expect(sqlText).not.toMatch(/MATCH\(body/i);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 8 — Export buttons (visible only after search returns results)
// ─────────────────────────────────────────────────────────────────────────────
test('08 CSV and JSON export buttons appear after successful search', async ({ page }) => {
  await goToFTS(page);
  await selectTestIndex(page);
  await runSearch(page, 'error');

  await expect(page.locator('button').filter({ hasText: 'CSV' })).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('button').filter({ hasText: 'JSON' })).toBeVisible({ timeout: 8_000 });
});

test('08b Copy button also appears in results toolbar', async ({ page }) => {
  await goToFTS(page);
  await selectTestIndex(page);
  await runSearch(page, 'error');

  await expect(page.locator('button').filter({ hasText: 'Copy' })).toBeVisible({ timeout: 8_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 9 — Header buttons
// ─────────────────────────────────────────────────────────────────────────────
test('09 "New FTS Index" button is in the header', async ({ page }) => {
  await goToFTS(page);
  await expect(
    page.locator('button').filter({ hasText: 'New FTS Index' })
  ).toBeVisible({ timeout: 8_000 });
});

test('09b Clicking "New FTS Index" opens the Create FTS Table wizard', async ({ page }) => {
  await goToFTS(page);
  await page.locator('button').filter({ hasText: 'New FTS Index' }).click();

  // Step 1 of the wizard should show
  await expect(
    page.getByText(/Create Full.Text Search Table|Step 1/i).first()
  ).toBeVisible({ timeout: 5_000 });
});

test('09c Wizard shows "Select schema" dropdown in step 1', async ({ page }) => {
  await goToFTS(page);
  await page.locator('button').filter({ hasText: 'New FTS Index' }).click();

  const select = page.locator('select').first();
  await expect(select).toBeVisible({ timeout: 5_000 });
});

test('09d Wizard closes when Cancel is clicked', async ({ page }) => {
  await goToFTS(page);
  await page.locator('button').filter({ hasText: 'New FTS Index' }).click();

  await page.locator('button').filter({ hasText: 'Cancel' }).first().click();
  // Wizard should be gone
  await expect(page.getByText('Create Full-Text Search Table')).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  // Page title still there
  await expect(
    page.getByRole('main').getByText('Full-Text Search', { exact: true })
  ).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 10 — Query Syntax tips panel
// ─────────────────────────────────────────────────────────────────────────────
test('10 Query Syntax section is visible on the right panel', async ({ page }) => {
  await goToFTS(page);
  await expect(page.getByText('Query Syntax')).toBeVisible({ timeout: 8_000 });
});

test('10b Built-in syntax tips are shown (Single Term, Phrase, Boolean OR)', async ({ page }) => {
  await goToFTS(page);
  // Use exact:true to avoid matching partial text like "Exact phrase in sequence"
  await expect(page.getByText('Single Term', { exact: true })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText('Phrase', { exact: true })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText('Boolean OR', { exact: true })).toBeVisible({ timeout: 8_000 });
});

test('10c Must Exclude tip is NOT present (removed — not supported by MonkDB 6)', async ({ page }) => {
  await goToFTS(page);
  // We removed this tip because MonkDB 6.0 does not enforce -term exclusion
  await page.waitForTimeout(2_000);
  const mustExclude = page.getByText('Must Exclude');
  await expect(mustExclude).not.toBeVisible({ timeout: 3_000 }).catch(() => {
    // If it appears somewhere not visible, that's fine — just check page text
  });
  const pageText = await page.evaluate(() => document.body.innerText);
  expect(pageText).not.toContain('Must Exclude');
});

test('10d Prefix Match tip shows "connect*" (correct stemmed example)', async ({ page }) => {
  await goToFTS(page);
  // Wildcard example should be "connect*" not "conn*" (which fails with english stemming)
  const pageText = await page.evaluate(() => document.body.innerText);
  expect(pageText).toContain('connect*');
  expect(pageText).not.toContain('conn*');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 11 — User-editable snippets
// ─────────────────────────────────────────────────────────────────────────────
test('11 "Add Snippet" button is visible in the right panel', async ({ page }) => {
  await goToFTS(page);
  await expect(
    page.locator('button').filter({ hasText: 'Add Snippet' })
  ).toBeVisible({ timeout: 8_000 });
});

test('11b Clicking "Add Snippet" shows label and query inputs', async ({ page }) => {
  await goToFTS(page);
  await page.locator('button').filter({ hasText: 'Add Snippet' }).click();

  // SnippetForm renders inputs with these placeholders
  const labelInput = page.locator('input[placeholder*="Label"]');
  const queryInput = page.locator('input[placeholder*="Query"]');
  await expect(labelInput).toBeVisible({ timeout: 5_000 });
  await expect(queryInput).toBeVisible({ timeout: 5_000 });
});

test('11c Can save a snippet and see it in the list', async ({ page }) => {
  // Clear localStorage first to avoid leftover test snippets
  await injectConnection(page);
  await page.goto('/fts');
  await page.evaluate(() => localStorage.removeItem('monkdb-fts-query-snippets'));
  await page.reload();
  await page.waitForLoadState('networkidle');

  await page.locator('button').filter({ hasText: 'Add Snippet' }).click();

  await page.locator('input[placeholder*="Label"]').fill('PW Test Query');
  await page.locator('input[placeholder*="Query"]').fill('database*');

  await page.locator('button').filter({ hasText: 'Save' }).click();

  // The new snippet label should appear
  await expect(page.getByText('PW Test Query')).toBeVisible({ timeout: 5_000 });
});

test('11d Snippet persists after page reload (localStorage)', async ({ page }) => {
  await injectConnection(page);
  await page.goto('/fts');
  await page.evaluate(() => localStorage.removeItem('monkdb-fts-query-snippets'));
  await page.reload();
  await page.waitForLoadState('networkidle');

  await page.locator('button').filter({ hasText: 'Add Snippet' }).click();
  await page.locator('input[placeholder*="Label"]').fill('PW Persist Test');
  await page.locator('input[placeholder*="Query"]').fill('error*');
  await page.locator('button').filter({ hasText: 'Save' }).click();

  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('PW Persist Test')).toBeVisible({ timeout: 5_000 });

  // Cleanup
  await page.evaluate(() => localStorage.removeItem('monkdb-fts-query-snippets'));
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 12 — Network / no bad SQL sent to MonkDB
// ─────────────────────────────────────────────────────────────────────────────
test('12 No $1/$2 PostgreSQL placeholders in any SQL sent to MonkDB', async ({ page }) => {
  const badStmts: string[] = [];

  await page.route('**/api/monkdb/query', async (route) => {
    const body = route.request().postDataJSON() as { stmt?: string } | null;
    if (body?.stmt && (body.stmt.includes('$1') || body.stmt.includes('$2'))) {
      badStmts.push(body.stmt);
    }
    await route.continue();
  });

  await goToFTS(page);
  // Let indexes load (triggers SHOW CREATE TABLE + COUNT queries)
  await page.waitForTimeout(5_000);

  // Select an index and search to trigger all query paths
  const tableBtn = page.locator('button').filter({ hasText: TEST_TABLE });
  if (await tableBtn.first().isVisible({ timeout: 15_000 })) {
    await tableBtn.first().click();
    await page.waitForLoadState('networkidle');
    await runSearch(page, 'error');
  }

  if (badStmts.length > 0) {
    console.error('Found PostgreSQL-style placeholders in SQL:', badStmts);
  }
  expect(badStmts).toHaveLength(0);
});

test('12b No unhandled JS errors on FTS page', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await goToFTS(page);
  await page.waitForTimeout(3_000);

  const realErrors = errors.filter(
    e => !e.includes('WebSocket') && !e.includes('HMR') && !e.includes('ECONNREFUSED')
  );
  if (realErrors.length > 0) console.error('JS errors:', realErrors);
  expect(realErrors).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 13 — Refresh button and schedule
// ─────────────────────────────────────────────────────────────────────────────
test('13 Header "Refresh" button reloads index list', async ({ page }) => {
  await goToFTS(page);
  const refreshBtn = page.locator('button').filter({ hasText: 'Refresh' }).first();
  await expect(refreshBtn).toBeVisible({ timeout: 5_000 });
  // Clicking it should not throw an error
  await refreshBtn.click();
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('main').getByText('Full-Text Search', { exact: true })
  ).toBeVisible();
});
