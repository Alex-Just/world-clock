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
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
});
