import type { Symbol } from '@/lib/market';
export type CalculatorOperation = 'mazanehTo18k' | 'market18kToMazaneh' | 'goldBubble' | 'usdGap';
export type CalculatorField = { key: string; label: string; unit: string; symbol: Symbol; currency: string; quoteUnit: string };
const melted: CalculatorField = { key: 'melted', label: 'مظنه آب‌شده ۷۰۵', unit: 'تومان / مثقال', symbol: 'GOLD_MELTED', currency: 'TMN', quoteUnit: 'مثقال' };
const gram: CalculatorField = { key: 'gram', label: 'قیمت گرم طلای ۱۸ عیار', unit: 'تومان / گرم', symbol: 'GOLD_18K', currency: 'TMN', quoteUnit: 'گرم' };
const xau: CalculatorField = { key: 'xau', label: 'اونس جهانی طلا', unit: 'دلار / اونس تروا', symbol: 'XAU_USD', currency: 'USD', quoteUnit: 'اونس تروا' };
const usd: CalculatorField = { key: 'usd', label: 'نرخ دلار', unit: 'تومان / دلار', symbol: 'USD', currency: 'TMN', quoteUnit: 'دلار' };
export const calculatorCatalog: Record<CalculatorOperation, { title: string; formulaId: string; version: string; fields: CalculatorField[] }> = {
  mazanehTo18k: { title: 'مظنه به گرم ۱۸ عیار', formulaId: 'MAZANEH_TO_18K', version: '1.0', fields: [melted] },
  market18kToMazaneh: { title: 'گرم ۱۸ عیار به مظنه', formulaId: 'MAZANEH_TO_18K', version: '1.0', fields: [gram] },
  goldBubble: { title: 'ارزش محاسباتی و حباب طلا', formulaId: 'GOLD_BUBBLE', version: '1.0', fields: [melted, xau, usd] },
  usdGap: { title: 'فاصله دلار با دلار ضمنی طلا', formulaId: 'USD_GAP', version: '1.0', fields: [melted, xau, usd] },
};
export const formulaRegistry = {
  GOLD_BUBBLE: { approved: true, description: 'فرمول حباب طلا تأیید شده است؛ قیمت ۱۸ عیار از تبدیل تأییدشده مظنه به دست می‌آید. خروجی محاسباتی پیشنهاد خرید یا فروش نیست. محدوده خنثی و آستانه معاملاتی هنوز فعال نیستند.' },
  USD_GAP: { approved: true, description: 'فاصله نرخ دلار با دلار ضمنی طلا با مدل تأییدشده محاسبه می‌شود؛ این معیار ارزش بنیادی دلار یا توصیه معامله نیست.' },
  SILVER_BUBBLE: { approved: false, description: 'محاسبه حباب نقره تا تکمیل و تأیید داده و مدل نقره داخلی فعال نیست؛ وجود قیمت به‌تنهایی به معنای فعال بودن تحلیل نیست.' },
} as const;
export type CalculatorResult = {
  formulaId: string; version: string; calculatedAt: string;
  outputs: { label: string; value: number; unit: string }[];
  inputs: { key: string; label: string; value: number; unit: string; provenance: 'LIVE' | 'MANUAL' | 'CONSTANT'; observedAt: string | null; source: string }[];
  constants: { label: string; provenance: 'CONSTANT'; version: string }[];
};

