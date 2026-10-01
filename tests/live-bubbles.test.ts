import assert from 'node:assert/strict';
import test from 'node:test';
import { computeLiveBubbles } from '../src/server/live-bubbles';
import type { Snapshot } from '../src/lib/market';

const base = {
  buy: '100',
  sell: '110',
  source: 'test',
  sourceUrl: null,
  observedAt: new Date().toISOString(),
  fetchedAt: new Date().toISOString(),
};

test('live bubbles compute gold and usd from mazaneh even when slightly stale', () => {
  const old = new Date(Date.now() - 40 * 60_000).toISOString();
  const snapshot: Snapshot = {
    mode: 'live',
    status: 'stale',
    pollSeconds: 300,
    quotes: [
      { symbol: 'GOLD_MELTED', currency: 'TMN', unit: 'مثقال', buy: '100000000', sell: '100000000', source: 't', sourceUrl: null, observedAt: old, fetchedAt: old },
      { symbol: 'XAU_USD', currency: 'USD', unit: 'oz', buy: '4000', sell: '4000', source: 't', sourceUrl: null, observedAt: old, fetchedAt: old },
      { symbol: 'USD', currency: 'TMN', unit: 'دلار', buy: '200000', sell: '200000', source: 't', sourceUrl: null, observedAt: old, fetchedAt: old },
      { symbol: 'XAG_USD', currency: 'USD', unit: 'oz', buy: '50', sell: '50', source: 't', sourceUrl: null, observedAt: old, fetchedAt: old },
      { symbol: 'AED', currency: 'TMN', unit: 'درهم', ...base },
      { symbol: 'GOLD_18K', currency: 'TMN', unit: 'گرم', ...base },
      { symbol: 'SILVER_999', currency: 'TMN', unit: 'گرم', buy: '350000', sell: '350000', source: 't', sourceUrl: null, observedAt: old, fetchedAt: old },
      { symbol: 'SEKE_CASH', currency: 'TMN', unit: 'عدد', ...base },
      { symbol: 'ROB_SEKE', currency: 'TMN', unit: 'عدد', ...base },
    ],
  };
  const cards = computeLiveBubbles(snapshot);
  const gold = cards.find(item => item.key === 'GOLD_BUBBLE')!;
  const silver = cards.find(item => item.key === 'SILVER_BUBBLE')!;
  const usd = cards.find(item => item.key === 'USD_BUBBLE')!;
  assert.equal(gold.status, 'stale');
  assert.ok(gold.percent != null);
  assert.equal(usd.status, 'stale');
  assert.ok(usd.percent != null);
  assert.equal(silver.status, 'stale');
  assert.ok(silver.percent != null);
  assert.equal(silver.formulaVersion, 'V5.4-SILVER.1');
  assert.ok(silver.usdImplied != null);
  assert.ok(silver.silverUsdGapPct != null);
  // Separate fields must both be present (do not merge into one generic silver_gap).
  assert.notEqual(silver.percent, null);
  assert.notEqual(silver.silverUsdGapPct, null);
});

test('silver bubble unavailable without SILVER_999 but may expose theoretical only', () => {
  const now = new Date().toISOString();
  const snapshot: Snapshot = {
    mode: 'live',
    status: 'ok',
    pollSeconds: 60,
    quotes: [
      { symbol: 'GOLD_MELTED', currency: 'TMN', unit: 'مثقال', buy: '100000000', sell: '100000000', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
      { symbol: 'XAU_USD', currency: 'USD', unit: 'اونس تروا', buy: '4000', sell: '4000', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
      { symbol: 'USD', currency: 'TMN', unit: 'دلار', buy: '200000', sell: '200000', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
      { symbol: 'XAG_USD', currency: 'USD', unit: 'اونس تروا', buy: '50', sell: '50', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
      { symbol: 'AED', currency: 'TMN', unit: 'درهم', ...base, observedAt: now, fetchedAt: now },
      { symbol: 'GOLD_18K', currency: 'TMN', unit: 'گرم', ...base, observedAt: now, fetchedAt: now },
      { symbol: 'SEKE_CASH', currency: 'TMN', unit: 'عدد', ...base, observedAt: now, fetchedAt: now },
      { symbol: 'ROB_SEKE', currency: 'TMN', unit: 'عدد', ...base, observedAt: now, fetchedAt: now },
    ],
  };
  const silver = computeLiveBubbles(snapshot).find(item => item.key === 'SILVER_BUBBLE')!;
  assert.equal(silver.status, 'unavailable');
  assert.equal(silver.percent, null);
  assert.equal(silver.gap ?? null, null);
  assert.ok(silver.theoretical != null);
});
