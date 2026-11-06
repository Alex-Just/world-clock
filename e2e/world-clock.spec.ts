import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator } from '@playwright/test';

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
  await expect(page.getByTestId('row-America/New_York').getByText('New York')).toBeVisible();
  await expect(page.getByTestId('row-America/New_York').getByText('EST')).toBeVisible();
  const rowHeights = await page.getByTestId('row-America/New_York').evaluate((row) => ({
    row: row.getBoundingClientRect().height,
    timeline: row.querySelector('[data-row-timeline]')?.getBoundingClientRect().height ?? 0,
  }));
  expect(Math.abs(rowHeights.row - rowHeights.timeline)).toBeLessThanOrEqual(1);
  const ruler = page.getByTestId('ruler-surface');
  const box = await ruler.boundingBox();
  if (!box) throw new Error('ruler missing');
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('range-bar')).toBeVisible();
  await expect(page.getByTestId('focus-line')).toBeVisible();
  const focusStroke = await page.getByTestId('focus-line').evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: style.borderLeftWidth, filter: style.filter };
  });
  expect(focusStroke.width).toBe('2px');
  expect(focusStroke.filter).not.toBe('none');
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

  await page.getByLabel('Start').fill('09:00');
  await page.getByLabel('End').fill('09:00');
  await expect(page.getByText('Start and end must differ.')).toBeVisible();
  const validationResults = await new AxeBuilder({ page }).analyze();
  expect(
    validationResults.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
});

test('preselects the focus hour and follows hover across every row', async ({ page }) => {
  const timeline = page.getByTestId('row-Europe/Madrid').locator('[data-timeline]');
  const box = await timeline.boundingBox();
  if (!box) throw new Error('timeline missing');
  const slot = page.getByTestId('hover-slot');
  await expect(slot).toBeVisible();
  const resting = await slot.boundingBox();

  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  const hovered = await slot.boundingBox();
  expect(hovered?.x).not.toBe(resting?.x);

  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
  const second = await slot.boundingBox();
  if (!hovered || !second) throw new Error('hover slot missing');
  expect(second.x).toBeGreaterThan(hovered.x);

  const hourWeight = async (hour: string) =>
    page
      .getByTestId('row-Europe/Madrid')
      .locator('[data-testid="hour-label"]', { hasText: new RegExp(`^${hour}$`) })
      .evaluate((element) => getComputedStyle(element).fontWeight);
  expect(await hourWeight('18')).toBe('600');

  await page.mouse.move(10, 10);
  await expect(slot).toBeVisible();
  const returned = await slot.boundingBox();
  expect(returned?.x).toBeCloseTo(resting?.x ?? -1, 0);
  expect(await hourWeight('13')).toBe('600');
});

test('emphasizes the home row and the hovered row', async ({ page }) => {
  const madrid = page.getByTestId('row-Europe/Madrid');
  const newYork = page.getByTestId('row-America/New_York');
  const madridCell = madrid.locator('[role="gridcell"]').first();
  const newYorkCell = newYork.locator('[role="gridcell"]').first();
  expect(
    await madridCell.evaluate((element) => getComputedStyle(element).backgroundColor),
  ).not.toBe(await newYorkCell.evaluate((element) => getComputedStyle(element).backgroundColor));

  const restingBackground = await newYorkCell.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await newYorkCell.hover();
  await page.waitForTimeout(200);
  expect(
    await newYorkCell.evaluate((element) => getComputedStyle(element).backgroundColor),
  ).not.toBe(restingBackground);

  await page.mouse.move(10, 10);
  await page.waitForTimeout(200);
  expect(await newYorkCell.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
    restingBackground,
  );
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
    .getByTestId('row-Asia/Kolkata')
    .getByRole('button', { name: /actions for delhi/i })
    .click();
  const menu = page.getByRole('menu', { name: /actions for delhi/i });
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
  await page.mouse.click(380, 400);
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
  await page.setViewportSize({ width: 1440, height: 500 });
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
  expect(after.y).toBeGreaterThanOrEqual(0);
  expect(after.y + after.height).toBeLessThanOrEqual(500);
  expect(triggerBox.y).toBeGreaterThanOrEqual(0);
});

