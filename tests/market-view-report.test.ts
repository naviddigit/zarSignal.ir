import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMarketViewDecision,
  composeMarketViewProse,
  type MarketViewEvidenceRow,
} from '../src/lib/market-view-report';
import {
  activeSectionIndex,
  flattenNarrativeGraphemes,
  graphemesForElapsed,
  isGraphemePrefix,
  segmentGraphemes,
  sliceAtoms,
  typingCharsPerSecond,
  visibleAtomsAt,
  visibleBodiesAt,
  withAtoms,
  type NarrativeSection,
} from '../src/lib/market-view-typing';

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
  assert.equal(prose.decision.kind, 'insufficient_data');
  assert.equal(prose.decision.tradeAction, null);
  assert.match(prose.summaryLines[0], /دیده نمی‌شود|در دسترس نیست|اختلاف/);
});

test('narrative layers stay distinct: view reason meaning result', () => {
  const prose = composeMarketViewProse([
    row({ id: 'gold', marketLabel: 'طلا · گرم ۱۸ عیار (مشتق از مظنه)', status: 'ok', diffPercent: -2.4, marketPriceLabel: '۲۵٬۰۰۰٬۰۰۰ تومان / گرم', referenceLabel: '۲۵٬۶۰۰٬۰۰۰ تومان / گرم' }),
    row({ id: 'usd', marketLabel: 'دلار آزاد بازار', status: 'ok', diffPercent: 0.05, marketPriceLabel: '۲۵۰٬۰۰۰ تومان / دلار', referenceLabel: '۲۴۹٬۰۰۰ تومان / دلار' }),
    row({ id: 'silver', marketLabel: 'نقره ۹۹۹', status: 'ok', diffPercent: 0.4, marketPriceLabel: '۵۰۰٬۰۰۰ تومان / گرم', referenceLabel: '۴۹۸٬۰۰۰ تومان / گرم' }),
  ], 'ok');
  assert.match(prose.summaryLines[0], /طلا پایین‌تر و نقره بالاتر|طلا.*نقره/);
  assert.doesNotMatch(prose.summaryLines[0], /مشتق از مظنه/);
  assert.match(prose.marketSays, /جدول شواهد|تومان|مرجع/);
  assert.doesNotMatch(prose.marketSays, /اونس جهانی و دلار بازار می‌گذاریم/);
  assert.ok(prose.reading);
  assert.match(prose.reading!, /نسبت|مجوز خرید یا فروش نیست|اضافه‌قیمت|دلار ضمنی|هم‌خوان/);
  assert.ok(prose.conclusion);
  assert.match(prose.conclusion!, /فعال نیست/);
  assert.doesNotMatch(prose.conclusion!, /۲٫۴۰٪/);
  assert.doesNotMatch(prose.reading! + prose.conclusion!, /در موتور محصول موجود نیست|اعلان خودکار/);
  assert.equal(prose.decision.kind, 'analysis_inactive');
  assert.equal(prose.decision.tradeAction, null);
  assert.ok(prose.decision.valuation);
  assert.equal(prose.decision.valuation!.marketLabel, 'بازار');
  assert.equal(prose.decision.valuation!.percent, null);
  assert.equal(prose.decision.valuation!.stance, 'mixed');
  assert.match(prose.decision.valuation!.title, /مقایسه‌ای/);
  assert.match(prose.decision.reason, /موتور تصمیم|فعال نیست/);
  assert.doesNotMatch(prose.decision.title, /در انتظار تأیید شرایط/);
});

