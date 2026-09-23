import { test, expect } from '@playwright/test';
test('manual calculation, provenance, shared selector and blocked tabs', async ({ page }) => {
  await page.goto('/calculator');
  await page.getByRole('textbox', { name: 'مظنه آب‌شده ۷۰۵' }).fill('100000000');
  await page.getByRole('button', { name: 'محاسبه', exact: true }).click();
  await expect(page.locator('.calc-output')).toContainText('۲۳٬۰۸۶٬۵۸۳');
  await page.getByText('جزئیات منبع و محاسبه', { exact: true }).click();
  await expect(page.locator('.calc-details')).toContainText('MANUAL');
  await expect(page.locator('.calc-details')).toContainText('CONSTANT');
  await page.getByRole('textbox', { name: 'مظنه آب‌شده ۷۰۵' }).fill('200000000');
  await expect(page.locator('.calc-output')).toHaveCount(0);
  await page.getByRole('button', { name: 'نقره', exact: true }).click();
  await expect(page.locator('.calc-locked')).toBeVisible();
  await expect(page.locator('.calc-output')).toHaveCount(0);
  await page.getByRole('button', { name: 'طلا', exact: true }).click();
  await page.locator('.calc-inputs button[aria-haspopup="listbox"]').click();
  await page.getByRole('option', { name: 'ارزش محاسباتی و حباب طلا' }).click();
  await expect(page.locator('.calc-entry')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('approved gold description and homepage calculator entry agree', async ({ page }) => {
  await page.goto('/markets/gold_melted');
  await expect(page.locator('.asset-explainer').last()).toContainText('فرمول حباب طلا تأیید شده');
  await expect(page.locator('.asset-explainer').last()).not.toContainText('فرمول حباب، ارزش نظری و آستانه معاملاتی هنوز تأیید نشده‌اند');
  await page.goto('/');
  await expect(page.locator('#calculator a')).toHaveAttribute('href', '/calculator');
});