test('passes an axe scan with the zone menu open in both themes', async ({ page }) => {
  await page
    .getByTestId('row-America/New_York')
    .getByRole('button', { name: /actions for new york/i })
    .click();
  await expect(page.getByRole('menu', { name: /actions for new york/i })).toBeVisible();
  await page.waitForTimeout(200);

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

test('keeps light theme readable while the OS is dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await expect(page.getByText('New York')).toBeVisible();
  await page.getByRole('button', { name: /settings/i }).click();
  await page.getByRole('radio', { name: /^light$/i }).check();
  await page.getByRole('button', { name: /close settings/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.waitForTimeout(250);

  const daytime = page.getByTestId('row-America/New_York').getByText('Daytime');
  await expect(daytime).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
});

test('keeps timeline hour and date labels readable', async ({ page }) => {
  await expect(page.getByText('New York')).toBeVisible();
  const sizes = await page.evaluate(() => {
    const fontSize = (selector: string): number | null => {
      const element = document.querySelector(selector);
      return element ? Number.parseFloat(getComputedStyle(element).fontSize) : null;
    };
    return {
      rulerHour: fontSize('[data-testid="ruler-surface"] [data-testid="hour-label"]'),
      rowHour: fontSize('[data-testid="row-Europe/Madrid"] [data-testid="hour-label"]'),
      dayMarker: fontSize('[data-testid="row-Europe/Madrid"] [data-testid="day-marker"]'),
    };
  });
  expect(sizes.rulerHour).toBeGreaterThanOrEqual(12);
  expect(sizes.rowHour).toBeGreaterThanOrEqual(12);
  expect(sizes.dayMarker).toBeGreaterThanOrEqual(12);
});

test('uses no text smaller than 12px', async ({ page }) => {
  await expect(page.getByText('New York')).toBeVisible();
  const offenders = await page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((element) => {
        const hasText = [...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        );
        if (!hasText) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (rect.width < 2 || rect.height < 2) return false;
        return Number.parseFloat(style.fontSize) < 12;
      })
      .map((element) => ({
        text: element.textContent.trim().slice(0, 40),
        size: getComputedStyle(element).fontSize,
        className: element.getAttribute('class'),
      })),
  );
  expect(offenders).toEqual([]);
});

test('uses 16px form fields and 24px targets on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('row-America/New_York').getByText('New York')).toBeVisible();
  await page.getByRole('button', { name: /settings/i }).click();

  const field = await page.getByLabel('Start').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { fontSize: Number.parseFloat(getComputedStyle(element).fontSize), height: rect.height };
  });
  expect(field.fontSize).toBeGreaterThanOrEqual(16);
  expect(field.height).toBeGreaterThanOrEqual(44);

  await page.getByRole('button', { name: /close settings/i }).click();
  const targets = await page
    .locator(
      'header button, nav[aria-label="Days"] button, [data-testid^="row-"] button[aria-haspopup="menu"]',
    )
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            label: element.getAttribute('aria-label') ?? element.textContent.trim(),
            width: rect.width,
            height: rect.height,
          };
        }),
    );
  for (const target of targets) {
    expect(target.width, `${target.label} width`).toBeGreaterThanOrEqual(24);
    expect(target.height, `${target.label} height`).toBeGreaterThanOrEqual(24);
  }
});

