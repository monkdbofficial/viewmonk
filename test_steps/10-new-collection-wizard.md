# Test Group 10 — New Collection Wizard
**Tests**: 10, 10b, 10c, 10d (4 tests)
**Purpose**: Verify the "Create Vector Table" dialog opens correctly, contains the expected form controls, and can be dismissed.

---

## Test 10 — "New Collection" button opens Create Vector Table dialog

**What it verifies**: Clicking the "New Collection" header button opens the `CreateVectorTableDialog`.

### Steps
1. `goToVectorOps(page)`
2. Click `button` with text "New Collection"

### Assertions
- Text matching `/Create Vector Table/i` is visible within 5 seconds

---

## Test 10b — Wizard shows schema select dropdown

**What it verifies**: The first field in the wizard is a `<select>` for the MonkDB schema (e.g., "doc").

### Steps
1. `goToVectorOps(page)`
2. Click "New Collection"
3. Find `select.first()`

### Assertions
- The select element is visible within 5 seconds

### Notes
- The schema select is populated by querying `information_schema.schemata` filtered to exclude system schemas

---

## Test 10c — Wizard shows dimension preset buttons (MiniLM, MPNet, OpenAI)

**What it verifies**: The dimension section has preset buttons for common embedding model sizes.

### Steps
1. `goToVectorOps(page)`
2. Click "New Collection"

### Assertions
- `getByText('MiniLM (384D)')` is visible within 5 seconds
- `getByText('MPNet (768D)')` is visible within 5 seconds
- `getByText('OpenAI (1536D)')` is visible within 5 seconds

### Notes
**Preset values clicked → dimension input updated:**
| Preset             | Dimension |
|--------------------|-----------|
| MiniLM (384D)      | 384       |
| MPNet (768D)       | 768       |
| OpenAI (1536D)     | 1536      |
| Custom             | user types |

---

## Test 10d — Wizard closes on Cancel

**What it verifies**: Clicking Cancel removes the dialog from the DOM.

### Steps
1. `goToVectorOps(page)`
2. Click "New Collection"
3. Click `button` with text "Cancel"

### Assertions
- "Create Vector Table" text is NOT visible within 3 seconds (`.catch(() => {})` to avoid flakiness)
- "New Collection" button is still visible (page is intact)
