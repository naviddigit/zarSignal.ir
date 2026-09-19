/** Bubble formulas v1.0 — approved Spec. No neutral-band classification. */

export const TROY_OZ_GRAMS = 31.1034768;
export const PURITY_18K = 0.75;
export const FORMULA_VERSION = '1.0';

export type GoldBubbleInput = { xauUsd: number; usdIrt: number; market18k: number };
export type SilverBubbleInput = { xagUsd: number; usdIrt: number; silver999Market: number };
export type UsdGapInput = { market18k: number; xauUsd: number; actualUsd: number };

export type BubbleResult = {
  theoretical: number;
  gap: number;
  percent: number;
  formulaId: 'GOLD_BUBBLE' | 'SILVER_BUBBLE' | 'USD_GAP';
  formulaVersion: typeof FORMULA_VERSION;
};

function assertPositive(name: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`invalid_${name}`);
}

export function goldBubble(input: GoldBubbleInput): BubbleResult {
  assertPositive('xauUsd', input.xauUsd);
  assertPositive('usdIrt', input.usdIrt);
  assertPositive('market18k', input.market18k);
  const theoretical = (input.xauUsd * input.usdIrt) / TROY_OZ_GRAMS * PURITY_18K;
  const gap = input.market18k - theoretical;
  return { theoretical, gap, percent: (gap / theoretical) * 100, formulaId: 'GOLD_BUBBLE', formulaVersion: FORMULA_VERSION };
}

export function silverBubble(input: SilverBubbleInput): BubbleResult {
  assertPositive('xagUsd', input.xagUsd);
  assertPositive('usdIrt', input.usdIrt);
  assertPositive('silver999Market', input.silver999Market);
  const theoretical = (input.xagUsd * input.usdIrt) / TROY_OZ_GRAMS;
  const gap = input.silver999Market - theoretical;
  return { theoretical, gap, percent: (gap / theoretical) * 100, formulaId: 'SILVER_BUBBLE', formulaVersion: FORMULA_VERSION };
}

export function usdGap(input: UsdGapInput): BubbleResult {
  assertPositive('market18k', input.market18k);
  assertPositive('xauUsd', input.xauUsd);
  assertPositive('actualUsd', input.actualUsd);
  const theoretical = (input.market18k * TROY_OZ_GRAMS) / (input.xauUsd * PURITY_18K);
  const gap = input.actualUsd - theoretical;
  return { theoretical, gap, percent: (gap / theoretical) * 100, formulaId: 'USD_GAP', formulaVersion: FORMULA_VERSION };
}
