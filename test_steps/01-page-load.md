# Test Group 01 — Page Load
**Tests**: 01, 01b, 01c, 01d, 01e (5 tests)
**Purpose**: Verify the `/vector-ops` page renders its core structural elements correctly on load.

---

## Test 01 — Vector Operations page loads and shows title

**What it verifies**: The page loads successfully and the main heading "Vector Operations" is visible.

### Steps
1. Inject connection credentials into `localStorage` (`monkdb_connections`, `monkdb_active_connection`)
2. Navigate to `/vector-ops`
3. Wait for `networkidle`

### Assertions
- `<main>` contains the text "Vector Operations" (exact) **OR** `<h1>` contains "Vector Operations"
- Timeout: 10 seconds

### Notes
- Uses `.or()` combinator to handle both text-node and heading variants
- `first()` to avoid strict-mode violations if multiple matches

---

## Test 01b — Stats strip is visible with Collections label

**What it verifies**: The stats bar (4-card strip at the top of the middle column) includes a "Collections" label.

### Steps
1. `goToVectorOps(page)` — inject connection + navigate

### Assertions
- `getByText('Collections').first()` is visible within 8 seconds

### Notes
- Uses `.first()` because "Collections" also appears in the left-panel sidebar heading (`<span>`)
- The stats card uses a `<p>` element; the sidebar heading uses a different tag

---

## Test 01c — Stats strip shows Documents and Searches labels

**What it verifies**: The stats strip also shows the "Documents" and "Searches (24h)" metric cards.

### Steps
1. `goToVectorOps(page)`

### Assertions
- `getByText('Documents', { exact: true }).first()` is visible within 8 seconds
- `getByText('Searches (24h)')` is visible within 8 seconds

### Notes
- `exact: true` on "Documents" prevents substring match against collection names like `doc.documents`

---

## Test 01d — "New Collection" button is in the header

**What it verifies**: The primary action button to open the Create Vector Table wizard is rendered in the page header.

### Steps
1. `goToVectorOps(page)`

### Assertions
- `button` with text "New Collection" is visible within 8 seconds

---

## Test 01e — "Diagnostics" toggle button is in the header

**What it verifies**: The Diagnostics panel toggle button is accessible in the page header.

### Steps
1. `goToVectorOps(page)`

### Assertions
- `button` with text "Diagnostics" is visible within 8 seconds
