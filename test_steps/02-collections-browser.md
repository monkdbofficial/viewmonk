# Test Group 02 — Collections Browser (Left Panel)
**Tests**: 02, 02b, 02c, 02d (4 tests)
**Purpose**: Verify the left-panel collection browser renders correctly and discovers the test table from MonkDB.

---

## Test 02 — Left panel shows "Collections" heading

**What it verifies**: The left sidebar panel has a visible "Collections" heading/label.

### Steps
1. `goToVectorOps(page)`

### Assertions
- `getByText('Collections').first()` is visible within 8 seconds

---

## Test 02b — Left panel filter input is visible

**What it verifies**: The search/filter text input for narrowing the collection list is rendered.

### Steps
1. `goToVectorOps(page)`

### Assertions
- `input[placeholder*="Search collections"]` is visible within 8 seconds

### Notes
- `placeholder*=` (contains) matches variations like "Search collections..." or "Filter collections"

---

## Test 02c — Test collection appears in left panel within 20s

**What it verifies**: The `pw_vec_ui` table created in `beforeAll` is discovered via `information_schema` and shown in the browser.

### Steps
1. `goToVectorOps(page)`
2. Wait up to 20 seconds for the `pw_vec_ui` row to appear

### Assertions
- `getByText('pw_vec_ui', { exact: true }).first()` is visible within 20 seconds

### Notes
- 20-second timeout accounts for MonkDB returning data and the hook completing 2+ parallel queries (`information_schema.columns` + doc counts)
- Collection rows are `<div>` elements with `onClick`, not `<button>` elements

---

## Test 02d — Collection row shows schema and dimension info

**What it verifies**: Each collection row displays sub-text including the schema name and vector dimension.

### Steps
1. `goToVectorOps(page)`
2. Wait for `pw_vec_ui` row to appear (20s timeout)

### Assertions
- `getByText('doc').first()` is visible within 5 seconds

### Notes
- The sub-text format is `"{schema} · {dimension}D · {N} docs"` (e.g. `doc · 384D · 3 docs`)
- Checking for `doc` is sufficient; strict dimension check is in test 03b
