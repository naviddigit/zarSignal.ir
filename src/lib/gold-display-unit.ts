import { MAZANEH_TO_18K_DIVISOR } from './mazaneh-to-18k';

export type GoldDisplayUnit = 'gram' | 'mesghal';

/** Canonical engine values stay unchanged; only 18k market-equivalent units are displayed. */
export function goldDisplay(value: number, unit: string, display: GoldDisplayUnit) {
  const price = unit === 'تومان / گرم' || unit === 'تومان / مثقال';
  const weight = unit === 'گرم' || unit === 'مثقال';
  if (!price && !weight) return { value, unit };
  const fromMesghal = unit.includes('مثقال');
  const toMesghal = display === 'mesghal';
  const factor = fromMesghal === toMesghal ? 1 : price === toMesghal ? MAZANEH_TO_18K_DIVISOR : 1 / MAZANEH_TO_18K_DIVISOR;
  return { value: value * factor, unit: price ? `تومان / ${toMesghal ? 'مثقال' : 'گرم'}` : toMesghal ? 'مثقال' : 'گرم' };
}

export function goldCanonical(value: number, canonicalUnit: string, display: GoldDisplayUnit) {
  const factor = goldDisplay(1, canonicalUnit, display).value;
  return value / factor;
}

export function goldInputText(value: string, unit: string, display: GoldDisplayUnit) {
  if (!value || goldDisplay(1, unit, display).value === 1) return value;
  return String(Number(goldDisplay(Number(value), unit, display).value.toFixed(6)));
}
