import { test, expect } from '@playwright/test';
import {link_text} from "./test-data";

test('front page loads', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('main')).toBeVisible();
});

test.describe('Check links are marked up', () => {
  for (const item of link_text) {
    test(`Check ${item}`, async ({ page }) => {
      await page.goto('http://localhost:8080');

      // Find the first word in the var item
      // Check it is a link
    });
  }
});