# Test Group 05 — KNN Search Results
**Tests**: 05, 05b, 05c, 05d (4 tests)
**Purpose**: Execute an actual KNN search against MonkDB and verify the result display — count, content, score percentage, and score progress bar.

---

## runKNNSearch() — Helper Used in All Tests

```
1. Fill textarea with QUERY_VEC_STR ([1.0, 0.0, 0.0 × 382])
2. Click button matching /^Search$/
3. Wait for networkidle
4. Wait 1.5 seconds (MonkDB write visibility delay)
```

---

## Test 05 — Searching with valid vector returns results

**What it verifies**: A KNN search against the 3-document test table returns at least 1 result.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`:
   - Fill `[1.0, 0.0, … 0.0]` (384D) into textarea
   - Click Search
   - Wait for networkidle + 1.5s

### Assertions
- Text matching `/\d+\s+result/i` (e.g., "3 results", "1 result") is visible within 10 seconds

### Notes
- MonkDB KNN query: `SELECT *, _score FROM "doc"."pw_vec_ui" WHERE knn_match("embedding", ?, 5) ORDER BY _score DESC`
- With k=5 and 3 documents, all 3 should be returned

---

## Test 05b — Result rows show content text

**What it verifies**: Each result row displays the human-readable content from the `content` column.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`

### Assertions
- Text matching `/First axis|Orthogonal|Near first/i` is visible within 10 seconds

### Notes
- Matches any of the three inserted content values:
  - "First axis vector document" (id=1, most similar to QUERY_VEC)
  - "Orthogonal vector document" (id=2, least similar)
  - "Near first axis document" (id=3, close to id=1)

---

## Test 05c — Result rows show a score percentage

**What it verifies**: Each result row displays the similarity score formatted as a percentage (e.g., `"100.0%"`).

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`

### Assertions
- Text matching `/\d+\.\d+%/` (e.g., "100.0%", "33.3%") is visible within 10 seconds

### Notes
- Score display: `(result.score * 100).toFixed(1) + "%"`
- VEC1 searched against VEC1 → score ~1.0 → "100.0%"
- `vector_similarity` is not true cosine; orthogonal vectors return ~0.33, not 0.0

---

## Test 05d — Score progress bar is rendered inside result rows

**What it verifies**: Each result row shows a visual progress bar (filled portion in blue) representing the score magnitude.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`

### Assertions
- `page.locator('.bg-blue-500').first()` is visible within 10 seconds

### Notes
- The progress bar markup:
  ```html
  <div class="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
    <div class="h-full bg-blue-500 rounded-full" style="width: {score*100}%"></div>
  </div>
  ```
- The inner `.bg-blue-500` div has a dynamic `width` style — its width is `> 0` for all real results
