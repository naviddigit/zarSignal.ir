import test from 'node:test';
import assert from 'node:assert/strict';
import {
  channelDeliveryReady,
  crossedThreshold,
  evaluateMarketAlert,
  shouldRearmAlert,
  type MarketSnapshotMetrics,
} from '../src/lib/market-change-alerts';
import { diffVisitBaseline, type VisitBaselinePayload } from '../src/server/last-visit';

const fresh: MarketSnapshotMetrics = {
  observedAt: '2026-10-02T09:00:00.000Z',
  prices: {
    GOLD_MELTED: { value: 30_000_000, unit: 'مثقال', currency: 'TMN', stale: false },
  },
  gaps: {
    gold: { percent: 1.5, stale: false },
    silver: { percent: -0.4, stale: false },
    usd: { percent: 0.2, stale: false },
  },
  goldSilverRelativePct: 1.9,
};

test('price and gap cross fire only on edge when armed', () => {
  const fire = evaluateMarketAlert({
    conditionType: 'GAP_PCT_CROSS',
    symbol: 'GOLD_BUBBLE',
    unit: null,
    direction: 'above',
    threshold: 1,
    armed: true,
    lastFiredAt: null,
  }, fresh);
  assert.equal(fire.fire, true);
  if (fire.fire) {
    assert.match(fire.message, /هشدار تغییر بازار/);
    assert.match(fire.message, /توصیهٔ خرید یا فروش نیست/);
  }

  const disarmed = evaluateMarketAlert({
    conditionType: 'GAP_PCT_CROSS',
    symbol: 'GOLD_BUBBLE',
    unit: null,
    direction: 'above',
    threshold: 1,
    armed: false,
    lastFiredAt: new Date(),
  }, fresh);
  assert.equal(disarmed.fire, false);
  if (!disarmed.fire) assert.equal(disarmed.reason, 'disarmed');

  assert.equal(shouldRearmAlert({
    conditionType: 'GAP_PCT_CROSS',
    symbol: 'GOLD_BUBBLE',
    unit: null,
    direction: 'above',
    threshold: 1,
  }, { ...fresh, gaps: { ...fresh.gaps, gold: { percent: 0.2, stale: false } } }), true);

  assert.equal(crossedThreshold(1.5, 1, 'above'), true);
  assert.equal(crossedThreshold(0.5, 1, 'above'), false);
});

test('stale or missing inputs never fire', () => {
  const stale = evaluateMarketAlert({
    conditionType: 'PRICE_CROSS',
    symbol: 'GOLD_MELTED',
    unit: 'مثقال',
    direction: 'above',
    threshold: 1,
    armed: true,
    lastFiredAt: null,
  }, {
    ...fresh,
    prices: { GOLD_MELTED: { value: 40_000_000, unit: 'مثقال', currency: 'TMN', stale: true } },
  });
  assert.equal(stale.fire, false);
  if (!stale.fire) assert.equal(stale.reason, 'stale_or_unit');

  const missing = evaluateMarketAlert({
    conditionType: 'GOLD_SILVER_RELATIVE',
    symbol: 'RELATIVE',
    unit: null,
    direction: 'above',
    threshold: 0.5,
    armed: true,
    lastFiredAt: null,
  }, { ...fresh, goldSilverRelativePct: null });
  assert.equal(missing.fire, false);
});

test('Push and SMS channels are not ready without service', () => {
  assert.equal(channelDeliveryReady('IN_APP').ready, true);
  assert.equal(channelDeliveryReady('PUSH').ready, false);
  assert.equal(channelDeliveryReady('SMS').ready, false);
  assert.match(channelDeliveryReady('SMS').note, /SMS/);
});

test('last-visit diff uses real deltas only and caps at three', () => {
  const previous: VisitBaselinePayload = {
    observedAt: '2026-10-01T10:00:00.000Z',
    metrics: [
      { id: 'gold', label: 'طلا', gapPercent: -1, priceLabel: 'a' },
      { id: 'silver', label: 'نقره ۹۹۹', gapPercent: 0.5, priceLabel: 'b' },
      { id: 'usd', label: 'دلار', gapPercent: 0.1, priceLabel: 'c' },
    ],
  };
  const current: VisitBaselinePayload = {
    observedAt: '2026-10-02T10:00:00.000Z',
    metrics: [
      { id: 'gold', label: 'طلا', gapPercent: -2.2, priceLabel: 'a2' },
      { id: 'silver', label: 'نقره ۹۹۹', gapPercent: 1.1, priceLabel: 'b' },
      { id: 'usd', label: 'دلار', gapPercent: 0.12, priceLabel: 'c' },
    ],
  };
  const changes = diffVisitBaseline(current, previous, 3);
  assert.ok(changes.length >= 1);
  assert.ok(changes.length <= 3);
  assert.match(changes[0]!.summary, /طلا|نقره/);
  assert.doesNotMatch(changes.map(c => c.summary).join(' '), /ساختگی|فرضی/);
});
