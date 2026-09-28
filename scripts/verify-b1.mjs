import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { webkit, expect } from '@playwright/test';
const base='http://127.0.0.1:3101'; // Isolated fixture server only; never production.
await mkdir('artifacts/phase-b1',{recursive:true});
const browser=await webkit.launch();
try {
  const admin=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'America/Los_Angeles'});
  await admin.addCookies([{name:'authjs.session-token',value:'b1-session-a',url:base}]);
  const page=await admin.newPage();
  await page.goto(base+'/admin/analysis-settings');
  await expect(page.getByRole('heading',{name:'بازه اعتبار تحلیل',exact:true})).toBeVisible();
  await page.screenshot({path:'artifacts/phase-b1/admin-desktop.png',fullPage:true});
  // Unauthorized and cross-origin writes never reach persistence.
  const anon=await browser.newContext();
  const unauthorized=await anon.request.post(base+'/api/admin/analysis-settings',{headers:{Origin:base},data:{warningStart:'21:00',warningEnd:'10:00'}});
  assert.equal(unauthorized.status(),401);
  const cross=await admin.request.post(base+'/api/admin/analysis-settings',{headers:{Origin:'https://untrusted.invalid'},data:{warningStart:'21:00',warningEnd:'10:00'}});
  assert.equal(cross.status(),403);
  const invalid=await admin.request.post(base+'/api/admin/analysis-settings',{headers:{Origin:base},data:{warningStart:'10:00',warningEnd:'10:00'}});
  assert.equal(invalid.status(),400);
  // Verify UI save feedback using its current (warning) test window.
  await page.getByRole('button',{name:'ذخیره بازه اعتبار',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('ذخیره شد');
  await page.waitForLoadState('networkidle');
  for(const width of [360,390,430]){
    await page.setViewportSize({width,height:844});
    await page.goto(base+'/analysis/gold_melted');
    await expect(page.getByRole('heading',{name:'هشدار اعتبار تحلیل'})).toBeVisible();
    await expect(page.locator('.analysis-summary')).toHaveCount(0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await expect(page.getByRole('button',{name:'مشاهده تحلیل با پذیرش هشدار'})).toBeInViewport();
    await page.screenshot({path:`artifacts/phase-b1/warning-${width}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'مشاهده تحلیل با پذیرش هشدار'}).click();
  await expect(page.locator('.analysis-summary')).toBeVisible();
  await expect(page.getByRole('status').filter({hasText:'تحلیل خارج از بازه استاندارد'})).toBeVisible();
  const accepted=page.url();assert.ok(new URL(accepted).searchParams.get('request'));
  const other=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Pacific/Auckland'});
  await other.addCookies([{name:'authjs.session-token',value:'b1-session-b',url:base}]);
  const otherPage=await other.newPage();await otherPage.goto(accepted);
  await expect(otherPage.getByRole('heading',{name:'هشدار اعتبار تحلیل'})).toBeVisible();
  await expect(otherPage.locator('.analysis-summary')).toHaveCount(0);
  await page.goto(base+'/admin/analysis-settings');
  await page.getByRole('button',{name:'تیره',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'artifacts/phase-b1/admin-mobile-dark.png',fullPage:true});
  // Changing policy invalidates old acceptance, even if hours remain the same.
  await page.getByRole('button',{name:'ذخیره بازه اعتبار',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('ذخیره شد');
  await page.waitForLoadState('networkidle');
  await page.goto(accepted);await expect(page.getByRole('heading',{name:'هشدار اعتبار تحلیل'})).toBeVisible();
  await anon.close();await other.close();await admin.close();
  console.log('PASS: admin save, 401/403/400, warning 360/390/430, acknowledgement isolation, policy invalidation, browser timezone independence');
} finally {await browser.close();}
