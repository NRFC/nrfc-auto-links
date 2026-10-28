import {test, expect, Page} from '@playwright/test';

async function randomOption(page: Page, selector: any) {
  const selectLocator = page.locator(selector).last();
  const count = await selectLocator.locator('option').count();
  const randomIndex = Math.floor(Math.random() * count);
  await selectLocator.selectOption({ index: randomIndex });
}

async function addRule(page: Page, value: string) {
  await page.getByRole('button', {name: 'Add Rule'}).click();
  await page.locator('input[name^="nrfc_auto_links_settings[rules]"][name$="[text]"]').last().fill(value);
  await randomOption(page, 'select[name^="nrfc_auto_links_settings[rules]"][name$="[link]"]');
  await page.getByRole('button', {name: 'Save Settings'}).click();
}

test.describe('Create auto-link settings', () => {
  test('login to the admin screen', async ({ page }) => {
    const response = await page.goto('/wp-admin');

    expect(response?.status()).toBe(200);

    await page.locator('#user_login').fill('admin');
    await page.locator('#user_pass').fill('local-dev-password');
    await page.locator('#wp-submit').click();

    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await page.getByRole('link', { name: 'NRFC Auto Links' }).click();

    await expect(page).toHaveURL(/page=nrfc-auto-links/);
    await expect(page.getByRole('heading', { name: 'NRFC Auto Links Settings' })).toBeVisible();

    await addRule(page, 'acoustic');
    await addRule(page, 'seismic');
  });
});
