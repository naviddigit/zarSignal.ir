import { test, expect } from '@playwright/test';
test('Persian dashboard filters and persists local favorites',async({page}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await expect(page.getByRole('heading',{level:1})).toContainText('بازار را واضح ببین');
  await expect(page.locator('tbody tr')).toHaveCount(6);
  await page.getByRole('textbox',{name:'جستجوی بازار'}).fill('دلار');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button',{name:'نشان‌کردن دلار آمریکا'}).click();
  await page.reload();
  await page.getByRole('button',{name:'نشان‌شده‌ها',exact:true}).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'نشان‌کردن دلار آمریکا'})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('link',{name:/دلار آمریکا USD/}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('قیمت دلار آمریکا');
});
test('demo is explicit, has no invented bubbles, and API requires credentials',async({page,request}) => {
  await page.goto('/');
  await expect(page.locator('.data-note')).toContainText('نمونه');
  await expect(page.locator('.bubble-value')).toHaveCount(3);
  await expect(page.locator('.bubble-value').first()).toContainText('در انتظار');
  const publicResponse = await request.get('/api/public/markets');
  expect(publicResponse.status()).toBe(200); expect((await publicResponse.json()).mode).toBe('demo');
  const privateResponse = await request.get('/api/v1/quotes');
  expect(privateResponse.status()).toBe(401);
  expect(privateResponse.headers()['cache-control']).toBe('no-store');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('all information routes render and invalid symbols return 404', async({page,request}) => {
  for (const path of ['/pricing','/developers','/mobile','/methodology']) { await page.goto(path); await expect(page.getByRole('heading',{level:1})).toBeVisible(); }
  expect((await request.get('/markets/unknown')).status()).toBe(404);
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
});
test('admin requires a signed session and shows operational state after login', async({page}) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading',{level:1})).toHaveText('ورود به مدیریت');
  await page.locator('#token').fill('local-only-zarsignal-admin-token-2026');
  await page.getByRole('button',{name:'ورود امن'}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('صبح بخیر، مدیر.');
  await page.getByRole('link',{name:'داده و دریافت'}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('داده و دریافت');
});
