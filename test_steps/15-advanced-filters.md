# Test Group 15 — Advanced Filters Panel
**Tests**: 15, 15b, 15c, 15d, 15e, 15f (6 tests)
**Purpose**: Verify the collapsible Advanced Filters section — WHERE clause input, Min Score slider, active indicator badge, and collapse behaviour.

---

## Test 15 — Advanced Filters toggle button is visible after collection selected

**What it verifies**: The "Advanced Filters" collapsible toggle button renders in the search panel after collection selection.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`

### Assertions
- `button` with text "Advanced Filters" is visible within 5 seconds

---

## Test 15b — Advanced Filters panel opens on click and shows WHERE input

**What it verifies**: Clicking "Advanced Filters" expands the section revealing the Extra WHERE Condition text input.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Advanced Filters" toggle

### Assertions
- "Extra WHERE Condition" label is visible within 3 seconds
- `input[placeholder*="category"]` is visible within 3 seconds

### Notes
- Full placeholder: `e.g. category = 'news' AND year > 2023`
- The WHERE input appends `AND (user_input)` to the generated SQL query

---

## Test 15c — Advanced Filters panel shows Min Score slider

**What it verifies**: The Min Score section with a range slider is visible inside the expanded filter panel.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Advanced Filters"

### Assertions
- "Min Score" text is visible within 3 seconds
- `input[type="range"]` is visible within 3 seconds

### Notes
- The slider is a client-side filter (0.0–1.0, step 0.01)
- It does NOT re-run the SQL query — it filters the already-fetched `results` array in memory
- Label text: `"Client-side filter — hides results below this score"`

---

## Test 15d — Advanced Filters shows "active" badge when WHERE clause is typed

**What it verifies**: When a non-empty WHERE clause is typed, an "active" badge appears on the filter button to signal that a filter is set.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Advanced Filters"
4. Fill `input[placeholder*="category"]` with `"id = '1'"`

### Assertions
- `span` with text "active" is visible within 3 seconds

---

## Test 15e — Advanced Filters shows "active" badge when min score slider moved

**What it verifies**: Moving the Min Score slider away from 0 also triggers the "active" badge.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Advanced Filters"
4. Set `input[type="range"]` value to `"0.5"`
5. `dispatchEvent('input')` on the slider (required for React to see the change)

### Assertions
- `span` with text "active" is visible within 3 seconds

### Notes
- React synthetic event fires on native `input` event, not `change`
- `slider.fill('0.5')` alone may not trigger the React handler in all Playwright versions; `dispatchEvent('input')` ensures it

---

## Test 15f — Advanced Filters collapses on second click

**What it verifies**: Clicking the toggle a second time hides the filter panel (accordion/toggle behaviour).

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Advanced Filters" → panel opens, "Min Score" visible
4. Click "Advanced Filters" again → panel closes

### Assertions
- After first click: "Min Score" is visible within 3 seconds
- After second click: "Min Score" is NOT visible within 2 seconds
