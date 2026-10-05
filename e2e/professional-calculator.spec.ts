import { test, expect } from '@playwright/test';
test('mazaneh price directions share one shortcut while physical weight stays separate', async ({ page }) => {
  await page.goto('/calculator');
  await expect(page.getByRole('button', { name: 'مظنه ↔ گرم ۱۸' })).toHaveCount(1);
  await page.getByRole('button', { name: 'مظنه ↔ گرم ۱۸' }).click();
  await expect(page.getByRole('button', { name: 'گرم ۱۸ به مظنه' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'مظنه به گرم ۱۸' }).click();
  await page.getByRole('textbox', { name: 'مظنه آب‌شده ۷۰۵' }).fill('100000000');
  await page.getByRole('button', { name: 'محاسبه', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'نتیجه محاسبه' })).toContainText('23,085,091');
  await page.getByRole('button', { name: 'بستن' }).last().click();
  await page.getByRole('button', { name: 'تبدیل وزن فیزیکی' }).click();
  await expect(page.getByText('۱ مثقال = ۴٫۶۰۸ گرم')).toBeVisible();
  await expect(page.locator('.calc-weight-widget')).toBeVisible();
});
test('approved gold description and homepage calculator entry agree', async ({ page }) => {
  await page.goto('/markets/gold_melted');
  await expect(page.locator('.asset-explainer').last()).toContainText('فرمول حباب طلا تأیید شده');
  await page.goto('/');
  await expect(page.locator('#calculator a')).toHaveAttribute('href', '/calculator');
});
