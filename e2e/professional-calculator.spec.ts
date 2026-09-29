import { test, expect } from '@playwright/test';
test('manual calculation and open silver/coin popular tools', async ({ page }) => {
  await page.goto('/calculator');
  await page.getByRole('button', { name: 'مظنه ÷ ۴٫۳۳۱۸' }).click();
  await page.getByRole('textbox', { name: 'مظنه آب‌شده ۷۰۵' }).fill('100000000');
  await page.getByRole('button', { name: 'محاسبه', exact: true }).click();
  await expect(page.locator('.calc-result-slot')).toContainText('23,085,091');
  await page.getByRole('tab', { name: 'نقره' }).click();
  await expect(page.getByRole('button', { name: 'تبدیل وزن' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'عیار نقره' })).toBeVisible();
  await page.getByRole('tab', { name: 'سکه' }).click();
  await expect(page.getByRole('button', { name: 'حباب سکه' })).toBeDisabled();
  await expect(page.locator('.calc-weight-widget')).toBeVisible();
});
test('approved gold description and homepage calculator entry agree', async ({ page }) => {
  await page.goto('/markets/gold_melted');
  await expect(page.locator('.asset-explainer').last()).toContainText('فرمول حباب طلا تأیید شده');
  await page.goto('/');
  await expect(page.locator('#calculator a')).toHaveAttribute('href', '/calculator');
});
