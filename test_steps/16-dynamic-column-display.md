# Test Group 16 — Dynamic Column Display in Search Results
**Tests**: 16, 16b, 16c, 16d, 16e (5 tests)
**Purpose**: Verify the search result panel dynamically uses actual column names from the query response — not hardcoded `id/content/score` — and that client-side filtering works.

---

## Test 16 — Result toolbar shows column count hint after search

**What it verifies**: After a KNN search, the result toolbar shows a "N columns" hint, calculated from the actual columns returned by MonkDB.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`

### Assertions
- Text matching `/\d+\s+columns?/i` is visible within 10 seconds (e.g., "3 columns", "2 columns")

### Notes
- `pw_vec_ui` has columns: `id, content, embedding` → query returns `id, content, _score` (embedding filtered out) → 2 display columns + `_score` → toolbar shows "2 columns" or "3 columns" depending on implementation

---

## Test 16b — Result rows show column labels as `<dt>` elements (dynamic key-value)

**What it verifies**: Each result row renders a `<dl>` definition list where `<dt>` elements show the actual column names from the table schema.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`
4. Find all `dl dt` elements and read their text contents

### Assertions
- At least one `<dt>` element is visible within 10 seconds
- The collected labels include at least `"content"` or `"id"` (the test table's non-vector columns)

### Notes
**Result row HTML structure:**
```html
<dl class="space-y-0.5">
  <div class="flex gap-2 text-xs">
    <dt class="w-24 flex-shrink-0 font-mono text-gray-400 truncate pt-px">id</dt>
    <dd class="text-gray-800 dark:text-gray-200 break-words min-w-0">1</dd>
  </div>
  <div class="flex gap-2 text-xs">
    <dt>content</dt>
    <dd>First axis vector document</dd>
  </div>
</dl>
```
The columns are driven by `resultCols` (from `result.cols` after search), filtered to exclude `_score` and the vector column.

---

## Test 16c — Result rank numbers (#1, #2 ...) are shown

**What it verifies**: Each result row displays its rank in the result set as `#1`, `#2`, etc.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`

### Assertions
- `locator('text=#1').first()` is visible within 10 seconds

### Notes
- Rank is rendered as `<span class="text-xs text-gray-400">#{idx + 1}</span>` in the result row header

---

## Test 16d — Min score slider filters results client-side

**What it verifies**: After a search, moving the Min Score slider to 0.99 reduces visible results and shows a filter indicator.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)` — get results
4. Wait for "N results" text
5. Click "Advanced Filters"
6. Set range input to `"0.99"`, dispatch `'input'` event

### Assertions
- Either text matching `/\d+\/\d+\s+results?/i` (e.g., "1/3 results") is visible within 5 seconds
- OR text matching `/filtered by min score/i` is visible within 5 seconds

### Notes
- Orthogonal vectors (VEC2) return score ~0.33 via `knn_match` — they would be hidden at threshold 0.99
- VEC1 scored against VEC1 → ~1.0 → still shown at 0.99
- The client-side filter does NOT re-run the SQL; it filters the in-memory `results` array via `filteredResults = results.filter(r => r.score >= minScore)`

---

## Test 16e — WHERE clause filter is included in query (history shows "+ filter")

**What it verifies**: When a WHERE clause is entered in Advanced Filters, it is included in the SQL query, and the history entry reflects this with a `"+ filter"` annotation.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Advanced Filters"
4. Fill WHERE clause with `"id IS NOT NULL"`
5. Fill textarea with `QUERY_VEC_STR`
6. Click Search, wait for `networkidle` + 1.5s

### Assertions
- Text matching `/\+ filter/i` is visible within 10 seconds (in the history entry)

### Notes
**Generated SQL with WHERE clause:**
```sql
-- KNN mode
SELECT *, _score FROM "doc"."pw_vec_ui"
WHERE knn_match("embedding", ?, 5)
AND (id IS NOT NULL)
ORDER BY _score DESC

-- Similarity mode
SELECT *, vector_similarity("embedding", ?) AS _score FROM "doc"."pw_vec_ui"
WHERE 1=1 AND (id IS NOT NULL)
ORDER BY _score DESC LIMIT 5
```

The history entry label shows: `"KNN (384D) + filter"` when a WHERE clause is active.
