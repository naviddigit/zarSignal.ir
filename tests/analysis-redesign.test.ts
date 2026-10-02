import test from 'node:test';
import assert from 'node:assert/strict';
import { instruments, type Snapshot } from '../src/lib/market';
import { marketViewReportFromSnapshot } from '../src/server/market-view-report';
import { buildAnalysisNarrativeSections, selectReportMetrics } from '../src/lib/market-view-report';
import { buildStoryPublicPayload } from '../src/lib/analysis-story-card';
import { effectiveTypingCps } from '../src/lib/analysis-reading-settings';

export function reviewSnapshot(): Snapshot {
  const prices = [26039971 * 4.3318, 26039971, 4192.37, 61.48, 516051, 261698, 71310, 250000000, 75000000];
  const now = new Date().toISOString();
  return { mode: 'live', status: 'ok', quotes: instruments.map((asset, index) => ({ symbol: asset.symbol, buy: String(prices[index]), sell: String(prices[index]), currency: asset.currency, unit: asset.unit, source: 'test fixture', sourceUrl: null, observedAt: now, fetchedAt: now })) };
}

test('report identity follows effective inputs, not timestamps, order or unrelated markets', () => {
  const snapshot = reviewSnapshot();
  const report = marketViewReportFromSnapshot(snapshot, 'full', 'USD');
  const refetched = structuredClone(snapshot);
  refetched.quotes.reverse().forEach(q => { q.observedAt = new Date(Date.now() + 1000).toISOString(); });
  refetched.quotes.find(q => q.symbol === 'SEKE_CASH')!.sell = '999';
  assert.equal(marketViewReportFromSnapshot(refetched, 'full', 'USD').reportId, report.reportId);
  refetched.quotes.find(q => q.symbol === 'USD')!.sell = '262000';
  assert.notEqual(marketViewReportFromSnapshot(refetched, 'full', 'USD').reportId, report.reportId);
  const old = structuredClone(snapshot);
  old.quotes.find(q => q.symbol === 'USD')!.observedAt = new Date(Date.now() - 3600000).toISOString();
  assert.notEqual(marketViewReportFromSnapshot(old, 'full', 'USD').reportId, report.reportId);
});

test('shared report focus keeps direct gold, silver and FX distinct across result and story', () => {
  const snapshot = reviewSnapshot();
  snapshot.quotes.find(q => q.symbol === 'GOLD_MELTED')!.sell = '90000000';
  const report = marketViewReportFromSnapshot(snapshot, 'full');
  assert.deepEqual(selectReportMetrics(report).map(row => row.id), ['gold_direct', 'silver', 'usd_aed']);
  const story = buildStoryPublicPayload(report, 'https://www.zarsignal.ir');
  assert.equal(story.metrics.length, 3);
  assert.equal(story.metrics[1]!.label, 'نقره ۹۹۹');
  const direct = marketViewReportFromSnapshot(snapshot, 'full', 'GOLD_18K');
  assert.equal(direct.decision.valuation?.percent, direct.evidence.find(row => row.id === 'gold_direct')!.diffPercent);
  const sections = buildAnalysisNarrativeSections(report);
  assert.deepEqual(sections.map(section => section.id), ['view', 'reason', 'meaning']);
  assert.doesNotMatch(sections.map(section => section.body).join(' '), /در جدول|در مخزن|resolution=/);
  assert.match(sections[2]!.body, /مقدار نقرهٔ معادل هر گرم طلای ۱۸/);
  assert.equal(effectiveTypingCps({ baseCps: 70, maxCps: 100, fastMultiplier: 1.2, sectionAppearMs: 220 }, 2), 2 * effectiveTypingCps({ baseCps: 70, maxCps: 100, fastMultiplier: 1.2, sectionAppearMs: 220 }, 1));
});
