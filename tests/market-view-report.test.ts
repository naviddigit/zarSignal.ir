import test from 'node:test';
import assert from 'node:assert/strict';
import { composeMarketViewProse, type MarketViewEvidenceRow } from '../src/lib/market-view-report';

function row(partial: Partial<MarketViewEvidenceRow> & Pick<MarketViewEvidenceRow, 'id' | 'marketLabel'>): MarketViewEvidenceRow {
  return {
    marketPriceLabel: null,
    referenceLabel: null,
    referenceBasis: 'test',
    diffPercent: null,
    unitNote: 'test',
    status: 'unavailable',
    statusReason: null,
    formulaVersion: null,
    ...partial,
  };
}

test('composeMarketViewProse refuses fake conclusion without usable rows', () => {
  const prose = composeMarketViewProse([
    row({ id: 'gold', marketLabel: 'طلا', status: 'unavailable', statusReason: 'missing' }),
    row({ id: 'coin', marketLabel: 'سکه', status: 'blocked', statusReason: 'SPEC' }),
  ], 'unavailable');
  assert.equal(prose.conclusion, null);
  assert.equal(prose.reading, null);
  assert.match(prose.summaryLines[0], /در دسترس نیست|داده/);
});

test('composeMarketViewProse describes gold below reference without trade advice', () => {
  const prose = composeMarketViewProse([
    row({ id: 'gold', marketLabel: 'طلا', status: 'ok', diffPercent: -2.4, marketPriceLabel: '1', referenceLabel: '2' }),
    row({ id: 'usd', marketLabel: 'دلار', status: 'ok', diffPercent: 0.05, marketPriceLabel: '1', referenceLabel: '2' }),
    row({ id: 'silver', marketLabel: 'نقره', status: 'ok', diffPercent: 0.4, marketPriceLabel: '1', referenceLabel: '2' }),
    row({ id: 'coin', marketLabel: 'سکه', status: 'blocked', statusReason: 'SPEC' }),
  ], 'ok');
  assert.match(prose.summaryLines[0], /پایین‌تر|طلا/);
  assert.ok(prose.reading);
  assert.match(prose.reading!, /مجوز خرید یا فروش نیست/);
  assert.doesNotMatch(prose.reading!, /بخرید|بفروشید|پیشنهاد خرید|پیشنهاد فروش/);
  assert.ok(prose.conclusion);
  assert.doesNotMatch(prose.conclusion!, /بخرید|بفروشید/);
});


test('no invented neutral band and no unusable row in narrative', () => {
  const prose = composeMarketViewProse([
    row({ id: 'gold', marketLabel: 'طلا', status: 'ok', diffPercent: -0.01 }),
    row({ id: 'silver', marketLabel: 'نقره', status: 'blocked', diffPercent: 90 }),
  ], 'ok');
  assert.match(prose.summaryLines[0], /پایین‌تر/);
  assert.doesNotMatch(prose.summaryLines[0], /نقره|نزدیک|خنثی/);
  assert.ok(prose.reading);
});

test('gold implied dollar is not counted as an independent valuation', () => {
  const prose = composeMarketViewProse([
    row({ id: 'gold', marketLabel: 'طلا', status: 'ok', diffPercent: -1 }),
    row({ id: 'usd', marketLabel: 'دلار', status: 'ok', diffPercent: 1.01 }),
    row({ id: 'silver', marketLabel: 'نقره', status: 'ok', diffPercent: 0.1 }),
  ], 'ok');
  assert.match(prose.reading!, /تأیید مستقل/);
  assert.match(prose.conclusion!, /^طلا/);
});

test('gold silver parity describes the supplied example without inventing executable swap', () => {
  const evidence = [
    row({ id: 'gold', marketLabel: 'طلا', status: 'ok', diffPercent: -0.72 }),
    row({ id: 'silver', marketLabel: 'نقره', status: 'ok', diffPercent: 0.42 }),
  ];
  const prose = composeMarketViewProse(evidence, 'ok');
  assert.match(prose.reading!, /۱٫۱۴٪ پایین‌تر/);
  assert.match(prose.conclusion!, /تبدیل طلا به نقره مزیت ارزشی نشان نمی‌دهد/);
  assert.match(prose.reading!, /بازده قابل اجرای تبدیل نیست/);
  const reversed = composeMarketViewProse(evidence.map(r => ({ ...r, diffPercent: r.id === 'gold' ? 0.42 : -0.72 })), 'ok');
  assert.match(reversed.reading!, /نقره نسبت به طلا اضافه‌قیمت کمتری/);
  const stale = composeMarketViewProse(evidence.map(r => ({ ...r, status: 'stale' as const })), 'stale');
  assert.doesNotMatch(stale.reading!, /نسبت قیمت طلا به نقره/);
  const missing = composeMarketViewProse([evidence[0]], 'ok');
  assert.doesNotMatch(missing.reading!, /نسبت قیمت طلا به نقره/);
});


import { marketViewReportFromSnapshot } from '../src/server/market-view-report';
import { instruments, type Snapshot } from '../src/lib/market';

function liveSnapshot(): Snapshot {
  const prices = { GOLD_MELTED: 100000000, GOLD_18K: 23000000, XAU_USD: 4000, XAG_USD: 60, SILVER_999: 400000, USD: 240000, AED: 65000, SEKE_CASH: 250000000, ROB_SEKE: 65000000 };
  return { mode: 'live', status: 'ok', quotes: instruments.map(asset => ({
    symbol: asset.symbol, buy: String(prices[asset.symbol]), sell: String(prices[asset.symbol]),
    currency: asset.currency, unit: asset.unit, source: 'test', sourceUrl: null,
    observedAt: new Date().toISOString(), fetchedAt: new Date().toISOString(),
  })) };
}

test('same snapshot supports overall and focused reports, preview redacts full prose', () => {
  const snapshot = liveSnapshot();
  const overall = marketViewReportFromSnapshot(snapshot, 'full');
  assert.equal(overall.evidence.length, 4);
  const silver = marketViewReportFromSnapshot(snapshot, 'full', 'SILVER_999');
  assert.deepEqual(silver.evidence.map(row => row.id), ['silver']);
  assert.match(silver.title, /نقره/);
  assert.ok(silver.reading);
  assert.ok(silver.evidence[0].impliedUsdLabel);
  const preview = marketViewReportFromSnapshot(snapshot, 'preview', 'SILVER_999');
  assert.equal(preview.reading, null);
  assert.equal(preview.conclusion, null);
});

test('international ounce never masquerades as the local silver valuation', () => {
  const report = marketViewReportFromSnapshot(liveSnapshot(), 'full', 'XAG_USD');
  assert.equal(report.evidence.length, 0);
  assert.equal(report.currentQuote?.unit, 'اونس تروا');
  assert.equal(report.conclusion, null);
});

test('report timestamp uses oldest relevant input and fingerprint ignores refetch time', () => {
  const snapshot = liveSnapshot();
  const oldTime = new Date(Date.now() - 20 * 60_000).toISOString();
  snapshot.quotes.find(q => q.symbol === 'USD')!.observedAt = oldTime;
  const report = marketViewReportFromSnapshot(snapshot, 'full', 'SILVER_999');
  assert.equal(report.dataObservedAtIso, oldTime);
  assert.equal(report.dataFreshness, 'stale');
  const refetched = { ...snapshot, quotes: snapshot.quotes.map(q => ({ ...q, fetchedAt: new Date(Date.now() + 1000).toISOString() })) };
  assert.equal(marketViewReportFromSnapshot(refetched, 'full', 'SILVER_999').snapshotFingerprint, report.snapshotFingerprint);
});
