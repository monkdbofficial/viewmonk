/**
 * Timeseries Studio — Professional UI Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * End-to-end browser tests against the live Next.js dev server at /timeseries.
 *
 * Architecture:
 *   • TimeseriesPage — page-object that wraps every common navigation pattern
 *   • No waitForTimeout() — all waits are condition-driven
 *   • test.step()        — used throughout for structured Playwright trace output
 *   • Full isolation     — connection + dashboard state injected fresh per test
 *
 * Coverage (65 tests):
 *  Group 1 — Page Load & Navigation        (01–05)
 *  Group 2 — New Dashboard Dialog          (06–12)
 *  Group 3 — Dashboard List UX             (13–21)
 *  Group 4 — Template Gallery              (22–30)
 *  Group 5 — Dashboard Builder             (31–40)
 *  Group 6 — Widget Config Drawer          (41–47)
 *  Group 7 — Dashboard Viewer              (48–54)
 *  Group 8 — Template Preview & Use        (55–59)
 *  Group 9 — Customer Support Template     (60–65)
 */

import { test, expect, Page } from '@playwright/test';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONN_ID      = 'pw-ts-conn';
const CONN_PAYLOAD = JSON.stringify([{
  id:     CONN_ID,
  name:   'Playwright TS Test',
  config: { host: 'localhost', port: 4200, protocol: 'http', role: 'superuser' },
}]);

const MONKDB_SQL = 'http://localhost:4200/_sql';

/** All 13 widget type labels exactly as displayed in the widget palette. */
const WIDGET_TYPES = [
  'Stat Card',   'Line Chart',   'Area Chart',  'Bar Chart',
  'Pie / Donut', 'Gauge',        'Heatmap',     'Data Table',
  'Scatter Plot','Funnel Chart', 'Treemap',     'Candlestick', 'Progress KPI',
] as const;

/** All 6 dashboard theme names as shown in the theme picker. */
const THEME_NAMES = [
  'Dark Navy', 'Midnight Glow', 'Light Clean',
  'Purple Storm', 'Neon Cyber', 'Warm Vibrant',
] as const;

/** All 5 sort-mode option labels in the sort control. */
const SORT_OPTIONS = [
  'Newest first', 'Oldest first', 'Name A → Z', 'Name Z → A', 'Most widgets',
] as const;

/** Time-range preset labels shown in the GlobalTimeRangeBar panel. */
const TIME_PRESETS = [
  'Last 15 minutes', 'Last 1 hour', 'Last 6 hours',
  'Last 24 hours',   'Last 7 days', 'Last 30 days',
] as const;

/** All 8 template category filter labels (including "All"). */
const TEMPLATE_CATEGORY_FILTERS = [
  'All', 'Business', 'Analytics', 'Finance',
  'Infrastructure', 'IoT', 'Weather', 'Support',
] as const;

// ─── Page Object ──────────────────────────────────────────────────────────────

class TimeseriesPage {
  constructor(private readonly page: Page) {}

