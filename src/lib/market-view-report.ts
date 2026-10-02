/** Market-view report types + Persian prose from approved bubble math only.
 * No invented V5.4 BUY/SELL/HOLD or confidence; trade actions only when a server engine emits them.
 * Decision engine Master Prompt is not supplied — buy/sell/hold require an explicit engineTrade.
 */

import type { Symbol } from '@/lib/market';
import {
  withAtoms,
  type MetricTone,
  type NarrativeAtom,
  type NarrativeSection,
} from '@/lib/market-view-typing';

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
  /** Engine is active and evaluating, but stated market conditions are not yet met. */
  | 'needs_confirmation'
  /** Approved trading analysis is not wired/active for this symbol. */
  | 'analysis_inactive'
  /** Missing, blocked, or too-stale inputs for a reliable comparison/decision. */
  | 'insufficient_data';

export type MarketViewValuationStance = 'below' | 'above' | 'equal' | 'mixed' | 'unknown';

export type MarketViewValuationSummary = {
  /** `mixed` = valid opposing gold/silver directions; `unknown` = missing reference only. */
  stance: MarketViewValuationStance;
  title: string;
  detail: string;
  /** Short market name for the result card — never omit the asset. */
  marketLabel: string;
  /** Percent gap vs reference; null for overall/mixed or when unknown. Never invent a single overall %. */
  percent: number | null;
};

export type MarketViewDecision = {
  kind: MarketViewDecisionKind;
  /** Null unless the server decision engine explicitly emitted buy/sell/hold. */
  tradeAction: MarketViewTradeAction | null;
  title: string;
  reason: string;
  changeConditions: string;
  valuation: MarketViewValuationSummary | null;
};

/** Valuation stance vs reference — distinct from trade decision. */
export type MarketViewValuationMark = {
  id: MarketViewEvidenceRow['id'];
  label: string;
  stance: Exclude<MarketViewValuationStance, 'mixed'>;
  stanceLabel: string;
  percentLabel: string | null;
};

export type MarketViewTrendStatus = 'ready' | 'not_computed' | 'unavailable';

/** Price trend vs history — never invent from bubble sign alone. */
export type MarketViewTrend = {
  status: MarketViewTrendStatus;
  /** Short public label shown on the result card. */
  label: string;
  /** Optional basis note when status is ready (range + method). */
  detail: string | null;
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
  /** Structured trend from an approved history path — not bubble direction. */
  trend: MarketViewTrend;
  changeFromPrior: string | null;
  details: {
    formulaNotes: string[];
    disclaimer: string;
  };
};

/** Honest default while GAP_TREND / history trend is not wired into this report. */
export function buildMarketViewTrend(_args?: {
  historyConnected?: boolean;
}): MarketViewTrend {
  // Capability GAP_TREND is SOURCE_REQUIRED; no approved computation is attached to market-view yet.
  return {
    status: 'not_computed',
    label: 'روند قیمت در این گزارش محاسبه نشده است',
    detail: null,
  };
}

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

