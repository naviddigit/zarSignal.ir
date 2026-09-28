// Requires scripts/start-release-test.mjs; writes ONLY the isolated release fixture.
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { chromium, expect } from '@playwright/test';
const url=new URL(process.env.DATABASE_URL??'http://missing');
assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');assert.equal(url.pathname,'/b1_release');
const db=new PrismaClient();const browser=await chromium.launch({channel:'msedge'});
const key='homepage-content-v1';const previous=await db.integrationSetting.findUnique({where:{key}});
try {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addCookies([{name:'authjs.session-token',value:'b1-session-a',url:'http://127.0.0.1:3101'}]);
  const page=await context.newPage();await page.goto('http://127.0.0.1:3101/admin/content');
  await page.locator('textarea[name="title"]').fill('عنوان آزمایشی مدیریت');
  await page.getByRole('checkbox',{name:'پرسش‌های متداول',exact:true}).uncheck();
  await page.getByRole('button',{name:'ذخیره و انتشار متن‌ها',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('ذخیره شد');
  const saved=await db.integrationSetting.findUniqueOrThrow({where:{key}});
  assert.equal(JSON.parse(saved.publicValue).sections.faq,false);
  assert.equal(JSON.parse(saved.publicValue).texts.title,'عنوان آزمایشی مدیریت');
  assert.ok(await db.integrationSetting.count({where:{category:'audit',key:{startsWith:'content-audit-'}}}));
  await page.screenshot({path:'artifacts/customer-quality/admin-content-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto('http://127.0.0.1:3101/');
  await expect(page.locator('h1')).toContainText('عنوان آزمایشی مدیریت');
  await expect(page.locator('.faq-preview')).toHaveCount(0);
  const anon=await browser.newPage();await anon.goto('http://127.0.0.1:3101/admin/content');
  await expect(anon).toHaveURL(/admin\/login/);
  console.log('PASS: authenticated CMS save, DB persistence/audit, homepage rendering, visibility switch, mobile overflow, anonymous denial');
} finally {
  if(previous)await db.integrationSetting.update({where:{key},data:{publicValue:previous.publicValue}});
  else await db.integrationSetting.deleteMany({where:{key}});
  await browser.close();await db.$disconnect();
}
