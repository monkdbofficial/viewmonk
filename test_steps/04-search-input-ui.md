# Test Group 04 — Search Input UI
**Tests**: 04, 04b, 04c, 04d, 04e (5 tests)
**Purpose**: Verify the VectorSearchPanel renders all input controls correctly after a collection is selected.

---

## Test 04 — Vector input textarea is visible after collection selected

**What it verifies**: The main vector input (a `<textarea>`) appears in the search panel after selecting a collection.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`

### Assertions
- `page.locator('textarea').first()` is visible within 5 seconds

---

## Test 04b — Textarea placeholder mentions dimension

**What it verifies**: The textarea placeholder text includes the vector dimension so users know the expected length.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Read `placeholder` attribute of `textarea.first()`

### Assertions
- `placeholder` attribute contains the string `"384"`

### Notes
- Expected placeholder example: `"[0.1, 0.2, 0.3, ... 384 numbers total]"`

---

## Test 04c — Search Type select has KNN Match and Vector Similarity options

**What it verifies**: The search-type dropdown provides both `knn` and `similarity` search modes.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Locate `select.first()`
4. Get all `<option>` text contents

### Assertions
- Select element is visible within 5 seconds
- At least one option text contains "KNN"
- At least one option text contains "Similarity"

---

## Test 04d — Top K input is visible and accepts numbers

**What it verifies**: The `Top K` numeric input renders and accepts user input.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Locate `input[type="number"].first()`
4. Fill value `"10"`

### Assertions
- Number input is visible within 5 seconds
- After `.fill('10')`, `.inputValue()` returns `"10"`

---

## Test 04e — Search button is disabled when textarea empty

**What it verifies**: The Search button stays disabled until the user provides a vector — prevents accidental empty searches.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Locate `button` matching regex `/^Search$/`

### Assertions
- Button is **disabled** within 5 seconds (textarea is still empty at this point)

### Notes
- The regex `/^Search$/` (exact match) avoids matching "Saved searches" or other buttons containing "search"
