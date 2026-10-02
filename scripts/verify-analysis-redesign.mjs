// Run with npm run dev already listening on localhost:3000. Temporary fixture is removed in finally.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const fixturePath = path.resolve('src/app/dev-analysis-review/page.tsx');
if (fs.existsSync(fixturePath)) throw new Error('Remove the previous local review fixture before running.');
fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
fs.mkdirSync('tmp', { recursive: true });
fs.writeFileSync(fixturePath, "import { notFound } from 'next/navigation';\nimport { MarketViewReportView } from '@/components/market-view-report';\nimport { AnalysisMarketSelect } from '@/components/analysis-market-select';\nimport { marketViewReportFromSnapshot } from '@/server/market-view-report';\nimport { instruments, type Symbol, type Snapshot } from '@/lib/market';\nexport default async function Review({ searchParams }: { searchParams: Promise<Record<string,string>> }) {\n if (process.env.NODE_ENV !== 'development') notFound();\n const q = await searchParams;\n const prices = [26039971*4.3318,26039971,4192.37,61.48,516051,261698,71310,250000000,75000000];\n const now = new Date(Date.now() - (q.stale ? 3600000 : 0)).toISOString();\n const snapshot: Snapshot = {mode:'live',status:'ok',quotes: instruments.filter(a => !q.missing || a.symbol === 'SEKE_CASH').map(a => ({symbol:a.symbol,buy:String(prices[instruments.indexOf(a)]),sell:String(prices[instruments.indexOf(a)]),currency:a.currency,unit:a.unit,source:'test',sourceUrl:null,observedAt:now,fetchedAt:now}))};\n const report=marketViewReportFromSnapshot(snapshot,q.guest ? 'preview' : 'full',q.symbol as Symbol || undefined);\n return <main id=\"main\" className=\"shell content-page analysis-page market-view-page\"><p>دادهٔ آزمایشی برای بررسی رابط</p><AnalysisMarketSelect current={q.symbol}/><MarketViewReportView initial={report} canRefresh signedIn={!q.guest} readingSettings={{baseCps:45,fastMultiplier:2,sectionAppearMs:220}} /></main>;\n}\n");
const browser=await chromium.launch({channel:'msedge'});
try {
const errors=[];
const page=await browser.newPage({viewport:{width:390,height:844}});
page.on('pageerror',e=>errors.push(`${page.url()}: ${e.message}`));
let mode='new', count=0;
await page.route('**/api/public/analysis/read',r=>r.fulfill({json:{count:32}}));
await page.route('**/api/public/analysis/feedback?*', r=>{
 count++;
 return r.fulfill(mode==='error' ? {status:503,json:{}} : {json:{feedback:mode==='saved'?{rating:4,comment:'نظر ذخیره‌شده'}:null,canCreateNew:mode==='new'||mode==='saved',nextAllowedAt:mode==='cooldown'?new Date(Date.now()+2000).toISOString():null}});
});
await page.goto('http://localhost:3000/dev-analysis-review');
await expect(page.locator('.market-view__narrative')).toHaveAttribute('data-typing','on',{timeout:60000});
const before=Number(await page.locator('.market-view__narrative').getAttribute('data-shown'));
await page.getByRole('button',{name:'۲×',exact:true}).click();
expect(Number(await page.locator('.market-view__narrative').getAttribute('data-shown'))).toBeGreaterThanOrEqual(before);
await page.mouse.wheel(0,-300);
await expect(page.getByRole('button',{name:'ادامهٔ خواندن'})).toBeVisible();
await page.getByRole('button',{name:'ادامهٔ خواندن'}).click();
await expect(page.locator('.market-view')).toHaveAttribute('data-reveal-phase','done',{timeout:60000});
await expect(page.locator('#analysis-feedback-label')).toBeInViewport();
const bounds=await page.locator('#analysis-feedback-label').boundingBox();
expect(bounds.y+bounds.height).toBeLessThan(744);
await page.getByText('افزودن توضیح اختیاری',{exact:true}).click();
await page.getByRole('textbox',{name:'بازخورد اختیاری'}).fill('آزمون بدون ارسال');
console.log('typing/speed/pause/resume/final feedback PASS');
await page.emulateMedia({reducedMotion:'reduce'});
for(const width of [360,390,768,1440]) for(const theme of ['dark','light']) {
 await page.setViewportSize({width,height:900});
 await page.addInitScript(t=>localStorage.setItem('zarsignal-theme',t),theme);
 for(const symbol of ['', 'GOLD_MELTED','USD','SILVER_999']) {
  await page.goto('http://localhost:3000/dev-analysis-review?symbol='+symbol);
  await expect(page.locator('.market-view__engagement')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(!symbol) await page.screenshot({path:`tmp/analysis-after-${width}-${theme}.png`,fullPage:true});
 }
}
console.log('4 widths x 2 themes x 4 reports PASS');
await page.setViewportSize({width:390,height:844});
for(const next of ['saved','cooldown','error']) {
 mode=next; await page.goto('http://localhost:3000/dev-analysis-review');
 await expect(page.locator('.market-view__feedback')).not.toContainText('در حال بررسی بازخورد');
 if(mode==='saved') {await expect(page.getByText('نظر ذخیره‌شده',{exact:true})).toBeVisible();await expect(page.locator('.market-view__feedback form')).toHaveCount(0);await page.getByRole('button',{name:'ویرایش بازخورد'}).click();await expect(page.locator('.market-view__feedback form')).toBeVisible();}
 else {await expect(page.locator('.market-view__feedback form')).toHaveCount(0);mode='new';if(next==='error')await page.getByRole('button',{name:'تلاش دوباره'}).click();await expect(page.locator('.market-view__feedback form')).toBeVisible({timeout:7000});}
}
console.log('saved/edit/cooldown expiry/status failure retry PASS');
for(const query of ['guest=1','missing=1','stale=1']) {
 await page.goto('http://localhost:3000/dev-analysis-review?'+query);
 await expect(page.locator('.market-view__engagement')).toBeVisible();
 if(query==='guest=1') await expect(page.locator('.market-view__feedback form')).toHaveCount(0);
 await page.screenshot({path:`tmp/analysis-${query.split('=')[0]}.png`,fullPage:true});
}
mode='new';await page.goto('http://localhost:3000/dev-analysis-review');
await page.getByRole('button',{name:'ساخت استوری',exact:true}).click();
for(const [id,label] of [['vault_dark','نبض بازار'],['studio_light','تمرکز روی یک دارایی'],['dual_metal','مقایسهٔ طلا و نقره']]) {
 await page.getByRole('button',{name:label,exact:true}).click();
 if(id==='studio_light')await page.getByLabel('تم تصویر').selectOption('light');
 await page.getByRole('button',{name:'پیش‌نمایش و ساخت PNG'}).click();
 await expect(page.getByRole('button',{name:'دانلود PNG'})).toBeVisible({timeout:15000});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'دانلود PNG'}).click();await (await download).saveAs(`tmp/story-${id}.png`);
}
console.log('three real story PNG exports PASS');
await page.route('**/api/public/market-view?*', r => r.fulfill({json:{unchanged:true}}));
await page.getByRole('button',{name:'بررسی دادهٔ تازه',exact:true}).click();
await expect(page.getByText('از آخرین بررسی، دادهٔ مؤثر بر تحلیل تغییر نکرده است.')).toBeVisible();
await expect(page.locator('.market-view')).toHaveAttribute('data-reveal-phase','done');
console.log('unchanged refresh preserves report PASS');
console.log('page errors',errors);expect(errors).toEqual([]);
} finally { await browser.close(); fs.unlinkSync(fixturePath); fs.rmdirSync(path.dirname(fixturePath)); }
