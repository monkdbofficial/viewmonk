# Test Group 19 — Collection Management Menu (3-dot)
**Tests**: 19, 19b, 19c, 19d, 19e, 19f, 19g (7 tests + 19 = 8 total)
**Purpose**: Verify the three-dot (MoreVertical) context menu on each collection row — hover reveal, menu items, DDL modal, Rename form, Add Column form, and Drop confirmation.

---

## Architecture Notes

- The three-dot button uses `opacity-0 group-hover:opacity-100` CSS — it's invisible until the mouse hovers over the parent `.group` div
- The DDL modal renders via `createPortal(modal, document.body)` with `z-[9999]` — this is critical so the modal escapes `overflow-hidden` ancestor containers in the left panel
- Each collection row has `data-testid="vec-row-{schema}-{table}"` for precise targeting when multiple collections exist

---

## Test 19 — Hovering a collection row reveals the three-dot menu button

**What it verifies**: The CSS `group-hover:opacity-100` makes the Collection actions button visually appear when the row is hovered.

### Steps
1. `goToVectorOps(page)`
2. Wait for `pw_vec_ui` text to appear (20s timeout)
3. Hover over `getByText('pw_vec_ui', { exact: true }).first()`

### Assertions
- `[title="Collection actions"].first()` is visible within 3 seconds

### Notes
- In Playwright, `opacity: 0` elements ARE considered visible for assertion purposes (they're in the DOM and can receive events). The `toBeVisible()` check may succeed even before hover in some configurations.

---

## Test 19b — Clicking three-dot menu shows all 4 action items

**What it verifies**: The dropdown menu contains exactly 4 items: View Schema, Rename, Add Column, Drop Table.

### Steps
1. `goToVectorOps(page)`
2. Wait for `pw_vec_ui`, hover over it
3. Click `[title="Collection actions"].first()` — opens dropdown

### Assertions
- `getByText('View Schema').first()` is visible within 3 seconds
- `getByText('Rename').first()` is visible within 3 seconds
- `getByText('Add Column').first()` is visible within 3 seconds
- `getByText('Drop Table').first()` is visible within 3 seconds

### Notes
- `.first()` on each because clicking the menu also reveals the same items that may exist as inline form labels after a subsequent open; using `.first()` avoids strict-mode violations

---

## Test 19c — "View Schema" opens DDL modal with table name in header

**What it verifies**: Clicking "View Schema" from the correct collection's menu opens the DDL modal showing `doc.pw_vec_ui — Schema` in the header.

### Steps
1. `goToVectorOps(page)`
2. Find `[data-testid="vec-row-doc-pw_vec_ui"]` ← **scoped to correct row**
3. Wait for the row element (20s timeout)
4. Hover the row
5. Click the Collection actions button **within** the row (scoped locator)
6. Click `getByText('View Schema').first()`

### Assertions
- `getByText('doc.pw_vec_ui', { exact: false }).first()` is visible within 5 seconds (in modal header)

### Why data-testid Scoping Is Required
Without scoping, `page.locator('[title="Collection actions"]').first()` picks the **first** Collection actions button in the DOM (which may belong to `doc.documents` if that collection is listed above `pw_vec_ui`). This would open the DDL for the wrong table.

### Notes
- The DDL modal is rendered via `createPortal(modal, document.body)` — it is NOT inside the left panel's `overflow-hidden` container, so it is fully visible and accessible to Playwright
- The modal header: `{ddlModal.schema}.{ddlModal.table} — Schema`

---

## Test 19d — DDL modal closes when X is clicked

**What it verifies**: The modal close button (title="Close DDL") removes the modal from the DOM.

### Steps
1. `goToVectorOps(page)`
2. Find `[data-testid="vec-row-doc-pw_vec_ui"]`, hover, click Collection actions
3. Click "View Schema"
4. Wait for `doc.pw_vec_ui` text to appear (confirms modal is open, 5s timeout)
5. Click `[title="Close DDL"]`

### Assertions
- `getByText('doc.pw_vec_ui — Schema', { exact: false })` count is 0 within 3 seconds

---

## Test 19e — "Rename" option shows inline rename form

**What it verifies**: Clicking "Rename" from the menu replaces the menu with an inline rename form containing a text input pre-filled with the current table name.

### Steps
1. `goToVectorOps(page)`
2. Hover `pw_vec_ui`, click Collection actions (first), click "Rename"

### Assertions
- "Rename Table" text is visible within 3 seconds
- `input[placeholder="new_table_name"].first()` is visible within 3 seconds

### Steps (cleanup)
- Click `button` with text "Cancel" (closes rename form without renaming)

### Assertions (post-cancel)
- `input[placeholder="new_table_name"]` count is 0 within 3 seconds

---

## Test 19f — "Add Column" option shows inline add-column form

**What it verifies**: Clicking "Add Column" shows an inline form with a column name input and type select.

### Steps
1. `goToVectorOps(page)`
2. Hover `pw_vec_ui`, click Collection actions (first), click "Add Column"

### Assertions
- `getByText('Add Column').last()` is visible within 3 seconds (panel heading)
- `input[placeholder="column_name"].last()` is visible within 3 seconds

### Steps (cleanup)
- Click `button` with text "Cancel" (last → targets the inline form Cancel, not the menu)

---

## Test 19g — "Drop Table" shows inline drop confirmation

**What it verifies**: Clicking "Drop Table" shows an inline destructive confirmation warning (does NOT actually drop the table).

### Steps
1. `goToVectorOps(page)`
2. Hover `pw_vec_ui`, click Collection actions (first), click "Drop Table"

### Assertions
- Text matching `/cannot be undone/i` is visible within 3 seconds

### Steps (cleanup)
- Click "Cancel" button (last)

### Assertions (post-cancel)
- `/cannot be undone/i` count is 0 within 3 seconds

### Notes
- **Important**: The test ALWAYS cancels the drop — the `pw_vec_ui` table must remain intact for subsequent tests
- The `afterAll` hook handles the actual cleanup after all tests complete
