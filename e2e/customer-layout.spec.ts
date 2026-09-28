import {test,expect} from '@playwright/test';
test('mobile hero text and radar label remain visible without overlap',async({page})=>{
  for(const width of [320,390,430]){
    await page.setViewportSize({width,height:844});await page.goto('/');
    await expect(page.locator('.hero-copy h1')).toBeVisible();
    const token=await page.locator('.token-gold').boundingBox();
    const label=await page.locator('.radar-pro__eyebrow').boundingBox();
    expect(label!.y).toBeGreaterThan(token!.y+token!.height);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await expect(page.locator('body>.footer')).not.toBeVisible();
  }
});
test('radar rotates available assets and remains selectable',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');await page.mouse.move(0,0);
  await expect(page.locator('.token-dollar')).toHaveAttribute('aria-pressed','true',{timeout:12000});
  await page.locator('.token-silver').click();
  await expect(page.locator('.token-silver')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.radar-pro__status')).toContainText('در انتظار مدل');
  await expect(page.getByRole('button',{name:'ادامه چرخش خودکار'})).toBeVisible();
});
