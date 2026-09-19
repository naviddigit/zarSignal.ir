/** MAZANEH_TO_18K v1.0 — derive MARKET_18K from GOLD_MELTED (مظنه). */

export const MESGHAL_GRAMS = 4.608;
export const MAZANEH_PURITY = 705;
export const GOLD_18K_PURITY = 750;
export const MAZANEH_TO_18K_VERSION = '1.0';

export type Derived18k = {
  market18k: number;
  provenance: 'DERIVED';
  formulaId: 'MAZANEH_TO_18K';
  formulaVersion: typeof MAZANEH_TO_18K_VERSION;
  sourceSymbol: 'GOLD_MELTED';
};

export function mazanehTo18k(goldMeltedTomanPerMesghal: number): Derived18k {
  if (!Number.isFinite(goldMeltedTomanPerMesghal) || goldMeltedTomanPerMesghal <= 0) throw new Error('invalid_gold_melted');
  return {
    market18k: goldMeltedTomanPerMesghal * GOLD_18K_PURITY / (MAZANEH_PURITY * MESGHAL_GRAMS),
    provenance: 'DERIVED',
    formulaId: 'MAZANEH_TO_18K',
    formulaVersion: MAZANEH_TO_18K_VERSION,
    sourceSymbol: 'GOLD_MELTED',
  };
}

export function market18kToMazaneh(market18k: number): number {
  if (!Number.isFinite(market18k) || market18k <= 0) throw new Error('invalid_market_18k');
  return market18k * MESGHAL_GRAMS * MAZANEH_PURITY / GOLD_18K_PURITY;
}
