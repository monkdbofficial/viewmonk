# Test Group 13 — Query History
**Tests**: 13, 13b, 13c (3 tests)
**Purpose**: Verify the query history right-panel tab works correctly — shows a placeholder when empty, records searches with timing, and supports clearing.

---

## Test 13 — Query History panel shows "No searches yet" before any search

**What it verifies**: On a fresh page load with empty history, the History tab shows a placeholder message.

### Steps
1. `injectConnection(page)` (manually, without `goToVectorOps`)
2. Navigate to `/vector-ops`
3. `page.evaluate(() => localStorage.removeItem('monkdb-vector-history'))` — clear any history
4. Reload the page
5. Wait for `networkidle`

### Assertions
- "No searches yet" text is visible within 8 seconds

### Notes
- History key: `localStorage['monkdb-vector-history']`
- Test uses `page.evaluate` to clear after navigate (so init script runs on reload, not on initial go-to)
- The reload ensures the React state initialises from the cleared localStorage

---

## Test 13b — After a search, history shows the collection name and timing

**What it verifies**: Each completed search appends an entry to the History tab showing the collection name and query time in ms.

### Steps
1. `injectConnection(page)`
2. Navigate to `/vector-ops`
3. `page.evaluate(() => localStorage.removeItem('monkdb-vector-history'))` — clean slate
4. Wait for `networkidle`
5. `selectTestCollection(page)` — click `pw_vec_ui`
6. `runKNNSearch(page)` — fill vector, click Search, wait

### Assertions
- Text matching `/pw_vec_ui/i` **OR** `getByText('pw_vec_ui')` is visible within 10 seconds (history entry shows the collection)
- Text matching `/\d+ms/` is visible within 5 seconds (timing shows e.g. "57ms")

### Notes
- History entry format: `"pw_vec_ui — KNN (384D) — 57ms — 3 results"`
- The history is stored in localStorage and re-hydrated on next page load

---

## Test 13c — Clear history button appears and clears the list

**What it verifies**: After a search exists in history, a trash/clear button appears and clicking it resets history to empty.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)` — adds 1 entry to history

### Assertions (part 1 — before clear)
- `button[title="Clear history"]` is visible within 5 seconds

### Steps (continued)
4. Click `button[title="Clear history"]`

### Assertions (part 2 — after clear)
- "No searches yet" text is visible within 5 seconds
