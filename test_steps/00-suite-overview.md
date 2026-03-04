# Vector Search UI Test Suite — Overview

**File**: `e2e/vector/ui-vector.spec.ts`
**Project**: `vec-ui` (Playwright project)
**Total tests**: 92
**Runner**: `npx playwright test --project=vec-ui`

---

## What This Suite Tests

End-to-end browser tests for the `/vector-ops` page of MonkDB Workbench.
Covers every visible UI element, user interaction, and data flow from the browser
all the way to the MonkDB HTTP API at `http://localhost:4200/_sql`.

---

## Test Data

| Constant      | Value                  | Purpose                          |
|---------------|------------------------|----------------------------------|
| `TEST_SCHEMA` | `doc`                  | MonkDB schema for the test table |
| `TEST_TABLE`  | `pw_vec_ui`            | Table name created for testing   |
| `TEST_COL`    | `embedding`            | FLOAT_VECTOR column name         |
| `DIMS`        | `384`                  | Vector dimension                 |
| `VEC1`        | `[1.0, 0.0 × 383]`     | First-axis unit vector           |
| `VEC2`        | `[0.0, 1.0, 0.0 × 382]`| Orthogonal vector to VEC1        |
| `VEC3`        | `[0.9, 0.1, 0.0 × 382]`| Near-first-axis vector           |
| `QUERY_VEC`   | same as VEC1           | Vector used in all search tests  |

### Inserted Documents

| id | content                        | embedding |
|----|-------------------------------|-----------|
| 1  | First axis vector document    | VEC1      |
| 2  | Orthogonal vector document    | VEC2      |
| 3  | Near first axis document      | VEC3      |

---

## Lifecycle

```
beforeAll  → ensureTestCollection()
             DROP TABLE IF EXISTS doc.pw_vec_ui
             CREATE TABLE doc.pw_vec_ui (id INTEGER PK, content TEXT, embedding FLOAT_VECTOR(384))
             INSERT 3 rows (VEC1, VEC2, VEC3)
             REFRESH TABLE doc.pw_vec_ui

afterAll   → DROP TABLE IF EXISTS doc.pw_vec_ui
```

---

## Helper Functions

| Function                   | What it does                                                                 |
|----------------------------|------------------------------------------------------------------------------|
| `sqlHttp(stmt, args?)`     | Direct HTTP POST to MonkDB at port 4200 (bypasses Next.js proxy)             |
| `ensureTestCollection()`   | Drops + recreates the test table and inserts 3 test vectors                  |
| `injectConnection(page)`   | Writes `monkdb_connections` + `monkdb_active_connection` to localStorage     |
| `goToVectorOps(page)`      | Injects connection, navigates to `/vector-ops`, waits for `networkidle`      |
| `selectTestCollection(page)`| Clicks the `pw_vec_ui` row in the collection browser, waits 500ms           |
| `runKNNSearch(page)`       | Fills textarea with QUERY_VEC_STR, clicks Search, waits for `networkidle`    |

---

## Test Groups

| File                                  | Tests          | Count | Area                                        |
|---------------------------------------|----------------|-------|---------------------------------------------|
| `01-page-load.md`                     | 01 – 01e       | 5     | Page load, header, stats strip              |
| `02-collections-browser.md`           | 02 – 02d       | 4     | Left panel, search filter, row metadata     |
| `03-collection-selection.md`          | 03 – 03d       | 4     | Click to select, info bar, Upload button    |
| `04-search-input-ui.md`               | 04 – 04e       | 5     | Textarea, search type, Top K, disabled state|
| `05-knn-search-results.md`            | 05 – 05d       | 4     | KNN results, content, score bar, score %    |
| `06-similarity-search.md`             | 06             | 1     | Similarity search mode                      |
| `07-export-buttons.md`                | 07             | 1     | Copy, CSV, JSON export buttons              |
| `08-sql-placeholder-safety.md`        | 08             | 1     | No $1/$2 PostgreSQL placeholders in SQL     |
| `09-no-js-errors.md`                  | 09             | 1     | No unhandled JS errors                      |
| `10-new-collection-wizard.md`         | 10 – 10d       | 4     | Create dialog open/close, schema select     |
| `11-upload-documents.md`              | 11 – 11d       | 4     | Upload button visibility, dialog open/close |
| `12-diagnostics-panel.md`             | 12 – 12b       | 2     | Diagnostics panel toggle, Run Diagnostics   |
| `13-query-history.md`                 | 13 – 13c       | 3     | History panel, search entry, clear          |
| `14-vector-function-reference.md`     | 14 – 14c       | 3     | knn_match / vector_similarity reference     |
| `15-advanced-filters.md`              | 15 – 15f       | 6     | WHERE clause, Min Score, active badge       |
| `16-dynamic-column-display.md`        | 16 – 16e       | 5     | Dynamic columns, rank numbers, filtering    |
| `17-create-dialog-advanced-schema.md` | 17 – 17h       | 8     | Custom PK/content/vector names, extra cols  |
| `18-schema-inspector.md`              | 18 – 18e       | 5     | Schema inspector toggle, PK/VECTOR badges   |
| `19-collection-management-menu.md`    | 19 – 19g       | 8     | 3-dot menu, DDL modal, Rename, AddCol, Drop |
| `20-inline-edit-delete.md`            | 20 – 20e       | 5     | Pencil edit form, trash delete confirm      |
| `21-saved-searches.md`                | 21 – 21e       | 5     | Bookmark, save form, Saved tab, delete      |
| `22-right-panel-tabs.md`              | 22 – 22d       | 4     | History/Saved/Analytics tabs, analytics     |
| `23-upload-dialog-3step.md`           | 23 – 23e       | 5     | 3-step upload flow, JSON paste, mapping     |

---

## Running the Suite

```bash
# Full suite
npx playwright test --project=vec-ui

# Specific test group
npx playwright test --project=vec-ui --grep "^05"

# Single test
npx playwright test --project=vec-ui --grep "05c"

# Headed (see browser)
npx playwright test --project=vec-ui --headed

# Debug mode
npx playwright test --project=vec-ui --debug "19c"
```

---

## Key Technical Notes

- MonkDB uses `?` placeholders (not `$1/$2`) — test 08 guards this
- Collection rows are `<div>` elements with `onClick` (not `<button>`) — use `getByText().click()` not `getByRole('button')`
- `FLOAT_VECTOR` dimension is NOT returned in `information_schema.columns.data_type` — hook falls back to 384
- The DDL modal renders via `createPortal(modal, document.body)` with `z-[9999]` to escape `overflow-hidden` ancestors
- Saved searches use `localStorage` key `monkdb-vector-saved` — tests 21c/21d/21e clear this via `addInitScript` before page load
- The `opacity-0 group-hover:opacity-100` delete button requires `click({ force: true })` in tests
