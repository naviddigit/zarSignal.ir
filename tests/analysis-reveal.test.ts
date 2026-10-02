import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REVEAL_FADE_MS,
  completedRevealCount,
  isRevealStepActive,
  isRevealStepMounted,
} from '../src/lib/analysis-reveal';
import { buildAnalysisRevealSteps, simulateRevealTimeline } from '../src/lib/analysis-reveal-plan';
import { canOfferConfirmationWatch, engineReadinessForSymbol } from '../src/lib/analysis-engine-status';
import type { MarketViewReport } from '../src/lib/market-view-report';

test('later reveal steps stay unmounted until their turn', () => {
  assert.equal(isRevealStepMounted(0, 0, false), true);
  assert.equal(isRevealStepMounted(1, 0, false), false);
  assert.equal(isRevealStepActive(0, 0, false), true);
  assert.equal(isRevealStepActive(1, 0, false), false);
  assert.equal(completedRevealCount({
    activeIndex: 0,
    activeComplete: false,
    total: 5,
    reducedMotion: false,
  }), 0);
  assert.equal(completedRevealCount({
    activeIndex: 2,
    activeComplete: true,
    total: 5,
    reducedMotion: false,
  }), 3);
});

test('reduced-motion mounts every reveal step immediately', () => {
  assert.equal(isRevealStepMounted(4, 0, true), true);
  assert.equal(isRevealStepActive(0, 0, true), false);
  assert.equal(completedRevealCount({
    activeIndex: 0,
    activeComplete: false,
    total: 6,
    reducedMotion: true,
  }), 6);
});

test('evidence table is its own fade step after a typed intro — not grouped with limits/formula', () => {
  const report = {
    evidence: [{ id: 'gold' }, { id: 'usd' }],
    changeFromPrior: null,
  } as unknown as MarketViewReport;
  const steps = buildAnalysisRevealSteps(report);
  const ids = steps.map(s => s.id);
  assert.deepEqual(
    ids.slice(0, 6),
    ['narrative', 'outcome', 'evidence-intro', 'evidence-table', 'limits-intro', 'limits-details'],
  );
  assert.equal(steps.find(s => s.id === 'evidence-intro')?.kind, 'type');
  assert.equal(steps.find(s => s.id === 'evidence-table')?.kind, 'fade');
  assert.notEqual(ids.indexOf('evidence-table'), ids.indexOf('limits-details'));
});

test('timeline advances by real step completion, not one shared prose-length timeout', () => {
  const steps = buildAnalysisRevealSteps({
    evidence: [{ id: 'gold' }],
    changeFromPrior: null,
  } as unknown as MarketViewReport);
  const marks = simulateRevealTimeline(steps, [1200, 400, 350, 300], REVEAL_FADE_MS);
  const byId = Object.fromEntries(marks.map(m => [m.id, m.at]));
  assert.ok(byId['outcome']! > byId['narrative']!);
  assert.ok(byId['evidence-table']! > byId['evidence-intro']!);
  assert.equal(byId['evidence-table']! - byId['evidence-intro']!, REVEAL_FADE_MS);
  assert.ok(byId['limits-intro']! > byId['evidence-table']!);
  assert.equal(byId['limits-details']! - byId['limits-intro']!, REVEAL_FADE_MS);
  const gapOutcomeToEvidence = byId['evidence-intro']! - byId['outcome']!;
  const gapEvidenceToLimits = byId['limits-intro']! - byId['evidence-table']!;
  assert.notEqual(gapOutcomeToEvidence, gapEvidenceToLimits);
});

test('confirmation watch is off while no approved engine is wired', () => {
  const readiness = engineReadinessForSymbol('GOLD_MELTED');
  assert.equal(readiness.active, false);
  assert.equal(readiness.canWatchConfirmation, false);
  assert.equal(canOfferConfirmationWatch('SILVER_999'), false);
  assert.ok(readiness.missing.length >= 4);
  assert.match(readiness.reason, /فعال نیست|ingestion/);
});
