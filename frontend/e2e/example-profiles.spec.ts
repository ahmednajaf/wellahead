import { test, expect } from '@playwright/test';
import { exampleProfiles } from '../src/combined/example-profiles';

test('Emma’s cached demo waits three seconds and reaches confirmation without ASR or planner requests', async ({ page }, info) => {
  const requests: string[] = [];
  await page.route('**/api/**', route => {
    requests.push(route.request().url());
    return route.abort(); // The demo must work even with every API unavailable.
  });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/');
  await expect(page.locator('.onboard-header').getByRole('button', { name: 'Emma demo, age 35' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Listen to the questions' })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Tell us about your health' }).fill('My own draft.');
  await page.screenshot({ path: info.outputPath('example-choices.png'), fullPage: true });
  await expect(page.getByRole('combobox', {name:'Demo profile'})).toHaveCount(0);
  await expect(page.getByRole('button', {name:/Apple Health/})).toHaveCount(0);
  await expect(page.getByRole('button', {name:'bupa Connect'})).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Emma demo, age 35' }).click();
  await expect(page.getByRole('textbox', { name: 'Tell us about your health' })).toHaveValue(exampleProfiles['family-history'].text);
  await expect(page.locator('.onboarding-record')).toHaveCount(0); expect(requests).toEqual([]);
  await page.screenshot({path:info.outputPath('emma-mobile.png'),fullPage:true});
  const started = Date.now();
  await page.getByRole('button', { name: 'Review my health profile' }).click();
  await expect(page.getByRole('status')).toHaveText('Getting your story ready to review…');
  await expect(page.getByRole('heading', { name: 'Here’s what we understood' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Here’s what we understood' })).toBeVisible();
  expect(Date.now() - started).toBeGreaterThanOrEqual(3000);
  await expect(page.locator('.review-grid article').filter({ has: page.getByRole('heading', { name: 'Age', exact: true }) })).toContainText('35');
  await expect(page.locator('.review-grid article')).toHaveCount(6);
  await page.screenshot({ path: info.outputPath('family-confirmation-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Looks right' }).click();
  await expect(page.getByText('Emma · example profile')).toBeVisible(); expect(requests).toEqual([]);
  await expect(page.getByRole('button', { name: 'View details for Be.Reassured', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View details for Breast health pathway', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return to my story' }).click();
  await expect(page.getByRole('textbox', { name: 'Tell us about your health' })).toHaveValue('My own draft.');
});
