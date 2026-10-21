import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
test.setTimeout(90000);

test('analysis summary and story trigger stay compact on the real page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/analysis');
  const quick = page.getByRole('region', { name: 'نگاه سریع به بازار' });
  await expect(quick).toBeVisible();
  expect((await quick.boundingBox())!.height).toBeLessThan(170);
  const toolbar = page.getByRole('group', { name: 'ابزارهای تحلیل' });
  await expect(toolbar).toBeVisible();
  expect((await toolbar.boundingBox())!.height).toBeLessThan(120);
  await toolbar.getByRole('button', { name: 'ساخت استوری', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'استودیوی استوری' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('history and feedback open only on request and saved feedback survives reopening', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Bundle the real components with a signed-in UI fixture; no account or database writes.
  const report = await (await request.get('/api/public/market-view')).json();
  const bundle = await build({
    stdin: { contents: `import { createRoot } from 'react-dom/client';
      import { MarketViewReportView } from './src/components/market-view-report';
      import { LastVisitChanges } from './src/components/last-visit-changes';
      createRoot(document.getElementById('root')).render(<MarketViewReportView initial={${JSON.stringify(report)}} signedIn planLevel="HOME" planStatus="فعال" canRefresh actions={<><LastVisitChanges baselineAt="2026-10-10T10:00:00Z" changes={[{id:'silver',label:'نقره ۹۹۹',summary:'اختلاف با مرجع بیشتر شد',deltaPercent:1}]} /><a href="/calculator" className="analysis-icon-action" aria-label="محاسبه">محاسبه</a><a href="/alerts" className="analysis-icon-action" aria-label="هشدار">هشدار</a></>} />);`, loader: 'tsx', resolveDir: process.cwd() },
    bundle: true, write: false, jsx: 'automatic', define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' },
  });
  const css = (await Promise.all(['globals.css', 'theme.css'].map(file => readFile(`src/app/${file}`, 'utf8')))).join('\n');
  await page.route('**/__analysis-ui-fixture', route => route.fulfill({ contentType: 'text/html', body: `<html lang="fa" dir="rtl" class="site-ready"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main id="root" style="max-width:720px;margin:24px auto;width:calc(100% - 32px)"></main><script>${bundle.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script></html>` }));
  let saved: { rating: number; comment: string } | null = null;
  let failFirstFeedbackCheck = true;
  let alert: any = null;
  await page.route('**/api/public/alerts', route => {
    if (route.request().method() === 'POST') { alert = route.request().postDataJSON(); return route.fulfill({ status: 201, json: { id: 'test-alert' } }); }
    return route.fulfill({ json: { alerts: [], notifications: [] } });
  });
  await page.route('**/api/public/story-backgrounds', route => route.fulfill({ json: { backgrounds: [{ id: 'blue', title: 'آبی اختصاصی', start: '#07111f', end: '#172a42', imageUrl: '', enabled: true }] } }));
  await page.route('**/api/public/analysis/read', route => route.fulfill({ json: { count: 19 } }));
  await page.route('**/api/public/analysis/feedback**', async route => {
    if (route.request().method() === 'GET' && failFirstFeedbackCheck) {
      failFirstFeedbackCheck = false;
      await new Promise(resolve => setTimeout(resolve, 2500));
      return route.fulfill({ status: 503, json: { error: 'unavailable' } });
    }
    if (route.request().method() === 'POST') saved = route.request().postDataJSON();
    return route.fulfill({ json: { feedback: saved, canCreateNew: true } });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/__analysis-ui-fixture');
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'امتیاز و بازخورد', exact: true }).click();
  const pendingFeedback = page.getByRole('dialog', { name: 'امتیاز و بازخورد' });
  await expect(pendingFeedback.getByRole('radio')).toHaveCount(5);
  await expect(pendingFeedback.getByRole('button', { name: 'ارسال بازخورد', exact: true })).toBeDisabled();
  await expect(pendingFeedback.getByRole('alert')).toContainText('دریافت بازخورد قبلی ممکن نشد');
  await pendingFeedback.getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
  await expect(pendingFeedback.getByRole('alert')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('اختلاف با مرجع بیشتر شد')).toHaveCount(0);
  await page.getByRole('button', { name: 'از آخرین بازدید شما', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'از آخرین بازدید شما' })).toContainText('اختلاف با مرجع بیشتر شد');
  await page.getByRole('dialog', { name: 'از آخرین بازدید شما' }).screenshot({ path: `artifacts/analysis-history-${test.info().project.name}.png` });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'امتیاز و بازخورد', exact: true }).click();
  const feedback = page.getByRole('dialog', { name: 'امتیاز و بازخورد' });
  await feedback.getByRole('radio', { name: '5 از ۵ — بسیار مفید' }).click();
  await feedback.getByText('توضیح اختیاری', { exact: true }).click();
  await feedback.getByRole('textbox', { name: 'بازخورد اختیاری' }).fill('مختصر و روشن');
  await feedback.screenshot({ path: `artifacts/analysis-feedback-${test.info().project.name}.png` });
  await feedback.getByRole('button', { name: 'ارسال بازخورد', exact: true }).click();
  await expect(feedback).toContainText('بازخورد شما ثبت شد');
  expect(saved).toMatchObject({ rating: 5, comment: 'مختصر و روشن' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'امتیاز و بازخورد', exact: true }).click();
  await expect(feedback).toContainText('مختصر و روشن');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'محاسبه', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'از گزارش خارج می‌شوید؟' })).toBeVisible();
  expect(page.url()).toContain('__analysis-ui-fixture');
  await page.getByRole('button', { name: 'ماندن در گزارش' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'هشدار', exact: true }).click();
  const alertDialog = page.getByRole('dialog', { name: 'هشدار تغییر بازار' });
  await expect(alertDialog).toBeVisible();
  const scrolling = await alertDialog.evaluate(element => {
    const body = element.querySelector('.ds-overlay__body')!;
    return { panel: getComputedStyle(element).overflowY, unnecessary: body.scrollHeight > body.clientHeight + 2 };
  });
  expect(scrolling.panel).toBe('hidden');
  expect(scrolling.unnecessary).toBe(false);
  await alertDialog.screenshot({ path: `artifacts/analysis-alert-${test.info().project.name}.png` });
  await alertDialog.getByRole('button', { name: 'ثبت هشدار تغییر بازار', exact: true }).click();
  await expect(alertDialog.getByRole('status')).toContainText('هشدار شما ثبت شد');
  expect(alert).toMatchObject({ conditionType: 'GAP_PCT_CROSS', threshold: 1, channel: 'IN_APP' });
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  const observedAt = '2026-10-21T10:00:00.000Z';
  const storyPrices: Record<string, string> = {
    GOLD_MELTED: '115770000', GOLD_18K: '26750000', SILVER_999: '480000',
    SEKE_CASH: '720000000', ROB_SEKE: '90000000',
  };
  await page.route('**/api/public/markets', route => route.fulfill({ json: {
    mode: 'live', status: 'ok', quotes: Object.entries(storyPrices).map(([symbol, sell]) => ({
      symbol, buy: sell, sell, currency: 'TMN', unit: 'تومان', source: 'test', sourceUrl: null,
      observedAt, fetchedAt: observedAt,
    })),
  } }));
  await page.route('**/api/public/markets/*/history?*', route => route.fulfill({ json: {
    bars: [1, 2, 3, 4, 5, 6, 7].map((_, index) => ({ c: 100 + index * 3 })),
  } }));
  await page.getByRole('button', { name: 'ساخت استوری', exact: true }).click();
  const studio = page.getByRole('dialog', { name: 'استودیوی استوری' });
  const cleanTemplate = studio.getByRole('button', { name: 'نمای کلی بازار', exact: true });
  await expect(cleanTemplate).toHaveAttribute('aria-pressed', 'true');
  await studio.getByRole('button', { name: 'ساخت پیش‌نمایش', exact: true }).click();
  const cleanPreview = studio.getByRole('img', { name: /پیش‌نمایش استوری/ });
  await expect(cleanPreview).toBeVisible({ timeout: 20000 });
  await expect.poll(() => cleanPreview.evaluate(image => { const element = image as HTMLImageElement; return [element.naturalWidth, element.naturalHeight]; })).toEqual([1080, 1920]);
  const cleanPng = await cleanPreview.evaluate(async image => { const blob = await (await fetch((image as HTMLImageElement).src)).blob(); return await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.readAsDataURL(blob); }); });
  await writeFile(`artifacts/story-template-clean-full-${test.info().project.name}.png`, Buffer.from(cleanPng, 'base64'));
  await cleanPreview.screenshot({ path: `artifacts/story-template-clean-${test.info().project.name}.png` });
  const richTemplate = studio.getByRole('button', { name: 'نمای کلی بازار · طلایی', exact: true });
  await richTemplate.click();
  await expect(richTemplate).toHaveAttribute('aria-pressed', 'true');
  await studio.getByRole('button', { name: 'ساخت پیش‌نمایش', exact: true }).click();
  const richPreview = studio.getByRole('img', { name: /پیش‌نمایش استوری/ });
  await expect(richPreview).toBeVisible({ timeout: 20000 });
  await expect.poll(() => richPreview.evaluate(image => { const element = image as HTMLImageElement; return [element.naturalWidth, element.naturalHeight]; })).toEqual([1080, 1920]);
  const richPng = await richPreview.evaluate(async image => { const blob = await (await fetch((image as HTMLImageElement).src)).blob(); return await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.readAsDataURL(blob); }); });
  await writeFile(`artifacts/story-template-rich-full-${test.info().project.name}.png`, Buffer.from(richPng, 'base64'));
  await richPreview.screenshot({ path: `artifacts/story-template-rich-${test.info().project.name}.png` });
  const originalTemplate = studio.getByRole('button', { name: 'نبض بازار', exact: true });
  await originalTemplate.click();
  await expect(originalTemplate).toHaveAttribute('aria-pressed', 'true');
  await studio.getByRole('button', { name: 'آبی اختصاصی', exact: true }).click();
  await studio.getByRole('button', { name: 'روشن', exact: true }).click();
  await expect(studio.getByRole('button', { name: 'آبی اختصاصی', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(studio.getByRole('button', { name: 'روشن', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await studio.getByRole('button', { name: 'ساخت پیش‌نمایش', exact: true }).click();
  await expect(studio.getByRole('img', { name: /پیش‌نمایش استوری/ })).toBeVisible({ timeout: 20000 });
  await studio.screenshot({ path: `artifacts/analysis-studio-${test.info().project.name}.png` });
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: `artifacts/analysis-compact-${test.info().project.name}.png`, fullPage: true });
});
