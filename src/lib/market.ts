export const instruments = [
  { symbol: 'GOLD_MELTED', name: 'طلای آب‌شده نقدی', short: 'آب‌شده', category: 'gold', currency: 'TMN', unit: 'مثقال', description: 'قیمت آب‌شده نقدی؛ واحد و محل بازار باید هنگام مقایسه یکسان باشند.' },
  { symbol: 'GOLD_18K', name: 'گرم طلای ۱۸ عیار', short: '۱۸ عیار', category: 'gold', currency: 'TMN', unit: 'گرم', description: 'قیمت هر گرم طلای ۱۸ عیار به تومان.' },
  { symbol: 'XAU_USD', name: 'اونس جهانی طلا', short: 'اونس طلا', category: 'gold', currency: 'USD', unit: 'اونس تروا', description: 'قیمت جهانی یک اونس تروا طلا به دلار.' },
  { symbol: 'XAG_USD', name: 'اونس نقره', short: 'اونس نقره', category: 'silver', currency: 'USD', unit: 'اونس تروا', description: 'قیمت هر اونس تروا نقره به دلار آمریکا.' },
  { symbol: 'SILVER_999', name: 'گرم نقره ۹۹۹', short: 'نقره ۹۹۹', category: 'silver', currency: 'TMN', unit: 'گرم', description: 'قیمت هر گرم نقره ۹۹۹ داخلی به تومان.' },
  { symbol: 'USD', name: 'دلار / تتر', short: 'دلار', category: 'currency', currency: 'TMN', unit: 'دلار', description: 'نرخ دلار/تتر به تومان از دیده‌بان فعال.' },
  { symbol: 'AED', name: 'درهم امارات', short: 'درهم', category: 'currency', currency: 'TMN', unit: 'درهم', description: 'قیمت درهم امارات به تومان.' },
  { symbol: 'SEKE_CASH', name: 'سکه نقدی', short: 'سکه', category: 'gold', currency: 'TMN', unit: 'عدد', description: 'قیمت سکه نقدی به تومان.' },
  { symbol: 'ROB_SEKE', name: 'ربع سکه', short: 'ربع', category: 'gold', currency: 'TMN', unit: 'عدد', description: 'قیمت ربع سکه به تومان.' },
] as const;
export type Symbol = typeof instruments[number]['symbol'];
export type Quote = { symbol: Symbol; buy: string; sell: string; currency: string; unit: string; source: string; sourceUrl: string | null; observedAt: string; fetchedAt: string };
export type Snapshot = { mode: 'demo' | 'live'; status: 'demo' | 'ok' | 'stale' | 'unavailable'; quotes: Quote[]; pollSeconds?: number; };
/** Core symbols required for live bubble formulas. */
export const formulaCriticalSymbols: Symbol[] = ['GOLD_MELTED', 'XAU_USD', 'USD'];
export function isStale(quote: Quote, now = Date.now()) { const observedAt = Date.parse(quote.observedAt); return !Number.isFinite(observedAt) || now - observedAt > 15 * 60_000 || observedAt > now + 60_000; }
export function bubbleResult() { return { status: 'pending_formula' as const, value: null, targets: null, reason: 'در انتظار تعریف و اعتبارسنجی فرمول تحلیل' }; }
const demoBuys = ['102400000', '23600000', '4340', '66', '489000', '229000', '62550', '232200000', '63000000'] as const;
export const demoQuotes: Quote[] = instruments.map((asset, index) => ({ symbol: asset.symbol, buy: demoBuys[index] ?? '1', sell: demoBuys[index] ?? '1', currency: asset.currency, unit: asset.unit, source: 'دادهٔ نمایشی', sourceUrl: null, observedAt: '2026-09-01T09:00:00.000Z', fetchedAt: '2026-09-01T09:00:00.000Z' }));
export function formatPrice(value: string, currency: string) { return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(Number(value))} ${currency === 'TMN' ? 'تومان' : 'دلار'}`; }
