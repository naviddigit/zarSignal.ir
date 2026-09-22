import { test, expect } from '@playwright/test';
import { instruments } from '../src/lib/market';

const bars = Array.from({ length: 89 }, (_, i) => ({ t: new Date(Date.UTC(2026, 5, 25 + i)).toISOString(), o: 100 + i, h: 104 + i, l: 98 + i, c: 102 + i }));
const daily = bars.map(b => ({ t: b.t.slice(0, 10) + 'T23:59:59.999Z', marketPrice: b.c, bubblePercent: 2, cadence: 'daily' }));
const snapshots = [0, 300000, 600000].map(t => ({ t: new Date(t).toISOString(), marketPrice: 100, bubblePercent: 1, cadence: 'snapshot' }));

test('full chart overlays 89 daily candles and historical bubble with two axes', async ({ page }) => {
  await page.route('**/api/public/markets/gold_melted/history?**', route => route.fulfill({ json: { bars } }));
  await page.route('**/api/public/bubbles/history?**', route => route.fulfill({ json: { points: daily } }));
  await page.goto('/charts/gold_melted');
  await page.getByRole('button', { name: '۹۰ روز', exact: true }).click();
  await expect(page.locator('.chart-candle')).toHaveCount(89);
  await expect(page.locator('.bubble-overlay')).toHaveCount(1);
  await expect(page.locator('.bubble-axis')).toHaveCount(5);
  await expect(page.locator('.chart-tooltip')).toContainText('بیشینه');
  const chart = page.locator('.market-chart svg');
  await chart.focus(); await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.chart-crosshair')).toHaveCount(1);
  await page.getByRole('checkbox', { name: 'حباب / فاصله · محور راست ٪' }).uncheck();
  await expect(page.locator('.bubble-overlay')).toHaveCount(0);
  await expect(page.locator('.chart-candle')).toHaveCount(89);
  await page.getByRole('button', { name: 'تیره', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('two points remain empty; deeper history has a real server paywall', async ({ page, request }) => {
  await page.route('**/api/public/bubbles/history?**', route => route.fulfill({ json: { points: snapshots.slice(0,2) } }));
  await page.goto('/charts/gold_melted');
  await expect(page.locator('.chart-empty')).toContainText('تاریخچه این بازه در حال شکل‌گیری است');
  await expect(page.locator('.market-chart')).toHaveCount(0);
  await page.unroute('**/api/public/bubbles/history?**');
  await page.getByRole('button', { name: '۹۰ روز', exact: true }).click();
  await expect(page.locator('.chart-locked')).toContainText('باز کردن تاریخچه کامل');
  for (const path of ['/api/public/bubbles/history?formula=GOLD_BUBBLE&range=90d', '/api/public/markets/gold_melted/history?days=90']) {
    const response = await request.get(path);
    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data.points ?? data.bars).toEqual([]);
    expect(response.headers()['cache-control']).toContain('no-store');
  }
});

test('home is compact with valid sparklines only and a single full-chart CTA', async ({ page }) => {
  await page.route('**/api/public/bubbles/history?**', route => route.fulfill({ json: { points: snapshots } }));
  await page.goto('/');
  await expect(page.locator('#bubble-history .teaser-sparks svg')).toHaveCount(2);
  await expect(page.locator('#bubble-history a')).toHaveCount(1);
  await expect(page.locator('#bubble-history a')).toHaveAttribute('href', '/charts/gold_melted');
  await expect(page.locator('#bubble-history .market-chart')).toHaveCount(0);
});

test('all nine live symbols stay public', async ({ page }) => {
  const now = new Date().toISOString();
  await page.route('**/api/public/markets', route => route.fulfill({ json: { mode: 'live', status: 'ok', pollSeconds: 60,
    quotes: instruments.map(a => ({ ...a, buy: '102750000', sell: '102750000', source: 'upstream-private', sourceUrl: null, fetchedAt: now, observedAt: now })) } }));
  await page.goto('/');
  await expect(page.locator('.market-table tbody tr')).toHaveCount(9);
  await expect(page.locator('.quote-source')).toHaveCount(9);
  await expect(page.locator('.no-source')).toHaveCount(0);
  await expect(page.locator('#markets')).not.toContainText('upstream-private');
});
