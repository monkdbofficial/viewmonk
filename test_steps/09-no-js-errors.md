# Test Group 09 — No JavaScript Errors
**Tests**: 09 (1 test)
**Purpose**: Confirm the page loads and stabilises without throwing any unhandled JavaScript exceptions.

---

## Test 09 — No unhandled JS errors on the vector-ops page

**What it verifies**: The page runs cleanly; no uncaught exceptions are thrown to `window.onerror` or `window.addEventListener('unhandledrejection')`.

### Steps
1. Register `page.on('pageerror', err => errors.push(err.message))` listener
2. `goToVectorOps(page)`
3. Wait 3 seconds for all deferred initialisation (hooks, effects, lazy components)

### Assertions
- Filter `errors` array, removing noise:
  - Entries containing `"WebSocket"` (HMR dev-server reconnect)
  - Entries containing `"HMR"` (Webpack / Next.js Hot Module Replacement)
  - Entries containing `"ECONNREFUSED"` (connection errors from dev tools)
- `real` (remaining errors) has length 0

### Notes
- Only **real** application errors (React render errors, unhandled promise rejections, type errors) will fail the test
- WebSocket / HMR noise is expected in the Next.js dev environment and is intentionally excluded
- This test catches regressions like:
  - Calling a method on `undefined` during component mount
  - Missing required props on a component
  - JSON parse errors during localStorage initialisation