test('overall market summary compares gold and silver without crowning max abs gap', () => {
  const prose = composeMarketViewProse([
    row({ id: 'gold', marketLabel: 'طلا', status: 'ok', diffPercent: -0.67, marketPriceLabel: '1', referenceLabel: '2' }),
    row({ id: 'silver', marketLabel: 'نقره', status: 'ok', diffPercent: 0.75, marketPriceLabel: '1', referenceLabel: '2' }),
  ], 'ok');
  assert.equal(
    prose.summaryLines[0],
    'طلا پایین‌تر و نقره بالاتر از مرجع محاسباتی است؛ در این مقایسه، طلا اضافه‌قیمت کمتری دارد.',
  );
  assert.doesNotMatch(prose.summaryLines[0], /۰٫۷۵٪|خرید|سود تضمینی/);
  assert.equal(prose.decision.valuation!.marketLabel, 'بازار');
  assert.equal(prose.decision.valuation!.percent, null);
  assert.equal(prose.decision.valuation!.stance, 'mixed');
  assert.equal(prose.decision.valuation!.title, 'برداشت مقایسه‌ای بازار');
  assert.match(prose.decision.valuation!.detail, /طلا پایین‌تر و نقره بالاتر/);
  assert.doesNotMatch(prose.decision.valuation!.title + prose.decision.valuation!.detail, /مرجع نامشخص/);
});

test('mixed gold-below silver-above stays mixed not unknown on result valuation', () => {
  const prose = composeMarketViewProse([
    row({ id: 'gold', marketLabel: 'طلا', status: 'ok', diffPercent: -0.67, marketPriceLabel: '1', referenceLabel: '2' }),
    row({ id: 'silver', marketLabel: 'نقره', status: 'ok', diffPercent: 0.75, marketPriceLabel: '1', referenceLabel: '2' }),
  ], 'ok');
  assert.equal(prose.decision.valuation!.stance, 'mixed');
  assert.equal(prose.decision.valuation!.percent, null);
  assert.match(prose.decision.valuation!.detail, /طلا پایین‌تر و نقره بالاتر/);
});

test('gold silver parity stays in meaning without inventing executable swap', () => {
  const evidence = [
    row({ id: 'gold', marketLabel: 'طلا', status: 'ok', diffPercent: -0.72, marketPriceLabel: '1', referenceLabel: '2' }),
    row({ id: 'silver', marketLabel: 'نقره', status: 'ok', diffPercent: 0.42, marketPriceLabel: '1', referenceLabel: '2' }),
  ];
  const prose = composeMarketViewProse(evidence, 'ok');
  assert.match(prose.reading!, /۱٫۱۴٪/);
  assert.match(prose.reading!, /طلا نسبت به نقره اضافه‌قیمت کمتری|اضافه‌قیمت کمتری/);
  assert.match(prose.reading!, /بازده قابل اجرای تبدیل نیست/);
  assert.doesNotMatch(prose.conclusion!, /تبدیل طلا به نقره/);
  const reversed = composeMarketViewProse(evidence.map(r => ({ ...r, diffPercent: r.id === 'gold' ? 0.42 : -0.72 })), 'ok');
  assert.match(reversed.reading!, /نقره نسبت به طلا اضافه‌قیمت کمتری/);
  const stale = composeMarketViewProse(evidence.map(r => ({ ...r, status: 'stale' as const })), 'stale');
  assert.doesNotMatch(stale.reading!, /نسبت داخلی طلا به نقره/);
  assert.match(stale.decision.reason, /قدیمی/);
  assert.equal(stale.decision.kind, 'insufficient_data');
});

test('focused symbol uses short names and does not fill with other markets', () => {
  const prose = composeMarketViewProse([
    row({ id: 'gold', marketLabel: 'طلا · گرم ۱۸ عیار (مشتق از مظنه)', status: 'ok', diffPercent: -1.1, marketPriceLabel: '۲۵٬۷۰۰٬۰۰۰ تومان / گرم', referenceLabel: '۲۶٬۰۰۰٬۰۰۰ تومان / گرم' }),
  ], 'ok', { symbol: 'GOLD_18K' });
  assert.match(prose.summaryLines[0], /طلای ۱۸ عیار/);
  assert.doesNotMatch(prose.summaryLines[0], /نقره|دلار آزاد/);
  assert.match(prose.marketSays, /مشتق از مظنه|تابلوی گرم ۱۸/);
  assert.doesNotMatch(prose.reading!, /نسبت طلا به نقره/);
});

