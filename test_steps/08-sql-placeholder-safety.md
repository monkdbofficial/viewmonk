# Test Group 08 — SQL Placeholder Safety
**Tests**: 08 (1 test)
**Purpose**: Guarantee that no PostgreSQL-style `$1`, `$2`, ... placeholders appear in any SQL statement sent to MonkDB. MonkDB only supports `?` positional placeholders.

---

## Test 08 — No $1/$2 PostgreSQL placeholders in any SQL sent to MonkDB

**What it verifies**: Every SQL statement that the UI sends via `/api/monkdb/query` uses `?` placeholders, never `$N`.

### Steps
1. Intercept all requests to `**/api/monkdb/query` via `page.route()`
   - For each intercepted request, parse the JSON body and check `body.stmt` for `/\$\d/` pattern
   - Collect matching statements in `badStmts[]`
   - Continue the request (do not block)
2. `goToVectorOps(page)`
3. Wait 5 seconds for initial queries (hook fetches `information_schema.columns`)
4. If the test collection row is visible: click it to select
5. Wait for `networkidle`
6. Fill textarea with `QUERY_VEC_STR`
7. Click Search
8. Wait for `networkidle` + 1.5 seconds

### Assertions
- `badStmts` array has length 0

### Notes

**Why this matters:**
MonkDB's HTTP SQL API (`/_sql`) uses positional `?` placeholders:
```json
{ "stmt": "SELECT * FROM t WHERE id = ?", "args": [42] }
```
PostgreSQL-style `$1`, `$2` are not supported and would cause a syntax error in MonkDB.

**Common bug vector**: Copy-pasting SQL snippets from PostgreSQL documentation or using a library that defaults to `$N` syntax.

**Statements intercepted during a typical test run:**
- `information_schema.columns WHERE ...` (collection hook)
- `information_schema.key_column_usage JOIN ...` (PK detection)
- `SELECT *, _score FROM ... WHERE knn_match(?, ?, 5)` — but note: `k` is a literal, not `?`
- `SELECT *, vector_similarity(?, ?) AS _score FROM ...` (similarity mode)
