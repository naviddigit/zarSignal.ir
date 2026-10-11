import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfessional } from '../src/server/professional-calculator';
import { coinValuation, coinOperations } from '../src/lib/coin-calculator';
import { liveQuarterBubble } from '../src/lib/coin-live';
import { defaultCalculatorAccessPolicy } from '../src/lib/calculator-access';
import { calculatorToolsByProduct } from '../src/lib/calculator-navigation';
import { evaluateMarketAlert } from '../src/lib/market-change-alerts';
import type { Snapshot } from '../src/lib/market';
const empty: Snapshot = { mode: 'live', status: 'unavailable', quotes: [] };
function run(operation: string, values: Record<string, number>, coin = 'emami', snapshot = empty) {
  return calculateProfessional({ operation, coin, inputs: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value, provenance: 'MANUAL' }])) }, snapshot).outputs;
}
test('coin metal basis and positive/negative bubble use intrinsic denominator', () => {
  assert.ok(Math.abs(coinValuation(8.133, 900, 15e6, 143e6).intrinsic - 146394000) < .001);
  assert.ok(Math.abs(coinValuation(8.133, 900, 15e6, 143e6).gap + 3394000) < .001);
  assert.throws(() => coinValuation(0, 900, 1, 1));
  assert.equal(run('coinIntrinsic', { gram: 1000, weight: 1, purity: 750 }, 'custom')[1].value, 1000);
  assert.throws(() => run('coinIntrinsic', { gram: 1000 }, '__proto__'));
});
test('budget charges per-coin fees once and leaves nonnegative remainder', () => {
  const rows = run('coinBudget', { gram: 15e6, price: 143e6, capital: 500e6, fee: 1e6 });
  assert.equal(rows[0].value, 3); assert.equal(rows[4].value, 432e6); assert.equal(rows[5].value, 68e6);
});
test('target, break-even, conversion and global scenario preserve units and costs', () => {
  assert.equal(run('coinTarget', { gram: 15e6, price: 100, quantity: 2, target: 120, cost: 10 })[1].value, 30);
  assert.equal(run('coinBubbleBreakEven', { gram: 15e6, price: 100, quantity: 2, cost: 10 })[0].value, 105);
  assert.equal(run('coinSwap', { price: 100, quantity: 2, destination: 30, cost: 10 })[2].value, 6);
  const rows = run('coinScenario', { xau: 31.1034768, usd: 1000, threshold: -10, price: 10000 });
  assert.ok(Math.abs(rows[1].value - 8.133 * .9 * 1000 * .9) < 1e-8);
  assert.throws(() => run('coinTarget', { gram: 1, price: 1, quantity: 1.5, target: 2, cost: 0 }));
});
test('comparison excludes missing prices, sorts bubbles, and reports threshold distances', () => {
  const values = { gram: 1000, emami: 10000, bahar: 9000, half: 0, quarter: 0, gram_unused: 0 };
  // Price key for the gram coin must not collide with the gold reference.
  const rows = run('coinCompare', { ...values, coinGram: 0 });
  assert.match(rows[0].label, /بهار/);
  assert.equal(rows.length, 4);
  const alert = run('coinAlert', { gram: 1000, price: 9000, threshold: -5 });
  assert.ok(alert.at(-1)!.value < 0);
});
test('all new tools have navigation and admin policy entries', () => {
  for (const id of Object.keys(coinOperations)) {
    assert.ok(calculatorToolsByProduct.coin.includes(id as never));
    assert.ok(Object.hasOwn(defaultCalculatorAccessPolicy, id));
  }
});
test('quarter live reference rejects stale prices and does not trust manual prices as live', () => {
  const now = new Date().toISOString();
  const snapshot: Snapshot = { mode: 'live', status: 'ok', quotes: [
    { symbol: 'GOLD_MELTED', buy: '4331.8', sell: '4331.8', unit: 'مثقال', currency: 'TMN', source: 'test', sourceUrl: null, fetchedAt: now, observedAt: now },
    { symbol: 'ROB_SEKE', buy: '2300', sell: '2300', unit: 'عدد', currency: 'TMN', source: 'test', sourceUrl: null, fetchedAt: now, observedAt: now },
  ] };
  assert.ok(liveQuarterBubble(snapshot)!.percent < 0);
  snapshot.quotes[0].observedAt = '2020-01-01T00:00:00Z';
  assert.equal(liveQuarterBubble(snapshot), null);
  assert.throws(() => calculateProfessional({ operation: 'coinIntrinsic', coin: 'emami', inputs: { gram: { provenance: 'LIVE', value: 999 } } }, empty));
});
test('quarter alert fires only with fresh metric below personal threshold', () => {
  const alert = { conditionType: 'GAP_PCT_CROSS' as const, symbol: 'QUARTER_BUBBLE', unit: null, direction: 'below' as const, threshold: 0, armed: true, lastFiredAt: null };
  const metrics = { observedAt: new Date().toISOString(), prices: {}, gaps: { quarter: { percent: -1, stale: false } }, goldSilverRelativePct: null };
  assert.equal(evaluateMarketAlert(alert, metrics).fire, true);
  metrics.gaps.quarter.stale = true;
  assert.equal(evaluateMarketAlert(alert, metrics).fire, false);
});
