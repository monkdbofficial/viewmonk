# Test Group 23 — Upload Dialog — 3-Step Column Mapping Flow
**Tests**: 23, 23b, 23c, 23d, 23e (5 tests)
**Purpose**: Verify the redesigned DocumentUploadDialog 3-step flow — step indicator rendering, file input UI, JSON paste activation, column mapping step, and Cancel behaviour.

---

## Architecture Notes

The upload dialog is a 3-step flow replacing the old embedding-dependent design:

| Step | Name           | UI                                                                          |
|------|----------------|-----------------------------------------------------------------------------|
| 1    | Load File      | File dropzone (`Choose file` button) + JSON paste textarea                  |
| 2    | Map Columns    | Maps file fields → table columns; supports `__skip__` and `__auto__` (UUID) |
| 3    | Upload         | Bulk INSERT in 100-row chunks; progress bar                                 |

**Navigation:**
- "Map Columns" button enables when data is loaded (JSON parsed successfully)
- "Back" button on step 2 returns to step 1
- "Upload" button on step 2 (after mapping) executes bulk INSERT

**INSERT strategy:**
- 100-row chunks with flat args array: `INSERT INTO t (c1, c2) VALUES (?,?),(?,?)...`
- Vector fields: parses string value via `JSON.parse()` to float array
- UUID auto-generation for `__auto__` mapped columns

---

## Test 23 — Upload dialog shows 3-step indicator (Load File, Map Columns, Upload)

**What it verifies**: The dialog header shows all 3 step labels in the progress indicator.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Upload Documents"

### Assertions
- `getByText('1. Load File').first()` is visible within 5 seconds
- `getByText('2. Map Columns').first()` is visible within 3 seconds
- `getByText('3. Upload').first()` is visible within 3 seconds

---

## Test 23b — Upload dialog step 1 shows file dropzone and JSON paste area

**What it verifies**: Step 1 has both a file input area and a textarea for direct JSON paste.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Upload Documents"

### Assertions
- `getByText('Choose file').first()` is visible within 5 seconds (file dropzone button)
- `locator('textarea').last()` is visible within 3 seconds (JSON paste area)

### Notes
- The textarea is the LAST textarea on the page (`locator('textarea').last()`) — the first textarea is the vector search input in the search panel

---

## Test 23c — Pasting JSON enables "Map Columns" navigation button

**What it verifies**: When valid JSON is pasted into the textarea, the "Map Columns" button (step navigation) becomes enabled.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Upload Documents"
4. Find `locator('textarea').last()` (JSON paste area)
5. Fill it with `JSON.stringify([{ id: '1', content: 'hello' }])`
6. Wait 500ms (debounce/React state update)

### Assertions
- `button` with text matching `/Map Columns/` is **enabled** within 5 seconds

### Notes
- JSON is parsed via `JSON.parse()` — must be a valid JSON array of objects
- Supported formats: `[{ "col": "val" }, ...]`
- The button stays **disabled** when the textarea is empty or contains invalid JSON

---

## Test 23d — Clicking "Map Columns" advances to step 2 with column mapping rows

**What it verifies**: After pasting JSON and clicking "Map Columns", the dialog advances to step 2 showing the column mapping interface.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Upload Documents"
4. Fill JSON paste area with `JSON.stringify([{ id: '1', content: 'test document' }])`
5. Wait 500ms
6. Click `button` with text `/Map Columns/`
7. Wait for `networkidle`

### Assertions
- `getByText('Map each table column').first()` is visible within 8 seconds

### Notes
**Column mapping step loads:**
1. Queries `information_schema.columns` to get the table's actual columns
2. For each table column, shows a dropdown to select which field from the uploaded JSON to map to it
3. Special options: `__skip__` (don't populate), `__auto__` (auto-generate UUID)
4. The file's field names appear as options in each dropdown

---

## Test 23e — Upload dialog Cancel button works on all steps

**What it verifies**: Clicking Cancel on step 1 closes the dialog completely.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Upload Documents"
4. Verify step indicator is visible (confirms dialog is open)
5. Click `button` with text "Cancel"

### Assertions
- Before cancel: `getByText('1. Load File').first()` is visible within 5 seconds
- After cancel: `getByText('1. Load File')` count is 0 within 3 seconds

### Notes
- Cancel resets all dialog state (step, loaded data, mappings)
- The dialog is a controlled component — state lives in `DocumentUploadDialog`