test('decision card never invents BUY/SELL/HOLD or awaiting-confirmation from bubble gaps', () => {
  const pending = buildMarketViewDecision([
    row({ id: 'gold', marketLabel: 'طلا', status: 'ok', diffPercent: -3 }),
  ], 'ok', null);
  assert.equal(pending.kind, 'analysis_inactive');
  assert.equal(pending.tradeAction, null);
  assert.match(pending.reason, /فعال نیست/);
  assert.doesNotMatch(pending.title, /در انتظار تأیید شرایط/);
  assert.doesNotMatch(pending.reason, /اعلان|منتظر فرصت|HOLD/);
});

test('needs_confirmation only when an active engine reports unmet conditions', () => {
  const awaiting = buildMarketViewDecision([
    row({ id: 'gold', marketLabel: 'طلا', status: 'ok', diffPercent: -1 }),
  ], 'ok', null, null, {
    reason: 'روند تأییدشده هنوز برقرار نشده است.',
    changeConditions: 'با برقراری روند و نرخ قابل اجرا، وضعیت بازبینی می‌شود.',
  });
  assert.equal(awaiting.kind, 'needs_confirmation');
  assert.equal(awaiting.title, 'در انتظار تأیید شرایط');
  const stale = buildMarketViewDecision([
    row({ id: 'gold', marketLabel: 'طلا', status: 'stale', diffPercent: -1 }),
  ], 'stale', null);
  assert.equal(stale.kind, 'insufficient_data');
  assert.match(stale.title, /قدیمی|داده/);
});

test('BUY/SELL/HOLD only from explicit engineTrade fixture', () => {
  const buy = buildMarketViewDecision([], 'ok', 'buy');
  assert.equal(buy.kind, 'buy');
  assert.equal(buy.tradeAction, 'buy');
  assert.match(buy.title, /خرید/);
  const sell = buildMarketViewDecision([], 'ok', 'sell');
  assert.equal(sell.kind, 'sell');
  assert.equal(sell.tradeAction, 'sell');
  const hold = buildMarketViewDecision([
    row({ id: 'gold', marketLabel: 'طلا', status: 'ok', diffPercent: -1 }),
  ], 'ok', 'hold');
  assert.equal(hold.kind, 'hold');
  assert.equal(hold.tradeAction, 'hold');
  assert.ok(hold.valuation);
  const empty = buildMarketViewDecision([], 'unavailable', null);
  assert.equal(empty.kind, 'insufficient_data');
  assert.match(empty.title, /داده کافی نیست/);
});

test('grapheme typing mid-progress shows a correct prefix of one paragraph', () => {
  const sections: NarrativeSection[] = [
    { id: 'view', title: 'دید فعلی', body: 'طلای ۱۸ عیار الان ۱٫۱۴٪ پایین‌تر از مرجع است.' },
    { id: 'reason', title: 'چرا؟', body: 'قیمت بازار ۲۵٬۷۰۵٬۲۵۰ تومان / گرم و مرجع ۲۶٬۰۰۰٬۰۰۰ تومان / گرم است.' },
    { id: 'meaning', title: 'برداشت از این اختلاف', body: 'این اختلاف رابطهٔ قیمت داخلی با اونس و دلار را نشان می‌دهد.' },
  ];
  const { graphemes } = flattenNarrativeGraphemes(sections);
  assert.ok(graphemes.length > 40);
  const mid = Math.floor(graphemes.length * 0.35);
  const bodies = visibleBodiesAt(sections, mid);
  assert.ok(bodies[0]!.length > 0);
  assert.ok(bodies[0]!.length < sections[0]!.body.length || bodies[1]!.length > 0);
  assert.equal(isGraphemePrefix(sections[0]!.body, bodies[0]!), true);
  assert.equal(isGraphemePrefix(sections[1]!.body, bodies[1]!), true);
  assert.equal(bodies[2], '');
  const active = activeSectionIndex(sections, mid);
  assert.ok(active === 0 || active === 1);
  const joinedVisible = bodies.join('');
  const joinedFull = sections.map(s => s.body).join('');
  assert.equal(isGraphemePrefix(joinedFull, joinedVisible), true);
  assert.notEqual(joinedVisible, joinedFull);
  // Later sections stay empty until earlier ones finish.
  const onlyFirst = visibleBodiesAt(sections, segmentGraphemes(sections[0]!.body).length);
  assert.equal(onlyFirst[0], sections[0]!.body);
  assert.equal(onlyFirst[1], '');
  assert.equal(onlyFirst[2], '');
  assert.ok(typingCharsPerSecond(graphemes.length) >= 40);
  assert.ok(typingCharsPerSecond(graphemes.length) <= 160);
});