test('hides redundant offset abbreviations and simplifies UTC offsets', async ({ page }) => {
  await expect(page.getByText('New York')).toBeVisible();
  const madrid = page.getByTestId('row-Europe/Madrid');
  await expect(madrid.getByText('UTC+1', { exact: true })).toBeVisible();
  await expect(madrid.getByText('GMT+1', { exact: true })).toHaveCount(0);
  await expect(
    page.getByTestId('row-Europe/Moscow').getByText('UTC+3', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('row-UTC').getByText('UTC', { exact: true })).toHaveCount(1);
  await expect(
    page.getByTestId('row-America/Los_Angeles').getByText('PST', { exact: true }),
  ).toBeVisible();
});

test('uses the 16px base size for menus and settings controls', async ({ page }) => {
  await page
    .getByTestId('row-Asia/Kolkata')
    .getByRole('button', { name: /actions for delhi/i })
    .click();
  const menu = page.getByRole('menu', { name: /actions for delhi/i });
  await expect(menu).toBeVisible();
  const menuSizes = await menu
    .getByRole('menuitem')
    .evaluateAll((items) =>
      items.map((item) => Number.parseFloat(getComputedStyle(item).fontSize)),
    );
  expect(menuSizes.every((size) => size >= 16)).toBe(true);

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /settings/i }).click();
  const controlSizes = await page.evaluate(() => {
    const dialog = document.querySelector('dialog[aria-label="Settings"]');
    if (!dialog) return null;
    const fields = [...dialog.querySelectorAll('input, select, button')].filter(
      (element) => element.getBoundingClientRect().width > 0,
    );
    return fields.map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  });
  expect(controlSizes).not.toBeNull();
  expect(controlSizes?.every((size) => size >= 16)).toBe(true);
  const zone = page
    .getByRole('dialog', { name: /settings/i })
    .getByText('San Francisco')
    .first();
  expect(await zone.evaluate((element) => getComputedStyle(element).fontSize)).toBe('16px');
});

test('keeps the board in place when a range appears', async ({ page }) => {
  const board = page.getByTestId('board-scroll');
  const before = await board.boundingBox();
  const ruler = page.getByTestId('ruler-surface');
  const box = await ruler.boundingBox();
  if (!before || !box) throw new Error('layout missing');
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('range-bar')).toBeVisible();
  const after = await board.boundingBox();
  if (!after) throw new Error('board missing');
  expect(after.y).toBe(before.y);

  await page.setViewportSize({ width: 390, height: 844 });
  const row = page.getByTestId('row-America/New_York');
  const rowBefore = await row.boundingBox();
  await page.getByRole('button', { name: /clear/i }).click();
  const normalRow = await row.boundingBox();
  if (!rowBefore || !normalRow) throw new Error('row missing');
  expect(rowBefore.height).toBe(normalRow.height);
});

test('restores hover after closing the menu and outside pointerdown', async ({ page }) => {
  await expect(page.getByTestId('relative-badge')).toBeHidden();
  const timeline = page.getByTestId('row-America/New_York').locator('[data-timeline]');
  const box = await timeline.boundingBox();
  const cell = page.getByTestId('row-America/New_York').locator('[role="gridcell"]').first();
  if (!box) throw new Error('timeline missing');
  const slot = page.getByTestId('hover-slot');
  const resting = await slot.boundingBox();

  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  await page.waitForTimeout(100);
  expect((await slot.boundingBox())?.x).not.toBe(resting?.x);
  expect(await cell.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(
    'rgb(255, 255, 255)',
  );

  // This pointerdown has no preceding pointer movement, so only the
  // document-level reset can clear the hover state.
  await page.evaluate(() => {
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5 }),
    );
  });
  await page.waitForTimeout(100);
  expect((await slot.boundingBox())?.x).toBeCloseTo(resting?.x ?? -1, 0);
  expect(await cell.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
    'rgb(255, 255, 255)',
  );

  const trigger = page
    .getByTestId('row-America/New_York')
    .getByRole('button', { name: /actions for new york/i });
  await trigger.click();
  const menu = page.getByRole('menu', { name: /actions for new york/i });
  await expect(menu).toBeVisible();
  await page.mouse.click(10, 500);
  await expect(menu).toBeHidden();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
  await page.waitForTimeout(100);
  expect((await slot.boundingBox())?.x).not.toBe(resting?.x);

  await trigger.click();
  await expect(menu).toBeVisible();
  await trigger.click();
  await expect(menu).toBeHidden();
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height / 2);
  await page.waitForTimeout(100);
  expect((await slot.boundingBox())?.x).not.toBe(resting?.x);
});

