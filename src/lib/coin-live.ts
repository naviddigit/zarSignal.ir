import { coinValuation, coinSpecs } from './coin-calculator';
import { resolveCalculatorLiveValue } from './calculator-live';
import type { Snapshot } from './market';

/** Only ROB_SEKE identifies a specific banking product; SEKE_CASH does not identify its design/year. */
export function liveQuarterBubble(snapshot: Snapshot) {
  const gold = resolveCalculatorLiveValue({ key: 'gram', label: 'طلای ۱۸', unit: 'تومان / گرم', symbol: 'GOLD_18K' }, snapshot);
  const coin = resolveCalculatorLiveValue({ key: 'price', label: 'ربع‌سکه', unit: 'تومان', symbol: 'ROB_SEKE', currency: 'TMN', quoteUnit: 'عدد' }, snapshot);
  if (!gold || !coin || Math.abs(Date.parse(gold.observedAt) - Date.parse(coin.observedAt)) > 15 * 60_000) return null;
  return { ...coinValuation(coinSpecs.quarter.weight, coinSpecs.quarter.purity, gold.value, coin.value), price: coin.value, observedAt: new Date(Math.min(Date.parse(gold.observedAt), Date.parse(coin.observedAt))).toISOString() };
}
