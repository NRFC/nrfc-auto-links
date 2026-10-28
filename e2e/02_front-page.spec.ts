import { test, expect } from '@playwright/test';

test('front page loads', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('main')).toBeVisible();
});
