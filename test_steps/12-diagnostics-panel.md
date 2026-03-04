# Test Group 12 — Diagnostics Panel
**Tests**: 12, 12b (2 tests)
**Purpose**: Verify the Diagnostics toggle opens a debug panel with a "Run Full Diagnostics" action button.

---

## Test 12 — Diagnostics panel toggles open when button clicked

**What it verifies**: Clicking the Diagnostics button in the header reveals a panel containing debug/diagnostic content.

### Steps
1. `goToVectorOps(page)`
2. Click `button` with text "Diagnostics"

### Assertions
- Text matching `/Debug|Diagnostic/i` is visible within 5 seconds

### Notes
- The Diagnostics panel appears below the header and contains sections for connection status, query testing, and a full diagnostics runner

---

## Test 12b — Diagnostics panel has "Run Full Diagnostics" button

**What it verifies**: The diagnostics panel contains an action button to execute a full suite of MonkDB health checks.

### Steps
1. `goToVectorOps(page)`
2. Click "Diagnostics" (opens panel)
3. If a "Debug & Diagnostic" toggle button is visible (within 3s), click it to expand
4. Look for "Run Full Diagnostics" button

### Assertions
- `button` with text "Run Full Diagnostics" is visible within 5 seconds

### Notes
- The panel may have a collapsible sub-section. The test handles both states (already expanded vs needs click)
- "Run Full Diagnostics" executes a series of MonkDB checks: connection ping, information_schema queries, KNN + similarity test queries, and renders results inline
