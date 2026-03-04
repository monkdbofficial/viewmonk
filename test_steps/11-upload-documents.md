# Test Group 11 — Upload Documents Button
**Tests**: 11, 11b, 11c, 11d (4 tests)
**Purpose**: Verify the Upload Documents button is conditionally rendered only after collection selection, and the dialog opens/closes correctly.

---

## Test 11 — "Upload Documents" is NOT shown before a collection is selected

**What it verifies**: The Upload Documents button is gated behind collection selection — it must be absent on initial load.

### Steps
1. `goToVectorOps(page)`
2. Wait 2 seconds (allow full page init without selecting anything)
3. Check `button` with text "Upload Documents"

### Assertions
- `uploadBtn.isVisible()` returns `false` (button not present or hidden)

### Notes
- Uses `.catch(() => false)` to handle the case where the element doesn't exist at all (vs being hidden)
- Intentional UX design: without a selected collection, there's no target table for upload

---

## Test 11b — "Upload Documents" appears once a collection is selected

**What it verifies**: After selecting `pw_vec_ui`, the Upload Documents button becomes visible in the header action area.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`

### Assertions
- `button` with text "Upload Documents" is visible within 5 seconds

---

## Test 11c — Upload dialog opens with file upload dropzone

**What it verifies**: Clicking Upload Documents opens the `DocumentUploadDialog` showing the step 1 content.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Upload Documents" button

### Assertions
- Text "Upload Documents" is visible within 5 seconds (dialog title)
- Text matching `/JSON, CSV, or TXT/i` is visible within 5 seconds (file type hint)

### Notes
- The dialog is a 3-step flow: **Load File → Map Columns → Upload**
- Step 1 shows a file dropzone + JSON paste textarea

---

## Test 11d — Upload dialog closes on Cancel

**What it verifies**: Clicking Cancel on the upload dialog closes it without side effects.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. Click "Upload Documents"
4. Click `button` with text "Cancel"

### Assertions
- "Upload Documents" button (in header) is still visible (page intact, dialog gone)

### Notes
- The Cancel button in the dialog closes it and resets internal state
- The "Upload Documents" button in the page header remains visible since the collection is still selected
