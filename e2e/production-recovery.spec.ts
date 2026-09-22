import { test, expect } from '@playwright/test';

test('home renders all nine symbols with no hydration errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /hydration|hydrated|didn't match/i.test(message.text())) errors.push(message.text());
  });
  await page.goto('/');
  await expect(page.locator('#markets')).toBeVisible();
  await expect(page.locator('.market-table tbody tr')).toHaveCount(9);
  await expect(page.locator('.radar-pro')).toBeVisible();
  await expect(page.locator('.route-loading')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'تیره', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(errors).toEqual([]);
});

test('light/dark tokens, centered icons and the thin radar ring stay consistent', async ({ page }) => {
  await page.goto('/');
  for (const [label, theme] of [['روشن', 'light'], ['تیره', 'dark']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const colors = await page.locator('h1 .gold-text').evaluate(element => {
      const root = getComputedStyle(document.documentElement);
      return { actual: getComputedStyle(element).color, token: root.getPropertyValue('--accent').trim() };
    });
    const expected = await page.evaluate(color => {
      const element = document.createElement('span');
      element.style.color = color;
      document.body.append(element);
      const value = getComputedStyle(element).color;
      element.remove();
      return value;
    }, colors.token);
    expect(colors.actual).toBe(expected);
    const offset = await page.locator('.market-asset-mark').first().evaluate(element => {
      const mark = element.getBoundingClientRect();
      const icon = element.querySelector('svg')!.getBoundingClientRect();
      return Math.abs(mark.x + mark.width / 2 - icon.x - icon.width / 2);
    });
    expect(offset).toBeLessThan(1);
    await expect(page.locator('.radar-pro__ring-value')).toHaveCSS('stroke-width', '1.5px');
    await expect(page.locator('.radar-pro__ring-value')).toHaveCSS('fill', 'none');
  }
});

test('failed history does not hide the market or masquerade as an empty chart', async ({ page }) => {
  await page.route('**/api/public/bubbles/history?**', route => route.fulfill({ status: 503, json: { error: 'history_unavailable' } }));
  await page.goto('/');
  await expect(page.locator('#bubble-history')).toContainText('تاریخچه کوتاه‌مدت در حال شکل‌گیری است');
  await expect(page.locator('#bubble-history svg')).toHaveCount(0);
  await expect(page.locator('.market-table tbody tr')).toHaveCount(9);
});

test('server rendered prices and radar remain present without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator('#markets')).toBeVisible();
  await expect(page.locator('.radar-pro')).toBeVisible();
  await context.close();
});

test('history cards have spacing and a symbol chart renders returned bars', async ({ page }) => {
  await page.goto('/');
  const gap = await page.locator('#bubble-history').evaluate(element => {
    const market = document.querySelector('#markets')!;
    return market.getBoundingClientRect().top - element.getBoundingClientRect().bottom;
  });
  expect(gap).toBeGreaterThanOrEqual(24);

  await page.route('**/api/public/markets/gold_melted/history?**', route => route.fulfill({ json: {
    bars: [
      { t: '2026-09-20T00:00:00Z', o: 100, h: 103, l: 99, c: 102, v: null },
      { t: '2026-09-21T00:00:00Z', o: 102, h: 104, l: 101, c: 103, v: null },
    ],
  } }));
  await page.goto('/markets/gold_melted');
  await expect(page.locator('.symbol-history.chart-workspace')).toBeVisible();
  const symbolGap = await page.locator('.symbol-history').evaluate(element => {
    const panel = document.querySelector('.asset-price-panel')!;
    return element.getBoundingClientRect().top - panel.getBoundingClientRect().bottom;
  });
  expect(symbolGap).toBeGreaterThanOrEqual(24);
});
