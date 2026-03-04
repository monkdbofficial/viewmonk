# Test Group 18 — Schema Inspector (CollectionSchemaPanel)
**Tests**: 18, 18b, 18c, 18d, 18e (5 tests)
**Purpose**: Verify the collapsible Schema Inspector panel between the info bar and search panel — toggle behaviour, column table rendering, PK badge, and VECTOR badge.

---

## Component: CollectionSchemaPanel

Located between the collection info bar and the VectorSearchPanel.
Lazily loads schema data from `information_schema` on first expand.

| Data Source                                      | Used for                          |
|--------------------------------------------------|-----------------------------------|
| `information_schema.columns`                     | Column names and data types       |
| `information_schema.key_column_usage` JOIN `table_constraints WHERE constraint_type = 'PRIMARY KEY'` | PK column detection |
| `SHOW CREATE TABLE schema.table`                 | DDL text display                  |

---

## Test 18 — Schema Inspector toggle is visible after collection selected

**What it verifies**: The "Schema Inspector" collapsible button appears in the centre panel after selecting a collection.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`

### Assertions
- `button` with text "Schema Inspector" is visible within 5 seconds

---

## Test 18b — Schema Inspector expands on click and shows Columns section

**What it verifies**: Clicking "Schema Inspector" triggers the lazy data load and renders the "Columns (N)" section heading.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Schema Inspector"

### Assertions
- Text matching `/Columns \(\d+\)/` is visible within 5 seconds (e.g., "Columns (3)")

### Notes
- The lazy load queries MonkDB on first expand; subsequent expands use cached state
- `pw_vec_ui` has 3 columns: `id`, `content`, `embedding` → shows "Columns (3)"

---

## Test 18c — Schema Inspector shows "id" column (primary key)

**What it verifies**: The column table includes a row for the `id` column.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Schema Inspector"

### Assertions
- `<td>` element with exact text `"id"` is visible within 8 seconds

### Notes
- The `id` column should have an amber "PK" badge next to it (primary key indicator)
- The test uses `locator('td').filter({ hasText: /^id$/ })` for exact match on the table cell

---

## Test 18d — Schema Inspector shows VECTOR badge on the embedding column

**What it verifies**: The `embedding` column (type `FLOAT_VECTOR(384)`) is highlighted with a blue "VECTOR" badge.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Schema Inspector"

### Assertions
- `getByText('VECTOR').first()` is visible within 8 seconds

### Notes
- Badge colours:
  - PK column → amber badge showing `"PK"`
  - FLOAT_VECTOR column → blue badge showing `"VECTOR"`
  - Regular columns → no badge, just data type label

---

## Test 18e — Schema Inspector collapses on second click

**What it verifies**: Clicking the toggle a second time hides the schema panel (accordion behaviour).

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Schema Inspector" → wait for "Columns (N)" to appear
4. Click "Schema Inspector" again

### Assertions
- After first click: `/Columns \(\d+\)/` is visible within 5 seconds
- After second click: `/Columns \(\d+\)/` count is 0 within 3 seconds