test('keeps work-hour markings warm instead of night blue', async ({ page }) => {
  const segment = page.getByTestId('ruler-surface').getByTestId('work-segment').first();
  await expect(segment).toBeVisible();
  const channels = await segment.evaluate((element) => {
    const color = getComputedStyle(element).backgroundColor;
    return (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  });
  expect(channels).toHaveLength(3);
  const [red = 0, , blue = 0] = channels;
  expect(red).toBeGreaterThan(blue);
  expect(
    await page
      .getByTestId('work-cell')
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe('rgb(255, 255, 255)');
  await expect(page.getByTestId('home-row-fill')).toBeVisible();
});

test('keeps the header height when the relative badge appears', async ({ page }) => {
  for (const width of [700, 800]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    await page.getByTestId('board-scroll').waitFor();
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    const board = page.getByTestId('board-scroll');
    const before = await board.boundingBox();
    if (!before) throw new Error('board missing');

    await page.getByRole('button', { name: /set time/i }).click();
    await page.getByRole('tab', { name: /relative/i }).click();
    await page.getByLabel(/amount/i).fill('3');
    await page.getByRole('button', { name: /apply/i }).click();
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await expect(page.getByTestId('relative-badge')).toBeVisible();
    const focused = await board.boundingBox();
    if (!focused) throw new Error('board missing');
    expect(focused.y).toBe(before.y);

    await page.getByRole('button', { name: /^now$/i }).click();
    await expect(page.getByTestId('relative-badge')).toBeHidden();
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    const restored = await board.boundingBox();
    if (!restored) throw new Error('board missing');
    expect(restored.y).toBe(before.y);
  }
});

test('keeps mobile range labels inside the zone cell', async ({ page }) => {
  for (const { width, twentyFourHour } of [
    { width: 320, twentyFourHour: false },
    { width: 390, twentyFourHour: false },
    { width: 320, twentyFourHour: true },
    { width: 390, twentyFourHour: true },
  ]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByLabel(/24-hour time/i).setChecked(twentyFourHour);
    await page.getByRole('button', { name: /close settings/i }).click();

    const clear = page.getByRole('button', { name: /^clear$/i });
    if ((await clear.count()) > 0) await clear.click();

    const ruler = page.getByTestId('ruler-surface');
    await ruler.scrollIntoViewIfNeeded();
    const box = await ruler.boundingBox();
    if (!box) throw new Error('ruler missing');
    const startX = Math.max(box.x + 20, 170);
    const endX = Math.min(box.x + box.width - 20, startX + 80);
    await page.mouse.move(startX, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(endX, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId('range-bar')).toBeVisible();

    const time = page.getByTestId('range-time');
    const details = page.getByRole('button', { name: /^details$/i });
    const [timeBox, detailsBox] = await Promise.all([time.boundingBox(), details.boundingBox()]);
    if (!timeBox || !detailsBox) throw new Error('range bar content missing');
    expect(timeBox.x + timeBox.width).toBeLessThanOrEqual(detailsBox.x - 2);

    const label = page.getByTestId('range-label-value').first();
    await expect(label).toBeVisible();
    const bleeds = await page.evaluate(() => {
      const cell = document.querySelector('[data-testid="row-America/New_York"] [role="gridcell"]');
      const label = document.querySelector(
        '[data-testid="row-America/New_York"] [data-testid="range-label-value"]',
      );
      if (!cell || !label) return true;
      const cellRect = cell.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const target = document.elementFromPoint(
        cellRect.right + 3,
        labelRect.top + labelRect.height / 2,
      );
      return target !== null && label.contains(target);
    });
    expect(bleeds).toBe(false);
  }
});

test('keeps narrow 12-hour headers from overflowing', async ({ page }) => {
  for (const width of [320, 560]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    await page.getByTestId('board-scroll').waitFor();
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByLabel(/24-hour time/i).setChecked(false);
    await page.getByRole('button', { name: /close settings/i }).click();
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByTestId('relative-badge')).toBeHidden();
  }
});

test('centers hour labels between boundary ticks', async ({ page }) => {
  await expect(page.getByText('New York')).toBeVisible();
  const ruler = page.getByTestId('ruler-surface');
  const labels = ruler.getByTestId('hour-label');
  const ticks = ruler.getByTestId('hour-tick');
  const labelCount = await labels.count();
  expect(labelCount).toBeGreaterThanOrEqual(24);
  expect(await ticks.count()).toBe(labelCount);

  const rulerBox = await ruler.boundingBox();
  if (!rulerBox) throw new Error('ruler missing');
  const index = Math.min(5, labelCount - 1);
  const [labelBox, tickBox] = await Promise.all([
    labels.nth(index).boundingBox(),
    ticks.nth(index).boundingBox(),
  ]);
  if (!labelBox || !tickBox) throw new Error('hour marker missing');
  const expectedOffset = rulerBox.width / labelCount / 2;
  expect(
    Math.abs(labelBox.x + labelBox.width / 2 - (tickBox.x + tickBox.width / 2) - expectedOffset),
  ).toBeLessThan(2);

  const row = page.getByTestId('row-Europe/Madrid');
  const rowLabels = row.getByTestId('hour-label');
  const rowTicks = row.getByTestId('hour-tick');
  const rowCount = await rowLabels.count();
  const timelineBox = await row.locator('[data-row-timeline]').boundingBox();
  if (!timelineBox) throw new Error('row timeline missing');
  const [rowLabelBox, rowTickBox] = await Promise.all([
    rowLabels.nth(index).boundingBox(),
    rowTicks.nth(index).boundingBox(),
  ]);
  if (!rowLabelBox || !rowTickBox) throw new Error('row hour marker missing');
  const rowExpectedOffset = timelineBox.width / rowCount / 2;
  expect(
    Math.abs(
      rowLabelBox.x +
        rowLabelBox.width / 2 -
        (rowTickBox.x + rowTickBox.width / 2) -
        rowExpectedOffset,
    ),
  ).toBeLessThan(2);
});

test('keeps row hour ticks above white work cells', async ({ page }) => {
  const row = page.getByTestId('row-Europe/Madrid');
  const tick = row.getByTestId('hour-tick').nth(10);
  const workCell = row.getByTestId('work-cell').first();
  const [tickBox, workBox] = await Promise.all([tick.boundingBox(), workCell.boundingBox()]);
  if (!tickBox || !workBox) throw new Error('hour marker or work cell missing');
  expect(tickBox.x).toBeGreaterThan(workBox.x);
  expect(tickBox.x).toBeLessThan(workBox.x + workBox.width);

  const [tickZ, workZ] = await Promise.all([
    tick.evaluate((element) => getComputedStyle(element).zIndex),
    workCell.evaluate((element) => getComputedStyle(element).zIndex),
  ]);
  expect(Number(tickZ)).toBeGreaterThan(Number(workZ));
});

test('escape clears the range and then returns to now', async ({ page }) => {
  const grid = page.getByRole('grid', { name: /world clock/i });
  const ruler = page.getByTestId('ruler-surface');
  const box = await ruler.boundingBox();
  if (!box) throw new Error('ruler missing');

  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('range-bar')).toBeVisible();
  await expect(grid).toHaveAttribute('data-following', 'false');

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('range-bar')).toBeHidden();
  await expect(grid).toHaveAttribute('data-following', 'false');

  await page.keyboard.press('Escape');
  await expect(grid).toHaveAttribute('data-following', 'true');
  await expect(page.getByTestId('relative-badge')).toBeHidden();
});