test('2x typing advances about twice as many graphemes for the same elapsed time', () => {
  const total = 400;
  const at1 = graphemesForElapsed(2000, total, 1);
  const at2 = graphemesForElapsed(2000, total, 2);
  assert.ok(at1 > 0);
  assert.ok(at2 > at1);
  assert.ok(at2 >= Math.floor(at1 * 1.8));
  assert.ok(at2 <= Math.ceil(at1 * 2.2) || at2 === total);
});

test('structured metric atoms slice without regex rewriting', () => {
  const section = withAtoms('view', 'دید فعلی', [
    { kind: 'text', text: 'طلا ' },
    { kind: 'metric', text: '۰٫۶۷٪', tone: 'below' },
    { kind: 'text', text: ' پایین‌تر' },
  ]);
  const mid = sliceAtoms(section.atoms!, 6);
  assert.equal(mid.some(a => a.kind === 'metric'), true);
  const bodies = visibleAtomsAt([section], 3);
  assert.equal(bodies[0]!.every(a => a.kind === 'text' || a.kind === 'metric'), true);
});

test('skip-equivalent full shown equals complete bodies', () => {
  const sections: NarrativeSection[] = [
    { id: 'a', title: 'الف', body: 'یک' },
    { id: 'b', title: 'ب', body: 'دو سه' },
  ];
  const { graphemes } = flattenNarrativeGraphemes(sections);
  const full = visibleBodiesAt(sections, graphemes.length);
  assert.deepEqual(full, ['یک', 'دو سه']);
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
  assert.equal(overall.decision.kind, 'analysis_inactive');
  assert.equal(overall.decision.tradeAction, null);
  assert.ok(overall.decision.valuation);
  assert.match(overall.decision.valuation!.detail, /مرجع محاسباتی|پایین‌تر|بالاتر/);
  assert.match(overall.decision.valuation!.title, /مقایسه‌ای|بازار/);
  assert.equal(overall.decision.valuation!.marketLabel, 'بازار');
  assert.ok(overall.valuationMarks.length);
  const silver = marketViewReportFromSnapshot(snapshot, 'full', 'SILVER_999');
  assert.deepEqual(silver.evidence.map(row => row.id), ['silver']);
  assert.match(silver.title, /نقره/);
  assert.ok(silver.reading);
  assert.ok(silver.evidence[0].impliedUsdLabel);
  assert.doesNotMatch(silver.reading!, /نسبت طلا به نقره/);
  const preview = marketViewReportFromSnapshot(snapshot, 'preview', 'SILVER_999');
  assert.equal(preview.reading, null);
  assert.equal(preview.conclusion, null);
  assert.equal(preview.decision.tradeAction, null);
  assert.match(preview.decision.title, /پیش‌نمایش/);
  assert.doesNotMatch(JSON.stringify(preview), /نسبت طلا به نقره|بازده قابل اجرای تبدیل/);
});

test('international ounce never masquerades as the local silver valuation', () => {
  const report = marketViewReportFromSnapshot(liveSnapshot(), 'full', 'XAG_USD');
  assert.equal(report.evidence.length, 0);
  assert.equal(report.currentQuote?.unit, 'اونس تروا');
  assert.equal(report.conclusion, report.decision.reason);
  assert.equal(report.decision.kind, 'insufficient_data');
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
