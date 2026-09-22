import { test, expect } from '@playwright/test';
import { instruments } from '../src/lib/market';

test('89 OHLC candles have axes, tooltip and accessible range controls', async ({ page }) => {
  const bars = Array.from({ length: 89 }, (_, i) => ({ t: new Date(Date.UTC(2026, 5, 1 + i)).toISOString(), o: 100 + i, c: 102 + i, h: 105 + i, l: 98 + i }));
  await page.route('**/api/public/markets/gold_melted/history?**', route => route.fulfill({ json: { bars } }));
  await page.goto('/markets/gold_melted');
  await expect(page.locator('.chart-candle')).toHaveCount(89);
  await expect(page.locator('.chart-grid text')).toHaveCount(9);
  await expect(page.locator('.chart-tooltip')).toContainText('بیشینه');
  const chart = page.locator('.market-chart svg');
  await chart.focus();
  await chart.press('ArrowLeft');
  await expect(page.locator('.chart-crosshair')).toHaveCount(1);
  await expect(page.locator('.chart-tooltip')).toContainText('بسته');
  await page.getByRole('button', { name: '۳۰ روز', exact: true }).click();
  await expect(page.locator('.chart-candle')).toHaveCount(89);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('two bubble snapshots never draw a chart in any range', async ({ page }) => {
  await page.route('**/api/public/bubbles/history?**', route => route.fulfill({ json: { points: [0, 360000].map(t => ({ t: new Date(t).toISOString(), marketPrice: 100, bubblePercent: 1, status: 'ok' })) } }));
  await page.goto('/');
  await expect(page.locator('#bubble-history')).toContainText('تاریخچه در حال شکل‌گیری است');
  for (const label of ['۷ روز', '۳۰ روز', '۲۴ ساعت']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('#bubble-history .chart-empty')).toBeVisible();
    await expect(page.locator('#bubble-history svg')).toHaveCount(0);
  }
});

test('sufficient bubble history shows two labelled independent axes', async ({ page }) => {
  await page.route('**/api/public/bubbles/history?**', route => route.fulfill({ json: { points: [0, 300000, 600000].map(t => ({ t: new Date(t).toISOString(), marketPrice: 100, bubblePercent: 1, status: 'ok' })) } }));
  await page.goto('/');
  await expect(page.locator('#bubble-history .market-chart')).toHaveCount(2);
  await expect(page.locator('#bubble-history .chart-series')).toHaveCount(2);
  await expect(page.locator('#bubble-history .chart-legend')).toContainText('دو محور مستقل');
});

test('fresh snapshot binds all nine rows without disconnected labels', async ({ page }) => {
  const now = new Date().toISOString();
  await page.route('**/api/public/markets', route => route.fulfill({ json: { mode: 'live', status: 'ok', pollSeconds: 60,
    quotes: instruments.map(a => ({ ...a, buy: '102750000', sell: '102750000', source: 'upstream-private', sourceUrl: null, fetchedAt: now, observedAt: now })) } }));
  await page.goto('/');
  await expect(page.locator('.market-table tbody tr')).toHaveCount(9);
  await expect(page.locator('.quote-source')).toHaveCount(9);
  await expect(page.locator('.no-source')).toHaveCount(0);
  await expect(page.locator('#markets')).not.toContainText('upstream-private');
  await expect(page.locator('.feed-state')).toContainText('منبع داده متصل');
});
