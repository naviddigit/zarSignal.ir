import assert from 'node:assert/strict';
import test from 'node:test';
import {
  goldBubble,
  goldSilverConversionEdge,
  silverBubbleV54,
  uae18kTheoretical,
  usdFromAedGap,
  USD_AED_PEG,
  USD_AED_PEG_VERSION,
  UAE_GOLD_FORMULA_VERSION,
  USD_AED_GAP_VERSION,
  GOLD_SILVER_RATIO_VERSION,
} from '../src/server/bubble-formulas';
import { computeMarketIndicators } from '../src/server/market-indicators';
import { marketViewReportFromSnapshot } from '../src/server/market-view-report';
import type { Quote, Snapshot } from '../src/lib/market';

const near = (actual: number, expected: number, digits = 2) => {
  const scale = 10 ** digits;
  assert.equal(Math.round(actual * scale) / scale, Math.round(expected * scale) / scale);
};

/** Shared Premium R01.2 golden fixture — tests only; never hard-coded into live report path. */
const FIXTURE = {
  usd: 261698,
  aed: 71310,
  usdAed: 3.6725,
  xau: 4192.37,
  xag: 61.48,
  gold18: 26039971,
  silver999: 516051,
} as const;

test('GT-R01-GOLD-GAP rounds to −1.57%', () => {
  const r = goldBubble({
    xauUsd: FIXTURE.xau,
    usdIrt: FIXTURE.usd,
    market18k: FIXTURE.gold18,
  });
  near(r.percent, -1.57, 2);
});

test('GT-R01-IRAN-UAE-GAP rounds to −1.64%', () => {
  assert.equal(USD_AED_PEG, FIXTURE.usdAed);
  const r = uae18kTheoretical({
    xauUsd: FIXTURE.xau,
    aedToman: FIXTURE.aed,
    iranGold18: FIXTURE.gold18,
    usdAed: FIXTURE.usdAed,
  });
  assert.equal(r.formulaVersion, UAE_GOLD_FORMULA_VERSION);
  assert.equal(r.pegVersion, USD_AED_PEG_VERSION);
  near(r.percent, -1.64, 2);
});

test('GT-R01-USD-AED-GAP rounds to −0.07%', () => {
  const r = usdFromAedGap({
    aedToman: FIXTURE.aed,
    usdMarket: FIXTURE.usd,
    usdAed: FIXTURE.usdAed,
  });
  assert.equal(r.formulaVersion, USD_AED_GAP_VERSION);
  near(r.percent, -0.07, 2);
});

test('GT-R01-SILVER-GAP rounds to −0.14%', () => {
  const r = silverBubbleV54({
    xagUsd: FIXTURE.xag,
    usdIrt: FIXTURE.usd,
    silver999Market: FIXTURE.silver999,
  });
  near(r.silverPremiumPct, -0.14, 2);
});

test('GT-R01-GS-EDGE rounds to −1.43%', () => {
  const r = goldSilverConversionEdge({
    xauUsd: FIXTURE.xau,
    xagUsd: FIXTURE.xag,
    gold18: FIXTURE.gold18,
    silver999: FIXTURE.silver999,
  });
  assert.equal(r.formulaVersion, GOLD_SILVER_RATIO_VERSION);
  near(r.edgePercent, -1.43, 2);
});

function quote(symbol: Quote['symbol'], mid: number, currency: string, unit: string): Quote {
  const now = new Date().toISOString();
  const price = String(mid);
  return {
    symbol,
    buy: price,
    sell: price,
    currency,
    unit,
    source: 'fixture',
    sourceUrl: null,
    observedAt: now,
    fetchedAt: now,
  };
}

