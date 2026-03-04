# Test Group 06 — Similarity Search Mode
**Tests**: 06 (1 test)
**Purpose**: Verify that switching from KNN to Vector Similarity search mode also returns valid results.

---

## Test 06 — Switching to Vector Similarity and searching returns results

**What it verifies**: The `similarity` search mode (`vector_similarity`) produces results just like KNN mode.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Select `"similarity"` option in the search-type `<select>` element
4. Fill textarea with `QUERY_VEC_STR`
5. Click Search button (matching `/^Search$/`)
6. Wait for `networkidle` + 1.5 seconds

### Assertions
- Text matching `/\d+\s+result/i` is visible within 10 seconds

### Notes

**KNN vs Similarity — different SQL generated:**

| Mode        | SQL Pattern                                                                                 |
|-------------|---------------------------------------------------------------------------------------------|
| KNN         | `WHERE knn_match("embedding", ?, 5) ORDER BY _score DESC`                                   |
| Similarity  | `SELECT *, vector_similarity("embedding", ?) AS _score WHERE 1=1 ORDER BY _score DESC LIMIT 5` |

**MonkDB `vector_similarity` behaviour:**
- Returns a cosine-like score in range [0, 1]
- Orthogonal vectors (VEC1 · VEC2 = 0) return ~0.33, **not** 0.0 — this is by design
- `knn_match` k literal must be an integer constant (cannot use `?` placeholder)
