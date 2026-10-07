import { test,expect } from '@playwright/test';
test('boot releases content even when hydration chunks never arrive',async({page})=>{
  await page.route('**/_next/**/*.js',route=>route.abort());
  await page.goto('/calculator',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#boot-splash')).toBeHidden({timeout:4000});
  await expect(page.getByRole('main')).toBeVisible();
});
test('mobile tool list removes physical weight and supports staged trades',async({page})=>{
  await page.goto('/calculator');
  await expect(page.getByRole('tab',{name:'ارز',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'وزن واقعی',exact:true})).toHaveCount(0);
  await page.getByRole('tab',{name:'معامله سریع',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'قیمت ورود',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'خرید پله‌ای',exact:true}).click();
  await expect(page.locator('.trade-step')).toHaveCount(2);
  await page.getByRole('button',{name:'افزودن پله'}).click();
  await expect(page.locator('.trade-step')).toHaveCount(3);
  await expect(page.locator('.calc-stage__side')).toBeHidden();
  await page.screenshot({path:'artifacts/calculator-mobile-completion.png',fullPage:true});
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth',await page.evaluate(()=>document.body.clientWidth));
});

test('mobile market and bubbles use compact two-column cards',async({page})=>{
  await page.setViewportSize({width:360,height:780});
  await page.goto('/markets');
  await expect(page.locator('.price-card-grid')).toHaveCSS('grid-template-columns',/\d.*px \d.*px/);
  await page.screenshot({path:'artifacts/markets-mobile-completion.png',fullPage:true});
  await page.goto('/');
  await expect(page.locator('.bubble-grid')).toHaveCSS('grid-template-columns',/\d.*px \d.*px/);
  await page.locator('#bubbles').screenshot({path:'artifacts/bubbles-mobile-completion.png'});
});

test('calculator waits beyond twelve seconds for a fresh quote without another click',async({page})=>{
  await page.goto('/calculator');
  await page.getByRole('button',{name:'مثقال ↔ گرم ۱۸',exact:true}).click();
  await page.getByRole('button',{name:'مثقال به گرم ۱۸',exact:true}).click();
  await page.clock.install();
  let release!: (route: import('@playwright/test').Route) => void;
  const requested = new Promise<import('@playwright/test').Route>(resolve=>{release=resolve;});
  await page.route('**/api/public/markets?fresh=1',route=>release(route));
  await page.getByRole('button',{name:'تازه‌سازی قیمت‌ها'}).click();
  const route = await requested;
  await page.clock.fastForward(13000);
  const now = new Date().toISOString();
  await route.fulfill({json:{mode:'live',status:'ok',quotes:[{symbol:'GOLD_MELTED',buy:'100000000',sell:'100000000',currency:'TMN',unit:'مثقال',observedAt:now,fetchedAt:now,source:'زرسیگنال',sourceUrl:null}]}});
  await expect(page.getByRole('textbox',{name:'مثقال آب‌شده ۷۰۵'})).toHaveValue('100,000,000');
  await expect(page.locator('.calc-error')).toHaveCount(0);
});
