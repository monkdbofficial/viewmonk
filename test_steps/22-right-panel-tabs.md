# Test Group 22 — Right Panel Tabs
**Tests**: 22, 22b, 22c, 22d (4 tests)
**Purpose**: Verify the right panel's three-tab navigation (History | Saved | Analytics) — tab rendering, Analytics panel content, and empty states.

---

## Architecture Notes

The right panel has three tabs:

| Tab       | Key          | Content                                                    |
|-----------|--------------|------------------------------------------------------------|
| History   | `history`    | Search history entries (collection, type, timing, count)   |
| Saved     | `saved`      | Saved search entries with Run Again and delete buttons     |
| Analytics | `analytics`  | Computed metrics from `queryHistory` (useMemo)             |

Analytics metrics computed:
- **Total Searches**: `queryHistory.length`
- **Avg Latency**: mean of `queryHistory[].duration` in ms
- **Avg Results**: mean of `queryHistory[].resultCount`
- **Top Collection**: most frequently searched collection
- **KNN / Similarity breakdown**: bar chart by search type

---

## Test 22 — Right panel shows History, Saved, and Analytics tabs

**What it verifies**: All three tab buttons are rendered in the right panel.

### Steps
1. `goToVectorOps(page)`

### Assertions
- `button` with text "History" is visible within 5 seconds
- `button` with text "Saved" is visible within 5 seconds
- `button` with text "Analytics" is visible within 5 seconds

---

## Test 22b — Clicking Analytics tab shows analytics panel

**What it verifies**: Clicking Analytics renders either an empty state or the analytics metrics UI.

### Steps
1. `goToVectorOps(page)`
2. Click `button` with text "Analytics"

### Assertions
- Either "No data yet" **OR** "Total Searches" text is visible within 5 seconds

### Notes
- On fresh load with no search history, shows "No data yet"
- After at least one search has been performed in this session, shows metrics

---

## Test 22c — After a search, Analytics shows total searches > 0

**What it verifies**: Performing a KNN search populates the Analytics metrics panel with real data.

### Steps
1. `goToVectorOps(page)`
2. `selectTestCollection(page)`
3. `runKNNSearch(page)`
4. Click `button` with text "Analytics"

### Assertions
- `getByText('Total Searches').first()` is visible within 5 seconds
- `getByText('Avg Latency').first()` is visible within 3 seconds

### Notes
- Analytics are computed in real-time from `queryHistory` state using `useMemo`
- After one KNN search: Total Searches=1, Avg Latency={search duration}ms, KNN bar=100%

---

## Test 22d — Clicking Saved tab shows "No saved searches" when empty

**What it verifies**: The Saved tab renders the correct empty state when localStorage has no saved searches.

### Setup
- `injectConnection(page)` (manually)
- `page.addInitScript(() => { localStorage.removeItem('monkdb-vector-saved'); localStorage.removeItem('monkdb-vector-history'); })`
- Navigate to `/vector-ops` manually (not via `goToVectorOps` to control timing)

### Steps
1. Set up init script before navigation
2. Navigate to `/vector-ops`
3. Wait for `networkidle`
4. Click `button` with text "Saved"

### Assertions
- `getByText('No saved searches').first()` is visible within 5 seconds

### Notes
- Both `monkdb-vector-saved` and `monkdb-vector-history` are cleared to ensure completely fresh state
- The `addInitScript` runs synchronously BEFORE any page scripts, so React initialises state from the cleared localStorage
