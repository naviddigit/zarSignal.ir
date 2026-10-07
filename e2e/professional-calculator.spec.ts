import { test, expect } from '@playwright/test';
test('market equivalent and price conversion remain distinct without physical-weight tool', async ({ page }) => {
  await page.goto('/calculator');
  await expect(page.getByRole('region', { name: 'ابزار انتخابی' })).toBeVisible();
  await expect(page.getByText('ضریب ثابت بازار: ۴٫۳۳۱۸')).toBeVisible();
  await expect(page.getByRole('button', { name: 'وزن واقعی', exact:true })).toHaveCount(0);
  await page.getByRole('button', { name: 'مثقال ↔ گرم ۱۸', exact:true }).click();
  await page.getByRole('button', { name: 'مثقال به گرم ۱۸', exact:true }).click();
  await page.getByRole('textbox', { name: 'مثقال آب‌شده ۷۰۵' }).fill('100000000');
  await page.getByRole('button', { name: 'محاسبه', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'نتیجه محاسبه' })).toContainText('23,085,091', { timeout: 20000 });
});

test('approved gold description and homepage calculator entry agree', async ({ page }) => {
  await page.goto('/markets/gold_melted');
  await expect(page.locator('.asset-explainer').last()).toContainText('فرمول حباب طلا تأیید شده');
  await page.goto('/');
  await expect(page.locator('#calculator a')).toHaveAttribute('href', '/calculator');
});
test('silver bar tool opens from its icon and computes from explicit inputs', async ({ page }) => {
  await page.goto('/calculator');
  await page.getByRole('tab', { name: 'نقره' }).click();
  await page.getByRole('button', { name: 'شمش نقره' }).click();
  for (const [label, value] of [
    ['وزن شمش', '1000'], ['عیار شمش', '999'], ['اونس جهانی نقره', '32'],
    ['نرخ دلار', '100000'], ['اجرت ضرب اعلام‌شده', '500000'],
    ['مالیاتِ اجرت اعلام‌شده', '50000'], ['اختلاف خرید و فروش', '100000'], ['هزینه دیگر', '0'],
  ]) await page.getByRole('textbox', { name: label }).fill(value);
  await page.getByRole('button', { name: 'محاسبه', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'نتیجه محاسبه' })).toContainText('نقره خالص شمش', { timeout: 20000 });
});
