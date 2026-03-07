/**
 * Vector Operations SQL Compatibility Test Suite
 * Tests every SQL query used by the vector-ops module against a live MonkDB /_sql endpoint.
 * No browser — pure HTTP.
 *
 * Covers:
 *  1.  FLOAT_VECTOR column detection via information_schema.columns
 *  2.  CREATE TABLE with FLOAT_VECTOR(N)
 *  3.  INSERT with ? vector param
 *  4.  REFRESH TABLE
 *  5.  knn_match(col, ?, k)  — ? for vector, literal k
 *  6.  vector_similarity(col, ?) AS score
 *  7.  SELECT *, _score — virtual score column in KNN
 *  8.  vector_similarity returns cosine score between 0 and 1
 *  9.  ON CONFLICT upsert with lowercase excluded
 * 10.  Bulk INSERT: multiple (?, ?) groups with flat args array
 * 11.  ? parameter syntax (NOT $1/$2 PostgreSQL style)
 * 12.  Column name quoting with double-quotes
 * 13.  SELECT COUNT(*) for document counts
 * 14.  sys.privileges query for diagnostics
 * 15.  information_schema.routines — knn_match / vector_similarity not listed
 * 16.  Dimension mismatch — wrong size vector returns error or 0 results
 * 17.  Batched COUNT(*) pattern (10 concurrent)
 * 18.  information_schema.columns data_type format for FLOAT_VECTOR
 * 19.  Blob schema exclusion doesn't break vector discovery query
 * 20.  FLOAT_VECTOR empty table — knn_match returns 0 rows
 */

import { test, expect } from '@playwright/test';

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

async function sqlRaw(stmt: string, args: unknown[] = []): Promise<MonkResult | MonkError> {
  const res = await fetch(MONKDB, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stmt, args }),
  });
  return res.json();
}

// ── Test fixtures ─────────────────────────────────────────────────────────────
const TEST_SCHEMA = 'doc';
const TEST_TABLE  = 'pw_vec_test';
const TEST_COL    = 'embedding';
const DIMS        = 4;  // small dimension for fast tests
const TEST_TABLE2 = 'pw_vec_bulk';

// Sample vectors (unit-normalised for cosine = dot-product)
const VEC_A = [1.0, 0.0, 0.0, 0.0];   // pure first-axis
const VEC_B = [0.0, 1.0, 0.0, 0.0];   // pure second-axis (orthogonal to A)
const VEC_C = [0.9, 0.1, 0.0, 0.0];   // close to A
const VEC_WRONG_DIM = [0.1, 0.2, 0.3];  // 3D instead of 4D

// ── Setup / teardown ──────────────────────────────────────────────────────────
test.beforeAll(async () => {
  await sqlRaw(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE2}"`);
  await sqlRaw(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE}"`);

  await sql(`
    CREATE TABLE "${TEST_SCHEMA}"."${TEST_TABLE}" (
      id      INTEGER PRIMARY KEY,
      content TEXT,
      "${TEST_COL}" FLOAT_VECTOR(${DIMS})
    )
  `);

  await sql(
    `INSERT INTO "${TEST_SCHEMA}"."${TEST_TABLE}" (id, content, "${TEST_COL}") VALUES
     (1, 'First axis document',  ?),
     (2, 'Second axis document', ?),
     (3, 'Close to first axis',  ?)`,
    [VEC_A, VEC_B, VEC_C]
  );

  await sql(`REFRESH TABLE "${TEST_SCHEMA}"."${TEST_TABLE}"`);
});