test('hides the now marker when viewing another day', async ({ page }) => {
  await expect(page.getByTestId('focus-line')).toBeVisible();
  await expect(page.getByTestId('now-line')).toBeVisible();

  await page.getByRole('button', { name: 'Sat 7 2026' }).click();
  await expect(page.getByTestId('focus-line')).toBeHidden();
  await expect(page.getByTestId('focus-handle')).toBeHidden();
  await expect(page.getByTestId('now-line')).toBeHidden();
  await expect(page.getByTestId('relative-badge')).toBeVisible();

  await page.getByRole('button', { name: /^today$/i }).click();
  await expect(page.getByTestId('focus-line')).toBeVisible();
  await expect(page.getByTestId('now-line')).toBeVisible();
});

test('dims everything outside the hovered row and hour', async ({ page }) => {
  const timeline = page.getByTestId('row-America/New_York').locator('[data-row-timeline]');
  const box = await timeline.boundingBox();
  if (!box) throw new Error('timeline missing');

  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height / 2);
  await expect(
    page.getByTestId('row-America/New_York').getByTestId('crosshair-dim-left'),
  ).toHaveCSS('opacity', '0');
  await expect(page.getByTestId('row-Europe/Madrid').getByTestId('crosshair-dim-left')).toHaveCSS(
    'opacity',
    '1',
  );
  await expect(page.getByTestId('row-Europe/Madrid').getByTestId('row-crosshair-dim')).toHaveCSS(
    'opacity',
    '1',
  );
  await expect(page.getByTestId('ruler-crosshair-dim-left')).toHaveCSS('opacity', '1');
  await expect(page.getByTestId('ruler-crosshair-column')).toHaveCSS('opacity', '1');
  await expect(page.getByTestId('row-America/New_York').getByTestId('hover-row-border')).toHaveCSS(
    'opacity',
    '1',
  );
  await expect(page.getByTestId('row-Europe/Madrid').getByTestId('hover-row-border')).toHaveCSS(
    'opacity',
    '0',
  );
  await expect(page.getByTestId('hover-slot')).toHaveCSS('border-left-width', '1px');

  await page.mouse.move(10, 10);
  await expect(page.getByTestId('ruler-crosshair-dim-left')).toHaveCSS('opacity', '0');
  await expect(page.getByTestId('ruler-crosshair-column')).toHaveCSS('opacity', '0');
  await expect(page.getByTestId('row-America/New_York').getByTestId('hover-row-border')).toHaveCSS(
    'opacity',
    '0',
  );
  await expect(page.getByTestId('row-Europe/Madrid').getByTestId('crosshair-dim-left')).toHaveCSS(
    'opacity',
    '0',
  );
});

