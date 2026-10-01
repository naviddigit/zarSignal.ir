/** Market-view report types + Persian prose from approved bubble math only.
 * No invented V5.4 BUY/SELL/HOLD or confidence; trade actions only when a server engine emits them.
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

/** Trade action only when a real decision engine produced it — never inferred from bubbles. */
export type MarketViewTradeAction = 'buy' | 'sell' | 'hold';

export type MarketViewDecisionKind =
  | 'buy'
  | 'sell'
  | 'hold'
  | 'needs_confirmation'
  | 'insufficient_data';

export type MarketViewDecision = {
  kind: MarketViewDecisionKind;
  /** Null unless the server decision engine explicitly emitted buy/sell/hold. */
  tradeAction: MarketViewTradeAction | null;
  title: string;
  reason: string;
  changeConditions: string;
};

/** Valuation stance vs reference — distinct from trade decision. */
export type MarketViewValuationMark = {
  id: MarketViewEvidenceRow['id'];
  label: string;
  stance: 'below' | 'above' | 'equal' | 'unknown';
  stanceLabel: string;
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
  decision: MarketViewDecision;
  valuationMarks: MarketViewValuationMark[];
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

function stanceLabel(direction: ReturnType<typeof stance>) {
  if (direction === 'below') return 'پایین‌تر از مرجع';
  if (direction === 'above') return 'بالاتر از مرجع';
  if (direction === 'equal') return 'برابر با مرجع';
  return 'مرجع نامشخص';
}

export function buildValuationMarks(evidence: MarketViewEvidenceRow[]): MarketViewValuationMark[] {
  return evidence
    .filter(row => row.id !== 'coin')
    .map(row => {
      const direction = stance(row.diffPercent);
      return {
        id: row.id,
        label: row.marketLabel,
        stance: direction === 'none' ? 'unknown' : direction,
        stanceLabel: stanceLabel(direction),
      };
    });
}

/**
 * Decision card state. BUY/SELL/HOLD only when tradeAction is non-null from a real engine.
 * Bubble/gap text must never invent a trade call.
 */
export function buildMarketViewDecision(
  evidence: MarketViewEvidenceRow[],
  freshness: MarketViewReport['dataFreshness'],
  /** Reserved for a future approved V5.4 decision engine — pass null today. */
  engineTrade: MarketViewTradeAction | null = null,
): MarketViewDecision {
  if (engineTrade === 'buy') {
    return {
      kind: 'buy',
      tradeAction: 'buy',
      title: 'خرید',
      reason: 'موتور تصمیم سمت سرور وضعیت خرید را تأیید کرده است.',
      changeConditions: 'با تغییر روند، نرخ اجرایی یا هزینهٔ معامله، این نتیجه می‌تواند عوض شود.',
    };
  }
  if (engineTrade === 'sell') {
    return {
      kind: 'sell',
      tradeAction: 'sell',
      title: 'فروش',
      reason: 'موتور تصمیم سمت سرور وضعیت فروش را تأیید کرده است.',
      changeConditions: 'با تغییر روند، نرخ اجرایی یا هزینهٔ معامله، این نتیجه می‌تواند عوض شود.',
    };
  }
  if (engineTrade === 'hold') {
    return {
      kind: 'hold',
      tradeAction: 'hold',
      title: 'نگهداری',
      reason: 'موتور تصمیم سمت سرور وضعیت نگهداری را تأیید کرده است.',
      changeConditions: 'با تغییر روند یا فاصلهٔ قیمت از مرجع، این نتیجه می‌تواند عوض شود.',
    };
  }

  const usable = freshness === 'unavailable' ? [] : evidence.filter(row =>
    (row.status === 'ok' || row.status === 'stale') && row.diffPercent != null && Number.isFinite(row.diffPercent));

  if (!usable.length) {
    return {
      kind: 'insufficient_data',
      tradeAction: null,
      title: 'داده کافی نیست',
      reason: 'برای مقایسه با مرجع محاسباتی، قیمت بازار یا ورودی‌های لازم در دسترس نیست.',
      changeConditions: 'با رسیدن دادهٔ معتبر، گزارش و نتیجه اینجا به‌روز می‌شود.',
    };
  }

  return {
    kind: 'needs_confirmation',
    tradeAction: null,
    title: 'نیاز به تأیید',
    reason: 'روند هم‌زمان، نرخ واقعی خرید و فروش و هزینهٔ معامله برای تأیید تصمیم در موتور محصول موجود نیست.',
    changeConditions: 'وقتی روند تأییدشده و نرخ اجرایی در موتور فعال شود، نتیجه می‌تواند به خرید، فروش یا نگهداری تبدیل شود.',
  };
}

/** Describe observable valuation only; no invented neutral band or trading state. */
export function composeMarketViewProse(evidence: MarketViewEvidenceRow[], freshness: MarketViewReport['dataFreshness']): Pick<
  MarketViewReport,
  'summaryLines' | 'marketSays' | 'reading' | 'unconfirmed' | 'conclusion' | 'decision' | 'valuationMarks'
> {
  const valuationMarks = buildValuationMarks(evidence);
  const usable = freshness === 'unavailable' ? [] : evidence.filter(row =>
    (row.status === 'ok' || row.status === 'stale') && row.diffPercent != null && Number.isFinite(row.diffPercent));
  const unconfirmed = evidence.filter(row => row.status === 'blocked' || row.status === 'unavailable')
    .map(row => `${row.marketLabel}: ${row.statusReason ?? 'دادهٔ کافی موجود نیست'}`);
  if (freshness === 'stale' || freshness === 'mixed') unconfirmed.unshift('بخشی از داده‌ها قدیمی است؛ گزارش، وضعیت همان زمان مشاهده را توضیح می‌دهد.');
  unconfirmed.push('روند و نرخ قابل اجرای خرید و فروش برای تأیید تصمیم معاملاتی در این گزارش موجود نیست.');

  const decision = buildMarketViewDecision(evidence, freshness, null);

  if (!usable.length) {
    return {
      summaryLines: ['دادهٔ معتبر برای مقایسه با ارزش محاسباتی در دسترس نیست.', 'با دریافت ورودی‌های معتبر، گزارش اینجا به‌روز می‌شود.'],
      marketSays: 'برای توضیح اختلاف قیمت، هم قیمت بازار و هم ورودی‌های مرجع لازم‌اند؛ عدد یا نتیجهٔ جایگزین ساخته نمی‌شود.',
      reading: null,
      conclusion: null,
      unconfirmed,
      decision,
      valuationMarks,
    };
  }

  const describe = (row: MarketViewEvidenceRow) => {
    const direction = stance(row.diffPercent);
    const basis = row.id === 'usd' ? 'دلار ضمنی طلا' : 'ارزش محاسباتی خود';
    if (direction === 'equal') return `${row.marketLabel} با ${basis} برابر است`;
    return `${row.marketLabel} ${formatFaMoney(Math.abs(row.diffPercent!), 2)}٪ ${direction === 'below' ? 'پایین‌تر' : 'بالاتر'} از ${basis} است`;
  };
  const gold = usable.find(row => row.id === 'gold');
  const silver = usable.find(row => row.id === 'silver');
  const independent = usable.filter(row => row.id !== 'usd');
  const dominant = [...independent].sort((a, b) => Math.abs(b.diffPercent!) - Math.abs(a.diffPercent!))[0] ?? usable[0];
  const comparison = gold && silver
    ? gold.diffPercent! < 0 && silver.diffPercent! >= 0
      ? 'پایین‌تر بودن قیمت از مرجع در طلا دیده می‌شود؛ نقره همین وضعیت را ندارد.'
      : silver.diffPercent! < 0 && gold.diffPercent! >= 0
        ? 'پایین‌تر بودن قیمت از مرجع در نقره دیده می‌شود؛ طلا همین وضعیت را ندارد.'
        : `فاصلهٔ قیمت از مرجع در ${Math.abs(gold.diffPercent!) >= Math.abs(silver.diffPercent!) ? 'طلا' : 'نقره'} بیشتر است.`
    : 'این اختلاف فقط رابطهٔ قیمت با مرجع را نشان می‌دهد.';

  const parityGap = gold?.status === 'ok' && silver?.status === 'ok'
    && gold.diffPercent! > -100 && silver.diffPercent! > -100
    ? ((1 + gold.diffPercent! / 100) / (1 + silver.diffPercent! / 100) - 1) * 100 : null;
  const parityReading = parityGap == null ? ''
    : `نسبت قیمت طلا به نقره در بازار داخلی ${formatFaMoney(Math.abs(parityGap), 2)}٪ ${parityGap < 0 ? 'پایین‌تر از' : parityGap > 0 ? 'بالاتر از' : 'برابر با'} نسبت محاسباتی جهانی است. ${parityGap < 0 ? 'طلا نسبت به نقره اضافه‌قیمت کمتری دارد؛ تبدیل طلا به نقره مزیت ارزشی نشان نمی‌دهد.' : parityGap > 0 ? 'نقره نسبت به طلا اضافه‌قیمت کمتری دارد.' : 'مزیت ارزشی بین این دو دیده نمی‌شود.'} این عدد قبل از هزینه و اختلاف خرید و فروش است؛ بازده قابل اجرای تبدیل نیست.`;

  const reading = [
    comparison,
    ...usable.filter(row => row.impliedUsdLabel).map(row =>
      `قیمت ${row.marketLabel} عملاً دلار ${row.impliedUsdLabel} را منعکس می‌کند.`),
    parityReading,
    usable.some(row => row.id === 'usd')
      ? 'فاصلهٔ دلار بازار با دلار ضمنی طلا همان رابطهٔ طلا و اونس است؛ تأیید مستقل دلار از درهم نیست.'
      : '',
    'اختلاف با مرجع به‌تنهایی مجوز خرید یا فروش نیست.',
  ].filter(Boolean).join(' ');

  // Short card-aligned line — must not repeat the full reading/parity block.
  const conclusion = `${describe(dominant)}. ${dominant.diffPercent! < 0
    ? 'تخفیف نسبت به مرجع است، نه تضمین ارزندگی.'
    : dominant.diffPercent! > 0
      ? 'اضافه‌قیمت نسبت به مرجع است، نه نشانهٔ قطعی افت.'
      : 'برابری با مرجع جهت حرکت بعدی را تعیین نمی‌کند.'}`;

  return {
    summaryLines: [`${usable.map(describe).join('؛ ')}.`, comparison],
    marketSays: 'قیمت داخلی فلزات را کنار اونس جهانی و دلار بازار می‌گذاریم تا مشخص شود چه مقدار از قیمت با این دو عامل توضیح داده می‌شود و چه اختلافی باقی می‌ماند.',
    reading,
    unconfirmed,
    conclusion,
    decision,
    valuationMarks,
  };
}
