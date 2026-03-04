# Test Group 20 — Inline Edit / Delete on Result Rows
**Tests**: 20, 20b, 20c, 20d, 20e (5 tests)
**Purpose**: Verify that after a search, each result row has pencil (edit) and trash (delete) buttons that open their respective inline forms, and that cancelling leaves the data intact.

---

## Architecture Notes

- Edit and delete buttons appear on result rows after a successful search
- PK column is detected via `information_schema.key_column_usage` JOIN `table_constraints`
- Edit form updates non-PK, non-vector columns: `UPDATE "schema"."table" SET col=? WHERE pk_col=?`
- Delete confirmation removes the document: `DELETE FROM "schema"."table" WHERE pk_col=?`
- All tests **cancel** the operations — test data must remain intact for other tests

---

## Test 20 — After search, result rows show edit (pencil) buttons

**What it verifies**: After a KNN search, each result row shows a pencil/edit button.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`

### Assertions
- `[title="Edit document"].first()` is visible within 5 seconds

---

## Test 20b — After search, result rows show delete (trash) buttons

**What it verifies**: After a KNN search, each result row shows a trash/delete button.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`

### Assertions
- `[title="Delete document"].first()` is visible within 5 seconds

---

## Test 20c — Clicking pencil shows inline edit form with Save and Cancel

**What it verifies**: Clicking the edit button on a result row expands an inline form with inputs for editable columns, plus Save and Cancel buttons.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`
4. Click `[title="Edit document"].first()`

### Assertions
- `button` with text "Save" is visible within 3 seconds
- `button` with text "Cancel" is visible within 3 seconds

### Notes
**Edit form behaviour:**
- Shows text inputs for all non-PK, non-vector columns (e.g., `content`)
- PK column is highlighted in amber in the result display (read-only reference)
- On Save: `UPDATE "doc"."pw_vec_ui" SET "content"=? WHERE "id"=?`
- PK column is determined from `information_schema.key_column_usage` query run when the collection is selected

---

## Test 20d — Cancel on edit form closes the form

**What it verifies**: Clicking Cancel on the inline edit form restores the result row to its normal display (with pencil/trash buttons).

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`
4. Click `[title="Edit document"].first()`
5. Wait for Save button to appear
6. Click `button` with text "Cancel" (first)

### Assertions
- `[title="Edit document"].first()` is visible again within 3 seconds (edit buttons restored)

---

## Test 20e — Clicking trash shows delete confirmation with Delete and Cancel

**What it verifies**: Clicking the trash button on a result row shows an inline confirmation warning before any delete is performed.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`
4. Click `[title="Delete document"].first()`

### Assertions
- Text matching `/cannot be undone/i` is visible within 3 seconds
- `button` with text "Delete" is visible within 3 seconds

### Steps (cleanup — prevents data loss)
5. Click `button` with text "Cancel" (first)

### Assertions (post-cancel)
- `/cannot be undone/i` count is 0 within 3 seconds

### Notes
- The test ALWAYS cancels — avoids deleting the 3 test documents that other tests depend on
- If test data gets accidentally deleted, `afterAll` still cleans up but `beforeAll` only runs once (remaining tests in the suite would fail)
