# Test Group 03 — Collection Selection
**Tests**: 03, 03b, 03c, 03d (4 tests)
**Purpose**: Verify that clicking a collection row loads the middle panel info bar, exposes the search panel, and activates the Upload Documents button.

---

## Test 03 — Clicking collection shows collection info bar in centre panel

**What it verifies**: After clicking `pw_vec_ui`, the centre panel displays an info bar containing the table name.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`:
   a. Find `getByText('pw_vec_ui', { exact: true }).first()`
   b. Wait up to 20s for it to appear
   c. Click the row div
   d. Wait for `networkidle` + 500ms

### Assertions
- `getByText('pw_vec_ui').first()` is visible within 5 seconds (now in info bar, not just in collection list)

---

## Test 03b — Info bar shows dimension badge

**What it verifies**: The info bar includes a badge showing the vector dimension (e.g., `384D`).

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`

### Assertions
- `getByText('384D').first()` is visible within 5 seconds

### Notes
- Uses `first()` in case other collections with the same dimension exist in the browser

---

## Test 03c — Info bar shows doc count

**What it verifies**: The info bar shows the number of documents in the collection (should be 3 after `beforeAll` insert).

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`

### Assertions
- Text matching `/\d+\s*doc/i` (e.g., "3 docs") is visible within 5 seconds

### Notes
- Regex allows for "3 docs", "3 documents", "3 doc" variations

---

## Test 03d — "Upload Documents" button appears after collection selected

**What it verifies**: The Upload Documents button (gated behind collection selection) becomes visible once a collection is active.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`

### Assertions
- `button` with text "Upload Documents" is visible within 5 seconds

### Notes
- This button is hidden when no collection is selected (verified in test 11)
- After selection, the header renders additional action buttons
