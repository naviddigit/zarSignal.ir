import { test, expect } from '@playwright/test';

test('restored radar links to analysis and keypad works across calculator fields', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const dollar = page.locator('.radar-pro__token.token-dollar');
  // A server-rendered button can precede hydration; retry the user interaction until selected.
  await expect(async () => { await dollar.click(); await expect(dollar).toHaveAttribute('aria-pressed', 'true'); }).toPass();
  await page.locator('.radar-analysis-link').click();
  await expect(page).toHaveURL(/\/analysis\/usd$/, { timeout: 15000 });
  await expect(page.locator('.analysis-summary, .reliability-warning')).toBeVisible({ timeout: 15000 });
  await page.goto('/calculator');
  const keypad = page.locator('.calc-keypad');
  await keypad.getByRole('button', { name: 'پاک‌کردن همه', exact: true }).click();
  for (const key of ['1', '2', '×', '3', '=']) await keypad.getByRole('button', { name: key, exact: true }).click();
  await expect(page.locator('.calc-weight-box__input')).toHaveValue('36');
  await page.getByRole('button', { name: 'حباب طلا', exact: true }).click();
  const fields = page.locator('.calc-tool-panel input');
  await expect(fields).toHaveCount(3);
  await fields.nth(1).focus();
  await keypad.getByRole('button', { name: 'پاک‌کردن همه', exact: true }).click();
  await keypad.getByRole('button', { name: '8', exact: true }).click();
  await expect(fields.nth(1)).toHaveValue('8');
  await expect(keypad).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('chart style switches to real OHLC and locked history stays gated', async ({ page }) => {
  let locked = false;
  await page.route('**/api/public/markets/*/history?*', route => route.fulfill({ status: locked ? 403 : 200, json: locked ? {error:'locked'} : {bars:[1,2,3,4].map(day => ({t:`2026-09-0${day}T00:00:00Z`,o:100,h:120,l:90,c:110}))} }));
  await page.route('**/api/public/bubbles/history?*', route => route.fulfill({ status: locked ? 403 : 200, json: locked ? {error:'locked'} : {points:[0,1,2].map(i=>({t:new Date(Date.UTC(2026,8,28,10,i*5)).toISOString(),marketPrice:20000000+i*10000,bubblePercent:i/10}))} }));
  await page.goto('/markets/gold_melted');
  const chart = page.locator('.chart-workspace');
  await chart.getByRole('button', {name:'کندل روزانه',exact:true}).click();
  await expect(chart.locator('.chart-candle')).toHaveCount(4);
  await chart.getByRole('button', {name:'خطی',exact:true}).click();
  await expect(chart.locator('.chart-candle')).toHaveCount(0);
  await expect(chart.locator('.chart-series').first()).toBeVisible();
  locked = true;
  await chart.getByRole('button', {name:'۳۰ روز',exact:true}).click();
  await expect(chart.locator('.chart-locked')).toBeVisible();
  await expect(chart.locator('.market-chart')).toHaveCount(0);
});
