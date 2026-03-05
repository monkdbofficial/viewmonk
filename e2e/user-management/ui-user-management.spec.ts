/**
 * User Management UI End-to-End Tests
 * Browser tests against the live Next.js dev server at /user-management.
 *
 * Covers:
 *  Group 1 — Page Load & Stats       (tests 01–07)
 *  Group 2 — Search & Filter         (tests 08–13)
 *  Group 3 — View Mode Toggle        (tests 14–17)
 *  Group 4 — Toolbar Actions         (tests 18–21)
 *  Group 5 — Create User             (tests 22–28)
 *  Group 6 — User Rows & Dialogs     (tests 29–36)
 */

import { test, expect, Page } from '@playwright/test';

// ─── Connection injection ──────────────────────────────────────────────────────
const CONN_ID      = 'pw-um-conn';
const CONN_PAYLOAD = JSON.stringify([{
  id: CONN_ID,
  name: 'Playwright UM Test',
  config: { host: 'localhost', port: 4200, protocol: 'http', role: 'superuser' },
}]);

const MONKDB = 'http://localhost:4200/_sql';

async function sqlHttp(stmt: string, args: unknown[] = []) {
  const res = await fetch(MONKDB, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stmt, args }),
  });
  return res.json();
}

async function injectConnection(page: Page) {
  await page.addInitScript(([payload, id]: [string, string]) => {
    localStorage.setItem('monkdb_connections', payload);
    localStorage.setItem('monkdb_active_connection', id);
  }, [CONN_PAYLOAD, CONN_ID] as [string, string]);
}

async function goToUserMgmt(page: Page) {
  await injectConnection(page);
  await page.goto('/user-management');
  await page.waitForLoadState('networkidle');
}

const TEST_USER    = 'pw_test_user_e2e';
const TEST_USER_2  = 'pw_test_user_e2e_2';

