// Run only against the isolated PostgreSQL release fixture and a production-mode test server.
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { chromium, expect } from '@playwright/test';
const url = new URL(process.env.DATABASE_URL ?? 'http://missing');
assert.equal(url.hostname,'127.0.0.1'); assert.equal(url.port,'55439'); assert.equal(url.pathname,'/b1_release');
const db = new PrismaClient();
const browser = await chromium.launch({channel:'msedge'});
try {
  const response = await fetch('http://127.0.0.1:3101/pricing');
  assert.equal(response.status,200);
  assert.ok((await response.text()).includes('خانگی'));
  const migration = await db.$queryRaw`SELECT finished_at FROM "_prisma_migrations" WHERE migration_name='20260927120000_analysis_time_reliability'`;
  assert.equal(migration.length,1); assert.ok(migration[0].finished_at);
  assert.equal(await db.plan.count({where:{slug:{in:['free','home','professional']}}}),3);
  const home = await db.plan.findUniqueOrThrow({where:{slug:'home'},include:{pricingVersions:true}});
  assert.equal(home.pricingVersions[0].price.toString(),'149000');
  const context = await browser.newContext();
  await context.addCookies([{name:'authjs.session-token',value:'b1-session-a',url:'http://127.0.0.1:3101'}]);
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3101/admin/plans');
  await expect(page.locator('input[name="trialDuration"]')).toHaveValue('1');
  await page.locator('input[name="trialDuration"]').fill('3');
  await page.getByRole('button',{name:'ذخیره دوره رایگان',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('ذخیره شد');
  assert.equal((await db.integrationSetting.findUniqueOrThrow({where:{key:'analysis-trial-hours'}})).publicValue,'72');
  await page.reload();
  await expect(page.locator('input[name="trialDuration"]')).toHaveValue('3');
  await page.goto('http://127.0.0.1:3101/pricing');
  assert.equal(await db.plan.count({where:{slug:{in:['free','home','professional']}}}),3);
  assert.equal((await db.integrationSetting.findUniqueOrThrow({where:{key:'analysis-trial-hours'}})).publicValue,'72');
  console.log('PASS: production release migration, launch prices, admin trial 3 days = 72h, persistence and repeat-read preservation');
} finally { await browser.close(); await db.$disconnect(); }
