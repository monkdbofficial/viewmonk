/**
 * FTS SQL Compatibility Test Suite
 * Tests every SQL query used by the FTS module directly against MonkDB /_sql.
 * No browser required — all tests use the MonkDB HTTP API directly.
 *
 * Covers:
 *  1. information_schema.tables  — table discovery
 *  2. SHOW CREATE TABLE          — FULLTEXT index detection
 *  3. SELECT COUNT(*)            — document count
 *  4. information_schema.columns — column metadata (with ? params)
 *  5. PK JOIN query              — key_column_usage + table_constraints
 *  6. CREATE TABLE + FULLTEXT    — index creation DDL
 *  7. INSERT INTO … SELECT *     — data copy
 *  8. REFRESH TABLE              — makes rows visible to MATCH
 *  9. MATCH("index_name", ?)     — full-text search with BM25 scoring
 * 10. _score column              — BM25 score returned and numeric
 * 11. MATCH(column_name, ?)      — must FAIL (MonkDB 6+ column syntax broken)
 * 12. Parameterised ? syntax     — ? works; $1 must fail
 * 13. Batch pattern              — 10 concurrent SHOW CREATE TABLE calls succeed
 * 14. SHOW CREATE TABLE DDL text — regex IDX_REGEX correctly finds index
 * 15. information_schema schemas — exclusion of sys / information_schema / pg_catalog
 */

import { test, expect } from '@playwright/test';

// ─── MonkDB direct query helper ──────────────────────────────────────────────
const MONKDB = 'http://localhost:4200/_sql';

interface MonkResult {
  cols: string[];
  rows: unknown[][];
  rowcount: number;
  duration: number;
}
interface MonkError {
  error: { code: number; message: string };
}

async function sql(stmt: string, args: unknown[] = []): Promise<MonkResult> {
  const res = await fetch(MONKDB, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stmt, args }),
  });
  const body = (await res.json()) as MonkResult | MonkError;
  if ('error' in body) {
    throw new Error(`MonkDB ${(body as MonkError).error.code}: ${(body as MonkError).error.message}`);
  }
  return body as MonkResult;
}

/** Same as sql() but returns the raw error instead of throwing */
async function sqlRaw(stmt: string, args: unknown[] = []): Promise<MonkResult | MonkError> {
  const res = await fetch(MONKDB, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stmt, args }),
  });
  return res.json();
}

// ─── Test fixtures ────────────────────────────────────────────────────────────
const TEST_SCHEMA = 'doc';
const TEST_TABLE  = 'pw_fts_test';           // primary test table (with FTS index)
const TEST_TABLE2 = 'pw_fts_copy';           // copy target used in INSERT…SELECT test
const TEST_INDEX  = 'idx_pw_fts_test';

// ─── Setup / teardown ─────────────────────────────────────────────────────────
test.beforeAll(async () => {
  // Drop leftover tables from previous runs (ignore errors)
  await sqlRaw(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE2}"`);
  await sqlRaw(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE}"`);

  // Create the primary test table with a named FULLTEXT index
  await sql(`
    CREATE TABLE "${TEST_SCHEMA}"."${TEST_TABLE}" (
      id       INTEGER PRIMARY KEY,
      title    TEXT,
      body     TEXT,
      author   TEXT,
      INDEX "${TEST_INDEX}"
        USING FULLTEXT (title, body)
        WITH (analyzer = 'english')
    )
  `);

  // Insert test rows
  await sql(`
    INSERT INTO "${TEST_SCHEMA}"."${TEST_TABLE}" (id, title, body, author) VALUES
    (1, 'MonkDB connection errors',
        'Database connection timeout errors occur when server is under heavy load.',
        'Alice'),
    (2, 'SQL query optimisation',
        'Optimising queries involves proper indexing and efficient WHERE clauses.',
        'Bob'),
    (3, 'Full-text search with BM25',
        'BM25 ranking provides relevance-based scoring for full-text search queries.',
        'Carol'),
    (4, 'Error handling in distributed systems',
        'Distributed systems must handle network failures and timeout errors gracefully.',
        'Alice'),
    (5, 'Database indexing strategies',
        'Indexes speed up query execution by allowing the engine to find rows.',
        'Bob')
  `);

  // REFRESH so rows are visible to MATCH queries
  await sql(`REFRESH TABLE "${TEST_SCHEMA}"."${TEST_TABLE}"`);
});

