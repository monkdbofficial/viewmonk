# Test Group 07 — Export Buttons
**Tests**: 07 (1 test)
**Purpose**: Verify that after a search, three export action buttons appear — Copy, CSV download, and JSON download.

---

## Test 07 — Copy, CSV, and JSON export buttons appear after search

**What it verifies**: The result toolbar renders three export buttons once results are available.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`

### Assertions
- `button[title="Copy to clipboard"]` is visible within 8 seconds
- `button[title="Export CSV"]` is visible within 5 seconds
- `button[title="Export JSON"]` is visible within 5 seconds

### Notes

**What each export does (implementation):**

| Button        | Behaviour                                                                                   |
|---------------|---------------------------------------------------------------------------------------------|
| Copy          | Copies `#1 [score%] col: val \| col: val` lines to clipboard for all filtered results       |
| Export CSV    | Generates a `.csv` file with dynamic columns: all non-vector, non-`_score` cols + `_score` |
| Export JSON   | Generates a `.json` file as an array of result objects including `_score`                   |

**Dynamic columns**: headers are taken from `resultCols` (the actual column names returned by the query), NOT hardcoded `id, content, score`. This means if the table has extra columns (e.g., `category`, `url`), they appear in the export automatically.

**Browser download trigger**: uses `triggerDownload()` which appends an `<a download>` element to the DOM, calls `.click()`, then removes it — Safari/Firefox compatible pattern.
