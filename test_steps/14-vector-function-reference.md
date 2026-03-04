# Test Group 14 — Vector Function Reference Panel
**Tests**: 14, 14b, 14c (3 tests)
**Purpose**: Verify the right-panel static reference section for MonkDB vector SQL functions is rendered and contains the expected code examples.

---

## Test 14 — Vector Functions reference panel is visible

**What it verifies**: The right panel contains a "Vector Functions" heading for the SQL reference section.

### Steps
1. `goToVectorOps(page)`

### Assertions
- `getByText('Vector Functions')` is visible within 8 seconds

---

## Test 14b — KNN Search and Similarity Score code blocks are shown

**What it verifies**: The reference panel shows both the KNN and Similarity function examples with their section labels.

### Steps
1. `goToVectorOps(page)`

### Assertions
- `getByText('KNN Search').first()` is visible within 8 seconds
- `getByText('Similarity Score').first()` is visible within 8 seconds

### Notes
- Uses `.first()` because "KNN Search" might appear in multiple places (tab labels, history entries, section headings)

---

## Test 14c — SQL reference shows knn_match and vector_similarity functions

**What it verifies**: The actual function names appear somewhere on the page in the reference code examples.

### Steps
1. `goToVectorOps(page)`
2. `page.evaluate(() => document.body.innerText)` — get all visible text

### Assertions
- Page text contains `"knn_match"`
- Page text contains `"vector_similarity"`

### Notes
**Reference SQL snippets shown:**
```sql
-- KNN Search
SELECT *, _score FROM "schema"."table"
WHERE knn_match("embedding_col", [0.1, ...], 10)
ORDER BY _score DESC

-- Similarity Score
SELECT *, vector_similarity("embedding_col", [0.1, ...]) AS _score
FROM "schema"."table"
ORDER BY _score DESC LIMIT 10
```

These are static code blocks rendered in the right panel of the Vector Ops page, helping users understand how to write their own queries.
