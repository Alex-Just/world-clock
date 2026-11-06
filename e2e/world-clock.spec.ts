import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'Europe/Madrid', viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-05T12:00:00Z') });
  await page.goto('/');
});

test('first run seeds zones and persists an added zone', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'World Clock' })).toBeVisible();
  await expect(page.getByText('New York')).toBeVisible();
  await page.getByRole('button', { name: /add zone/i }).click();
  await page.getByRole('combobox', { name: /search/i }).fill('kathmandu');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Kathmandu')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Kathmandu')).toBeVisible();
});

test('sets a focus and shows the same instant in another zone', async ({ page }) => {
  const ruler = page.getByTestId('ruler-surface');
  const box = await ruler.boundingBox();
  if (!box) throw new Error('ruler missing');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId('row-Europe/Madrid').getByText('12:00')).toBeVisible();
  await expect(page.getByTestId('row-America/New_York').getByText('06:00')).toBeVisible();
  await page.getByRole('button', { name: /^now$/i }).click();
  await expect(page.getByTestId('row-Europe/Madrid').getByText('13:00')).toBeVisible();
});

test('selects a range and shows a duration', async ({ page }) => {
  const ruler = page.getByTestId('ruler-surface');
  const box = await ruler.boundingBox();
  if (!box) throw new Error('ruler missing');
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('range-bar')).toContainText('6h');
  await expect(page.getByRole('button', { name: /details/i })).toBeVisible();
});

test('creates and expands a range directly on the board', async ({ page }) => {
  await expect(page.getByText(/click and drag the board/i)).toBeVisible();
  const timeline = page.getByTestId('row-Europe/Madrid').locator('[data-row-timeline]');
  const box = await timeline.boundingBox();
  if (!box) throw new Error('timeline missing');

  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();

  await expect(page.getByTestId('range-bar')).toContainText('6h');
  await expect(page.getByTestId('row-Europe/Madrid').getByText('06:00–12:00')).toBeVisible();
  await expect(page.getByTestId('range-outline')).toBeVisible();
});

test('jumps relative to now', async ({ page }) => {
  await page.getByRole('button', { name: /set time/i }).click();
  await page.getByRole('tab', { name: /relative/i }).click();
  await page.getByLabel(/amount/i).fill('3');
  await page.getByRole('button', { name: /apply/i }).click();
  await expect(page.getByRole('button', { name: /set time/i })).toContainText('16:00:00');
});

test('exports settings', async ({ page }) => {
  await page.getByRole('button', { name: /settings/i }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/world-clock.*\.json/);
});

test('is usable on a narrow viewport without gesture conflicts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('board-scroll')).toBeVisible();
  const ruler = page.getByTestId('ruler-surface');
  const box = await ruler.boundingBox();
  if (!box) throw new Error('ruler missing');
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('range-bar')).toBeVisible();
  await expect(page.getByTestId('focus-line')).toBeVisible();
});

test('passes an axe scan on the board and settings', async ({ page }) => {
  await expect(page.getByText('New York')).toBeVisible();
  const boardResults = await new AxeBuilder({ page }).analyze();
  expect(
    boardResults.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);

  await page.getByRole('button', { name: /settings/i }).click();
  const settingsResults = await new AxeBuilder({ page }).analyze();
  expect(
    settingsResults.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
});

test('highlights the hovered hour across every row', async ({ page }) => {
  const timeline = page.getByTestId('row-Europe/Madrid').locator('[data-timeline]');
  const box = await timeline.boundingBox();
  if (!box) throw new Error('timeline missing');

  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  const first = page.getByTestId('hover-slot');
  await expect(first).toBeVisible();
  const firstBox = await first.boundingBox();

  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
  const secondBox = await first.boundingBox();
  if (!firstBox || !secondBox) throw new Error('hover slot missing');
  expect(secondBox.x).toBeGreaterThan(firstBox.x);

  await page.mouse.move(10, 10);
  await expect(first).toBeHidden();
});

test('passes an axe scan in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await expect(page.getByText('New York')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
});

test('zone menu renders above every row and inside the viewport', async ({ page }) => {
  await page
    .getByTestId('row-America/New_York')
    .getByRole('button', { name: /actions for new york/i })
    .click();
  const menu = page.getByRole('menu', { name: /actions for new york/i });
  await expect(menu).toBeVisible();

  const hit = await menu.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const target = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return target !== null && node.contains(target);
  });
  expect(hit).toBe(true);

  for (const item of await menu.getByRole('menuitem').all()) {
    await expect(item).toBeVisible();
    const box = await item.boundingBox();
    if (!box) throw new Error('menu item missing');
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0);
  }
});

test('zone menu stays inside the viewport on the last row', async ({ page }) => {
  await page
    .getByTestId('row-America/Chicago')
    .getByRole('button', { name: /actions for chicago/i })
    .click();
  const menu = page.getByRole('menu', { name: /actions for chicago/i });
  await expect(menu).toBeVisible();
  const rect = await menu.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return {
      top: box.top,
      right: box.right,
      bottom: box.bottom,
      left: box.left,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    };
  });
  expect(rect.top).toBeGreaterThanOrEqual(0);
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.bottom).toBeLessThanOrEqual(rect.viewportHeight);
  expect(rect.right).toBeLessThanOrEqual(rect.viewportWidth);
});

