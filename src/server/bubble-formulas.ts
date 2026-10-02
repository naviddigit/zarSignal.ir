/** Bubble formulas — approved Spec. No neutral-band classification / Buy-Sell. */

export const TROY_OZ_GRAMS = 31.1034768;
export const PURITY_18K = 0.75;
/** Legacy silver purity factor was implicit 1.0 (no ×0.999). Kept for GT-SILVER-01..03. */
export const FORMULA_VERSION = '1.0';

/** V5.4-SILVER.1 — APPROVED. Do not silently overwrite legacy SILVER_BUBBLE 1.0. */
export const SILVER_PURITY_999 = 0.999;
export const SILVER_FORMULA_VERSION = 'V5.4-SILVER.1' as const;

/**
 * Premium R01.2 / V5.7 explicit FX peg — not a live quote symbol.
 * Source: UAE dirham official USD peg used in agent Premium R01.2 fixtures.
 */
export const USD_AED_PEG = 3.6725;
export const USD_AED_PEG_VERSION = 'V5.7-USD_AED.1' as const;
export const USD_AED_PEG_SOURCE = 'UAE_official_USD_AED_peg';

/** Premium R01.2 / V5.7 — درهم→دلار ضمنی و فاصله با دلار بازار. */
export const USD_AED_GAP_VERSION = 'V5.7-USD_AED_GAP.1' as const;
/** Premium R01.2 / V5.7 — مرجع نظری طلای ۱۸ امارات (نه خرده‌فروشی دبی). */
export const UAE_GOLD_FORMULA_VERSION = 'V5.7-UAE18K.1' as const;
/** Premium R01.2 / V5.7 — نسبت طلا/نقره و لبهٔ تبدیل نظری. */
export const GOLD_SILVER_RATIO_VERSION = 'V5.7-GS-RATIO.1' as const;

export type GoldBubbleInput = { xauUsd: number; usdIrt: number; market18k: number };
export type SilverBubbleInput = { xagUsd: number; usdIrt: number; silver999Market: number };
export type UsdGapInput = { market18k: number; xauUsd: number; actualUsd: number };
export type UsdFromAedInput = { aedToman: number; usdMarket: number; usdAed?: number };
export type Uae18kInput = { xauUsd: number; aedToman: number; iranGold18: number; usdAed?: number };
export type GoldSilverRatioInput = {
  xauUsd: number;
  xagUsd: number;
  gold18: number;
  silver999: number;
};

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

export type UsdFromAedResult = {
  usdFromAed: number;
  usdMarket: number;
  gap: number;
  percent: number;
  usdAed: number;
  formulaId: 'USD_AED_GAP';
  formulaVersion: typeof USD_AED_GAP_VERSION;
  pegVersion: typeof USD_AED_PEG_VERSION;
};

export type Uae18kResult = {
  uae18kAedPerGram: number;
  uae18kTomanPerGram: number;
  iranGold18: number;
  gap: number;
  percent: number;
  usdAed: number;
  formulaId: 'UAE18K_GAP';
  formulaVersion: typeof UAE_GOLD_FORMULA_VERSION;
  pegVersion: typeof USD_AED_PEG_VERSION;
};

export type GoldSilverRatioResult = {
  worldRatio: number;
  localRatio: number;
  edgePercent: number;
  formulaId: 'GOLD_SILVER_EDGE';
  formulaVersion: typeof GOLD_SILVER_RATIO_VERSION;
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

/**
 * Premium R01.2 / V5.7-FX — درهم→دلار ضمنی و فاصله با دلار بازار.
 * USD_AED is a versioned peg constant (not a live quote symbol).
 * Not an independent "dollar bubble"; separate from gold-implied USD gap.
 */
export function usdFromAedGap(input: UsdFromAedInput): UsdFromAedResult {
  assertPositive('aedToman', input.aedToman);
  assertPositive('usdMarket', input.usdMarket);
  const usdAed = input.usdAed ?? USD_AED_PEG;
  assertPositive('usdAed', usdAed);
  const usdFromAed = input.aedToman * usdAed;
  const gap = input.usdMarket - usdFromAed;
  const percent = (gap / usdFromAed) * 100;
  return {
    usdFromAed,
    usdMarket: input.usdMarket,
    gap,
    percent,
    usdAed,
    formulaId: 'USD_AED_GAP',
    formulaVersion: USD_AED_GAP_VERSION,
    pegVersion: USD_AED_PEG_VERSION,
  };
}

/**
 * Premium R01.2 / V5.7-UAE — مرجع نظری طلای ۱۸ امارات (نه قیمت خرده‌فروشی دبی).
 * UAE18K_AED_PER_GRAM = XAUUSD / 31.1034768 × 0.75 × USD_AED
 * UAE18K_TOMAN_PER_GRAM = UAE18K_AED_PER_GRAM × AED_TOMAN
 * IRAN_UAE_GAP_PERCENT = (IRAN_GOLD18 / UAE18K_TOMAN_PER_GRAM − 1) × 100
 */
export function uae18kTheoretical(input: Uae18kInput): Uae18kResult {
  assertPositive('xauUsd', input.xauUsd);
  assertPositive('aedToman', input.aedToman);
  assertPositive('iranGold18', input.iranGold18);
  const usdAed = input.usdAed ?? USD_AED_PEG;
  assertPositive('usdAed', usdAed);
  const uae18kAedPerGram = (input.xauUsd / TROY_OZ_GRAMS) * PURITY_18K * usdAed;
  const uae18kTomanPerGram = uae18kAedPerGram * input.aedToman;
  const gap = input.iranGold18 - uae18kTomanPerGram;
  const percent = (input.iranGold18 / uae18kTomanPerGram - 1) * 100;
  return {
    uae18kAedPerGram,
    uae18kTomanPerGram,
    iranGold18: input.iranGold18,
    gap,
    percent,
    usdAed,
    formulaId: 'UAE18K_GAP',
    formulaVersion: UAE_GOLD_FORMULA_VERSION,
    pegVersion: USD_AED_PEG_VERSION,
  };
}

/**
 * Premium R01.2 / V5.7-GS — نسبت جهانی و داخلی طلا۱۸/نقره۹۹۹ و لبهٔ تبدیل نظری.
 * worldRatio = (XAU × 0.75) / (XAG × 0.999)
 * localRatio = GOLD18 / SILVER999
 * edge = (localRatio / worldRatio − 1) × 100
 * Not an executable swap; overlapping with gold+silver premium — do not double-count as decision confirmations.
 */
export function goldSilverConversionEdge(input: GoldSilverRatioInput): GoldSilverRatioResult {
  assertPositive('xauUsd', input.xauUsd);
  assertPositive('xagUsd', input.xagUsd);
  assertPositive('gold18', input.gold18);
  assertPositive('silver999', input.silver999);
  const worldRatio = (input.xauUsd * PURITY_18K) / (input.xagUsd * SILVER_PURITY_999);
  const localRatio = input.gold18 / input.silver999;
  const edgePercent = (localRatio / worldRatio - 1) * 100;
  return {
    worldRatio,
    localRatio,
    edgePercent,
    formulaId: 'GOLD_SILVER_EDGE',
    formulaVersion: GOLD_SILVER_RATIO_VERSION,
  };
}