test('matches the settings hover across secondary controls', async ({ page }) => {
  const background = (locator: Locator) =>
    locator.evaluate((element) => getComputedStyle(element).backgroundColor);

  const settings = page.getByRole('button', { name: 'Settings' });
  await settings.hover();
  await expect.poll(async () => (await background(settings)).startsWith('rgb(')).toBe(true);
  const hoverBackground = await background(settings);

  for (const locator of [
    page.getByRole('button', { name: /^today$/i }),
    page.getByRole('button', { name: 'Sat 7 2026' }),
    page.getByRole('button', { name: 'Fri 6 2026' }),
    page.getByRole('button', { name: /next day/i }),
    page.getByRole('button', { name: 'Actions for New York' }),
  ]) {
    await locator.hover();
    await expect.poll(() => background(locator)).toBe(hoverBackground);
  }

  await page.getByRole('button', { name: 'Actions for New York' }).click();
  const rename = page.getByRole('menuitem', { name: 'Rename' });
  const menuBase = await background(rename);
  await rename.hover();
  await expect.poll(() => background(rename)).not.toBe(menuBase);
});

test('uses a hand cursor for actionable controls', async ({ page }) => {
  const cursor = (locator: Locator) =>
    locator.evaluate((element) => getComputedStyle(element).cursor);

  for (const locator of [
    page.getByRole('button', { name: 'Settings' }),
    page.getByRole('button', { name: /^today$/i }),
    page.getByRole('button', { name: 'Sat 7 2026' }),
    page.getByRole('button', { name: 'Actions for New York' }),
    page.getByRole('button', { name: 'Pick a date' }),
  ]) {
    expect(await cursor(locator)).toBe('pointer');
  }

  await page.getByRole('button', { name: 'Actions for New York' }).click();
  expect(await cursor(page.getByRole('menuitem', { name: 'Rename' }))).toBe('pointer');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /set time/i }).click();
  expect(await cursor(page.getByRole('button', { name: /apply/i }))).toBe('pointer');
});

