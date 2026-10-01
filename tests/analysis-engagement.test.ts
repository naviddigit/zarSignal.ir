import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicShareSummary, publicAnalysisPath } from '../src/lib/analysis-share';
import type { MarketViewReport } from '../src/lib/market-view-report';
import { analysisFeedbackInput, analysisReadInput } from '../src/server/analysis-engagement';

function sampleReport(partial?: Partial<MarketViewReport>): MarketViewReport {
  return {
    schemaVersion: '1.0',
    reportId: 'mvr_abcdef0123456789',
    generatedAtIso: '2026-10-01T12:00:00.000Z',
    dataObservedAtIso: '2026-10-01T11:55:00.000Z',
    dataFreshness: 'ok',
    snapshotFingerprint: 'abcdef0123456789',
    access: 'full',
    symbol: 'SILVER_999',
    title: 'تحلیل نقره ۹۹۹',
    summaryLines: ['نقره ۹۹۹ الان ۰٫۴۰٪ بالاتر از مرجع است.', 'teaser'],
    marketSays: 'قیمت بازار و مرجع…',
    evidence: [],
    reading: 'معنی خصوصی نباید در اشتراک باشد.',
    unconfirmed: ['محدودیت خصوصی'],
    conclusion: 'نتیجه کامل خصوصی',
    decision: {
      kind: 'needs_confirmation',
      tradeAction: null,
      title: 'نیاز به تأیید',
      reason: 'دلیل کوتاه',
      changeConditions: 'شرایط',
      valuation: {
        stance: 'above',
        title: 'نقره ۹۹۹ · بالاتر از مرجع',
        detail: 'نقره ۹۹۹ ۰٫۴۰٪ بالاتر از مرجع است.',
        marketLabel: 'نقره ۹۹۹',
        percent: 0.4,
      },
    },
    valuationMarks: [],
    changeFromPrior: null,
    details: { formulaNotes: [], disclaimer: 'سلب مسئولیت' },
    ...partial,
  };
}

test('public share path never includes request params', () => {
  assert.equal(publicAnalysisPath('SILVER_999'), '/analysis/silver_999');
  assert.equal(publicAnalysisPath(null), '/analysis');
});

test('share summary stays public and omits private narrative', () => {
  const summary = buildPublicShareSummary(sampleReport(), 'https://www.zarsignal.ir');
  assert.equal(summary.url, 'https://www.zarsignal.ir/analysis/silver_999');
  assert.match(summary.text, /نقره ۹۹۹/);
  assert.match(summary.text, /دید ارزشی/);
  assert.match(summary.text, /زرسیگنال/);
  assert.doesNotMatch(summary.text, /معنی خصوصی|نتیجه کامل|محدودیت خصوصی|request=/);
  assert.doesNotMatch(summary.url, /request=/);
  assert.doesNotMatch(summary.text, /نسخهٔ ثابت این گزارش/);
});

test('read and feedback inputs reject invalid report ids', () => {
  assert.equal(analysisReadInput.safeParse({
    reportId: 'not-valid',
    schemaVersion: '1.0',
  }).success, false);
  assert.equal(analysisFeedbackInput.safeParse({
    reportId: 'mvr_abcdef0123456789',
    schemaVersion: '1.0',
    rating: 6,
  }).success, false);
  assert.equal(analysisFeedbackInput.safeParse({
    reportId: 'mvr_abcdef0123456789',
    schemaVersion: '1.0',
    rating: 4,
    comment: 'x'.repeat(501),
  }).success, false);
  assert.equal(analysisFeedbackInput.safeParse({
    reportId: 'mvr_abcdef0123456789',
    schemaVersion: '1.0',
    rating: 5,
    comment: 'روشن بود',
  }).success, true);
});
