/** Market-view report types + Persian prose from approved bubble math only.
 * No V5.4 decision states (BUY/SELL/HOLD), confidence, or neutral-band claims.
 */

import type { Symbol } from '@/lib/market';

export type MarketViewAccess = 'preview' | 'full';

export type MarketViewRowStatus = 'ok' | 'stale' | 'unavailable' | 'blocked';

export type MarketViewEvidenceRow = {
  id: 'gold' | 'usd' | 'silver' | 'coin';
  marketLabel: string;
  marketPriceLabel: string | null;
  referenceLabel: string | null;
  referenceBasis: string;
  diffPercent: number | null;
  unitNote: string;
  status: MarketViewRowStatus;
  statusReason: string | null;
  formulaVersion: string | null;
  impliedUsdLabel?: string | null;
};

export type MarketViewReport = {
  schemaVersion: '1.0';
  reportId: string;
  generatedAtIso: string;
  dataObservedAtIso: string | null;
  dataFreshness: 'ok' | 'stale' | 'unavailable' | 'mixed';
  snapshotFingerprint: string;
  access: MarketViewAccess;
  symbol?: Symbol | null;
  currentQuote?: { label: string; price: string; unit: string } | null;
  title: string;
  summaryLines: [string, string];
  marketSays: string;
  evidence: MarketViewEvidenceRow[];
  reading: string | null;
  unconfirmed: string[];
  conclusion: string | null;
  changeFromPrior: string | null;
  details: {
    formulaNotes: string[];
    disclaimer: string;
  };
};

export function formatFaPercent(value: number, digits = 2) {
  return new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
    signDisplay: 'exceptZero',
  }).format(value);
}

export function formatFaMoney(value: number, digits = 0) {
  return new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatTehranStamp(iso: string | null) {
  if (!iso) return 'در دسترس نیست';
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tehran',
  }).format(new Date(iso));
}

function stance(percent: number | null): 'below' | 'above' | 'equal' | 'none' {
  if (percent == null || !Number.isFinite(percent)) return 'none';
  if (percent === 0) return 'equal';
  return percent < 0 ? 'below' : 'above';
}

/** Describe observable valuation only; no invented neutral band or trading state. */
export function composeMarketViewProse(evidence: MarketViewEvidenceRow[], freshness: MarketViewReport['dataFreshness']): Pick<
  MarketViewReport,
  'summaryLines' | 'marketSays' | 'reading' | 'unconfirmed' | 'conclusion'
> {
  const usable = freshness === 'unavailable' ? [] : evidence.filter(row =>
    (row.status === 'ok' || row.status === 'stale') && row.diffPercent != null && Number.isFinite(row.diffPercent));
  const unconfirmed = evidence.filter(row => row.status === 'blocked' || row.status === 'unavailable')
    .map(row => `${row.marketLabel}: ${row.statusReason ?? 'دادهٔ کافی موجود نیست'}`);
  if (freshness === 'stale' || freshness === 'mixed') unconfirmed.unshift('بخشی از داده‌ها قدیمی است؛ گزارش، وضعیت همان زمان مشاهده را توضیح می‌دهد.');
  unconfirmed.push('روند و نرخ قابل اجرای خرید و فروش برای تأیید تصمیم معاملاتی در این گزارش موجود نیست.');
  if (!usable.length) return {
    summaryLines: ['دادهٔ معتبر برای مقایسه با ارزش محاسباتی در دسترس نیست.', 'با دریافت ورودی‌های معتبر، گزارش اینجا به‌روز می‌شود.'],
    marketSays: 'برای توضیح اختلاف قیمت، هم قیمت بازار و هم ورودی‌های مرجع لازم‌اند؛ عدد یا نتیجهٔ جایگزین ساخته نمی‌شود.',
    reading: null, conclusion: null, unconfirmed,
  };

  const describe = (row: MarketViewEvidenceRow) => {
    const direction = stance(row.diffPercent);
    const basis = row.id === 'usd' ? 'دلار ضمنی طلا' : 'ارزش محاسباتی خود';
    if (direction === 'equal') return `${row.marketLabel} با ${basis} برابر است`;
    return `${row.marketLabel} ${formatFaMoney(Math.abs(row.diffPercent!), 2)}٪ ${direction === 'below' ? 'پایین‌تر' : 'بالاتر'} از ${basis} است`;
  };
  const gold = usable.find(row => row.id === 'gold');
  const silver = usable.find(row => row.id === 'silver');
  // USD implied by gold describes the same divergence; it is not another valuation vote.
  const independent = usable.filter(row => row.id !== 'usd');
  const dominant = [...independent].sort((a,b) => Math.abs(b.diffPercent!) - Math.abs(a.diffPercent!))[0] ?? usable[0];
  const comparison = gold && silver
    ? gold.diffPercent! < 0 && silver.diffPercent! >= 0
      ? 'پایین‌تر بودن قیمت از مرجع در طلا دیده می‌شود؛ نقره همین وضعیت را ندارد.'
      : silver.diffPercent! < 0 && gold.diffPercent! >= 0
        ? 'پایین‌تر بودن قیمت از مرجع در نقره دیده می‌شود؛ طلا همین وضعیت را ندارد.'
        : `فاصلهٔ قیمت از مرجع در ${Math.abs(gold.diffPercent!) >= Math.abs(silver.diffPercent!) ? 'طلا' : 'نقره'} بیشتر است. این مقایسه، رتبه‌بندی سود یا ریسک نیست.`
    : 'این اختلاف، رابطهٔ قیمت بازار با مرجع را نشان می‌دهد؛ جهت حرکت بعدی را مشخص نمی‌کند.';
  const implied = usable.filter(row => row.impliedUsdLabel).map(row =>
    `قیمت ${row.marketLabel} عملاً دلار ${row.impliedUsdLabel} را منعکس می‌کند.`);
  const reading = [comparison, ...implied,
    usable.some(row => row.id === 'usd') ? 'فاصلهٔ دلار بازار با دلار ضمنی طلا بازتاب همان رابطهٔ طلا، اونس و دلار است؛ تأیید مستقل یا مرجع دلار از درهم محسوب نمی‌شود.' : '',
    'اختلاف با مرجع به‌تنهایی مجوز خرید یا فروش نیست؛ هزینهٔ معامله و تغییر اونس یا دلار می‌تواند این فاصله را تغییر دهد.'
  ].filter(Boolean).join(' ');
  return {
    summaryLines: [`${usable.map(describe).join('؛ ')}.`, comparison],
    marketSays: 'قیمت داخلی فلزات را کنار اونس جهانی و دلار بازار می‌گذاریم تا مشخص شود چه مقدار از قیمت با این دو عامل توضیح داده می‌شود و چه اختلافی باقی می‌ماند.',
    reading, unconfirmed,
    conclusion: `${describe(dominant)}. ${dominant.diffPercent! < 0 ? 'این یک تخفیف نسبت به مرجع محاسباتی است، نه تضمین ارزندگی یا سود.' : dominant.diffPercent! > 0 ? 'این یک اضافه‌قیمت نسبت به مرجع محاسباتی است، نه نشانهٔ قطعی افت قیمت.' : 'برابری با مرجع، جهت حرکت بعدی را تعیین نمی‌کند.'} با تغییر قیمت داخلی، دلار یا اونس، نتیجهٔ مقایسه تغییر می‌کند. برای نتیجه‌گیری دربارهٔ ورود یا خروج، تأیید روند و نرخ واقعی معامله هنوز لازم است.`,
  };
}
