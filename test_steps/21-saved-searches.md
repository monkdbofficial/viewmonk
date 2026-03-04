# Test Group 21 — Saved Searches
**Tests**: 21, 21b, 21c, 21d, 21e (5 tests)
**Purpose**: Verify the bookmark/save-search feature — button appearance, label form, persistence to the Saved tab, Run Again functionality, and deletion.

---

## Architecture Notes

- Saved searches are stored in `localStorage['monkdb-vector-saved']` as `SavedSearch[]`
- Each entry: `{ id: UUID, label, collection: "schema.table", timestamp, params: { searchType, vector, topK, whereClause } }`
- Tests 21c/21d/21e use `page.addInitScript(() => localStorage.removeItem('monkdb-vector-saved'))` to guarantee a clean slate across test runs (prevents stale data from previous failures)
- The bookmark button shows only when the vector textarea is non-empty
- Saving auto-switches the right panel to the "Saved" tab

---

## Test 21 — Bookmark button appears after vector is entered in search input

**What it verifies**: The save-search bookmark icon (title="Save search") appears next to the Search button only when the vector textarea has content.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Fill `textarea.first()` with `QUERY_VEC_STR`

### Assertions
- `[title="Save search"].first()` is visible within 3 seconds

### Notes
- Before filling the textarea, this button is not rendered (conditional on `manualVector.trim()`)

---

## Test 21b — Clicking bookmark shows label input form

**What it verifies**: Clicking the bookmark button expands an inline form with a label input.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Fill textarea with `QUERY_VEC_STR`
4. Click `[title="Save search"].first()`

### Assertions
- `input[placeholder="Search label..."].first()` is visible within 3 seconds

---

## Test 21c — Saving a search adds it to the Saved tab

**What it verifies**: Filling the label input and pressing Enter saves the search and it appears in the Saved tab.

### Setup
- `page.addInitScript(() => localStorage.removeItem('monkdb-vector-saved'))` — clears saved searches before page load

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Fill textarea with `QUERY_VEC_STR`
4. Click `[title="Save search"]`
5. Find `input[placeholder="Search label..."].first()`
6. Fill label with `"My Saved KNN"`
7. `labelInput.press('Enter')` ← triggers `handleSaveSearch`

### Why `press('Enter')` not `button.click('Save')`:
`page.locator('button').filter({ hasText: 'Save' }).last()` would match the **"Saved" tab button** (substring match), not the actual Save button in the form. Pressing Enter on the label input is the correct trigger.

### Steps (continued)
8. Click `button` with text "Saved" (switches to Saved tab, though `handleSaveSearch` already did this)

### Assertions
- `getByText('My Saved KNN').first()` is visible within 5 seconds

---

## Test 21d — Saved tab shows "Run Again" button on saved searches

**What it verifies**: Each saved search entry in the Saved tab has a "Run Again" action button.

### Setup
- `page.addInitScript(() => localStorage.removeItem('monkdb-vector-saved'))`

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Fill textarea, click Save search bookmark
4. Fill label `"KNN Run Test"`, press Enter
5. Click "Saved" tab

### Assertions
- `getByText('KNN Run Test').first()` is visible within 5 seconds
- `button` with text "Run Again" is visible within 3 seconds

### Notes
- Clicking "Run Again" calls `runSavedSearch(saved)` which:
  1. Finds the matching collection in the collection list
  2. Sets it as `selectedCollection`
  3. Sets `loadedSearch` state — VectorSearchPanel's `useEffect` populates the search form

---

## Test 21e — Delete saved search removes it from the list

**What it verifies**: The delete button (bookmark-X icon) on a saved search entry removes it from the list. When the last item is deleted, the empty state "No saved searches" appears.

### Setup
- `page.addInitScript(() => localStorage.removeItem('monkdb-vector-saved'))`

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Fill textarea, click Save search bookmark
4. Fill label `"To Delete"`, press Enter
5. Click "Saved" tab
6. Wait for `getByText('To Delete').first()`
7. `page.locator('[title="Delete saved search"]').first().click({ force: true })`

### Why `force: true`:
The delete button has CSS `opacity-0 group-hover:opacity-100`. Playwright's default click checks visibility before clicking; `force: true` bypasses this check and fires the click event directly.

### Assertions
- `getByText('No saved searches').first()` is visible within 5 seconds

### Why NOT `getByText('To Delete').toHaveCount(0)`:
The toast notification "Search saved as 'To Delete'" is still visible in the DOM (as an `<div role="alert">`) when the assertion runs. `getByText('To Delete')` would match the toast text and return count=1 even after deletion. Asserting on "No saved searches" placeholder is more reliable.
