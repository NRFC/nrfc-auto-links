import { test, expect, Page, BrowserContext } from '@playwright/test';
import { link_text } from "./test-data";

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

let context: BrowserContext;
let sharedPage: Page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  sharedPage = await context.newPage();

  const response = await sharedPage.goto('/wp-admin');
  expect(response?.status()).toBe(200);

  await sharedPage.locator('#user_login').fill('admin');
  await sharedPage.locator('#user_pass').fill('local-dev-password');

  await Promise.all([
    sharedPage.waitForURL('**/wp-admin/'),
    sharedPage.locator('#wp-submit').click()
  ]);
});

test.afterAll(async () => {
  await context?.close();
});

test('Access admin menu', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:8080/wp-admin');

  await page.getByRole('link', {name: "Settings", exact: true}).click();
  await expect(page).toHaveURL(/options-general.php/);
  await expect(page.getByRole('heading', {name: 'General Settings'})).toBeVisible();

  await page.getByRole('link', {name: "NRFC Auto Links", exact: true}).click();
  await expect(page).toHaveURL(/page=nrfc-auto-links/);
  await expect(page.getByRole('heading', {name: 'NRFC Auto Links Settings'})).toBeVisible();

  await page.close();
});

test.describe('Create links', () => {
  test.describe.configure({ mode: 'serial' });

  for (const item of link_text) {
    test(`Create ${item}`, async () => {
      const page = await context.newPage();
      await page.goto('http://localhost:8080/wp-admin/options-general.php?page=nrfc-auto-links');

      await expect(page).toHaveURL(/page=nrfc-auto-links/);
      await expect(page.getByRole('heading', {name: 'NRFC Auto Links Settings'})).toBeVisible();
      await addRule(page, item);


      await page.close();
    });
  }
});

test('Test delete button', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:8080/wp-admin/options-general.php?page=nrfc-auto-links');

  // Create a link with random text to avoid collisions
  // Wait for it to be created
  // Find the link in the admin page

  // Find it's delete button
  // Click the delete button
  // Wait for the link to be deleted
  // Check that the link is no longer present in the admin page
});