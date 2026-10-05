export const weightUnits = {
  gram: { label: 'گرم', grams: 1 },
  mesghal: { label: 'مثقال', grams: 4.608 },
  seer: { label: 'سیر', grams: 75 },
  kilogram: { label: 'کیلوگرم', grams: 1000 },
  troyOunce: { label: 'اونس تروا', grams: 31.1035 },
  tola: { label: 'تولا', grams: 11.664 },
  pennyweight: { label: 'پنی‌ویت', grams: 1.555 },
  grain: { label: 'گرین', grams: 0.0648 },
} as const;

export const purityOptions = {
  '24k': { label: '۲۴ عیار', value: 999 },
  '22k': { label: '۲۲ عیار', value: 916 },
  '21k': { label: '۲۱ عیار', value: 875 },
  '18k': { label: '۱۸ عیار', value: 750 },
  '17k': { label: '۱۷ عیار / ۷۰۵', value: 705 },
  '14k': { label: '۱۴ عیار', value: 585 },
  '9k': { label: '۹ عیار', value: 375 },
  silver999: { label: 'نقره ۹۹۹', value: 999 },
  silver925: { label: 'نقره ۹۲۵', value: 925 },
  silver900: { label: 'نقره ۹۰۰', value: 900 },
  silver800: { label: 'نقره ۸۰۰', value: 800 },
} as const;

export type WeightUnit = keyof typeof weightUnits;
export type Purity = keyof typeof purityOptions;

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit) {
  if (!Number.isFinite(value) || value < 0) throw new Error('invalid_weight');
  return value * weightUnits[from].grams / weightUnits[to].grams;
}

export function convertPurityPrice(value: number, from: Purity, to: Purity) {
  if (!Number.isFinite(value) || value < 0) throw new Error('invalid_price');
  return value * purityOptions[to].value / purityOptions[from].value;
}

/** G02: conserve fine-metal mass when expressing a weight at another fineness. */
export function convertPurityWeight(value: number, from: Purity, to: Purity) {
  if (!Number.isFinite(value) || value < 0) throw new Error('invalid_weight');
  const sourceFineness = purityOptions[from].value;
  const targetFineness = purityOptions[to].value;
  if (sourceFineness <= 0 || targetFineness <= 0) throw new Error('invalid_purity');
  const fineWeight = value * sourceFineness / 1000;
  return { fineWeight, targetWeight: fineWeight * 1000 / targetFineness };
}
