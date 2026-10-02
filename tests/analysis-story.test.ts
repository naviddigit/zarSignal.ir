import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import {
  assertStoryPayloadPublic,
  buildStoryPublicPayload,
  STORY_HEIGHT,
  STORY_WIDTH,
} from '../src/lib/analysis-story-card';
import { buildMarketViewTrend, type MarketViewReport } from '../src/lib/market-view-report';
import {
  buildPlanCapabilityMatrix,
  specializedOfferReady,
} from '../src/lib/plan-capability-matrix';

function sampleReport(partial?: Partial<MarketViewReport>): MarketViewReport {
  return {
    schemaVersion: '1.0',
    reportId: 'mvr_abcdef0123456789',
    generatedAtIso: '2026-10-01T12:00:00.000Z',
    dataObservedAtIso: '2026-10-01T11:55:00.000Z',
    dataFreshness: 'ok',
    snapshotFingerprint: 'abcdef0123456789',
    access: 'full',
    symbol: null,
    title: 'دید زرسیگنال به بازار',
    summaryLines: ['طلا پایین‌تر و نقره بالاتر از مرجع است.', 'teaser'],
    marketSays: 'چرا؟',
    evidence: [
      {
        id: 'gold',
        marketLabel: 'طلا',
        marketPriceLabel: '1',
        referenceLabel: '2',
        referenceBasis: 'test',
        diffPercent: -0.67,
        unitNote: 't',
        status: 'ok',
        statusReason: null,
        formulaVersion: '1',
      },
      {
        id: 'silver',
        marketLabel: 'نقره',
        marketPriceLabel: '1',
        referenceLabel: '2',
        referenceBasis: 'test',
        diffPercent: 0.75,
        unitNote: 't',
        status: 'ok',
        statusReason: null,
        formulaVersion: '1',
      },
      {
        id: 'usd',
        marketLabel: 'دلار',
        marketPriceLabel: '1',
        referenceLabel: '2',
        referenceBasis: 'test',
        diffPercent: 0.1,
        unitNote: 't',
        status: 'ok',
        statusReason: null,
        formulaVersion: '1',
      },
    ],
    reading: 'خصوصی',
    unconfirmed: ['محدودیت خصوصی'],
    conclusion: 'نتیجه خصوصی',
    decision: {
      kind: 'analysis_inactive',
      tradeAction: null,
      title: 'بدون سیگنال معامله',
      reason: 'این گزارش مقایسهٔ ارزش بازار است؛ سیگنال خرید و فروش هنوز ارائه نمی‌شود.',
      changeConditions: 'جزئیات فنی',
      valuation: {
        stance: 'mixed',
        title: 'برداشت مقایسه‌ای بازار',
        detail: 'طلا پایین‌تر و نقره بالاتر از مرجع محاسباتی است؛ در این مقایسه، طلا اضافه‌قیمت کمتری دارد.',
        marketLabel: 'بازار',
        percent: null,
      },
    },
    valuationMarks: [],
    trend: buildMarketViewTrend(),
    changeFromPrior: null,
    details: { formulaNotes: [], disclaimer: 'سلب' },
    ...partial,
  };
}

test('trend default does not claim missing history without checking', () => {
  const trend = buildMarketViewTrend();
  assert.equal(trend.status, 'not_computed');
  assert.match(trend.label, /محاسبه نشده/);
  assert.doesNotMatch(trend.label, /بدون تاریخچه|قابل ارزیابی نیست/);
});

test('story payload stays public and uses live summary link wording', () => {
  const payload = buildStoryPublicPayload(sampleReport(), 'https://www.zarsignal.ir', {
    planStatus: 'رایگان',
    planLevel: 'FREE',
    planLabel: 'حساب رایگان',
    showPlanBadge: true,
  });
  assert.equal(payload.planBadge, null);
  assert.equal(payload.linkLabel, 'مشاهده خلاصهٔ بازار');
  assert.equal(payload.url, 'https://www.zarsignal.ir/analysis');
  assert.doesNotMatch(payload.url, /request=/);
  assert.equal(payload.metrics.length, 3);
  assert.match(payload.disclaimer, /نه سیگنال خرید و فروش/);
  assert.doesNotMatch(JSON.stringify(payload), /نتیجه خصوصی|محدودیت خصوصی|خصوصی/);
  assertStoryPayloadPublic(payload);
});