/** Short natural names for narrative — long labels stay on the evidence table. */
export function shortMarketLabel(id: MarketViewEvidenceRow['id'], symbol?: Symbol | null) {
  if (id === 'gold') {
    if (symbol === 'GOLD_MELTED') return 'آب‌شده';
    if (symbol === 'GOLD_18K') return 'طلای ۱۸ عیار';
    return 'طلای ۱۸ عیار';
  }
  if (id === 'usd') return 'دلار آزاد';
  if (id === 'silver') return 'نقره ۹۹۹';
  return 'سکه';
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

export function buildValuationMarks(
  evidence: MarketViewEvidenceRow[],
  symbol?: Symbol | null,
): MarketViewValuationMark[] {
  return evidence
    .filter(row => row.id !== 'coin')
    .map(row => {
      const direction = stance(row.diffPercent);
      return {
        id: row.id,
        label: shortMarketLabel(row.id, symbol),
        stance: direction === 'none' ? 'unknown' : direction,
        stanceLabel: stanceLabel(direction),
        percentLabel: row.diffPercent != null && Number.isFinite(row.diffPercent)
          ? `${formatFaPercent(row.diffPercent)}٪`
          : null,
      };
    });
}

function buildOverallComparativeView(usable: MarketViewEvidenceRow[]): {
  view: string;
  stance: MarketViewValuationSummary['stance'];
} {
  const gold = usable.find(row => row.id === 'gold');
  const silver = usable.find(row => row.id === 'silver');
  const usd = usable.find(row => row.id === 'usd');

  const phrase = (row: MarketViewEvidenceRow | undefined, label: string) => {
    if (!row || row.diffPercent == null || !Number.isFinite(row.diffPercent)) return null;
    const direction = stance(row.diffPercent);
    if (direction === 'none') return null;
    if (direction === 'equal') return `${label} برابر`;
    return `${label} ${direction === 'below' ? 'پایین‌تر' : 'بالاتر'}`;
  };

  if (gold && silver) {
    const g = phrase(gold, 'طلا');
    const s = phrase(silver, 'نقره');
    if (g && s) {
      const gDir = stance(gold.diffPercent);
      const sDir = stance(silver.diffPercent);
      let view = `${g} و ${s} از مرجع محاسباتی است`;
      if (gDir === 'below' && (sDir === 'above' || sDir === 'equal')) {
        view += '؛ در این مقایسه، طلا اضافه‌قیمت کمتری دارد.';
      } else if (sDir === 'below' && (gDir === 'above' || gDir === 'equal')) {
        view += '؛ در این مقایسه، نقره اضافه‌قیمت کمتری دارد.';
      } else if (gDir === 'above' && sDir === 'above') {
        view += '؛ هر دو بالاتر از مرجع‌اند و این به‌معنای توصیهٔ خرید نیست.';
      } else if (gDir === 'below' && sDir === 'below') {
        view += '؛ هر دو پایین‌تر از مرجع‌اند و این به‌معنای سود تضمینی نیست.';
      } else {
        view += '.';
      }
      const mixed = gDir !== sDir && gDir !== 'equal' && sDir !== 'equal' && gDir !== 'none' && sDir !== 'none';
      if (mixed) return { view, stance: 'mixed' };
      if (gDir === 'none') return { view, stance: 'unknown' };
      if (gDir === 'equal' && sDir === 'equal') return { view, stance: 'equal' };
      if (gDir === 'equal') return { view, stance: sDir === 'none' ? 'unknown' : sDir };
      return { view, stance: gDir };
    }
  }

  const parts = [phrase(gold, 'طلا'), phrase(silver, 'نقره'), phrase(usd, 'دلار آزاد')].filter(Boolean);
  if (parts.length >= 2) {
    const dirs = [gold, silver, usd]
      .map(row => (row && phrase(row, '') ? stance(row.diffPercent) : null))
      .filter((d): d is Exclude<ReturnType<typeof stance>, 'none'> => d != null && d !== 'none');
    const unique = new Set(dirs);
    const mixed = unique.size > 1 && ![...unique].every(d => d === 'equal');
    return {
      view: `${parts.join(' و ')} از مرجع محاسباتی است؛ این مقایسه توصیهٔ خرید یا فروش نیست.`,
      stance: mixed ? 'mixed' : (dirs[0] === 'equal' ? 'equal' : dirs[0] ?? 'unknown'),
    };
  }
  if (parts.length === 1) {
    const row = gold ?? silver ?? usd!;
    const direction = stance(row.diffPercent);
    const name = shortMarketLabel(row.id, null);
    const pct = formatFaMoney(Math.abs(row.diffPercent!), 2);
    if (direction === 'equal') {
      return { view: `${name} با مرجع محاسباتی برابر است.`, stance: 'equal' };
    }
    return {
      view: `${name} الان ${pct}٪ ${direction === 'below' ? 'پایین‌تر از' : 'بالاتر از'} مرجع محاسباتی است.`,
      stance: direction === 'none' ? 'unknown' : direction,
    };
  }
  return {
    view: 'الان اختلاف معتبری میان قیمت بازار و مرجع محاسباتی دیده نمی‌شود.',
    stance: 'unknown',
  };
}

function buildValuationSummary(
  usable: MarketViewEvidenceRow[],
  symbol?: Symbol | null,
): MarketViewValuationSummary | null {
  if (!usable.length) return null;

  // Overall market: comparative sentence — never crown max |diffPercent| as the headline asset.
  if (!symbol && usable.length > 1) {
    const comparative = buildOverallComparativeView(usable);
    return {
      stance: comparative.stance,
      title: 'برداشت مقایسه‌ای بازار',
      detail: comparative.view,
      marketLabel: 'بازار',
      percent: null,
    };
  }

  const independent = usable.filter(row => row.id !== 'usd');
  const focus = [...independent].sort((a, b) => Math.abs(b.diffPercent!) - Math.abs(a.diffPercent!))[0] ?? usable[0];
  const direction = stance(focus.diffPercent);
  const name = shortMarketLabel(focus.id, symbol);
  const percent = focus.diffPercent != null && Number.isFinite(focus.diffPercent) ? focus.diffPercent : null;

  if (direction === 'none') {
    return {
      stance: 'unknown',
      title: `${name} · مرجع نامشخص`,
      detail: `برای ${name} اختلاف معتبر با مرجع در دسترس نیست.`,
      marketLabel: name,
      percent: null,
    };
  }
  if (direction === 'equal') {
    return {
      stance: 'equal',
      title: `${name} · برابر با مرجع`,
      detail: `${name} با مرجع محاسباتی برابر است.`,
      marketLabel: name,
      percent: 0,
    };
  }
  const pct = formatFaMoney(Math.abs(focus.diffPercent!), 2);
  return {
    stance: direction,
    title: `${name} · ${stanceLabel(direction)}`,
    detail: `${name} ${pct}٪ ${direction === 'below' ? 'پایین‌تر از' : 'بالاتر از'} مرجع است.`,
    marketLabel: name,
    percent,
  };
}

/**
 * Decision card state. BUY/SELL/HOLD only when tradeAction is non-null from a real engine.
 * There is no approved V5.4 decision engine in source today — engineTrade stays null in production.
 * `engineAwaiting` is only for a live engine that explicitly reports unmet conditions (never inferred from bubbles).
 */
export function buildMarketViewDecision(
  evidence: MarketViewEvidenceRow[],
  freshness: MarketViewReport['dataFreshness'],
  engineTrade: MarketViewTradeAction | null = null,
  symbol?: Symbol | null,
  engineAwaiting: { reason: string; changeConditions: string } | null = null,
): MarketViewDecision {
  const usable = freshness === 'unavailable' ? [] : evidence.filter(row =>
    (row.status === 'ok' || row.status === 'stale') && row.diffPercent != null && Number.isFinite(row.diffPercent));
  const valuation = buildValuationSummary(usable, symbol);

  if (engineTrade === 'buy') {
    return {
      kind: 'buy',
      tradeAction: 'buy',
      title: 'خرید',
      reason: 'موتور تصمیم تأییدشده سمت سرور وضعیت خرید را صادر کرده است.',
      changeConditions: 'با تغییر روند تأییدشده، نرخ واقعی خرید و فروش یا هزینهٔ معامله، این وضعیت بازبینی می‌شود.',
      valuation,
    };
  }
  if (engineTrade === 'sell') {
    return {
      kind: 'sell',
      tradeAction: 'sell',
      title: 'فروش',
      reason: 'موتور تصمیم تأییدشده سمت سرور وضعیت فروش را صادر کرده است.',
      changeConditions: 'با تغییر روند تأییدشده، نرخ واقعی خرید و فروش یا هزینهٔ معامله، این وضعیت بازبینی می‌شود.',
      valuation,
    };
  }
  if (engineTrade === 'hold') {
    return {
      kind: 'hold',
      tradeAction: 'hold',
      title: 'نگهداری',
      reason: 'موتور تصمیم تأییدشده سمت سرور وضعیت نگهداری را صادر کرده است.',
      changeConditions: 'با تغییر روند تأییدشده یا فاصلهٔ قیمت از مرجع، این وضعیت بازبینی می‌شود.',
      valuation,
    };
  }

  // Only an active engine may claim "awaiting confirmation of conditions".
  if (engineAwaiting) {
    return {
      kind: 'needs_confirmation',
      tradeAction: null,
      title: 'در انتظار تأیید شرایط',
      reason: engineAwaiting.reason,
      changeConditions: engineAwaiting.changeConditions,
      valuation,
    };
  }

  if (!usable.length) {
    return {
      kind: 'insufficient_data',
      tradeAction: null,
      title: 'داده کافی نیست',
      reason: 'قیمت بازار یا ورودی‌های مرجع برای یک مقایسهٔ معتبر در دسترس نیست.',
      changeConditions: 'پس از رسیدن قیمت و مرجع هم‌زمان معتبر، دید ارزشی همین‌جا به‌روز می‌شود.',
      valuation: null,
    };
  }

  if (freshness === 'stale' || freshness === 'mixed') {
    return {
      kind: 'insufficient_data',
      tradeAction: null,
      title: 'داده قدیمی است',
      reason: 'قیمت با مرجع مقایسه شده، اما بخشی از داده قدیمی است؛ برای تصمیم معامله به دادهٔ تازه‌تر نیاز است.',
      changeConditions: 'با تازه‌شدن ورودی‌ها، دید ارزشی بازبینی می‌شود. این وضعیت به‌معنای انتظار خودکار برای فرصت معامله نیست.',
      valuation,
    };
  }

  // Usable bubble gap exists, but no approved trading engine is active for this symbol.
  return {
    kind: 'analysis_inactive',
    tradeAction: null,
    title: 'بدون سیگنال معامله',
    reason: 'این گزارش مقایسهٔ ارزش بازار است؛ سیگنال خرید و فروش هنوز ارائه نمی‌شود.',
    changeConditions: 'جزئیات فنی موتور تصمیم در بخش روش و محدودیت‌ها آمده است.',
    valuation,
  };
}

function reasonSentence(row: MarketViewEvidenceRow, symbol?: Symbol | null) {
  const name = shortMarketLabel(row.id, symbol);
  const market = row.marketPriceLabel ?? 'نامشخص';
  const reference = row.referenceLabel ?? 'نامشخص';
  const direction = stance(row.diffPercent);
  if (direction === 'none' || row.diffPercent == null) {
    return `برای ${name} مرجع معتبر اختلاف در دسترس نیست.`;
  }
  if (direction === 'equal') {
    return `قیمت ${name} با مرجع برابر است.`;
  }
  // One point: prices live in the evidence table; narrative keeps direction only once.
  return `قیمت بازار ${name} ${market} و مرجع ${reference} است.`;
}

function goldBasisNote(symbol?: Symbol | null) {
  if (symbol === 'GOLD_18K') {
    return 'درصد اختلاف از ارزش محاسباتی مشتق از مظنه است، نه قیمت تابلوی گرم ۱۸.';
  }
  if (symbol === 'GOLD_MELTED') {
    return 'مقایسه پس از تبدیل مظنه به گرم ۱۸ عیار است؛ جزئیات در فرمول.';
  }
  return 'اختلاف طلا از گرم ۱۸ مشتق از مظنه در برابر اونس و دلار است.';
}

/** Describe observable valuation only; no invented neutral band or trading state. */
export function composeMarketViewProse(
  evidence: MarketViewEvidenceRow[],
  freshness: MarketViewReport['dataFreshness'],
  options?: { symbol?: Symbol | null; engineTrade?: MarketViewTradeAction | null },
): Pick<
  MarketViewReport,
  'summaryLines' | 'marketSays' | 'reading' | 'unconfirmed' | 'conclusion' | 'decision' | 'valuationMarks'
> {
  const symbol = options?.symbol ?? null;
  const valuationMarks = buildValuationMarks(evidence, symbol);
  const usable = freshness === 'unavailable' ? [] : evidence.filter(row =>
    (row.status === 'ok' || row.status === 'stale') && row.diffPercent != null && Number.isFinite(row.diffPercent));
  const unconfirmed = evidence.filter(row => row.status === 'blocked' || row.status === 'unavailable')
    .map(row => `${shortMarketLabel(row.id, symbol)}: ${row.statusReason ?? 'دادهٔ کافی موجود نیست'}`);
  if (freshness === 'stale' || freshness === 'mixed') {
    unconfirmed.unshift('بخشی از داده‌ها قدیمی است؛ این گزارش روند تازه نیست.');
  }
  unconfirmed.push('روند قیمت در این گزارش محاسبه نشده است (مسیر GAP_TREND هنوز به گزارش وصل نیست).');

  const decision = buildMarketViewDecision(evidence, freshness, options?.engineTrade ?? null, symbol);

  if (!usable.length) {
    return {
      summaryLines: [
        'الان اختلاف معتبری میان قیمت بازار و مرجع محاسباتی دیده نمی‌شود.',
        'با رسیدن ورودی‌های معتبر، دید ارزشی اینجا شکل می‌گیرد.',
      ],
      marketSays: 'بدون قیمت و مرجع هم‌زمان، دلیل عددی ساخته نمی‌شود.',
      reading: null,
      conclusion: null,
      unconfirmed,
      decision,
      valuationMarks,
    };
  }

  const independent = usable.filter(row => row.id !== 'usd');
  const gold = usable.find(row => row.id === 'gold');
  const silver = usable.find(row => row.id === 'silver');
  const usd = usable.find(row => row.id === 'usd');

  // الف) دید فعلی — یک نکته؛ کل بازار مقایسه‌ای؛ بدون تاج max |diff|
  let view: string;
  let reasonFocus = independent[0] ?? usable[0]!;
  if (!symbol && usable.length > 1) {
    view = buildOverallComparativeView(usable).view;
    reasonFocus = gold ?? silver ?? usable[0]!;
  } else {
    const focus = [...independent].sort((a, b) => Math.abs(b.diffPercent!) - Math.abs(a.diffPercent!))[0] ?? usable[0]!;
    reasonFocus = focus;
    const name = shortMarketLabel(focus.id, symbol);
    const direction = stance(focus.diffPercent);
    const pct = formatFaMoney(Math.abs(focus.diffPercent!), 2);
    view = direction === 'equal'
      ? `${name} با مرجع محاسباتی برابر است.`
      : `${name} الان ${pct}٪ ${direction === 'below' ? 'پایین‌تر از' : 'بالاتر از'} مرجع محاسباتی است.`;
  }

  // ب) چرا؟ — یک نکته؛ جزئیات جدول برای حرفه‌ای‌ها
  let reason: string;
  if (!symbol && usable.length > 1) {
    reason = 'اعداد قیمت و مرجع در جدول شواهد آمده است؛ اینجا فقط جهت اختلاف بیان می‌شود.';
  } else {
    reason = reasonSentence(reasonFocus, symbol);
    if (reasonFocus.id === 'gold' || symbol === 'GOLD_18K' || symbol === 'GOLD_MELTED') {
      reason = `${reason} ${goldBasisNote(symbol)}`;
    }
  }

  // ج) برداشت از این اختلاف — یک نکته؛ بدون تکرار درصد دید فعلی
  let meaning: string;
  if (gold && silver) {
    const parityGap = gold.status === 'ok' && silver.status === 'ok'
      && gold.diffPercent! > -100 && silver.diffPercent! > -100
      ? ((1 + gold.diffPercent! / 100) / (1 + silver.diffPercent! / 100) - 1) * 100
      : null;
    if (parityGap != null) {
      const side = parityGap < 0 ? 'طلا نسبت به نقره اضافه‌قیمت کمتری دارد' : parityGap > 0 ? 'نقره نسبت به طلا اضافه‌قیمت کمتری دارد' : 'مزیت واضحی میان طلا و نقره دیده نمی‌شود';
      meaning = `نسبت داخلی طلا به نقره ${formatFaMoney(Math.abs(parityGap), 2)}٪ ${parityGap < 0 ? 'پایین‌تر از' : parityGap > 0 ? 'بالاتر از' : 'برابر با'} نسبت جهانی است؛ ${side}. این رقم بازده قابل اجرای تبدیل نیست.`;
    } else if (gold.diffPercent! < 0 && silver.diffPercent! >= 0) {
      meaning = 'تخفیف نسبت به مرجع در طلا دیده می‌شود؛ نقره همان وضعیت را ندارد.';
    } else if (silver.diffPercent! < 0 && gold.diffPercent! >= 0) {
      meaning = 'تخفیف نسبت به مرجع در نقره دیده می‌شود؛ طلا همان وضعیت را ندارد.';
    } else {
      meaning = 'اختلاف با مرجع به‌تنهایی مجوز خرید یا فروش نیست.';
    }
  } else if (gold && usd) {
    meaning = gold.impliedUsdLabel
      ? `فاصلهٔ دلار بازار با دلار ضمنی طلا (~${gold.impliedUsdLabel}) همان رابطهٔ طلا/اونس است؛ تأیید مستقل از درهم نیست.`
      : 'فاصلهٔ دلار بازار با دلار ضمنی طلا بازتاب همان رابطهٔ طلا و اونس است؛ تأیید مستقل از درهم نیست.';
  } else if (silver) {
    meaning = silver.impliedUsdLabel
      ? `اختلاف نقره هم‌خوانی قیمت داخلی با اونس و دلار (~${silver.impliedUsdLabel}) را نشان می‌دهد.`
      : 'اختلاف نقره هم‌خوانی قیمت داخلی با اونس جهانی و دلار بازار را نشان می‌دهد.';
  } else if (usd) {
    meaning = 'این رقم فقط فاصلهٔ دلار بازار با دلار ضمنی طلا است؛ ارزش بنیادی جداگانه نیست.';
  } else {
    meaning = 'این اختلاف رابطه با مرجع محاسباتی را نشان می‌دهد، نه جهت قطعی حرکت بعدی.';
  }

  // د) نتیجه — کوتاه؛ بدون وعدهٔ اعلان خودکار
  const result = decision.kind === 'analysis_inactive'
    ? decision.reason
    : decision.kind === 'needs_confirmation'
      ? decision.reason
      : decision.reason;

  const teaser = symbol
    ? 'برداشت و نتیجهٔ کامل این نماد با دسترسی تحلیل باز می‌شود.'
    : 'برداشت و نتیجهٔ کامل بازار با دسترسی تحلیل باز می‌شود.';

  return {
    summaryLines: [view, teaser],
    marketSays: reason,
    reading: meaning,
    unconfirmed,
    conclusion: result,
    decision,
    valuationMarks,
  };
}

function metricAtom(text: string, tone: MetricTone, arrow?: 'up' | 'down' | null): NarrativeAtom {
  return { kind: 'metric', text, tone, arrow: arrow ?? null };
}

function textAtom(text: string): NarrativeAtom {
  return { kind: 'text', text };
}

/** Build typed narrative with structured metrics — no regex HTML rewriting. */
export function buildAnalysisNarrativeSections(report: MarketViewReport): NarrativeSection[] {
  const valuation = report.decision.valuation;
  const viewAtoms: NarrativeAtom[] = [];

  if (!report.symbol && valuation && (valuation.stance === 'mixed' || valuation.marketLabel === 'بازار')) {
    const gold = report.evidence.find(r => r.id === 'gold');
    const silver = report.evidence.find(r => r.id === 'silver');
    const gDir = gold ? stance(gold.diffPercent) : 'none';
    const sDir = silver ? stance(silver.diffPercent) : 'none';
    if (gDir !== 'none' && sDir !== 'none') {
      viewAtoms.push(textAtom('طلا '));
      viewAtoms.push(metricAtom(
        gDir === 'below' ? 'پایین‌تر' : gDir === 'above' ? 'بالاتر' : 'برابر',
        gDir === 'below' ? 'below' : gDir === 'above' ? 'above' : 'neutral',
      ));
      viewAtoms.push(textAtom(' و نقره '));
      viewAtoms.push(metricAtom(
        sDir === 'below' ? 'پایین‌تر' : sDir === 'above' ? 'بالاتر' : 'برابر',
        sDir === 'below' ? 'below' : sDir === 'above' ? 'above' : 'neutral',
      ));
      viewAtoms.push(textAtom(' از مرجع محاسباتی است'));
      if (gDir === 'below' && (sDir === 'above' || sDir === 'equal')) {
        viewAtoms.push(textAtom('؛ در این مقایسه، طلا اضافه‌قیمت کمتری دارد.'));
      } else if (sDir === 'below' && (gDir === 'above' || gDir === 'equal')) {
        viewAtoms.push(textAtom('؛ در این مقایسه، نقره اضافه‌قیمت کمتری دارد.'));
      } else if (gDir === 'above' && sDir === 'above') {
        viewAtoms.push(textAtom('؛ هر دو بالاتر از مرجع‌اند و این به‌معنای توصیهٔ خرید نیست.'));
      } else if (gDir === 'below' && sDir === 'below') {
        viewAtoms.push(textAtom('؛ هر دو پایین‌تر از مرجع‌اند و این به‌معنای سود تضمینی نیست.'));
      } else {
        viewAtoms.push(textAtom('.'));
      }
    } else {
      viewAtoms.push(textAtom(report.summaryLines[0]));
    }
  } else if (valuation?.percent != null && valuation.stance !== 'unknown' && valuation.stance !== 'mixed') {
    const name = valuation.marketLabel;
    const pct = formatFaMoney(Math.abs(valuation.percent), 2);
    viewAtoms.push(textAtom(`${name} الان `));
    viewAtoms.push(metricAtom(
      `${pct}٪`,
      valuation.stance === 'below' ? 'below' : valuation.stance === 'above' ? 'above' : 'neutral',
    ));
    viewAtoms.push(textAtom(
      valuation.stance === 'equal'
        ? ' برابر با مرجع محاسباتی است.'
        : ` ${valuation.stance === 'below' ? 'پایین‌تر از' : 'بالاتر از'} مرجع محاسباتی است.`,
    ));
  } else {
    viewAtoms.push(textAtom(report.summaryLines[0]));
  }

  const sections: NarrativeSection[] = [
    withAtoms('view', 'دید فعلی', viewAtoms),
    withAtoms('reason', 'چرا؟', [textAtom(report.marketSays)]),
  ];

  if (report.access === 'full' && report.reading) {
    const meaningAtoms: NarrativeAtom[] = [];
    const gold = report.evidence.find(r => r.id === 'gold' && r.status === 'ok');
    const silver = report.evidence.find(r => r.id === 'silver' && r.status === 'ok');
    if (gold && silver && gold.diffPercent != null && silver.diffPercent != null
      && gold.diffPercent > -100 && silver.diffPercent > -100) {
      const parityGap = ((1 + gold.diffPercent / 100) / (1 + silver.diffPercent / 100) - 1) * 100;
      meaningAtoms.push(textAtom('نسبت داخلی طلا به نقره '));
      meaningAtoms.push(metricAtom(
        `${formatFaMoney(Math.abs(parityGap), 2)}٪`,
        parityGap < 0 ? 'below' : parityGap > 0 ? 'above' : 'neutral',
      ));
      meaningAtoms.push(textAtom(
        ` ${parityGap < 0 ? 'پایین‌تر از' : parityGap > 0 ? 'بالاتر از' : 'برابر با'} نسبت جهانی است؛ ${
          parityGap < 0 ? 'طلا نسبت به نقره اضافه‌قیمت کمتری دارد' : parityGap > 0 ? 'نقره نسبت به طلا اضافه‌قیمت کمتری دارد' : 'مزیت واضحی میان طلا و نقره دیده نمی‌شود'
        }. این رقم بازده قابل اجرای تبدیل نیست.`,
      ));
    } else {
      meaningAtoms.push(textAtom(report.reading));
    }
    sections.push(withAtoms('meaning', 'برداشت از این اختلاف', meaningAtoms));
  }

  if (report.access === 'full' && report.conclusion) {
    const tone = report.decision.kind === 'needs_confirmation' || report.decision.kind === 'analysis_inactive'
      ? 'pending' as const
      : report.decision.kind === 'insufficient_data'
        ? 'missing' as const
        : 'neutral' as const;
    sections.push(withAtoms('result', 'نتیجه', [
      metricAtom(report.conclusion, tone),
    ]));
  } else if (report.access === 'preview') {
    sections.push(withAtoms('gate', 'ادامه', [textAtom(report.summaryLines[1])]));
  }

  return sections;
}

/** Brief mode: view + reason only (and preview gate) — denser mobile reading. */
export function buildBriefAnalysisNarrativeSections(report: MarketViewReport): NarrativeSection[] {
  const full = buildAnalysisNarrativeSections(report);
  const keep = new Set(['view', 'reason', 'gate']);
  return full.filter(section => keep.has(section.id));
}
