import { test, expect } from '@playwright/test';
test('mazaneh price directions share one shortcut while physical weight stays separate', async ({ page }) => {
  await page.goto('/calculator');
  await expect(page.getByRole('region', { name: 'ابزار انتخابی' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'مقدار گرم طلای ۱۸ عیار' })).toHaveValue('1');
  await expect(page.getByText('0.230851')).toBeVisible();
  await expect(page.getByText('ضریب ثابت بازار: ۴٫۳۳۱۸')).toBeVisible();
  await page.getByRole('button', { name: 'وزن واقعی · مثقال ۴٫۶۰۸' }).click();
  await expect(page.getByText('1 گرم = 0.217014 مثقال وزنی')).toBeVisible();
  await page.getByRole('button', { name: 'محاسبهٔ عرفی ۱۸ عیار با ضریب ۴٫۳۳۱۸' }).click();
  await expect(page.getByText('0.230851')).toBeVisible();
  await expect(page.getByRole('button', { name: 'مظنه ↔ گرم ۱۸' })).toHaveCount(1);
  await page.getByRole('button', { name: 'مظنه ↔ گرم ۱۸' }).click();
  await expect(page.getByRole('button', { name: 'گرم ۱۸ به مظنه' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'مظنه به گرم ۱۸' }).click();
  await page.getByRole('textbox', { name: 'مظنه آب‌شده ۷۰۵' }).fill('100000000');
  await page.getByRole('button', { name: 'محاسبه', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'نتیجه محاسبه' })).toContainText('23,085,091');
  await page.getByRole('button', { name: 'بستن' }).last().click();
  await page.getByRole('button', { name: 'وزن واقعی · مثقال ۴٫۶۰۸' }).click();
  await expect(page.getByText('۱ مثقال = ۴٫۶۰۸ گرم')).toBeVisible();
  await expect(page.locator('.calc-weight-widget')).toBeVisible();
  await page.getByRole('button', { name: 'تبدیل عیار و وزن خالص' }).click();
  await page.getByRole('textbox', { name: 'وزن مبدأ به گرم' }).fill('10');
  await expect(page.getByText('فلز خالص: 7.5 گرم')).toBeVisible();
  await expect(page.getByText('یک مثقال طلای ۷۰۵ از نظر مقدار طلای خالص تقریباً معادل ۴٫۳۳۱۸ گرم طلای ۱۸ عیار است.', { exact: false })).toBeVisible();
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
  await expect(page.getByRole('dialog', { name: 'نتیجه محاسبه' })).toContainText('نقره خالص شمش');
});