test('zone menu works on a narrow viewport and dismisses cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page
    .getByTestId('row-America/New_York')
    .getByRole('button', { name: /actions for new york/i });
  await trigger.click();
  const menu = page.getByRole('menu', { name: /actions for new york/i });
  await expect(menu).toBeVisible();

  const rect = await menu.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { left: box.left, right: box.right };
  });
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.right).toBeLessThanOrEqual(390);

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();

  await trigger.click();
  await expect(menu).toBeVisible();
  await page.mouse.click(360, 80);
  await expect(menu).toBeHidden();

  await trigger.click();
  await expect(menu).toBeVisible();
  await trigger.click();
  await expect(menu).toBeHidden();
});

test('renames a zone through the menu', async ({ page }) => {
  await page
    .getByTestId('row-America/New_York')
    .getByRole('button', { name: /actions for new york/i })
    .click();
  await page
    .getByRole('menu', { name: /actions for new york/i })
    .getByRole('menuitem', { name: /rename/i })
    .click();
  const dialog = page.getByRole('dialog', { name: /edit zone/i });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/display name/i).fill('NYC');
  await dialog.getByRole('button', { name: /save/i }).click();
  await expect(page.getByTestId('row-America/New_York')).toContainText('NYC');
});

test('zone menu supports the keyboard and restores focus', async ({ page }) => {
  const trigger = page
    .getByTestId('row-America/New_York')
    .getByRole('button', { name: /actions for new york/i });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu', { name: /actions for new york/i });
  await expect(menu).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(menu.getByRole('menuitem', { name: /set as home/i })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('zone menu actions set home, move, and remove with undo', async ({ page }) => {
  const ny = page.getByTestId('row-America/New_York');
  await ny.getByRole('button', { name: /actions for new york/i }).click();
  await page
    .getByRole('menu', { name: /actions for new york/i })
    .getByRole('menuitem', { name: /set as home/i })
    .click();
  await expect(ny.getByText('Home zone')).toBeAttached();

  await ny.getByRole('button', { name: /actions for new york/i }).click();
  await page
    .getByRole('menu', { name: /actions for new york/i })
    .getByRole('menuitem', { name: /move down/i })
    .click();
  const utcBox = await page.getByTestId('row-UTC').boundingBox();
  const nyBox = await ny.boundingBox();
  if (!utcBox || !nyBox) throw new Error('rows missing');
  expect(nyBox.y).toBeGreaterThan(utcBox.y);

  const delhi = page.getByTestId('row-Asia/Kolkata');
  await delhi.getByRole('button', { name: /actions for delhi/i }).click();
  await page
    .getByRole('menu', { name: /actions for delhi/i })
    .getByRole('menuitem', { name: /remove/i })
    .click();
  await expect(delhi).toHaveCount(0);
  await page.getByRole('status').getByRole('button', { name: /undo/i }).click();
  await expect(page.getByTestId('row-Asia/Kolkata')).toBeVisible();
});

test('zone menu follows its anchor while the page scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  const trigger = page
    .getByTestId('row-America/New_York')
    .getByRole('button', { name: /actions for new york/i });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const menu = page.getByRole('menu', { name: /actions for new york/i });
  await expect(menu).toBeVisible();

  const before = await menu.boundingBox();
  await page.evaluate(() => {
    window.scrollBy(0, 60);
  });
  await page.waitForTimeout(100);
  const after = await menu.boundingBox();
  const triggerBox = await trigger.boundingBox();
  if (!before || !after || !triggerBox) throw new Error('menu or trigger missing');
  expect(after.y).toBeLessThan(before.y);
  expect(Math.abs(after.y - (triggerBox.y + triggerBox.height + 4))).toBeLessThan(2);
});

test('passes an axe scan with the zone menu open in both themes', async ({ page }) => {
  await page
    .getByTestId('row-America/New_York')
    .getByRole('button', { name: /actions for new york/i })
    .click();
  await expect(page.getByRole('menu', { name: /actions for new york/i })).toBeVisible();

  const light = await new AxeBuilder({ page }).analyze();
  expect(light.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
    [],
  );

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await expect(page.getByText('New York')).toBeVisible();
  await page
    .getByTestId('row-America/New_York')
    .getByRole('button', { name: /actions for new york/i })
    .click();
  await expect(page.getByRole('menu', { name: /actions for new york/i })).toBeVisible();
  const dark = await new AxeBuilder({ page }).analyze();
  expect(dark.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
    [],
  );
});

test('applies explicit dark theme while the OS is light', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.getByRole('button', { name: /settings/i }).click();
  await page.getByRole('radio', { name: /^dark$/i }).check();
  await page.getByRole('button', { name: /close settings/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.waitForTimeout(250);

  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
});
