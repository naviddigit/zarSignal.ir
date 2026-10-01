/** Shared aftermath reveal steps after narrative typing completes. */

export type AnalysisRevealPhase = 'typing' | 'aftermath' | 'done';

export const AFTERMATH_STEP_GAP_MS = 450;
export const AFTERMATH_FADE_MS = 300;

/** How many aftermath items are visible for the current step (1-based step). */
export function visibleAftermathCount(args: {
  typingComplete: boolean;
  step: number;
  total: number;
  reducedMotion: boolean;
}): number {
  const { typingComplete, step, total, reducedMotion } = args;
  if (total <= 0) return 0;
  if (reducedMotion) return total;
  if (!typingComplete) return 0;
  return Math.max(0, Math.min(total, step));
}

export function isAftermathItemVisible(index: number, visibleCount: number) {
  return index < visibleCount;
}
