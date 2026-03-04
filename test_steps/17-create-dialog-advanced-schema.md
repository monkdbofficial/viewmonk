# Test Group 17 — Create Vector Table Dialog — Advanced Schema
**Tests**: 17, 17b, 17c, 17d, 17e, 17f, 17g, 17h (8 tests)
**Purpose**: Verify the Advanced Schema section of the Create Vector Table wizard — custom column names, extra columns, SQL preview, and validation.

---

## Test 17 — Create dialog has "Advanced Schema" collapsible section

**What it verifies**: The wizard dialog contains an "Advanced Schema" accordion toggle button.

### Steps
1. `goToVectorOps(page)`
2. Click "New Collection"

### Assertions
- `button` with text "Advanced Schema" is visible within 5 seconds

---

## Test 17b — Advanced Schema opens and shows column name inputs

**What it verifies**: Clicking "Advanced Schema" expands the section with inputs for renaming the primary key, content, and vector columns.

### Steps
1. `goToVectorOps(page)`
2. Click "New Collection"
3. Click "Advanced Schema"

### Assertions
- "Primary Key" text is visible within 3 seconds
- `getByText('Content', { exact: true }).first()` is visible within 3 seconds
- `getByText('Vector', { exact: true }).first()` is visible within 3 seconds

### Notes
- `exact: true` on "Content" is needed to avoid matching the SQL reference code blocks that contain "content" as a lowercase word

---

## Test 17c — SQL preview updates when column names are changed

**What it verifies**: Changing the Primary Key column name in the Advanced Schema section immediately updates the live SQL `CREATE TABLE` preview.

### Steps
1. `goToVectorOps(page)`
2. Click "New Collection"
3. Select the first schema option (`index: 1`)
4. Fill table name input (`placeholder="my_documents"`) with `"test_custom"`
5. Click "Advanced Schema"
6. Find the PK column input (second textbox: `getByRole('textbox').nth(1)`)
7. Fill PK input with `"doc_id"`

### Assertions
- `pre` element containing "CREATE TABLE" also contains text `"doc_id"` within 3 seconds

### Notes
**SQL preview example after rename:**
```sql
CREATE TABLE "doc"."test_custom" (
  "doc_id" TEXT PRIMARY KEY,
  "content" TEXT,
  "embedding" FLOAT_VECTOR(384)
);
```
The preview uses `qi(name)` quoting: `"${name.replace(/"/g, '""')}"`.

---

## Test 17d — Extra Columns section has "Add Column" button

**What it verifies**: The Advanced Schema panel includes an "Add Column" button for adding extra columns beyond the base three (PK, content, vector).

### Steps
1. `goToVectorOps(page)`
2. Click "New Collection"
3. Click "Advanced Schema"

### Assertions
- `button` with text "Add Column" is visible within 3 seconds

---

## Test 17e — Clicking "Add Column" adds a new row with name input and type select

**What it verifies**: Each click of "Add Column" appends a new row to the extra columns list, consisting of a text input for the name and a type dropdown.

### Steps
1. `goToVectorOps(page)`
2. Click "New Collection"
3. Click "Advanced Schema"
4. Click "Add Column"

### Assertions
- `input[placeholder="column_name"].first()` is visible within 3 seconds

---

## Test 17f — Extra column appears in SQL preview

**What it verifies**: An extra column added via "Add Column" appears in the live SQL `CREATE TABLE` preview.

### Steps
1. `goToVectorOps(page)`
2. Click "New Collection"
3. Select first schema option, fill table name with `"test_extras"`
4. Click "Advanced Schema"
5. Click "Add Column"
6. Fill `input[placeholder="column_name"].first()` with `"category"`

### Assertions
- `pre` element with "CREATE TABLE" contains `"category"` within 3 seconds

### Notes
**SQL preview example:**
```sql
CREATE TABLE "doc"."test_extras" (
  "id" TEXT PRIMARY KEY,
  "content" TEXT,
  "category" TEXT,
  "embedding" FLOAT_VECTOR(384)
);
```
Extra columns appear BEFORE the vector column in the DDL.

---

## Test 17g — Create button disabled when PK column name is empty

**What it verifies**: Clearing the Primary Key column name disables the "Create Table" button (server-side would reject a table without a PK name).

### Steps
1. `goToVectorOps(page)`
2. Click "New Collection"
3. Select first schema option, fill table name with `"test_disabled"`
4. Click "Advanced Schema"
5. Find PK input (`getByRole('textbox').nth(1)`)
6. Clear PK input (fill with `""`)

### Assertions
- `button` matching `/Create Table/` is **disabled** within 3 seconds

### Notes
- Validation rule: `!idColName.trim()` → button disabled
- Also disabled when vector column name is empty

---

## Test 17h — Extra column row has a delete (trash) button

**What it verifies**: Each extra column row includes a trash/delete button to remove that column from the list.

### Steps
1. `goToVectorOps(page)`
2. Click "New Collection"
3. Click "Advanced Schema"
4. Click "Add Column" (one row appears)
5. Find the trash button via XPath: `//input[@placeholder="column_name"]/parent::div/button`
6. Click the trash button

### Assertions
- Before click: `input[placeholder="column_name"]` is visible
- After click: `input[placeholder="column_name"]` count is 0 within 3 seconds

### Notes
- Uses XPath parent traversal since Playwright doesn't have a native `locator.parent()` method
- The trash button is a `<button>` sibling of the name input inside the same flex row