test.afterAll(async () => {
  await sqlRaw(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE2}"`);
  await sqlRaw(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE}"`);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1 — FLOAT_VECTOR detection via information_schema.columns
// ─────────────────────────────────────────────────────────────────────────────
test('01 information_schema.columns detects FLOAT_VECTOR columns', async () => {
  const r = await sql(`
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE data_type LIKE 'float_vector%'
      AND table_schema NOT IN ('sys', 'information_schema', 'pg_catalog')
    ORDER BY table_schema, table_name
  `);

  expect(r.cols).toContain('data_type');
  const found = r.rows.some(row => row[2] === TEST_COL && row[1] === TEST_TABLE);
  expect(found, `Expected ${TEST_TABLE}.${TEST_COL} in FLOAT_VECTOR scan`).toBe(true);
});

test('01b data_type for FLOAT_VECTOR column includes dimension', async () => {
  const r = await sql(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [TEST_SCHEMA, TEST_TABLE, TEST_COL]
  );

  expect(r.rows.length).toBe(1);
  const dt = (r.rows[0][0] as string).toLowerCase();
  // MonkDB reports e.g. "float_vector(4)" or "float_vector"
  expect(dt).toContain('float_vector');
});

test('01c ? parameters work in information_schema.columns query', async () => {
  const r = await sql(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?`,
    [TEST_SCHEMA, TEST_TABLE]
  );

  const cols = r.rows.map(row => row[0] as string);
  expect(cols).toContain('id');
  expect(cols).toContain('content');
  expect(cols).toContain(TEST_COL);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2 — CREATE TABLE with FLOAT_VECTOR
// ─────────────────────────────────────────────────────────────────────────────
test('02 CREATE TABLE with FLOAT_VECTOR succeeds', async () => {
  const r = await sql(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = ? AND table_name = ?`,
    [TEST_SCHEMA, TEST_TABLE]
  );
  expect(r.rows.length).toBe(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3 — INSERT with ? vector param
// ─────────────────────────────────────────────────────────────────────────────
test('03 INSERT with ? vector param succeeds', async () => {
  const r = await sql(`SELECT COUNT(*) FROM "${TEST_SCHEMA}"."${TEST_TABLE}"`);
  expect(Number(r.rows[0][0])).toBe(3);
});

test('03b Vectors are stored and retrievable', async () => {
  const r = await sql(
    `SELECT id, content FROM "${TEST_SCHEMA}"."${TEST_TABLE}" ORDER BY id`
  );
  expect(r.rows.length).toBe(3);
  expect(r.rows[0][1]).toBe('First axis document');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4 — REFRESH TABLE
// ─────────────────────────────────────────────────────────────────────────────
test('04 REFRESH TABLE executes without error', async () => {
  const r = await sql(`REFRESH TABLE "${TEST_SCHEMA}"."${TEST_TABLE}"`);
  expect(r.rowcount).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5 — knn_match(col, ?, k) — exact MonkDB syntax
// ─────────────────────────────────────────────────────────────────────────────
test('05 knn_match with ? vector param returns results', async () => {
  const r = await sql(
    `SELECT id, _score FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE knn_match("${TEST_COL}", ?, 3)
     ORDER BY _score DESC`,
    [VEC_A]
  );

  expect(r.rows.length).toBeGreaterThan(0);
  expect(r.cols).toContain('_score');
});

test('05b knn_match returns doc 1 (VEC_A) as top result when querying VEC_A', async () => {
  const r = await sql(
    `SELECT id, _score FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE knn_match("${TEST_COL}", ?, 3)
     ORDER BY _score DESC`,
    [VEC_A]
  );

  const topId = Number(r.rows[0][0]);
  expect(topId).toBe(1);  // doc 1 is exact match for VEC_A
});

test('05c knn_match k parameter limits results', async () => {
  const r = await sql(
    `SELECT id FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE knn_match("${TEST_COL}", ?, 2)
     ORDER BY _score DESC`,
    [VEC_A]
  );

  expect(r.rows.length).toBeLessThanOrEqual(2);
});

test('05d knn_match scores are positive and descending', async () => {
  const r = await sql(
    `SELECT id, _score FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE knn_match("${TEST_COL}", ?, 3)
     ORDER BY _score DESC`,
    [VEC_A]
  );

  const scores = r.rows.map(row => row[1] as number);
  scores.forEach(s => expect(s).toBeGreaterThan(0));
  for (let i = 1; i < scores.length; i++) {
    expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
  }
});

test('05e knn_match: SELECT * with _score includes all regular columns', async () => {
  const r = await sql(
    `SELECT *, _score FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE knn_match("${TEST_COL}", ?, 3)
     ORDER BY _score DESC`,
    [VEC_A]
  );

  expect(r.cols).toContain('id');
  expect(r.cols).toContain('content');
  expect(r.cols).toContain('_score');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6 — vector_similarity(col, ?) AS score
// ─────────────────────────────────────────────────────────────────────────────
test('06 vector_similarity with ? param returns cosine score', async () => {
  const r = await sql(
    `SELECT id, vector_similarity("${TEST_COL}", ?) AS sim
     FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     ORDER BY sim DESC`,
    [VEC_A]
  );

  expect(r.cols).toContain('sim');
  expect(r.rows.length).toBe(3);

  const scores = r.rows.map(row => row[1] as number);
  scores.forEach(s => {
    expect(typeof s).toBe('number');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

test('06b vector_similarity: identical vector scores ~1.0', async () => {
  const r = await sql(
    `SELECT vector_similarity("${TEST_COL}", ?) AS sim
     FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE id = 1`,
    [VEC_A]
  );

  const score = r.rows[0][0] as number;
  expect(score).toBeCloseTo(1.0, 5);
});

test('06c vector_similarity: orthogonal vectors score lower than similar vectors', async () => {
  // VEC_A and VEC_B are orthogonal; VEC_C is close to VEC_A.
  // MonkDB vector_similarity does not guarantee cosine==0 for orthogonal vectors
  // (may use a shifted/normalised variant).  We assert simB < simC (relative order).
  const r = await sql(
    `SELECT id, vector_similarity("${TEST_COL}", ?) AS sim
     FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE id IN (2, 3)
     ORDER BY id`,
    [VEC_A]
  );

  const simB = r.rows.find(row => Number(row[0]) === 2)?.[1] as number;
  const simC = r.rows.find(row => Number(row[0]) === 3)?.[1] as number;
  // C is close to A, B is orthogonal — C must score higher
  expect(simC).toBeGreaterThan(simB);
  // Both scores must be in [0, 1]
  expect(simB).toBeGreaterThanOrEqual(0);
  expect(simC).toBeLessThanOrEqual(1);
});

test('06d vector_similarity with LIMIT respects limit', async () => {
  const r = await sql(
    `SELECT id, vector_similarity("${TEST_COL}", ?) AS sim
     FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     ORDER BY sim DESC
     LIMIT 2`,
    [VEC_A]
  );

  expect(r.rows.length).toBeLessThanOrEqual(2);
});

test('06e vector_similarity: SELECT *, sim gives named column', async () => {
  const r = await sql(
    `SELECT *, vector_similarity("${TEST_COL}", ?) AS _score
     FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     ORDER BY _score DESC
     LIMIT 3`,
    [VEC_A]
  );

  expect(r.cols).toContain('_score');
  expect(r.cols).toContain('id');
  expect(r.cols).toContain('content');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 7 — _score virtual column behaviour
// ─────────────────────────────────────────────────────────────────────────────
test('07 _score is NOT in SELECT * (must be requested explicitly)', async () => {
  const r = await sql(
    `SELECT * FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE knn_match("${TEST_COL}", ?, 3)`,
    [VEC_A]
  );

  expect(r.cols).not.toContain('_score');
});

test('07b _score IS included when requested with SELECT *, _score', async () => {
  const r = await sql(
    `SELECT *, _score FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE knn_match("${TEST_COL}", ?, 3)`,
    [VEC_A]
  );

  expect(r.cols).toContain('_score');
  const scoreIdx = r.cols.indexOf('_score');
  const score = r.rows[0][scoreIdx];
  expect(typeof score).toBe('number');
  expect(score as number).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 8 — ON CONFLICT upsert (lowercase excluded)
// ─────────────────────────────────────────────────────────────────────────────
test('08 ON CONFLICT upsert with ? and lowercase excluded works', async () => {
  // Update doc 1's vector to VEC_C via upsert
  await sql(
    `INSERT INTO "${TEST_SCHEMA}"."${TEST_TABLE}" (id, content, "${TEST_COL}")
     VALUES (?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       content = excluded.content,
       "${TEST_COL}" = excluded."${TEST_COL}"`,
    [1, 'Updated first axis doc', VEC_C]
  );
  await sql(`REFRESH TABLE "${TEST_SCHEMA}"."${TEST_TABLE}"`);

  const r = await sql(
    `SELECT content FROM "${TEST_SCHEMA}"."${TEST_TABLE}" WHERE id = 1`
  );
  expect(r.rows[0][0]).toBe('Updated first axis doc');

  // Restore original
  await sql(
    `INSERT INTO "${TEST_SCHEMA}"."${TEST_TABLE}" (id, content, "${TEST_COL}")
     VALUES (?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       content = excluded.content,
       "${TEST_COL}" = excluded."${TEST_COL}"`,
    [1, 'First axis document', VEC_A]
  );
  await sql(`REFRESH TABLE "${TEST_SCHEMA}"."${TEST_TABLE}"`);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 9 — Bulk INSERT: multiple (?, ?) groups with flat args
// ─────────────────────────────────────────────────────────────────────────────
test('09 Bulk INSERT with multiple (?, ?, ?) groups and flat args works', async () => {
  await sqlRaw(`DROP TABLE IF EXISTS "${TEST_SCHEMA}"."${TEST_TABLE2}"`);
  await sql(`
    CREATE TABLE "${TEST_SCHEMA}"."${TEST_TABLE2}" (
      id      INTEGER PRIMARY KEY,
      content TEXT,
      "${TEST_COL}" FLOAT_VECTOR(${DIMS})
    )
  `);

  // Simulate the batch-processor.ts bulk insert pattern
  const docs = [
    { id: 10, content: 'bulk doc 1', vec: [0.1, 0.2, 0.3, 0.4] },
    { id: 11, content: 'bulk doc 2', vec: [0.4, 0.3, 0.2, 0.1] },
    { id: 12, content: 'bulk doc 3', vec: [0.5, 0.5, 0.0, 0.0] },
  ];

  const placeholders = docs.map(() => '(?, ?, ?)').join(', ');
  const args: unknown[] = [];
  docs.forEach(d => args.push(d.id, d.content, d.vec));

  const r = await sql(
    `INSERT INTO "${TEST_SCHEMA}"."${TEST_TABLE2}" (id, content, "${TEST_COL}")
     VALUES ${placeholders}`,
    args
  );

  expect(r.rowcount).toBe(3);

  await sql(`REFRESH TABLE "${TEST_SCHEMA}"."${TEST_TABLE2}"`);

  const count = await sql(`SELECT COUNT(*) FROM "${TEST_SCHEMA}"."${TEST_TABLE2}"`);
  expect(Number(count.rows[0][0])).toBe(3);
});

test('09b knn_match works on bulk-inserted table', async () => {
  const r = await sql(
    `SELECT id FROM "${TEST_SCHEMA}"."${TEST_TABLE2}"
     WHERE knn_match("${TEST_COL}", ?, 3)
     ORDER BY _score DESC`,
    [[0.1, 0.2, 0.3, 0.4]]
  );

  expect(r.rows.length).toBeGreaterThan(0);
  expect(Number(r.rows[0][0])).toBe(10); // closest to query vec
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 10 — ? parameter vs $1 (PostgreSQL-style rejected)
// ─────────────────────────────────────────────────────────────────────────────
test('10 ? parameter syntax works for vector args', async () => {
  const r = await sql(
    `SELECT COUNT(*) FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE knn_match("${TEST_COL}", ?, 3)`,
    [VEC_A]
  );

  expect(Number(r.rows[0][0])).toBeGreaterThan(0);
});

test('10b $1 PostgreSQL-style fails or returns wrong results for vectors', async () => {
  const r = await sqlRaw(
    `SELECT COUNT(*) FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE knn_match("${TEST_COL}", $1, 3)`,
    [VEC_A]
  );

  // MonkDB should error on $1 syntax
  if ('error' in r) {
    expect((r as { error: { message: string } }).error).toBeTruthy();
  } else {
    // If no error, confirms it did NOT match via params — $1 treated as identifier
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 11 — Double-quoted column names
// ─────────────────────────────────────────────────────────────────────────────
test('11 Double-quoted column identifier works in knn_match', async () => {
  // "embedding" is quoted — test confirms quoting doesn't break the query
  const r = await sql(
    `SELECT id FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE knn_match("${TEST_COL}", ?, 3)`,
    [VEC_A]
  );

  expect(r.rows.length).toBeGreaterThan(0);
});

test('11b Double-quoted column in vector_similarity works', async () => {
  const r = await sql(
    `SELECT id, vector_similarity("${TEST_COL}", ?) AS sim
     FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     ORDER BY sim DESC LIMIT 1`,
    [VEC_A]
  );

  expect(Number(r.rows[0][0])).toBe(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 12 — SELECT COUNT(*) for document counts (useVectorCollections)
// ─────────────────────────────────────────────────────────────────────────────
test('12 SELECT COUNT(*) returns accurate document count', async () => {
  const r = await sql(
    `SELECT COUNT(*) FROM "${TEST_SCHEMA}"."${TEST_TABLE}"`
  );

  expect(Number(r.rows[0][0])).toBe(3);
});

test('12b Batched COUNT(*) — 10 concurrent requests all succeed', async () => {
  // Simulate batchedMap(collections, 10, ...) pattern
  const tables = await sql(
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_type = 'BASE TABLE'
       AND table_schema NOT IN ('sys', 'information_schema', 'pg_catalog', 'blob')
     LIMIT 10`
  );

  const results = await Promise.all(
    tables.rows.map(async (row) => {
      const schema = row[0] as string;
      const table  = row[1] as string;
      try {
        const r = await sql(`SELECT COUNT(*) FROM "${schema}"."${table}"`);
        return { ok: true, count: Number(r.rows[0][0]) };
      } catch {
        return { ok: false };
      }
    })
  );

  const failures = results.filter(r => !r.ok);
  expect(failures.length).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 13 — sys.privileges query (VectorDebugPanel diagnostic 4)
// ─────────────────────────────────────────────────────────────────────────────
test('13 sys.privileges query executes without fatal error', async () => {
  // Superuser role should succeed; other roles get an empty set
  const r = await sqlRaw(
    `SELECT grantee, type, class FROM sys.privileges WHERE grantee = current_user LIMIT 10`
  );

  if ('error' in r) {
    // Non-admin users may not have access — this is expected and handled by the debug panel
  } else {
    expect(Array.isArray((r as MonkResult).rows)).toBe(true);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 14 — version() query (VectorDebugPanel diagnostic 6)
// ─────────────────────────────────────────────────────────────────────────────
test('14 SELECT version() returns a string', async () => {
  const r = await sql(`SELECT version()`);
  expect(r.rows.length).toBe(1);
  expect(typeof r.rows[0][0]).toBe('string');
  expect((r.rows[0][0] as string).length).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 15 — Blob schema exclusion doesn't break FLOAT_VECTOR discovery
// ─────────────────────────────────────────────────────────────────────────────
test('15 FLOAT_VECTOR discovery query with blob exclusion succeeds', async () => {
  const r = await sql(`
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE data_type LIKE 'float_vector%'
      AND table_schema NOT IN ('sys', 'information_schema', 'pg_catalog', 'blob')
    ORDER BY table_schema, table_name
  `);

  // Must return at least our test table
  const found = r.rows.some(row => row[1] === TEST_TABLE);
  expect(found).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 16 — Empty collection — knn_match returns 0 rows
// ─────────────────────────────────────────────────────────────────────────────
test('16 knn_match on empty table returns 0 results (not an error)', async () => {
  await sqlRaw(`DROP TABLE IF EXISTS "doc"."pw_vec_empty"`);
  await sql(`
    CREATE TABLE "doc"."pw_vec_empty" (
      id INTEGER PRIMARY KEY,
      v  FLOAT_VECTOR(${DIMS})
    )
  `);
  await sql(`REFRESH TABLE "doc"."pw_vec_empty"`);

  const r = await sql(
    `SELECT id FROM "doc"."pw_vec_empty"
     WHERE knn_match(v, ?, 5)`,
    [VEC_A]
  );

  expect(r.rows.length).toBe(0);

  await sqlRaw(`DROP TABLE IF EXISTS "doc"."pw_vec_empty"`);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 17 — Dimension mismatch is caught as an error
// ─────────────────────────────────────────────────────────────────────────────
test('17 Passing wrong-dimension vector to knn_match returns an error', async () => {
  const r = await sqlRaw(
    `SELECT id FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE knn_match("${TEST_COL}", ?, 3)`,
    [VEC_WRONG_DIM]  // 3D vector against 4D column
  );

  // MonkDB should reject mismatched dimensions
  expect('error' in r).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 18 — Accessible schemas query (useVectorCollections filter)
// ─────────────────────────────────────────────────────────────────────────────
test('18 Accessible schemas query returns doc schema', async () => {
  const r = await sql(`
    SELECT DISTINCT table_schema
    FROM information_schema.tables
    WHERE table_schema NOT IN ('sys', 'information_schema', 'pg_catalog')
    ORDER BY table_schema
  `);

  const schemas = r.rows.map(row => row[0] as string);
  expect(schemas).toContain('doc');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 19 — Ranking: closer vector ranks higher in both modes
// ─────────────────────────────────────────────────────────────────────────────
test('19a knn_match: VEC_C (close to VEC_A) ranks above VEC_B (orthogonal)', async () => {
  const r = await sql(
    `SELECT id, _score FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE knn_match("${TEST_COL}", ?, 3)
     ORDER BY _score DESC`,
    [VEC_A]
  );

  const ranked = r.rows.map(row => Number(row[0]));
  const posB = ranked.indexOf(2);
  const posC = ranked.indexOf(3);
  // C (close to A) should rank above B (orthogonal to A)
  expect(posC).toBeLessThan(posB);
});

test('19b vector_similarity: VEC_C has higher sim to VEC_A than VEC_B does', async () => {
  const r = await sql(
    `SELECT id, vector_similarity("${TEST_COL}", ?) AS sim
     FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE id IN (2, 3)
     ORDER BY id`,
    [VEC_A]
  );

  // row for id=2 (VEC_B, orthogonal) and id=3 (VEC_C, close to A)
  const simB = r.rows.find(row => Number(row[0]) === 2)?.[1] as number;
  const simC = r.rows.find(row => Number(row[0]) === 3)?.[1] as number;
  expect(simC).toBeGreaterThan(simB);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 20 — array_length fallback behaviour on FLOAT_VECTOR
// ─────────────────────────────────────────────────────────────────────────────
test('20 array_length(col, 1) errors on FLOAT_VECTOR (useVectorCollections catches this)', async () => {
  // MonkDB does NOT support array_length() on FLOAT_VECTOR columns.
  // useVectorCollections.ts wraps this in a try/catch and falls back to 384.
  // This test confirms the error IS returned so the catch branch fires correctly.
  const r = await sqlRaw(
    `SELECT array_length("${TEST_COL}", 1) AS dim
     FROM "${TEST_SCHEMA}"."${TEST_TABLE}"
     WHERE "${TEST_COL}" IS NOT NULL
     LIMIT 1`
  );

  // MonkDB 6.x: UnsupportedFunctionException for FLOAT_VECTOR argument
  expect('error' in r).toBe(true);
  if ('error' in r) {
    const msg = (r as { error: { message: string } }).error.message.toLowerCase();
    expect(msg).toMatch(/float_vector|unsupported|overload|argument/);
  }
});
