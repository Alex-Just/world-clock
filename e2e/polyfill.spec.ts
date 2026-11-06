import { expect, test } from '@playwright/test';

test('renders in WebKit, where the Temporal polyfill is required', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'World Clock' })).toBeVisible();
  await expect(page.getByText('New York')).toBeVisible();
});

test('opens the zone menu above the rows in WebKit', async ({ page }) => {
  await page.goto('/');
  const trigger = page
    .getByTestId('row-America/New_York')
    .getByRole('button', { name: /actions for new york/i });
  await trigger.click();
  const menu = page.getByRole('menu', { name: /actions for new york/i });
  await expect(menu).toBeVisible();
  const onTop = await menu.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const target = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return target !== null && node.contains(target);
  });
  expect(onTop).toBe(true);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
});
