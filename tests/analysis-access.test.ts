import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { resolveAccountEntitlement } from '../src/server/account-entitlement';
import { trialPolicy } from '../src/server/analysis-trial';
import { hasCapability } from '../src/lib/capabilities';

test('admin trial hours, expiry and switch govern report entitlements; other internal products do not unlock reports', async t => {
  const subscriptionQuery = db.subscription.findMany;
  const planQuery = db.plan.findMany;
  const settingQuery = db.integrationSetting.findUnique;
  t.after(() => { db.subscription.findMany = subscriptionQuery; db.plan.findMany = planQuery; db.integrationSetting.findUnique = settingQuery; });
  let enabled = true;
  let product = '__analysis_trial';
  let expiresAt = new Date(Date.now() + 3_600_000);
  db.subscription.findMany = (async () => [{ product, status: 'ACTIVE', startsAt: new Date(0), expiresAt }]) as unknown as typeof subscriptionQuery;
  db.plan.findMany = (async () => []) as unknown as typeof planQuery;
  db.integrationSetting.findUnique = (async () => ({ enabled, publicValue: '3' })) as unknown as typeof settingQuery;
  assert.equal((await trialPolicy()).hours, 3);
  assert.equal(hasCapability((await resolveAccountEntitlement('test-user')).level, 'ANALYSIS_BASIC'), true);
  enabled = false;
  assert.equal((await resolveAccountEntitlement('test-user')).level, 'FREE');
  enabled = true;
  expiresAt = new Date(0);
  assert.equal((await resolveAccountEntitlement('test-user')).level, 'FREE');
  expiresAt = new Date(Date.now() + 3_600_000);
  product = '__other_internal';
  assert.equal((await resolveAccountEntitlement('test-user')).level, 'FREE');
  product = '__analysis_trial';
  db.integrationSetting.findUnique = (async () => { throw new Error('offline'); }) as unknown as typeof settingQuery;
  assert.equal((await resolveAccountEntitlement('test-user')).level, 'FREE');
});

test('commercial report access requires an enabled published plan and survives disabling trials', async t => {
  const subscriptionQuery = db.subscription.findMany, planQuery = db.plan.findMany, settingQuery = db.integrationSetting.findUnique;
  t.after(() => { db.subscription.findMany = subscriptionQuery; db.plan.findMany = planQuery; db.integrationSetting.findUnique = settingQuery; });
  db.subscription.findMany = (async () => [{ product: 'home', status: 'ACTIVE', startsAt: new Date(0), expiresAt: new Date('2100-01-01') }]) as unknown as typeof subscriptionQuery;
  db.plan.findMany = (async () => [{ slug: 'home', title: 'خانگی', features: ['history:30d'] }]) as unknown as typeof planQuery;
  db.integrationSetting.findUnique = (async () => ({ enabled: false, publicValue: '24' })) as unknown as typeof settingQuery;
  assert.equal((await resolveAccountEntitlement('test-user')).level, 'HOME');
  db.plan.findMany = (async () => []) as unknown as typeof planQuery;
  assert.equal((await resolveAccountEntitlement('test-user')).level, 'FREE');
});
