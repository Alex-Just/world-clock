import { expect, test } from '@playwright/test';

test('renders in WebKit, where the Temporal polyfill is required', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'World Clock' })).toBeVisible();
  await expect(page.getByText('New York')).toBeVisible();
});