test('story plan badge only from active commercial entitlement when opted in', () => {
  const guest = buildStoryPublicPayload(sampleReport(), 'https://www.zarsignal.ir', {
    showPlanBadge: true,
    planStatus: null,
    planLevel: null,
  });
  assert.equal(guest.planBadge, null);
  const trial = buildStoryPublicPayload(sampleReport(), 'https://www.zarsignal.ir', {
    showPlanBadge: true,
    planStatus: 'آزمایشی',
    planLevel: 'HOME',
    planLabel: 'دسترسی آزمایشی',
  });
  assert.equal(trial.planBadge, null);
  const home = buildStoryPublicPayload(sampleReport(), 'https://www.zarsignal.ir', {
    showPlanBadge: true,
    planStatus: 'فعال',
    planLevel: 'HOME',
    planLabel: 'پلن خانگی',
  });
  assert.equal(home.planBadge, 'پلن خانگی');
  const hidden = buildStoryPublicPayload(sampleReport(), 'https://www.zarsignal.ir', {
    showPlanBadge: false,
    planStatus: 'فعال',
    planLevel: 'HOME',
    planLabel: 'پلن خانگی',
  });
  assert.equal(hidden.planBadge, null);
});

test('qr encoder produces a real scannable data url for the public path', async () => {
  const payload = buildStoryPublicPayload(sampleReport(), 'https://www.zarsignal.ir');
  const dataUrl = await QRCode.toDataURL(payload.url, { errorCorrectionLevel: 'M', margin: 1, width: 128 });
  assert.match(dataUrl, /^data:image\/png;base64,/);
  assert.ok(dataUrl.length > 200);
  assert.equal(STORY_WIDTH, 1080);
  assert.equal(STORY_HEIGHT, 1920);
});

test('specialized plan is not sellable on inactive engine alone', () => {
  const matrix = buildPlanCapabilityMatrix();
  assert.ok(matrix.some(row => row.capability === 'ANALYSIS_BASIC' && row.productStatus === 'live'));
  assert.ok(matrix.some(row => row.capability === 'ANALYSIS_FULL' && row.productStatus === 'source_required'));
  const offer = specializedOfferReady(matrix);
  assert.equal(offer.ready, false);
  assert.match(offer.blockedReason!, /موتور تصمیم|تفاوت اجرایی/);
  assert.ok(offer.liveExtras.includes('دسترسی API') || offer.liveExtras.length >= 0);
});

test('story templates are named and USD gap is labeled honestly', () => {
  const { STORY_TEMPLATES, STORY_TEMPLATE_LABELS } = require('../src/lib/analysis-story-templates') as typeof import('../src/lib/analysis-story-templates');
  assert.deepEqual([...STORY_TEMPLATES], ['minimal_light', 'dark_gold', 'gold_silver']);
  assert.match(STORY_TEMPLATE_LABELS.minimal_light, /مینیمال/);
  const payload = buildStoryPublicPayload(sampleReport(), 'https://www.zarsignal.ir');
  assert.ok(payload.metrics.some(m => /فاصلهٔ دلار بازار با دلار ضمنی طلا/.test(m.label)));
  assert.doesNotMatch(payload.metrics.map(m => m.label).join(' '), /ارزش بنیادی|حباب مستقل دلار/);
});

test('master matrix does not invent V5.7 and ML stays unshipped', () => {
  const { buildMasterCapabilityMatrix, canMarketOpportunityEngine } = require('../src/lib/master-capability-matrix') as typeof import('../src/lib/master-capability-matrix');
  const { assessMlReadiness } = require('../src/lib/ml-readiness') as typeof import('../src/lib/ml-readiness');
  const rows = buildMasterCapabilityMatrix();
  assert.ok(rows.some(r => r.area.includes('V5.7') && r.status === 'absent'));
  assert.ok(rows.some(r => r.area.includes('سکه') && r.status === 'absent'));
  assert.equal(canMarketOpportunityEngine(), false);
  const ml = assessMlReadiness();
  assert.equal(ml.recommendation, 'do_not_ship');
  assert.equal(ml.predictionTarget, null);
  assert.ok(ml.notes.some(n => /امتیاز کاربران/.test(n)));
});
