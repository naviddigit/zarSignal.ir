/** Ordered reveal plan for market-view — no trivial typed intros before details. */

import type { MarketViewReport } from '@/lib/market-view-report';
import type { RevealPlanStep } from '@/lib/analysis-reveal';

export function buildAnalysisRevealSteps(report: MarketViewReport): RevealPlanStep[] {
  const steps: RevealPlanStep[] = [
    { id: 'narrative', kind: 'type' },
    { id: 'outcome', kind: 'fade' },
  ];
  if (report.evidence.length > 0) {
    steps.push({ id: 'evidence-table', kind: 'fade' });
  }
  steps.push({ id: 'limits-details', kind: 'fade' });
  if (report.changeFromPrior) {
    steps.push({ id: 'prior-intro', kind: 'type' });
  }
  steps.push({ id: 'formula-details', kind: 'fade' });
  steps.push({ id: 'engagement', kind: 'fade' });
  steps.push({ id: 'page-extras', kind: 'fade' });
  return steps;
}

/** Simulate sequential completion timestamps when each type finishes and each fade waits fadeMs. */
export function simulateRevealTimeline(steps: RevealPlanStep[], typeDurationsMs: number[], fadeMs: number) {
  let t = 0;
  let typeI = 0;
  const marks: { id: string; kind: string; at: number }[] = [];
  for (const step of steps) {
    if (step.kind === 'type') {
      t += typeDurationsMs[typeI] ?? 0;
      typeI += 1;
    } else {
      t += fadeMs;
    }
    marks.push({ id: step.id, kind: step.kind, at: t });
  }
  return marks;
}