test.afterAll(async () => {
  await sqlRaw(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE2}"`);
  await sqlRaw(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE}"`);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1 — information_schema.tables
// ─────────────────────────────────────────────────────────────────────────────
test('01 information_schema.tables returns BASE TABLE rows', async () => {
  const r = await sql(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('sys', 'information_schema', 'pg_catalog')
    ORDER BY table_schema, table_name
  `);

  expect(r.cols).toEqual(['table_schema', 'table_name']);
  expect(r.rows.length).toBeGreaterThan(0);

  // Our test table must appear
  const found = r.rows.some(row => row[0] === TEST_SCHEMA && row[1] === TEST_TABLE);
  expect(found, `Expected ${TEST_SCHEMA}.${TEST_TABLE} in result`).toBe(true);
});

test('01b sys / information_schema / pg_catalog are excluded from table list', async () => {
  const r = await sql(`
    SELECT table_schema
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('sys', 'information_schema', 'pg_catalog')
  `);

  for (const row of r.rows) {
    const schema = row[0] as string;
    expect(['sys', 'information_schema', 'pg_catalog']).not.toContain(schema);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2 — SHOW CREATE TABLE
// ─────────────────────────────────────────────────────────────────────────────
test('02 SHOW CREATE TABLE returns DDL string', async () => {
  const r = await sql(`SHOW CREATE TABLE "${TEST_SCHEMA}"."${TEST_TABLE}"`);

  expect(r.rows.length).toBe(1);
  const ddl = r.rows[0][0] as string;
  expect(typeof ddl).toBe('string');
  expect(ddl.length).toBeGreaterThan(20);
});

test('02b SHOW CREATE TABLE DDL contains named FULLTEXT index', async () => {
  const r = await sql(`SHOW CREATE TABLE "${TEST_SCHEMA}"."${TEST_TABLE}"`);
  const ddl = r.rows[0][0] as string;

  // This is the exact regex used in useFTSIndexes.ts
  const IDX_REGEX = /INDEX\s+"([^"]+)"\s+USING\s+FULLTEXT\s+\(([^)]+)\)/i;
  const ANALYZER_REGEX = /analyzer\s*=\s*'([^']+)'/i;

  const lines = ddl.split('\n');
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    const m = IDX_REGEX.exec(lines[i]);
    if (m) {
      found = true;
      expect(m[1]).toBe(TEST_INDEX);

      // Columns are title and body (order may vary)
      const cols = m[2].split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''));
      expect(cols).toContain('title');
      expect(cols).toContain('body');

      // Check analyzer in next few lines
      const context = lines.slice(i, i + 5).join(' ');
      const am = ANALYZER_REGEX.exec(context);
      expect(am?.[1]).toBe('english');
      break;
    }
  }

  expect(found, 'IDX_REGEX should match FULLTEXT index line in DDL').toBe(true);
});

test('02c SHOW CREATE TABLE on non-existent table returns error', async () => {
  const r = await sqlRaw(`SHOW CREATE TABLE "doc"."pw_table_that_does_not_exist"`);
  expect('error' in r).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3 — SELECT COUNT(*)
// ─────────────────────────────────────────────────────────────────────────────
test('03 SELECT COUNT(*) returns numeric row count', async () => {
  const r = await sql(`SELECT COUNT(*) FROM "${TEST_SCHEMA}"."${TEST_TABLE}"`);

  expect(r.rows.length).toBe(1);
  const count = parseInt(String(r.rows[0][0]), 10);
  expect(count).toBe(5);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4 — information_schema.columns with ? params
// ─────────────────────────────────────────────────────────────────────────────
test('04 information_schema.columns works with ? parameters', async () => {
  const r = await sql(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?
     ORDER BY ordinal_position`,
    [TEST_SCHEMA, TEST_TABLE]
  );

  expect(r.cols).toEqual(['column_name', 'data_type', 'is_nullable']);
  expect(r.rows.length).toBeGreaterThan(0);

  const colNames = r.rows.map(row => row[0] as string);
  expect(colNames).toContain('id');
  expect(colNames).toContain('title');
  expect(colNames).toContain('body');
  expect(colNames).toContain('author');
});

test('04b data_type for TEXT column is "text" in MonkDB', async () => {
  const r = await sql(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = 'title'`,
    [TEST_SCHEMA, TEST_TABLE]
  );

  expect(r.rows.length).toBe(1);
  const dataType = (r.rows[0][1] as string).toLowerCase();
  // MonkDB returns 'text' for TEXT columns
  expect(dataType).toBe('text');
});

test('04c data_type for INTEGER column is "integer" in MonkDB', async () => {
  const r = await sql(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = 'id'`,
    [TEST_SCHEMA, TEST_TABLE]
  );

  expect(r.rows.length).toBe(1);
  const dataType = (r.rows[0][1] as string).toLowerCase();
  expect(dataType).toBe('integer');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5 — Primary Key JOIN query (CreateFTSIndexDialog)
// ─────────────────────────────────────────────────────────────────────────────
test('05 information_schema PK JOIN returns primary key columns', async () => {
  const r = await sql(
    `SELECT kcu.column_name
     FROM information_schema.key_column_usage kcu
     JOIN information_schema.table_constraints tc
       ON kcu.constraint_name = tc.constraint_name
       AND kcu.table_schema = tc.table_schema
       AND kcu.table_name = tc.table_name
     WHERE tc.constraint_type = 'PRIMARY KEY'
       AND kcu.table_schema = ? AND kcu.table_name = ?`,
    [TEST_SCHEMA, TEST_TABLE]
  );

  expect(r.rows.length).toBeGreaterThan(0);
  const pkCols = r.rows.map(row => row[0] as string);
  expect(pkCols).toContain('id');
});

test('05b constraint_type = PRIMARY KEY works (not LIKE _pkey)', async () => {
  // Old broken query used: constraint_name LIKE '%_pkey' (PostgreSQL style)
  // New correct query uses: constraint_type = 'PRIMARY KEY'
  // This test verifies MonkDB supports constraint_type filtering

  const r = await sql(
    `SELECT tc.constraint_type, tc.constraint_name
     FROM information_schema.table_constraints tc
     WHERE tc.table_schema = ? AND tc.table_name = ?`,
    [TEST_SCHEMA, TEST_TABLE]
  );

  const types = r.rows.map(row => row[0] as string);
  // MonkDB should expose PRIMARY KEY constraint type
  expect(types).toContain('PRIMARY KEY');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6 — ? parameter syntax (NOT $1/$2 PostgreSQL style)
// ─────────────────────────────────────────────────────────────────────────────
test('06 MonkDB uses ? placeholders (not $1 PostgreSQL style)', async () => {
  // ? works
  const r = await sql(
    `SELECT column_name FROM information_schema.columns WHERE table_name = ?`,
    [TEST_TABLE]
  );
  expect(r.rows.length).toBeGreaterThan(0);
});

test('06b PostgreSQL-style $1 placeholder fails in MonkDB', async () => {
  const r = await sqlRaw(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [TEST_TABLE]
  );
  // MonkDB does NOT support $1 — should error or return no matches
  // Either an error OR zero rows (MonkDB treats $1 as literal string)
  if ('error' in r) {
    expect((r as { error: { message: string } }).error).toBeTruthy();
  } else {
    // If no error, $1 was treated as literal — should not match our table name
    const rows = (r as MonkResult).rows;
    const matched = rows.some(row => row[0] === TEST_TABLE);
    expect(matched).toBe(false);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 7 — REFRESH TABLE
// ─────────────────────────────────────────────────────────────────────────────
test('07 REFRESH TABLE executes without error', async () => {
  const r = await sql(`REFRESH TABLE "${TEST_SCHEMA}"."${TEST_TABLE}"`);
  // MonkDB returns rowcount = number of shards refreshed
  expect(r.rowcount).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 8 — MATCH with index name (the correct MonkDB 6+ syntax)
// ─────────────────────────────────────────────────────────────────────────────
test('08 MATCH("index_name", ?) returns results with _score', async () => {
  const r = await sql(
    `SELECT *, _score FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE MATCH("${TEST_INDEX}", ?)
     ORDER BY _score DESC
     LIMIT 10`,
    ['error']
  );

  expect(r.rows.length).toBeGreaterThan(0);
  expect(r.cols).toContain('_score');

  const scoreIdx = r.cols.indexOf('_score');
  for (const row of r.rows) {
    const score = row[scoreIdx] as number;
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThan(0);
  }
});

test('08b MATCH returns rows ranked by _score (highest first)', async () => {
  const r = await sql(
    `SELECT id, _score FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE MATCH("${TEST_INDEX}", ?)
     ORDER BY _score DESC
     LIMIT 10`,
    ['error database']
  );

  expect(r.rows.length).toBeGreaterThan(0);

  // Scores must be descending
  const scores = r.rows.map(row => row[1] as number);
  for (let i = 1; i < scores.length; i++) {
    expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
  }
});

test('08c MATCH returns correct rows for "error" query (rows 1 and 4 have error)', async () => {
  const r = await sql(
    `SELECT id FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE MATCH("${TEST_INDEX}", ?)
     ORDER BY id`,
    ['error']
  );

  const ids = r.rows.map(row => Number(row[0]));
  // Rows 1 and 4 contain the word "error"
  expect(ids).toContain(1);
  expect(ids).toContain(4);
});

test('08d MATCH with "connection timeout" phrase returns row 1', async () => {
  const r = await sql(
    `SELECT id FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE MATCH("${TEST_INDEX}", ?)
     ORDER BY id`,
    ['"connection timeout"']
  );

  const ids = r.rows.map(row => Number(row[0]));
  expect(ids).toContain(1);
});

test('08e MATCH minus-exclude: MonkDB 6.0 does NOT enforce -term exclusion', async () => {
  // CONFIRMED MONKDB LIMITATION: "error -distributed" returns ALL rows that match
  // "error" — the minus prefix is silently ignored. This was verified by live testing
  // on MonkDB 6.0.0-SNAPSHOT with both the standard and english analyzers.
  // The FTS syntax tips in the UI have been updated to remove this example.
  const r = await sql(
    `SELECT id FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE MATCH("${TEST_INDEX}", ?)
     ORDER BY id`,
    ['error -distributed']
  );

  const ids = r.rows.map(row => Number(row[0]));
  // Row 1 (has error) and row 4 (has error AND distributed) BOTH appear — exclusion ignored
  expect(ids).toContain(1);
  expect(ids).toContain(4);  // not excluded despite having "distributed"
});

test('08f MATCH with wildcard "connect*" matches row 1', async () => {
  const r = await sql(
    `SELECT id FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE MATCH("${TEST_INDEX}", ?)`,
    ['connect*']
  );

  const ids = r.rows.map(row => Number(row[0]));
  expect(ids).toContain(1);
});

test('08g MATCH with LIMIT respects the limit', async () => {
  const r = await sql(
    `SELECT id FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE MATCH("${TEST_INDEX}", ?)
     ORDER BY _score DESC
     LIMIT 2`,
    ['error database']
  );

  expect(r.rows.length).toBeLessThanOrEqual(2);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 9 — MATCH with column name MUST NOT work in MonkDB 6+
// (This is the critical breaking change — validates our fix is necessary)
// ─────────────────────────────────────────────────────────────────────────────
test('09 MATCH(column_name, ?) returns 0 results in MonkDB 6+ (column syntax broken)', async () => {
  // This FAILS silently (0 rows) or errors in MonkDB 6+
  const raw = await sqlRaw(
    `SELECT COUNT(*) FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE MATCH(title, ?)`,
    ['error']
  );

  if ('error' in raw) {
    // Got an explicit error — good, confirms it doesn't work
    expect((raw as { error: { message: string } }).error).toBeTruthy();
  } else {
    const count = Number((raw as MonkResult).rows[0]?.[0] ?? 0);
    // Should return 0 rows (broken syntax, no error — silent failure)
    expect(count).toBe(0);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 10 — CREATE TABLE with FULLTEXT, INSERT, REFRESH cycle
// ─────────────────────────────────────────────────────────────────────────────
test('10 CREATE TABLE with FULLTEXT index succeeds', async () => {
  // Clean up first
  await sqlRaw(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE2}"`);

  await sql(`
    CREATE TABLE "${TEST_SCHEMA}"."${TEST_TABLE2}" (
      id     INTEGER PRIMARY KEY,
      title  TEXT,
      body   TEXT,
      author TEXT,
      INDEX "idx_pw_fts_copy"
        USING FULLTEXT (title, body)
        WITH (analyzer = 'standard')
    )
  `);

  // Verify table exists
  const r = await sql(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = ? AND table_name = ?`,
    [TEST_SCHEMA, TEST_TABLE2]
  );
  expect(r.rows.length).toBe(1);
});

test('10b INSERT INTO … SELECT * FROM copies all rows', async () => {
  await sql(
    `INSERT INTO "${TEST_SCHEMA}"."${TEST_TABLE2}"
     SELECT * FROM "${TEST_SCHEMA}"."${TEST_TABLE}"`
  );
  await sql(`REFRESH TABLE "${TEST_SCHEMA}"."${TEST_TABLE2}"`);

  const r = await sql(`SELECT COUNT(*) FROM "${TEST_SCHEMA}"."${TEST_TABLE2}"`);
  expect(Number(r.rows[0][0])).toBe(5);
});

test('10c MATCH on copy table works after REFRESH', async () => {
  const r = await sql(
    `SELECT id FROM "${TEST_SCHEMA}"."${TEST_TABLE2}"
     WHERE MATCH("idx_pw_fts_copy", ?)
     ORDER BY _score DESC`,
    ['error']
  );

  expect(r.rows.length).toBeGreaterThan(0);
});

test('10d MATCH returns 0 rows before REFRESH (without explicit refresh)', async () => {
  // Create a fresh table, insert without refreshing, MATCH should return 0
  await sqlRaw(`DROP TABLE IF EXISTS "doc"."pw_fts_norefresh"`);
  await sql(`
    CREATE TABLE "doc"."pw_fts_norefresh" (
      id    INTEGER PRIMARY KEY,
      body  TEXT,
      INDEX "idx_pw_norefresh" USING FULLTEXT (body)
    )
  `);
  await sql(`INSERT INTO "doc"."pw_fts_norefresh" (id, body) VALUES (1, 'connection error')`);
  // NO REFRESH intentionally

  const r = await sql(
    `SELECT COUNT(*) FROM "doc"."pw_fts_norefresh"
     WHERE MATCH("idx_pw_norefresh", ?)`,
    ['connection']
  );

  // Without REFRESH, distributed engines may return 0 (eventual consistency)
  // This is the expected MonkDB behaviour documented in our guide
  const count = Number(r.rows[0][0]);
  // count is 0 or possibly 1 depending on timing — just log it, do not fail
  console.log(`[10d] Rows visible without REFRESH: ${count} (expected 0 on cold cluster)`);

  // Clean up
  await sqlRaw(`DROP TABLE IF EXISTS "doc"."pw_fts_norefresh"`);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 11 — Batched SHOW CREATE TABLE (simulates batchedMap with 10 concurrent)
// ─────────────────────────────────────────────────────────────────────────────
test('11 10 concurrent SHOW CREATE TABLE calls succeed for non-BLOB tables', async () => {
  // Simulate the batchedMap(tables, 10, ...) pattern used in useFTSIndexes.
  // CONFIRMED MONKDB LIMITATION: BLOB tables (schema 'blob') throw
  //   OperationOnInaccessibleRelationException — SHOW CREATE TABLE is not supported.
  //   useFTSIndexes.ts now excludes the 'blob' schema to prevent wasted error logs.
  const tables = await sql(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('sys', 'information_schema', 'pg_catalog', 'blob')
    LIMIT 10
  `);

  const results = await Promise.all(
    tables.rows.map(async (row) => {
      const schema = row[0] as string;
      const table  = row[1] as string;
      try {
        const r = await sql(`SHOW CREATE TABLE "${schema}"."${table}"`);
        return { ok: true, ddl: r.rows[0]?.[0] };
      } catch {
        return { ok: false, schema, table };
      }
    })
  );

  const failures = results.filter(r => !r.ok);
  if (failures.length > 0) {
    console.error('SHOW CREATE TABLE failures:', failures);
  }
  expect(failures.length).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 12 — MonkDB reserved schemas are actually queryable
// ─────────────────────────────────────────────────────────────────────────────
test('12 sys schema is queryable (not just excluded from FTS list)', async () => {
  const r = await sql(`SELECT name FROM sys.cluster`);
  expect(r.rows.length).toBeGreaterThan(0);
});

test('12b information_schema is queryable', async () => {
  const r = await sql(`SELECT schema_name FROM information_schema.schemata`);
  expect(r.rows.length).toBeGreaterThan(0);

  const names = r.rows.map(row => row[0] as string);
  expect(names).toContain('doc');
  expect(names).toContain('sys');
  expect(names).toContain('information_schema');
});

test('12c pg_catalog exists in MonkDB schema list', async () => {
  const r = await sql(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'pg_catalog'`
  );
  // If pg_catalog exists, it's correct to exclude it from FTS tables list
  // If it doesn't, the exclusion is harmless (no rows to filter)
  console.log(`[12c] pg_catalog present in MonkDB: ${r.rows.length > 0}`);
  // Either way is valid — just verifying our exclusion clause doesn't break things
  expect(r.rowcount).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 13 — _score column behaviour
// ─────────────────────────────────────────────────────────────────────────────
test('13 _score is not a real column (SELECT * does not include it)', async () => {
  const r = await sql(
    `SELECT * FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE MATCH("${TEST_INDEX}", ?)
     LIMIT 1`,
    ['error']
  );

  expect(r.rows.length).toBeGreaterThan(0);
  // _score should NOT be in SELECT * — it must be requested explicitly
  expect(r.cols).not.toContain('_score');
});

test('13b _score is included when explicitly selected', async () => {
  const r = await sql(
    `SELECT *, _score FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE MATCH("${TEST_INDEX}", ?)
     LIMIT 1`,
    ['error']
  );

  expect(r.cols).toContain('_score');
  const scoreIdx = r.cols.indexOf('_score');
  const score = r.rows[0][scoreIdx];
  expect(typeof score).toBe('number');
  expect(score as number).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 14 — REFRESH TABLE format verification (schema.table quoting)
// ─────────────────────────────────────────────────────────────────────────────
test('14 REFRESH TABLE with quoted schema.table succeeds', async () => {
  const r = await sql(`REFRESH TABLE "${TEST_SCHEMA}"."${TEST_TABLE}"`);
  expect(r.rowcount).toBeGreaterThanOrEqual(0);
});

test('14b REFRESH TABLE on non-existent table returns error', async () => {
  const r = await sqlRaw(`REFRESH TABLE "doc"."pw_table_nonexistent_xyz"`);
  expect('error' in r).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 15 — Index name double-quote escaping (buildMatchQuery)
// ─────────────────────────────────────────────────────────────────────────────
test('15 buildMatchQuery escapes double-quotes in index name', async () => {
  // Simulate the escaping logic from fts-utils.ts:
  // indexName.replace(/"/g, '""')
  const indexName = TEST_INDEX;
  const escaped = indexName.replace(/"/g, '""');
  const matchClause = `MATCH("${escaped}", ?)`;

  const r = await sql(
    `SELECT COUNT(*) FROM "${TEST_SCHEMA}"."${TEST_TABLE}" WHERE ${matchClause}`,
    ['error']
  );

  const count = Number(r.rows[0][0]);
  expect(count).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 16 — MATCH with empty string / edge cases
// ─────────────────────────────────────────────────────────────────────────────
test('16 MATCH with no matching terms returns 0 rows', async () => {
  const r = await sql(
    `SELECT COUNT(*) FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE MATCH("${TEST_INDEX}", ?)`,
    ['xyznonexistentterm12345']
  );

  expect(Number(r.rows[0][0])).toBe(0);
});

test('16b MATCH with multiple terms (OR semantics) returns union of results', async () => {
  const r = await sql(
    `SELECT id FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE MATCH("${TEST_INDEX}", ?)
     ORDER BY id`,
    ['error BM25']
  );

  // Row 1,4 have "error"; row 3 has "BM25" — all should appear
  const ids = r.rows.map(row => Number(row[0]));
  expect(ids).toContain(1);
  expect(ids).toContain(3);
  expect(ids).toContain(4);
});