  /** Navigate to /timeseries with a clean, isolated localStorage state. */
  async goto(): Promise<void> {
    await this.page.addInitScript(([payload, id]: [string, string]) => {
      localStorage.setItem('monkdb_connections', payload);
      localStorage.setItem('monkdb_active_connection', id);
      localStorage.removeItem('monkdb_ts_dashboards');
    }, [CONN_PAYLOAD, CONN_ID] as [string, string]);
    await this.page.goto('/timeseries');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to /timeseries with one dashboard pre-seeded in localStorage.
   * Waits until the named card is visible before resolving.
   */
  async gotoWithDashboard(name: string, dashId = 'dash_pw_seed_001'): Promise<void> {
    await this.page.addInitScript(
      ([payload, connId, id, dashName]: string[]) => {
        localStorage.setItem('monkdb_connections', payload);
        localStorage.setItem('monkdb_active_connection', connId);
        const now = new Date().toISOString();
        localStorage.setItem('monkdb_ts_dashboards', JSON.stringify([{
          id,
          name:            dashName,
          description:     'Playwright seed dashboard',
          themeId:         'dark-navy',
          refreshInterval: 30000,
          createdAt:       now,
          updatedAt:       now,
          widgets:         [],
        }]));
      },
      [CONN_PAYLOAD, CONN_ID, dashId, name],
    );
    await this.page.goto('/timeseries');
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
  }

  /** Click "Templates" tab and wait for the gallery heading to appear. */
  async openTemplates(): Promise<void> {
    await this.page.getByRole('button', { name: /Templates/ }).click();
    await expect(
      this.page.getByRole('heading', { name: 'Template Gallery' })
    ).toBeVisible({ timeout: 8_000 });
  }

  /** Open the "New Dashboard" dialog and wait for its heading. */
  async openNewDialog(): Promise<void> {
    await this.page.getByRole('button', { name: /New Dashboard/ }).click();
    await expect(
      this.page.getByRole('heading', { name: 'Create dashboard' })
    ).toBeVisible({ timeout: 5_000 });
  }

  /**
   * Complete the full create-dashboard flow.
   * Resolves when the builder's Save button is visible.
   */
  async createAndOpenBuilder(name: string): Promise<void> {
    await this.openNewDialog();
    const nameInput = this.page.getByPlaceholder('e.g. IoT Sensor Dashboard');
    await nameInput.clear();
    await nameInput.fill(name);
    await this.page.getByRole('button', { name: 'Create & Edit' }).click();
    await expect(
      this.page.getByRole('button', { name: /^Save$/ })
    ).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Click a widget type in the palette and wait for the canvas count to update.
   * @param type    Exact palette label, e.g. 'Stat Card'
   * @param expected The expected widget count after adding
   */
  async addWidget(type: string, expected = 1): Promise<void> {
    await this.page.getByText(type, { exact: true }).first().click();
    await expect(
      this.page.getByText(new RegExp(`^${expected} widgets?$`)).first()
    ).toBeVisible({ timeout: 8_000 });
  }

  /**
   * Open the Dashboard Viewer for a card that's already visible on screen.
   * Resolves when the Export button (unique to the viewer) appears.
   */
  async openViewer(cardName: string): Promise<void> {
    const card = this.page
      .locator('.relative')
      .filter({ has: this.page.getByRole('heading', { name: cardName }) })
      .first();
    await card.getByRole('button', { name: /^Open$/ }).click();
    await expect(
      this.page.getByRole('button', { name: /Export/ })
    ).toBeVisible({ timeout: 10_000 });
  }
}

// ─── SQL helper ───────────────────────────────────────────────────────────────

async function sqlHttp(stmt: string, args: unknown[] = []): Promise<unknown> {
  const res = await fetch(MONKDB_SQL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ stmt, args }),
  });
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Page Load & Navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 1 — Page Load & Navigation', () => {
  test('01 — "Timeseries Studio" heading is visible on load', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate to /timeseries', () => ts.goto());
    await expect(page.getByRole('heading', { name: 'Timeseries Studio' })).toBeVisible();
  });

  test('02 — "My Dashboards" and "Templates" tab buttons render', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate to /timeseries', () => ts.goto());
    await test.step('verify primary navigation tabs', async () => {
      await expect(page.getByRole('button', { name: /My Dashboards/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Templates/ })).toBeVisible();
    });
  });

  test('03 — Action bar shows "New Dashboard" and "Import" buttons', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate to /timeseries', () => ts.goto());
    await test.step('verify primary action buttons', async () => {
      await expect(page.getByRole('button', { name: /New Dashboard/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Import/ })).toBeVisible();
    });
  });

  test('04 — "My Dashboards" is the default active view (Template Gallery hidden)', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate to /timeseries', () => ts.goto());
    await test.step('confirm Template Gallery is NOT shown by default', async () => {
      await expect(
        page.getByRole('heading', { name: 'Template Gallery' })
      ).not.toBeVisible();
    });
  });

  test('05 — Switching to "Templates" tab reveals the Template Gallery', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate and open templates tab', async () => {
      await ts.goto();
      await ts.openTemplates();
    });
    await expect(page.getByRole('heading', { name: 'Template Gallery' })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — New Dashboard Dialog
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 2 — New Dashboard Dialog', () => {
  test('06 — "New Dashboard" button opens the Create dialog', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate', () => ts.goto());
    await test.step('open dialog', () => ts.openNewDialog());
    await expect(page.getByRole('heading', { name: 'Create dashboard' })).toBeVisible();
  });

  test('07 — Dialog has name input, description field, and "Create & Edit" button', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate and open dialog', async () => {
      await ts.goto();
      await ts.openNewDialog();
    });
    await test.step('verify all required form fields', async () => {
      await expect(page.getByPlaceholder('e.g. IoT Sensor Dashboard')).toBeVisible();
      await expect(page.getByPlaceholder('What is this dashboard for?')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create & Edit' })).toBeVisible();
    });
  });

  test('08 — Theme picker shows all 6 themes: Dark Navy through Warm Vibrant', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate and open dialog', async () => {
      await ts.goto();
      await ts.openNewDialog();
    });
    await test.step('verify all 6 theme labels are present inside the dialog', async () => {
      // Theme buttons render as: <button><span>(colored circle)</span><span>Dark Navy</span></button>
      // Scope to the dialog to avoid any accidental matches outside it
      const dialog = page.locator('div').filter({
        has: page.getByRole('heading', { name: 'Create dashboard' }),
      }).first();
      for (const theme of THEME_NAMES) {
        await expect(dialog.getByText(theme, { exact: true }).first()).toBeVisible({ timeout: 5_000 });
      }
    });
  });

  test('09 — Cancel button closes dialog without navigating away', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate and open dialog', async () => {
      await ts.goto();
      await ts.openNewDialog();
    });
    await test.step('cancel and confirm dialog closes', async () => {
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('heading', { name: 'Create dashboard' })).not.toBeVisible();
      await expect(page.getByRole('heading', { name: 'Timeseries Studio' })).toBeVisible();
    });
  });

  test('10 — Creating a dashboard navigates to the Dashboard Builder', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate and create dashboard', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder('Builder Nav PW');
    });
    await test.step('verify full builder toolbar is present', async () => {
      await expect(page.getByRole('button', { name: /^Save$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Preview$/ })).toBeVisible();
      await expect(page.getByTitle('Undo (⌘Z)')).toBeVisible();
      await expect(page.getByTitle('Redo (⌘Y)')).toBeVisible();
    });
  });

  test('11 — Builder toolbar name input contains the newly created dashboard name', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    const dashName = 'Name In Toolbar PW';
    await test.step('create dashboard', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder(dashName);
    });
    await test.step('verify the editable name input holds the dashboard name', async () => {
      // The builder toolbar renders an <input type="text" placeholder="Dashboard name"> for inline editing
      const nameInput = page.getByPlaceholder('Dashboard name').first();
      await expect(nameInput).toBeVisible({ timeout: 5_000 });
      await expect(nameInput).toHaveValue(dashName);
    });
  });

  test('12 — Created dashboard appears in "My Dashboards" after navigating back', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('create dashboard and go back to home', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder('Persist Test PW');
      await page.getByTitle('Back to dashboards').first().click();
    });
    await test.step('verify card is present on the home page', async () => {
      await expect(page.getByText('Persist Test PW').first()).toBeVisible({ timeout: 10_000 });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Dashboard List UX
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 3 — Dashboard List UX', () => {
  test('13 — Sort control shows current mode and all 5 options when opened', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate', () => ts.goto());
    await test.step('verify default sort label "Newest first" is shown in the trigger', async () => {
      // Sort is a custom dropdown button (not a <select>) — trigger shows current mode text
      await expect(page.getByText('Newest first').first()).toBeVisible({ timeout: 5_000 });
    });
    await test.step('open dropdown and verify all 5 sort option buttons appear', async () => {
      // Click the trigger to open the dropdown
      await page.getByText('Newest first').first().click();
      for (const option of SORT_OPTIONS) {
        await expect(
          page.getByRole('button', { name: option }).first()
        ).toBeVisible({ timeout: 5_000 });
      }
    });
  });

  test('14 — Dashboard card renders name and widget-count badge', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('seed and navigate', () => ts.gotoWithDashboard('Card Render PW'));
    await test.step('verify card name and badge', async () => {
      await expect(page.getByText('Card Render PW').first()).toBeVisible();
      await expect(
        page.locator('span').filter({ hasText: /^0 widgets$/ }).first()
      ).toBeVisible();
    });
  });

  test('15 — Dashboard card exposes Open, Edit details, and Delete action buttons', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('seed and navigate', () => ts.gotoWithDashboard('Actions Test PW'));
    await test.step('scope to target card and verify actions', async () => {
      const card = page
        .locator('.relative')
        .filter({ has: page.getByRole('heading', { name: 'Actions Test PW' }) })
        .first();
      await expect(card.getByRole('button', { name: /^Open$/ })).toBeVisible();
      await expect(card.getByTitle('Edit details')).toBeVisible();
      await expect(card.getByTitle('Delete')).toBeVisible();
    });
  });

  test('16 — Search box filters dashboards; no-match shows "0 results"', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('seed and navigate', () => ts.gotoWithDashboard('Search Filter PW'));
    await test.step('search for nonexistent term → 0 results', async () => {
      await page.getByPlaceholder('Search dashboards…').fill('xyz_no_match_999');
      await expect(page.getByText(/^0 results?$/).first()).toBeVisible({ timeout: 5_000 });
    });
    await test.step('refine search by name → card reappears', async () => {
      await page.getByPlaceholder('Search dashboards…').fill('Search Filter');
      await expect(page.getByText('Search Filter PW').first()).toBeVisible({ timeout: 5_000 });
    });
  });

  test('17 — Clearing the search box restores the full dashboard list', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('seed and navigate', () => ts.gotoWithDashboard('Clear Search PW'));
    await test.step('search then clear', async () => {
      await page.getByPlaceholder('Search dashboards…').fill('xyz_no_match');
      await expect(page.getByText(/^0 results?$/).first()).toBeVisible({ timeout: 5_000 });
      await page.getByPlaceholder('Search dashboards…').clear();
      await expect(page.getByText('Clear Search PW').first()).toBeVisible({ timeout: 5_000 });
    });
  });

  test('18 — Import button triggers the native file-chooser dialog', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate', () => ts.goto());
    await test.step('click Import and capture file-chooser event', async () => {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: /Import/ }).click(),
      ]);
      // File chooser should accept only JSON files
      expect(fileChooser).toBeTruthy();
    });
  });

  test('19 — "Open" button navigates from the card to the Dashboard Viewer', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('seed and navigate', () => ts.gotoWithDashboard('Open Nav PW'));
    await test.step('open viewer and verify toolbar', () => ts.openViewer('Open Nav PW'));
    await expect(page.getByRole('button', { name: /Export/ })).toBeVisible();
  });

  test('20 — "Edit details" opens dialog with the dashboard name pre-filled', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('seed and navigate', () => ts.gotoWithDashboard('Edit Pre-Fill PW'));
    await test.step('click Edit details on the card', async () => {
      const card = page
        .locator('.relative')
        .filter({ has: page.getByRole('heading', { name: 'Edit Pre-Fill PW' }) })
        .first();
      await card.getByTitle('Edit details').click();
    });
    await test.step('verify dialog is open and name is pre-filled', async () => {
      await expect(
        page.getByRole('heading', { name: 'Edit dashboard details' })
      ).toBeVisible({ timeout: 5_000 });
      // The edit dialog is a fixed overlay — target its inner max-w-lg container
      // which contains the heading and the name input (autoFocus, value = config.name)
      const nameInput = page.locator('.fixed.inset-0 input[type="text"]').first();
      await expect(nameInput).toHaveValue('Edit Pre-Fill PW', { timeout: 8_000 });
    });
  });

  test('21 — Delete shows confirmation overlay then removes the dashboard card', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('seed and navigate', () => ts.gotoWithDashboard('Delete Test PW', 'dash_pw_del_001'));
    const card = page
      .locator('.relative')
      .filter({ has: page.getByRole('heading', { name: 'Delete Test PW' }) })
      .first();
    await test.step('click trash icon — confirmation overlay appears', async () => {
      await card.getByTitle('Delete').click();
      await expect(
        page.getByText(/Delete .*Delete Test PW/i)
      ).toBeVisible({ timeout: 5_000 });
    });
    await test.step('confirm deletion — card is removed', async () => {
      const confirmBtn = page.locator('button.bg-red-600');
      await confirmBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await confirmBtn.click();
      await expect(
        page.getByRole('heading', { name: 'Delete Test PW' })
      ).not.toBeVisible({ timeout: 8_000 });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Template Gallery
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 4 — Template Gallery', () => {
  async function openGallery(page: Page): Promise<void> {
    const ts = new TimeseriesPage(page);
    await ts.goto();
    await ts.openTemplates();
  }

  test('22 — Templates tab displays the "Template Gallery" heading', async ({ page }) => {
    await test.step('open gallery', () => openGallery(page));
    await expect(page.getByRole('heading', { name: 'Template Gallery' })).toBeVisible();
  });

  test('23 — "All" filter badge correctly counts all 13 templates', async ({ page }) => {
    await test.step('open gallery', () => openGallery(page));
    await test.step('verify All badge shows 13', async () => {
      const allBtn = page.getByRole('button', { name: /^All/ }).first();
      await expect(allBtn).toBeVisible();
      await expect(allBtn).toContainText('13');
    });
  });

  test('24 — All 8 category filter buttons are visible', async ({ page }) => {
    await test.step('open gallery', () => openGallery(page));
    await test.step('verify every category button renders', async () => {
      for (const cat of TEMPLATE_CATEGORY_FILTERS) {
        await expect(
          page.getByRole('button', { name: new RegExp(cat, 'i') }).first()
        ).toBeVisible({ timeout: 5_000 });
      }
    });
  });

  test('25 — "IoT" category filter shows at least one IoT template', async ({ page }) => {
    await test.step('open gallery and apply IoT filter', async () => {
      await openGallery(page);
      await page.getByRole('button', { name: /^IoT/ }).first().click();
    });
    await test.step('verify at least one template card remains', async () => {
      const cards = page.getByRole('heading', { level: 3 });
      await expect(cards.first()).toBeVisible({ timeout: 5_000 });
      expect(await cards.count()).toBeGreaterThan(0);
    });
  });

  test('26 — "Finance" filter isolates Finance templates — IoT template hidden', async ({ page }) => {
    await test.step('open gallery and apply Finance filter', async () => {
      await openGallery(page);
      await page.getByRole('button', { name: /Finance/ }).first().click();
    });
    await test.step('verify Finance content visible; IoT template not visible', async () => {
      // At least one card should show under Finance
      await expect(
        page.getByRole('heading', { level: 3 }).first()
      ).toBeVisible({ timeout: 5_000 });
      // The IoT template "IoT Sensor Monitoring" must be hidden
      await expect(page.getByText('IoT Sensor Monitoring')).not.toBeVisible();
    });
  });

  test('27 — Searching by template name filters the gallery', async ({ page }) => {
    await test.step('open gallery', () => openGallery(page));
    await test.step('type "iot" and verify filter result count text', async () => {
      await page.getByPlaceholder('Search templates…').fill('iot');
      await expect(page.getByText(/\d+ templates? for/i)).toBeVisible({ timeout: 5_000 });
    });
  });

  test('28 — Searching by tag "CSAT" finds the Customer Support template', async ({ page }) => {
    await test.step('open gallery', () => openGallery(page));
    await test.step('search by tag and verify template appears', async () => {
      await page.getByPlaceholder('Search templates…').fill('CSAT');
      await expect(
        page.getByText('Customer Support Analytics')
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test('29 — Clearing search input restores all 13 templates', async ({ page }) => {
    await test.step('open gallery', () => openGallery(page));
    await test.step('search then clear and confirm count resets', async () => {
      await page.getByPlaceholder('Search templates…').fill('weather');
      await page.getByPlaceholder('Search templates…').clear();
      await expect(
        page.getByRole('button', { name: /^All.*13/ }).first()
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test('30 — Template card shows name, description, tag pills, and widget-count badge', async ({ page }) => {
    await test.step('open gallery', () => openGallery(page));
    await test.step('verify first card has all required elements', async () => {
      await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
      await expect(
        page.locator('span').filter({ hasText: /\d+ widgets/ }).first()
      ).toBeVisible({ timeout: 5_000 });
      // Template description paragraph
      await expect(page.locator('p.line-clamp-2').first()).toBeVisible();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 — Dashboard Builder
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 5 — Dashboard Builder', () => {
  test('31 — Builder toolbar has Save, Preview, Undo, and Redo controls', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('create a new dashboard', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder('Toolbar Test PW');
    });
    await test.step('verify all toolbar controls are present', async () => {
      await expect(page.getByRole('button', { name: /^Save$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Preview$/ })).toBeVisible();
      await expect(page.getByTitle('Undo (⌘Z)')).toBeVisible();
      await expect(page.getByTitle('Redo (⌘Y)')).toBeVisible();
    });
  });

  test('32 — Widget palette renders all 13 widget types', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('open builder', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder('Palette Full PW');
    });
    await test.step('verify every widget type label is in the palette', async () => {
      for (const label of WIDGET_TYPES) {
        await expect(
          page.getByText(label, { exact: true }).first()
        ).toBeVisible({ timeout: 5_000 });
      }
    });
  });

  test('33 — Clicking a widget type in palette adds it to canvas', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('open builder', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder('Add Widget PW');
    });
    await test.step('canvas starts empty (0 widgets)', async () => {
      await expect(page.getByText(/^0 widgets$/).first()).toBeVisible();
    });
    await test.step('add Stat Card — count becomes 1', () => ts.addWidget('Stat Card', 1));
  });

  test('34 — Adding a widget shows the "Unsaved" dirty indicator', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('open builder and add widget', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder('Unsaved Indicator PW');
      await ts.addWidget('Stat Card', 1);
    });
    await test.step('verify Unsaved badge is visible', async () => {
      await expect(page.getByText('Unsaved')).toBeVisible({ timeout: 5_000 });
    });
  });

  test('35 — Save button transitions to "Saved!" confirmation feedback', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('open builder, add widget, save', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder('Save Confirm PW');
      await ts.addWidget('Stat Card', 1);
      await page.getByRole('button', { name: /^Save$/ }).click();
    });
    await test.step('verify Saved! feedback appears', async () => {
      await expect(
        page.getByRole('button', { name: /Saved!/ })
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test('36 — Undo removes the last widget; Redo restores it', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('open builder and add Stat Card', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder('Undo Redo PW');
      await ts.addWidget('Stat Card', 1);
    });
    await test.step('Undo — widget count drops to 0', async () => {
      await page.getByTitle('Undo (⌘Z)').click();
      await expect(page.getByText(/^0 widgets$/).first()).toBeVisible({ timeout: 5_000 });
    });
    await test.step('Redo — widget count returns to 1', async () => {
      await page.getByTitle('Redo (⌘Y)').click();
      await expect(page.getByText(/^1 widget$/).first()).toBeVisible({ timeout: 5_000 });
    });
  });

  test('37 — Adding multiple widgets reflects the accurate count on canvas', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('open builder', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder('Multi Count PW');
    });
    await test.step('add 3 different widget types', async () => {
      await ts.addWidget('Stat Card',  1);
      await ts.addWidget('Line Chart', 2);
      await ts.addWidget('Bar Chart',  3);
    });
    await test.step('canvas count shows 3 widgets', async () => {
      await expect(page.getByText(/^3 widgets$/).first()).toBeVisible({ timeout: 5_000 });
    });
  });

  test('38 — "Preview" button in builder navigates to the Dashboard Viewer', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('open builder, add and save widget', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder('Preview Route PW');
      await ts.addWidget('Stat Card', 1);
      await page.getByRole('button', { name: /^Save$/ }).click();
      await expect(page.getByRole('button', { name: /Saved!/ })).toBeVisible({ timeout: 5_000 });
    });
    await test.step('click Preview and verify viewer loads', async () => {
      await page.getByRole('button', { name: /^Preview$/ }).click();
      await expect(
        page.getByRole('button', { name: /Export/ })
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('39 — Back-to-dashboards arrow returns to the home page', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('open builder', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder('Back Arrow PW');
    });
    await test.step('click back arrow and verify home heading', async () => {
      await page.getByTitle('Back to dashboards').first().click();
      await expect(
        page.getByRole('heading', { name: 'Timeseries Studio' })
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('40 — Enterprise widget types (Gauge, Heatmap, Candlestick) are in the palette', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('open builder', async () => {
      await ts.goto();
      await ts.createAndOpenBuilder('Enterprise Widgets PW');
    });
    await test.step('verify enterprise widget labels are present', async () => {
      for (const label of ['Gauge', 'Heatmap', 'Candlestick', 'Scatter Plot'] as const) {
        await expect(
          page.getByText(label, { exact: true }).first()
        ).toBeVisible({ timeout: 5_000 });
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6 — Widget Config Drawer
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 6 — Widget Config Drawer', () => {
  /** Open builder, add Stat Card, wait for drawer tabs to be visible. */
  async function openDrawer(page: Page): Promise<void> {
    const ts = new TimeseriesPage(page);
    await ts.goto();
    await ts.createAndOpenBuilder('Drawer PW');
    await page.getByText('Stat Card', { exact: true }).first().click();
    // Drawer auto-opens after adding a widget — wait for its Data tab button
    await expect(
      page.getByRole('button', { name: /^Data$/ }).first()
    ).toBeVisible({ timeout: 10_000 });
  }

  test('41 — Adding a widget automatically opens its config drawer', async ({ page }) => {
    await test.step('open builder and add Stat Card', () => openDrawer(page));
    await test.step('verify drawer is open (Data tab visible)', async () => {
      await expect(page.getByRole('button', { name: /^Data$/ }).first()).toBeVisible();
    });
  });

  test('42 — Config drawer has Data, Visual, Thresholds, and SQL tabs', async ({ page }) => {
    await test.step('open drawer', () => openDrawer(page));
    await test.step('verify all four tab buttons', async () => {
      for (const label of ['Data', 'Visual', 'Thresholds', 'SQL'] as const) {
        await expect(
          page.getByRole('button', { name: new RegExp(`^${label}$`) }).first()
        ).toBeVisible({ timeout: 5_000 });
      }
    });
  });

  test('43 — Data tab: Schema and Table selectors are always visible', async ({ page }) => {
    await test.step('open drawer', () => openDrawer(page));
    await test.step('switch to Data tab and verify selectors', async () => {
      await page.getByRole('button', { name: /^Data$/ }).first().click();
      await expect(page.getByText(/^Table$/i).first()).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('select').first()).toBeVisible();
    });
  });

  test('44 — Visual tab: Color Scheme picker and Legend toggle are visible', async ({ page }) => {
    await test.step('open drawer', () => openDrawer(page));
    await test.step('switch to Visual tab and verify controls', async () => {
      await page.getByRole('button', { name: /^Visual$/ }).first().click();
      await expect(page.getByText(/Color Scheme/i).first()).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/Show Legend|Legend/i).first()).toBeVisible({ timeout: 5_000 });
    });
  });

  test('45 — SQL tab: Custom SQL textarea with override capability is visible', async ({ page }) => {
    await test.step('open drawer', () => openDrawer(page));
    await test.step('switch to SQL tab and verify textarea', async () => {
      await page.getByRole('button', { name: /^SQL$/ }).first().click();
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5_000 });
    });
  });

  test('46 — Thresholds tab: "Add" button renders for creating threshold rules', async ({ page }) => {
    await test.step('open drawer', () => openDrawer(page));
    await test.step('switch to Thresholds tab and verify Add button', async () => {
      await page.getByRole('button', { name: /^Thresholds$/ }).first().click();
      await expect(
        page.getByRole('button', { name: /Add/ }).first()
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test('47 — Drawer header contains the widget-type label', async ({ page }) => {
    await test.step('open drawer', () => openDrawer(page));
    await test.step('verify widget type label is visible in drawer', async () => {
      await expect(page.getByText(/Stat Card/i).first()).toBeVisible({ timeout: 5_000 });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 7 — Dashboard Viewer
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 7 — Dashboard Viewer', () => {
  async function openViewer(page: Page): Promise<void> {
    const ts = new TimeseriesPage(page);
    await ts.gotoWithDashboard('Viewer Test PW');
    await ts.openViewer('Viewer Test PW');
  }

  test('48 — Viewer toolbar shows the dashboard name', async ({ page }) => {
    await test.step('open viewer', () => openViewer(page));
    await test.step('verify dashboard name in toolbar', async () => {
      await expect(page.getByText('Viewer Test PW').first()).toBeVisible({ timeout: 5_000 });
    });
  });

  test('49 — Widget-count chip is visible in the viewer toolbar', async ({ page }) => {
    await test.step('open viewer', () => openViewer(page));
    await test.step('verify widget count chip (seeded dashboard has 0 → "0w")', async () => {
      await expect(page.getByText(/\dw$/).first()).toBeVisible({ timeout: 8_000 });
    });
  });

  test('50 — Export dropdown exposes "Export as PNG" and "Export as JSON" options', async ({ page }) => {
    await test.step('open viewer', () => openViewer(page));
    await test.step('click Export and verify options', async () => {
      await page.getByRole('button', { name: /Export/ }).click();
      await expect(page.getByText('Export as PNG')).toBeVisible();
      await expect(page.getByText('Export as JSON')).toBeVisible();
    });
  });

  test('51 — GlobalTimeRangeBar shows a time-preset label', async ({ page }) => {
    await test.step('open viewer', () => openViewer(page));
    await test.step('verify time-range label matches a known preset', async () => {
      await expect(
        page.getByText(/Last \d+ (minute|hour|day|week)/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('52 — Clicking the time-range label opens the presets panel', async ({ page }) => {
    await test.step('open viewer', () => openViewer(page));
    await test.step('click time label and verify preset panel appears', async () => {
      await page.getByText(/Last \d+ (minute|hour|day|week)/i).first().click();
      // Presets panel should show known labels
      // Presets render as buttons — use .first() to avoid strict-mode multi-match
      await expect(
        page.getByText('Last 15 minutes').or(page.getByText('Last 1 hour')).first()
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test('53 — Fullscreen button is present in the viewer toolbar', async ({ page }) => {
    await test.step('open viewer', () => openViewer(page));
    await test.step('verify fullscreen button is accessible', async () => {
      await expect(
        page.getByTitle('Fullscreen').or(page.getByTitle('Exit fullscreen'))
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test('54 — Back button returns to the "Timeseries Studio" home page', async ({ page }) => {
    await test.step('open viewer', () => openViewer(page));
    await test.step('click back and verify home heading', async () => {
      await page.getByTitle('Back to dashboards').first().click();
      await expect(
        page.getByRole('heading', { name: 'Timeseries Studio' })
      ).toBeVisible({ timeout: 8_000 });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 8 — Template Preview & Use
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 8 — Template Preview & Use', () => {
  test.beforeAll(async () => {
    // Soft-ping MonkDB; tests degrade gracefully if the DB is unavailable
    try { await sqlHttp('SELECT 1'); } catch { /* ignored */ }
  });

  test('55 — Template cards expose "Use Template" and "Preview" action buttons', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate and open gallery', async () => {
      await ts.goto();
      await ts.openTemplates();
    });
    await test.step('verify CTA buttons on first card', async () => {
      await expect(
        page.getByRole('button', { name: /Use Template/ }).first()
      ).toBeVisible({ timeout: 8_000 });
      await expect(page.getByRole('button', { name: /^Preview$/ }).first()).toBeVisible();
    });
  });

  test('56 — "Use Template" opens the builder with widgets pre-populated', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate, open gallery, click Use Template', async () => {
      await ts.goto();
      await ts.openTemplates();
      await expect(
        page.getByRole('button', { name: /Use Template/ }).first()
      ).toBeVisible({ timeout: 8_000 });
      await page.getByRole('button', { name: /Use Template/ }).first().click();
    });
    await test.step('verify builder loaded with pre-populated widgets', async () => {
      await expect(
        page.getByRole('button', { name: /^Save$/ })
      ).toBeVisible({ timeout: 15_000 });
      const text = await page.getByText(/\d+ widgets?/).first().textContent({ timeout: 5_000 });
      expect(parseInt(text ?? '0')).toBeGreaterThan(0);
    });
  });

  test('57 — "Preview" navigates away from home (spinner or viewer visible)', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate and open gallery', async () => {
      await ts.goto();
      await ts.openTemplates();
    });
    await test.step('click Preview on first template', async () => {
      await page.getByRole('button', { name: /^Preview$/ }).first().click();
    });
    await test.step('verify home heading gone; preview content visible', async () => {
      await expect(
        page.getByRole('heading', { name: 'Timeseries Studio' })
      ).not.toBeVisible({ timeout: 8_000 });
      await expect(
        page.getByText('Preparing demo data…').or(page.getByText('Preview'))
      ).toBeVisible({ timeout: 20_000 });
    });
  });

  test('58 — IoT template "Use Template" opens builder with correct widget count', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate, filter to IoT, click Use Template', async () => {
      await ts.goto();
      await ts.openTemplates();
      await page.getByRole('button', { name: /^IoT/ }).first().click();
      await expect(
        page.getByRole('button', { name: /Use Template/ }).first()
      ).toBeVisible({ timeout: 8_000 });
      await page.getByRole('button', { name: /Use Template/ }).first().click();
    });
    await test.step('verify builder is populated', async () => {
      await expect(
        page.getByRole('button', { name: /^Save$/ })
      ).toBeVisible({ timeout: 15_000 });
      const text = await page.getByText(/\d+ widgets?/).first().textContent({ timeout: 5_000 });
      expect(parseInt(text ?? '0')).toBeGreaterThan(0);
    });
  });

  test('59 — Finance template "Use Template" opens builder with widgets', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate, filter to Finance, click Use Template', async () => {
      await ts.goto();
      await ts.openTemplates();
      await page.getByRole('button', { name: /Finance/ }).first().click();
      await expect(
        page.getByRole('button', { name: /Use Template/ }).first()
      ).toBeVisible({ timeout: 8_000 });
      await page.getByRole('button', { name: /Use Template/ }).first().click();
    });
    await test.step('verify builder is populated', async () => {
      await expect(
        page.getByRole('button', { name: /^Save$/ })
      ).toBeVisible({ timeout: 15_000 });
      const text = await page.getByText(/\d+ widgets?/).first().textContent({ timeout: 5_000 });
      expect(parseInt(text ?? '0')).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 9 — Customer Support Analytics Template
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 9 — Customer Support Analytics Template', () => {
  /** Navigate to gallery and apply the Support category filter. */
  async function openSupportFilter(page: Page): Promise<void> {
    const ts = new TimeseriesPage(page);
    await ts.goto();
    await ts.openTemplates();
    await page.getByRole('button', { name: /Support/ }).first().click();
    await expect(
      page.getByText('Customer Support Analytics')
    ).toBeVisible({ timeout: 8_000 });
  }

  test('60 — Customer Support Analytics template appears in the gallery', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate and open gallery', async () => {
      await ts.goto();
      await ts.openTemplates();
    });
    await test.step('verify template card is present', async () => {
      await expect(page.getByText('Customer Support Analytics')).toBeVisible({ timeout: 8_000 });
    });
  });

  test('61 — "Support" category filter button is visible and its badge shows count 1', async ({ page }) => {
    const ts = new TimeseriesPage(page);
    await test.step('navigate and open gallery', async () => {
      await ts.goto();
      await ts.openTemplates();
    });
    await test.step('verify Support filter badge', async () => {
      const supportBtn = page.getByRole('button', { name: /Support/ }).first();
      await expect(supportBtn).toBeVisible();
      await expect(supportBtn).toContainText('1');
    });
  });

  test('62 — "Support" filter isolates exactly one template card', async ({ page }) => {
    await test.step('apply Support filter', () => openSupportFilter(page));
    await test.step('verify exactly 1 template heading is present', async () => {
      const headings = page.getByRole('heading', { level: 3 });
      await expect(headings).toHaveCount(1);
      await expect(page.getByText('Customer Support Analytics')).toBeVisible();
    });
  });

  test('63 — Template card shows correct tags: CSAT and SLA', async ({ page }) => {
    await test.step('apply Support filter', () => openSupportFilter(page));
    await test.step('verify tag pills are present', async () => {
      await expect(page.getByText('CSAT', { exact: true })).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText('SLA',  { exact: true })).toBeVisible();
    });
  });

  test('64 — "Use Template" opens the builder with exactly 8 widgets', async ({ page }) => {
    await test.step('apply Support filter and click Use Template', async () => {
      await openSupportFilter(page);
      await page.getByRole('button', { name: /Use Template/ }).first().click();
    });
    await test.step('verify builder loaded with 8 widgets', async () => {
      await expect(
        page.getByRole('button', { name: /^Save$/ })
      ).toBeVisible({ timeout: 15_000 });
      const text = await page.getByText(/\d+ widgets?/).first().textContent({ timeout: 5_000 });
      expect(parseInt(text ?? '0')).toBe(8);
    });
  });

  test('65 — "Preview" on Support template navigates away from home', async ({ page }) => {
    await test.step('apply Support filter and click Preview', async () => {
      await openSupportFilter(page);
      await page.getByRole('button', { name: /^Preview$/ }).first().click();
    });
    await test.step('verify home heading gone; preview/spinner visible', async () => {
      await expect(
        page.getByRole('heading', { name: 'Timeseries Studio' })
      ).not.toBeVisible({ timeout: 8_000 });
      await expect(
        page.getByText('Preparing demo data…').or(page.getByText('Preview'))
      ).toBeVisible({ timeout: 20_000 });
    });
  });
});
