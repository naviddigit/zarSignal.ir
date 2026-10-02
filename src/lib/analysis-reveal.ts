/** Analysis reveal step machine — shared completion, no estimated text-length timeouts. */

export type AnalysisRevealPhase = 'typing' | 'fading' | 'done';

export const REVEAL_FADE_MS = 300;

export type RevealStepKind = 'type' | 'fade';

export type RevealPlanStep = {
  id: string;
  kind: RevealStepKind;
};

/** Steps fully settled before the active index (exclusive upper bound of completed work). */
export function completedRevealCount(args: {
  activeIndex: number;
  activeComplete: boolean;
  total: number;
  reducedMotion: boolean;
}): number {
  const { activeIndex, activeComplete, total, reducedMotion } = args;
  if (total <= 0) return 0;
  if (reducedMotion) return total;
  if (activeIndex < 0) return 0;
  const done = activeComplete ? activeIndex + 1 : activeIndex;
  return Math.max(0, Math.min(total, done));
}

export function isRevealStepMounted(index: number, activeIndex: number, reducedMotion: boolean) {
  if (reducedMotion) return true;
  return index <= activeIndex;
}

export function isRevealStepActive(index: number, activeIndex: number, reducedMotion: boolean) {
  if (reducedMotion) return false;
  return index === activeIndex;
}