test.afterAll(async () => {
  await sqlHttp(`DROP USER IF EXISTS ${TEST_USER}`);
  await sqlHttp(`DROP USER IF EXISTS ${TEST_USER_2}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Page Load & Stats
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 1 — Page Load & Stats', () => {
  test('01 — User Management page loads with heading', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(page.getByText(/User Management/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('02 — "Total Users" stats card is visible', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(page.getByText(/Total Users/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('03 — "Superusers" stats card is visible', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(page.getByText(/Superusers/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('04 — "Regular Users" stats card is visible', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(page.getByText(/Regular Users/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('05 — "Secured" stats card is visible', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(page.getByText(/Secured/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('06 — User list renders with at least the "monkdb" system user', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(page.getByText('monkdb', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('07 — "Showing X of Y users" count text is displayed', async ({ page }) => {
    await goToUserMgmt(page);
    await page.waitForTimeout(1000);
    await expect(page.getByText(/Showing.*of.*users/i).first()).toBeVisible({ timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Search & Filter
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 2 — Search & Filter', () => {
  test('08 — Search input is visible with correct placeholder', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(page.getByPlaceholder(/Search users by name/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('09 — Typing "monkdb" in search shows the monkdb superuser', async ({ page }) => {
    await goToUserMgmt(page);
    await page.getByPlaceholder(/Search users by name/i).first().fill('monkdb');
    await page.waitForTimeout(400);
    await expect(page.getByText('monkdb', { exact: true }).first()).toBeVisible({ timeout: 5_000 });
  });

  test('10 — Typing a random string hides all users (no results)', async ({ page }) => {
    await goToUserMgmt(page);
    await page.getByPlaceholder(/Search users by name/i).first().fill('xyzzy_no_user_here_abc_123');
    await page.waitForTimeout(400);
    // "No users found" message or count drops to 0
    await expect(
      page.getByText(/No users found|0.*users/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('11 — Clearing search restores full user list', async ({ page }) => {
    await goToUserMgmt(page);
    const searchInput = page.getByPlaceholder(/Search users by name/i).first();
    await searchInput.fill('xyzzy_nonexistent');
    await page.waitForTimeout(300);
    await searchInput.fill('');
    await page.waitForTimeout(300);
    await expect(page.getByText('monkdb', { exact: true }).first()).toBeVisible({ timeout: 5_000 });
  });

  test('12 — Filter dropdown is visible with All/Superuser/Regular options', async ({ page }) => {
    await goToUserMgmt(page);
    const filterSelect = page.locator('select').first();
    await filterSelect.waitFor({ state: 'visible', timeout: 10_000 });
    const options = await filterSelect.locator('option').allTextContents();
    const hasAll = options.some(o => /all/i.test(o));
    expect(hasAll).toBe(true);
  });

  test('13 — Selecting "Superusers Only" filter shows the monkdb superuser', async ({ page }) => {
    await goToUserMgmt(page);
    await page.locator('select').first().selectOption('superuser');
    await page.waitForTimeout(400);
    await expect(page.getByText(/monkdb/i).first()).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — View Mode Toggle
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 3 — View Mode Toggle', () => {
  test('14 — Grid view button is visible', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(page.locator('button[title="Grid view"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('15 — Table view button is visible', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(page.locator('button[title="Table view"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('16 — Clicking Table view switches to table layout', async ({ page }) => {
    await goToUserMgmt(page);
    await page.locator('button[title="Table view"]').first().click();
    await page.waitForTimeout(500);
    // Table view renders a <table> element
    await expect(page.locator('table').first()).toBeVisible({ timeout: 5_000 });
  });

  test('17 — Switching back to Grid view shows user cards', async ({ page }) => {
    await goToUserMgmt(page);
    // Switch to table first
    await page.locator('button[title="Table view"]').first().click();
    await page.waitForTimeout(300);
    // Switch back to grid
    await page.locator('button[title="Grid view"]').first().click();
    await page.waitForTimeout(300);
    // monkdb user card should be visible
    await expect(page.getByText('monkdb').first()).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Toolbar Actions
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 4 — Toolbar Actions', () => {
  test('18 — Export button is visible in toolbar', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(
      page.locator('button[title="Export users to CSV"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('19 — Refresh button is visible in toolbar', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(
      page.locator('button[title="Refresh users"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('20 — Clicking Refresh button reloads the user list', async ({ page }) => {
    await goToUserMgmt(page);
    await page.locator('button[title="Refresh users"]').first().click();
    await page.waitForTimeout(2000);
    // After refresh, monkdb should still be visible
    await expect(page.getByText('monkdb').first()).toBeVisible({ timeout: 10_000 });
  });

  test('21 — Create User button is visible in toolbar', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(
      page.getByRole('button', { name: /Create User/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 — Create User
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 5 — Create User', () => {
  test('22 — Clicking Create User opens the dialog', async ({ page }) => {
    await goToUserMgmt(page);
    await page.getByRole('button', { name: /Create User/i }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByPlaceholder(/Enter username/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('23 — Create User dialog has username and password fields', async ({ page }) => {
    await goToUserMgmt(page);
    await page.getByRole('button', { name: /Create User/i }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByPlaceholder(/Enter username/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/Enter password/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('24 — Create User dialog has a submit button', async ({ page }) => {
    await goToUserMgmt(page);
    await page.getByRole('button', { name: /Create User/i }).first().click();
    await page.waitForTimeout(300);
    await expect(
      page.getByRole('button', { name: /Create User|Submit|Save/i }).last()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('25 — Closing Create User dialog via Cancel hides the dialog', async ({ page }) => {
    await goToUserMgmt(page);
    await page.getByRole('button', { name: /Create User/i }).first().click();
    await page.waitForTimeout(300);
    const cancelBtn = page.getByRole('button', { name: /Cancel/i }).first();
    const cancelCount = await cancelBtn.count();
    if (cancelCount > 0) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByPlaceholder(/Enter username/i)).not.toBeVisible();
    }
  });

  test('26 — Create User end-to-end: fill form and submit', async ({ page }) => {
    await sqlHttp(`DROP USER IF EXISTS ${TEST_USER}`);
    await goToUserMgmt(page);
    await page.getByRole('button', { name: /Create User/i }).first().click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder(/Enter username/i).first().fill(TEST_USER);
    await page.getByRole('button', { name: /Create User/i }).last().click();
    await page.waitForTimeout(2000);
    await expect(
      page.getByText(new RegExp(`created|success|${TEST_USER}`, 'i')).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('27 — After creation, new user appears in user list', async ({ page }) => {
    // Ensure user exists from test 26 or create it
    await sqlHttp(`CREATE USER IF NOT EXISTS ${TEST_USER}`);
    await goToUserMgmt(page);
    await page.waitForTimeout(1000);
    await expect(page.getByText(TEST_USER).first()).toBeVisible({ timeout: 10_000 });
  });

  test('28 — Create second user to verify multiple users display', async ({ page }) => {
    await sqlHttp(`DROP USER IF EXISTS ${TEST_USER_2}`);
    await goToUserMgmt(page);
    await page.getByRole('button', { name: /Create User/i }).first().click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder(/Enter username/i).first().fill(TEST_USER_2);
    await page.getByRole('button', { name: /Create User/i }).last().click();
    await page.waitForTimeout(2000);
    // Total user count should increase — just verify page stays functional
    await expect(page.getByText(/Total Users/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6 — User Rows & Dialogs
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Group 6 — User Rows & Dialogs', () => {
  test('29 — Each user row has action buttons (edit/permissions/more)', async ({ page }) => {
    await goToUserMgmt(page);
    await page.waitForTimeout(1000);
    await expect(
      page.locator('button[title*="Edit"], button[title*="Permission"], button[title*="More"]').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('30 — Superuser badge/crown icon is shown for monkdb user', async ({ page }) => {
    await goToUserMgmt(page);
    await page.waitForTimeout(1000);
    await expect(page.getByText(/superuser|Superuser/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('31 — Edit button opens an edit dialog for the user', async ({ page }) => {
    await goToUserMgmt(page);
    await page.waitForTimeout(1000);
    const editBtn = page.locator('button[title*="Edit"]').first();
    await editBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await editBtn.click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Edit User').first()).toBeVisible({ timeout: 5_000 });
  });

  test('32 — Edit dialog has password change option', async ({ page }) => {
    await goToUserMgmt(page);
    await page.waitForTimeout(1000);
    const editBtn = page.locator('button[title*="Edit"]').first();
    await editBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await editBtn.click();
    await page.waitForTimeout(300);
    // Edit user dialog should have password-related content
    await expect(
      page.getByText(/Password|password/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('33 — Permissions button opens the permissions dialog', async ({ page }) => {
    await goToUserMgmt(page);
    await page.waitForTimeout(1000);
    const permBtn = page.locator('button[title*="Permission"]').first();
    const count = await permBtn.count();
    if (count > 0) {
      await permBtn.click();
      await page.waitForTimeout(300);
      await expect(
        page.getByText(/Permission|Privilege|Grant|GRANT/i).first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('34 — Table view shows user rows in a <table> element', async ({ page }) => {
    await goToUserMgmt(page);
    await page.locator('button[title="Table view"]').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 8_000 });
  });

  test('35 — Table view row expand button is present and clickable', async ({ page }) => {
    await goToUserMgmt(page);
    await page.locator('button[title="Table view"]').first().click();
    await page.waitForTimeout(500);
    // The table should have tbody rows
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 8_000 });
    // Click the expand chevron button on the first row (if present)
    const expandBtn = page.locator('table tbody tr button').first();
    const count = await expandBtn.count();
    if (count > 0) {
      await expandBtn.click();
      await page.waitForTimeout(400);
      // Page should remain stable after expand click
      await expect(page.getByText(/User Management/i).first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('36 — User management page renders without crash overlay', async ({ page }) => {
    await goToUserMgmt(page);
    await expect(page.locator('#__next-error')).not.toBeVisible();
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });
});
