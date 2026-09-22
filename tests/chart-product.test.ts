import test from 'node:test';
import assert from 'node:assert/strict';
import { synchronizedDailyBubbles } from '../src/lib/daily-bubbles';
import { canAccessHistory, planHistoryDays, validHistorySubscription } from '../src/lib/history-access';
import { mergeDailyHistory, snapshotChartPoints } from '../src/lib/chart-history';
import { historyAccessForEmail } from '../src/server/history-access';
import { db } from '../src/lib/db';

test('daily backfill uses only matching completed days and stable versioned identities', () => {
  const make = (symbol: string, day: string, close: number) => ({ symbol, openTime: new Date(`${day}T00:00:00Z`), close });
  const rows = [make('GOLD_MELTED', '2026-09-01', 100000000), make('XAU_USD', '2026-09-01', 4000), make('USD', '2026-09-01', 200000),
    make('GOLD_MELTED', '2026-09-02', 110000000), make('XAU_USD', '2026-09-02', 4100), // missing USD, no forward fill
    make('GOLD_MELTED', '2026-09-03', 110000000), make('XAU_USD', '2026-09-03', 4100), make('USD', '2026-09-03', 210000)];
  const result = synchronizedDailyBubbles(rows, new Date('2026-09-03T12:00:00Z'));
  assert.equal(result.length, 1);
  assert.deepEqual(result, synchronizedDailyBubbles([...rows].reverse(), new Date('2026-09-03T12:00:00Z')));
  assert.match(result[0].id, /2026-09-01:f1.0:c1.0$/);
  assert.equal(result[0].xau.close, 4000);
  assert.throws(() => synchronizedDailyBubbles([...rows, rows[0]], new Date('2026-09-03')), /ambiguous/);
});

test('overlay joins daily values by day, never substitutes live snapshots or fills missing days', () => {
  const bars = ['01','02','03'].map(day => ({ t: `2026-09-${day}T00:00:00Z`, o: 100, h: 103, l: 99, c: 101 }));
  const points = mergeDailyHistory(bars, [
    { t: '2026-09-01T23:59:59Z', marketPrice: 100, bubblePercent: 2, cadence: 'daily' },
    { t: '2026-09-02T12:00:00Z', marketPrice: 100, bubblePercent: 99, cadence: 'snapshot' },
  ]);
  assert.equal(points[0].bubble, 2);
  assert.equal(points[1].bubble, undefined);
  assert.equal(points[2].bubble, undefined);
  assert.equal(snapshotChartPoints([{ t: bars[0].t, marketPrice: 100, bubblePercent: 2, cadence: 'daily' }], 'USD').length, 0);
});

test('free window and explicit plan capabilities fail closed', () => {
  assert.equal(canAccessHistory(24), true);
  assert.equal(canAccessHistory(25), false);
  assert.equal(canAccessHistory(2160, planHistoryDays(['history:90d'])), true);
  assert.equal(canAccessHistory(2160, planHistoryDays(['professional', 'API', 'history:999d'])), false);
  assert.equal(canAccessHistory(NaN, 90), false);
  const now = new Date('2026-09-22');
  const sub = { status: 'ACTIVE', startsAt: new Date('2026-09-01'), expiresAt: new Date('2026-10-01') };
  assert.equal(validHistorySubscription(sub, now), true);
  for (const patch of [{status:'PENDING'}, {expiresAt:now}, {startsAt:new Date('2026-10-01')}]) assert.equal(validHistorySubscription({...sub,...patch}, now), false);
});

test('paid history requires active subscription product matching an enabled web Plan entitlement', async t => {
  const userQuery = db.user.findUnique, planQuery = db.plan.findMany;
  t.after(() => { db.user.findUnique = userQuery; db.plan.findMany = planQuery; });
  db.user.findUnique = (async () => ({ subscriptions: [{ product: 'home', status: 'ACTIVE', startsAt: new Date(0), expiresAt: new Date('2100-01-01') }] })) as unknown as typeof userQuery;
  db.plan.findMany = (async (args: { where: { slug: { in: string[] }; active: boolean; webAvailable: boolean } }) => {
    assert.deepEqual(args.where, { slug: { in: ['home'] }, active: true, webAvailable: true });
    return [{ features: ['history:90d'] }];
  }) as unknown as typeof planQuery;
  assert.equal(await historyAccessForEmail(2160, 'test@example.invalid'), true);
  db.plan.findMany = (async () => [{ features: ['API only'] }]) as unknown as typeof planQuery;
  assert.equal(await historyAccessForEmail(2160, 'test@example.invalid'), false);
  db.user.findUnique = (async () => { throw new Error('unavailable'); }) as unknown as typeof userQuery;
  assert.equal(await historyAccessForEmail(2160, 'test@example.invalid'), false);
});
