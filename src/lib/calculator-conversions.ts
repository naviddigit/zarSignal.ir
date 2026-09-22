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
  '17k': { label: '۱۷ عیار', value: 705 },
  '14k': { label: '۱۴ عیار', value: 585 },
  '9k': { label: '۹ عیار', value: 375 },
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