test('selects a custom date from the calendar', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Pick a date' });
  const dialog = page.getByRole('dialog', { name: 'Choose a date' });

  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('November 2026')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Thursday, November 5, 2026' })).toHaveAttribute(
    'aria-current',
    'date',
  );

  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);

  await dialog.getByRole('button', { name: 'Friday, November 20, 2026' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Fri 20 2026' })).toHaveAttribute(
    'aria-current',
    'date',
  );
  await expect(page.getByTestId('focus-line')).toBeHidden();
  const readout = page.getByRole('button', { name: /set time/i });
  await expect(readout).toContainText('Fri, Nov 20');
  await expect(readout).not.toContainText('2026');

  await trigger.click();
  await expect(dialog.getByRole('button', { name: 'Friday, November 20, 2026' })).toHaveAttribute(
    'aria-current',
    'date',
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('jumps to a distant date from the calendar', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Pick a date' });
  await trigger.focus();
  await page.keyboard.press('Enter');

  const input = page.getByLabel('Jump to date');
  await expect(input).toBeFocused();
  await input.fill('1985-03-14');
  await input.press('Enter');

  await expect(page.getByRole('dialog', { name: 'Choose a date' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Thu 14 1985' })).toHaveAttribute(
    'aria-current',
    'date',
  );
  await expect(page.getByTestId('focus-line')).toBeHidden();
  await expect(page.getByRole('button', { name: /set time/i })).toContainText(
    'Thu, Mar 14, 1985 · Madrid',
  );

  const badge = page.getByTestId('relative-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toContainText(/\d+y/);
  await expect(badge).toContainText(/\d+mo/);
  await expect(badge).toContainText('total');
  await expect(badge).toContainText('from today, 13:00');
});

test('shifts the visible window by six hours', async ({ page }) => {
  const labels = page.getByTestId('ruler-surface').getByTestId('hour-label');
  const next = page.getByRole('button', { name: 'Show next 6 hours' });
  const now = page.getByRole('button', { name: /^now$/i });

  await expect(labels.first()).toHaveText('00');

  await page.keyboard.press('ArrowRight');
  await expect(labels.first()).toHaveText('06');
  await page.keyboard.press('ArrowLeft');
  await expect(labels.first()).toHaveText('00');

  await next.click();
  await expect(labels.first()).toHaveText('06');
  await expect(labels.last()).toHaveText('05');
  await expect(page.getByTestId('row-Europe/Madrid').getByTestId('hour-label').first()).toHaveText(
    '06',
  );
  await expect(page.getByTestId('focus-line')).toBeVisible();
  await expect(page.getByTestId('now-line')).toBeVisible();

  await next.click();
  await next.click();
  await expect(labels.first()).toHaveText('18');
  await expect(next).toBeDisabled();
  await expect(page.getByTestId('focus-line')).toBeHidden();
  await expect(page.getByTestId('now-line')).toBeHidden();

  await now.click();
  await expect(labels.first()).toHaveText('00');
  await expect(page.getByTestId('focus-line')).toBeVisible();
  await expect(page.getByTestId('now-line')).toBeVisible();

  await next.click();
  await page.getByRole('button', { name: 'Sat 7 2026' }).click();
  await expect(labels.first()).toHaveText('00');
});