test('GT-R01 market-view report wires independent evidence from fixture snapshot', () => {
  // Mazaneh such that derived 18k ≈ FIXTURE.gold18 (÷4.3318)
  const melted = FIXTURE.gold18 * 4.3318;
  const snapshot: Snapshot = {
    mode: 'live',
    status: 'ok',
    quotes: [
      quote('GOLD_MELTED', melted, 'TMN', 'مثقال'),
      quote('GOLD_18K', FIXTURE.gold18, 'TMN', 'گرم'),
      quote('XAU_USD', FIXTURE.xau, 'USD', 'اونس تروا'),
      quote('XAG_USD', FIXTURE.xag, 'USD', 'اونس تروا'),
      quote('USD', FIXTURE.usd, 'TMN', 'دلار'),
      quote('AED', FIXTURE.aed, 'TMN', 'درهم'),
      quote('SILVER_999', FIXTURE.silver999, 'TMN', 'گرم'),
      quote('SEKE_CASH', 250000000, 'TMN', 'عدد'),
    ],
  };

  const indicators = computeMarketIndicators(snapshot);
  near(indicators.goldDirect.percent!, -1.57, 2);
  near(indicators.iranUaeGold.percent!, -1.64, 2);
  near(indicators.usdFromAed.percent!, -0.07, 2);
  near(indicators.silver.percent!, -0.14, 2);
  near(indicators.goldSilverEdge.percent!, -1.43, 2);
  assert.equal(indicators.coin.status, 'blocked');
  assert.equal(indicators.peg.version, USD_AED_PEG_VERSION);

  const report = marketViewReportFromSnapshot(snapshot, 'full');
  const byId = Object.fromEntries(report.evidence.map(r => [r.id, r]));
  assert.ok(byId.gold_direct);
  assert.ok(byId.usd_aed);
  assert.ok(byId.uae_gold);
  assert.ok(byId.gold_silver);
  near(byId.gold_direct!.diffPercent!, -1.57, 2);
  near(byId.uae_gold!.diffPercent!, -1.64, 2);
  near(byId.usd_aed!.diffPercent!, -0.07, 2);
  near(byId.silver!.diffPercent!, -0.14, 2);
  near(byId.gold_silver!.diffPercent!, -1.43, 2);
  assert.equal(byId.coin!.status, 'blocked');
  assert.ok(byId.coin!.marketPriceLabel, 'A blocked reference must not hide the valid coin quote');
  assert.equal(byId.coin!.referenceLabel, null);
  assert.equal(byId.coin!.diffPercent, null);
  assert.match(byId.usd!.marketLabel, /دلار آزاد.*دلار ضمنی طلا/);
  assert.match(byId.usd_aed!.marketLabel, /دلار آزاد.*مرجع درهم/);
  assert.equal(report.decision.kind, 'analysis_inactive');
  assert.equal(report.decision.tradeAction, null);
  assert.equal(report.trend.status, 'not_computed');
  assert.match(report.details.formulaNotes.join(' '), /V5\.7-UAE18K|USD_AED/);
  // Fixture numbers must not appear as hard-coded prose constants beyond computed evidence.
  assert.doesNotMatch(report.summaryLines.join(' '), /261698|4192\.37/);
});

test('GT-R01 GOLD_18K focus uses direct basis not only mazaneh', () => {
  const melted = FIXTURE.gold18 * 4.3318;
  const snapshot: Snapshot = {
    mode: 'live',
    status: 'ok',
    quotes: [
      quote('GOLD_MELTED', melted * 1.05, 'TMN', 'مثقال'),
      quote('GOLD_18K', FIXTURE.gold18, 'TMN', 'گرم'),
      quote('XAU_USD', FIXTURE.xau, 'USD', 'اونس تروا'),
      quote('USD', FIXTURE.usd, 'TMN', 'دلار'),
      quote('AED', FIXTURE.aed, 'TMN', 'درهم'),
      quote('XAG_USD', FIXTURE.xag, 'USD', 'اونس تروا'),
      quote('SILVER_999', FIXTURE.silver999, 'TMN', 'گرم'),
    ],
  };
  const report = marketViewReportFromSnapshot(snapshot, 'full', 'GOLD_18K');
  const direct = report.evidence.find(r => r.id === 'gold_direct');
  const derived = report.evidence.find(r => r.id === 'gold');
  assert.ok(direct);
  assert.equal(direct!.marketBasis, 'DIRECT');
  near(direct!.diffPercent!, -1.57, 2);
  assert.ok(derived);
  assert.notEqual(
    Math.round(direct!.diffPercent! * 100),
    Math.round(derived!.diffPercent! * 100),
  );
});
