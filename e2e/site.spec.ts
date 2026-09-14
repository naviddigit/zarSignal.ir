import { test, expect } from '@playwright/test';

test('market board is searchable, aligned and keeps favorites', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'نبض بازار' })).toBeVisible();
  await expect(page.locator('.market-table tbody tr')).toHaveCount(7);
  const mark = page.locator('.market-asset-mark').first();
  const icon = mark.locator('svg');
  const [markBox, iconBox] = await Promise.all([mark.boundingBox(), icon.boundingBox()]);
  expect(markBox && iconBox && Math.abs(markBox.x + markBox.width / 2 - iconBox.x - iconBox.width / 2)).toBeLessThan(1);
  await page.getByRole('textbox', { name: 'جست‌وجوی بازار' }).fill('دلار آمریکا');
  await expect(page.locator('.market-table tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'نشان‌کردن دلار آمریکا' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'منتخب', exact: true }).click();
  await expect(page.locator('.market-table tbody tr')).toHaveCount(1);
});

test('calculator formats controlled numeric inputs', async ({ page }) => {
  await page.goto('/');
  const calculator = page.locator('.calculator-machine');
  await expect(calculator.locator('input')).toHaveCount(3);
  for (const input of await calculator.locator('input').all()) await expect(input).toHaveValue('');
  await calculator.getByRole('textbox', { name: 'وزن' }).fill('۱۰٫۵x');
  await calculator.getByRole('textbox', { name: 'قیمت هر گرم' }).fill('8500000abc');
  await expect(calculator.getByRole('textbox', { name: 'وزن' })).toHaveValue('10.5');
  await expect(calculator.getByRole('textbox', { name: 'قیمت هر گرم' })).toHaveValue('8,500,000');
  await expect(calculator.locator('.calculator-screen strong')).toContainText('۸۹٬۲۵۰٬۰۰۰');
});

test('analysis stays blocked and API never returns demo prices', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('.bubble-value')).toHaveCount(3);
  await expect(page.locator('.bubble-value').first()).toContainText('در انتظار');
  const publicResponse = await request.get('/api/public/markets');
  expect(publicResponse.status()).toBe(200);
  const snapshot = await publicResponse.json();
  expect(snapshot.quotes.every((quote: { source: string }) => quote.source !== 'دادهٔ نمایشی')).toBe(true);
  const privateResponse = await request.get('/api/v1/quotes');
  expect(privateResponse.status()).toBe(401);
  expect(privateResponse.headers()['cache-control']).toBe('no-store');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('market detail, FAQ and information routes render', async ({ page, request }) => {
  await page.goto('/markets/gold_melted');
  await expect(page.getByRole('heading', { level: 1, name: 'قیمت طلای آب‌شده' })).toBeVisible();
  await expect(page.locator('.asset-price-panel')).toBeVisible();
  await page.goto('/faq');
  const firstQuestion = page.locator('.faq-accordion button').first();
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
  await firstQuestion.click();
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  for (const path of ['/pricing', '/developers', '/mobile', '/methodology', '/risk-management']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
});
