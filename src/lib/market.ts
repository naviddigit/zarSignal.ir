export const instruments = [
  { symbol: 'GOLD_MELTED', name: 'طلای آب‌شده', short: 'طلا', category: 'gold', currency: 'TMN', unit: 'مثقال', description: 'قیمت خرید و فروش طلای آب‌شده حواله؛ واحد و محل بازار باید هنگام مقایسه یکسان باشند.' },
  { symbol: 'XAG_USD', name: 'اونس نقره', short: 'نقره', category: 'silver', currency: 'USD', unit: 'اونس تروا', description: 'قیمت هر اونس تروا نقره به دلار آمریکا؛ این عدد قیمت هر گرم نقره در ایران نیست.' },
  { symbol: 'USD', name: 'دلار آمریکا', short: 'دلار', category: 'currency', currency: 'TMN', unit: 'دلار', description: 'نرخ خرید و فروش دلار به تومان؛ قیمت بازارها و ارائه‌دهندگان ممکن است متفاوت باشد.' },
  { symbol: 'EUR', name: 'یورو', short: 'یورو', category: 'currency', currency: 'TMN', unit: 'یورو', description: 'قیمت یورو به تومان با تفکیک نرخ خرید و فروش.' },
  { symbol: 'AED', name: 'درهم امارات', short: 'درهم', category: 'currency', currency: 'TMN', unit: 'درهم', description: 'قیمت درهم امارات به تومان با زمان دریافت و منبع مشخص.' },
  { symbol: 'XAU_USD', name: 'اونس جهانی طلا', short: 'اونس طلا', category: 'gold', currency: 'USD', unit: 'اونس تروا', description: 'قیمت جهانی یک اونس تروا طلا به دلار؛ برای تبدیل به طلای داخلی، عیار و واحد وزن لازم است.' },
  { symbol: 'DUBAI_GOLD_OZ', name: 'طلای دبی', short: 'طلای دبی', category: 'gold', currency: 'USD', unit: 'اونس دبی', description: 'قیمت خرید و فروش GOLD 1 OZ در بازار دبی به دلار؛ بدون تبدیل به تومان یا طلای داخلی.' },
] as const;
export type Symbol = typeof instruments[number]['symbol'];
export type Quote = { symbol: Symbol; buy: string; sell: string; currency: string; unit: string; source: string; sourceUrl: string | null; observedAt: string; fetchedAt: string };
export type Snapshot = { mode: 'demo' | 'live'; status: 'demo' | 'ok' | 'stale' | 'unavailable'; quotes: Quote[]; pollSeconds?: number; };
export function isStale(quote: Quote, now = Date.now()) { const observedAt = Date.parse(quote.observedAt); return !Number.isFinite(observedAt) || now - observedAt > 15 * 60_000 || observedAt > now + 60_000; }
export function bubbleResult() { return { status: 'pending_formula' as const, value: null, targets: null, reason: 'در انتظار تعریف و اعتبارسنجی فرمول تحلیل' }; }
export const demoQuotes: Quote[] = instruments.map((asset, index) => ({ symbol: asset.symbol, buy: ['34800000','31.25','98500','108400','26800','2640'][index], sell: ['35120000','31.65','99100','109100','27100','2648'][index], currency: asset.currency, unit: asset.unit, source: 'دادهٔ نمایشی', sourceUrl: null, observedAt: '2026-09-01T09:00:00.000Z', fetchedAt: '2026-09-01T09:00:00.000Z' }));
export function formatPrice(value: string, currency: string) { return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(Number(value))} ${currency === 'TMN' ? 'تومان' : 'دلار'}`; }
