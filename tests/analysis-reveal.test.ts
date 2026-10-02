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
});

test('reduced-motion mounts every reveal step immediately', () => {
  assert.equal(isRevealStepMounted(4, 0, true), true);
  assert.equal(completedRevealCount({
    activeIndex: 0,
    activeComplete: false,
    total: 6,
    reducedMotion: true,
  }), 6);
});

test('reveal plan drops trivial typed intros; evidence table is its own fade step', () => {
  const report = {
    evidence: [{ id: 'gold' }, { id: 'usd' }],
    changeFromPrior: null,
  } as unknown as MarketViewReport;
  const steps = buildAnalysisRevealSteps(report);
  const ids = steps.map(s => s.id);
  assert.deepEqual(
    ids.slice(0, 5),
    ['narrative', 'outcome', 'evidence-table', 'limits-details', 'formula-details'],
  );
  assert.equal(steps.find(s => s.id === 'evidence-intro'), undefined);
  assert.equal(steps.find(s => s.id === 'limits-intro'), undefined);
  assert.equal(steps.find(s => s.id === 'evidence-table')?.kind, 'fade');
});

test('timeline advances by real step completion, not one shared prose-length timeout', () => {
  const steps = buildAnalysisRevealSteps({
    evidence: [{ id: 'gold' }],
    changeFromPrior: null,
  } as unknown as MarketViewReport);
  const marks = simulateRevealTimeline(steps, [1200], REVEAL_FADE_MS);
  const byId = Object.fromEntries(marks.map(m => [m.id, m.at]));
  assert.ok(byId['outcome']! > byId['narrative']!);
  assert.equal(byId['evidence-table']! - byId['outcome']!, REVEAL_FADE_MS);
  assert.equal(byId['limits-details']! - byId['evidence-table']!, REVEAL_FADE_MS);
});

test('confirmation watch is off while no approved engine is wired', () => {
  const readiness = engineReadinessForSymbol('GOLD_MELTED');
  assert.equal(readiness.active, false);
  assert.equal(canOfferConfirmationWatch('SILVER_999'), false);
  assert.ok(readiness.missing.length >= 4);
});
