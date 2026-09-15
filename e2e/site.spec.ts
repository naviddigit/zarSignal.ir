import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const adminToken = (() => { try { return readFileSync('.env', 'utf8').match(/^ADMIN_BOOTSTRAP_TOKEN=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? ''; } catch { return ''; } })();

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

test('calculator loads a market side and keeps manual numeric input available', async ({ page }) => {
  await page.goto('/');
  const calculator = page.locator('.calculator-machine');
  await expect(calculator.locator('input')).toHaveCount(3);
  for (const input of await calculator.locator('input').all()) await expect(input).toHaveValue('');
  const autoSell = calculator.getByRole('button', { name: /قیمت فروش/ });
  if (await autoSell.isEnabled()) {
    await autoSell.click();
    await expect(calculator.getByRole('textbox', { name: 'قیمت هر واحد' })).not.toHaveValue('');
  }
  await calculator.getByRole('textbox', { name: 'تعداد / مقدار' }).fill('۱۰٫۵x');
  await calculator.getByRole('textbox', { name: 'قیمت هر واحد' }).fill('8500000abc');
  await expect(calculator.getByRole('textbox', { name: 'تعداد / مقدار' })).toHaveValue('10.5');
  await expect(calculator.getByRole('textbox', { name: 'قیمت هر واحد' })).toHaveValue('8,500,000');
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
  const acknowledgement = page.getByRole('checkbox', { name: /خواندم و می‌دانم/ });
  await acknowledgement.click();
  await expect(acknowledgement).toHaveAttribute('aria-checked', 'true');
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
});

test('admin can reach the three versioned formula editors', async ({ page }) => {
  test.skip(!adminToken, 'ADMIN_BOOTSTRAP_TOKEN is not configured');
  await page.goto('/admin/login');
  await page.locator('#token').fill(adminToken);
  await page.getByRole('button', { name: 'ورود امن' }).click();
  await page.waitForURL('**/admin');
  await page.goto('/admin/analysis');
  await expect(page.getByRole('heading', { level: 1, name: 'فرمول‌های طلا، نقره و دلار' })).toBeVisible();
  await expect(page.locator('.formula-card')).toHaveCount(3);
  await expect(page.locator('.formula-form')).toHaveCount(3);
  await expect(page.locator('.formula-live__grid article')).toHaveCount(7);
  await expect(page.locator('.formula-form').first().getByRole('checkbox')).toHaveCount(14);
  await page.goto('/admin/plans');
  await expect(page.locator('.plan-admin-list > article')).toHaveCount(4);
});
