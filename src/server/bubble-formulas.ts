/** Bubble formulas — approved Spec. No neutral-band classification / Buy-Sell. */

export const TROY_OZ_GRAMS = 31.1034768;
export const PURITY_18K = 0.75;
/** Legacy silver purity factor was implicit 1.0 (no ×0.999). Kept for GT-SILVER-01..03. */
export const FORMULA_VERSION = '1.0';

/** V5.4-SILVER.1 — APPROVED. Do not silently overwrite legacy SILVER_BUBBLE 1.0. */
export const SILVER_PURITY_999 = 0.999;
export const SILVER_FORMULA_VERSION = 'V5.4-SILVER.1' as const;

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

/** Full V5.4 silver valuation — premium and USD-implied kept as separate metrics. */
export type SilverBubbleV54Result = {
  silver999Market: number;
  silverTheo999: number;
  silverGap: number;
  silverPremiumPct: number;
  usdImpliedSilver: number;
  silverUsdGapPct: number;
  formulaId: 'SILVER_BUBBLE';
  formulaVersion: typeof SILVER_FORMULA_VERSION;
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

/**
 * Legacy SILVER_BUBBLE 1.0 — without ×0.999.
 * Kept for existing golden tests; do not rename to V5.4.
 * Live path uses {@link silverBubbleV54}.
 */
export function silverBubble(input: SilverBubbleInput): BubbleResult {
  assertPositive('xagUsd', input.xagUsd);
  assertPositive('usdIrt', input.usdIrt);
  assertPositive('silver999Market', input.silver999Market);
  const theoretical = (input.xagUsd * input.usdIrt) / TROY_OZ_GRAMS;
  const gap = input.silver999Market - theoretical;
  return { theoretical, gap, percent: (gap / theoretical) * 100, formulaId: 'SILVER_BUBBLE', formulaVersion: FORMULA_VERSION };
}

/**
 * V5.4-SILVER.1 — SilverTheo999 includes × SILVER_PURITY_999 (0.999).
 * No mazaneh-style divisor; SILVER_999 is already Toman/gram.
 * Does not emit Buy/Sell/Hold.
 */
export function silverBubbleV54(input: SilverBubbleInput): SilverBubbleV54Result {
  assertPositive('xagUsd', input.xagUsd);
  assertPositive('usdIrt', input.usdIrt);
  assertPositive('silver999Market', input.silver999Market);

  const silverTheo999 = (input.xagUsd * input.usdIrt) / TROY_OZ_GRAMS * SILVER_PURITY_999;
  const silverGap = input.silver999Market - silverTheo999;
  const silverPremiumPct = (silverGap / silverTheo999) * 100;
  const usdImpliedSilver = (input.silver999Market * TROY_OZ_GRAMS) / (input.xagUsd * SILVER_PURITY_999);
  const silverUsdGapPct = ((usdImpliedSilver - input.usdIrt) / input.usdIrt) * 100;

  return {
    silver999Market: input.silver999Market,
    silverTheo999,
    silverGap,
    silverPremiumPct,
    usdImpliedSilver,
    silverUsdGapPct,
    formulaId: 'SILVER_BUBBLE',
    formulaVersion: SILVER_FORMULA_VERSION,
  };
}

export function usdGap(input: UsdGapInput): BubbleResult {
  assertPositive('market18k', input.market18k);
  assertPositive('xauUsd', input.xauUsd);
  assertPositive('actualUsd', input.actualUsd);
  const theoretical = (input.market18k * TROY_OZ_GRAMS) / (input.xauUsd * PURITY_18K);
  const gap = input.actualUsd - theoretical;
  return { theoretical, gap, percent: (gap / theoretical) * 100, formulaId: 'USD_GAP', formulaVersion: FORMULA_VERSION };
}
