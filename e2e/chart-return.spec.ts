import { test, expect } from '@playwright/test';
test('locked daily candles return to the previous free line chart',async({page})=>{
  await page.route('**/api/public/markets/*/history?*',route=>route.fulfill({status:403,json:{error:'locked'}}));
  await page.route('**/api/public/bubbles/history?*',route=>route.fulfill(route.request().url().includes('range=24h')?{json:{points:[0,1,2].map(i=>({t:new Date(Date.UTC(2026,8,28,10,i*5)).toISOString(),marketPrice:20000000+i*10000,bubblePercent:i/10}))}}:{status:403,json:{error:'locked'}}));
  await page.goto('/markets/gold_melted');
  const chart=page.locator('.chart-workspace');
  await expect(chart.locator('.market-chart')).toBeVisible();
  await chart.getByRole('button',{name:'کندل روزانه',exact:true}).click();
  await expect(chart.locator('.chart-locked')).toBeVisible();
  await chart.getByRole('button',{name:'خطی',exact:true}).click();
  await expect(chart.getByRole('button',{name:'۲۴ ساعت',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(chart.locator('.chart-locked')).toHaveCount(0);
  await expect(chart.locator('.market-chart')).toBeVisible();
});
test('history failure has a short retry action that recovers',async({page})=>{
  let failed=true;
  await page.route('**/api/public/bubbles/history?*',route=>route.fulfill(failed?{status:500,json:{error:'unavailable'}}:{json:{points:[0,1,2].map(i=>({t:new Date(Date.UTC(2026,8,28,10,i*5)).toISOString(),marketPrice:20000000+i*10000,bubblePercent:i/10}))}}));
  await page.goto('/markets/gold_melted');
  const chart=page.locator('.chart-workspace');
  await expect(chart.getByText('نمودار دریافت نشد',{exact:true})).toBeVisible();
  failed=false;
  await chart.getByRole('button',{name:'تازه‌سازی نمودار'}).click();
  await expect(chart.locator('.market-chart')).toBeVisible();
});
