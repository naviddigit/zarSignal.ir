import { createHash } from 'crypto';
import { getPublicSnapshot } from '@/server/quotes';
import {
  FORMULA_VERSION,
  GOLD_SILVER_RATIO_VERSION,
  SILVER_FORMULA_VERSION,
  UAE_GOLD_FORMULA_VERSION,
  USD_AED_GAP_VERSION,
  USD_AED_PEG_VERSION,
} from '@/server/bubble-formulas';
import { MAZANEH_TO_18K_VERSION } from '@/server/mazaneh-to-18k';
import {
  computeMarketIndicators,
  relevantSymbolsForFocus,
  type IndicatorValue,
  type MarketIndicators,
} from '@/server/market-indicators';
import { instruments, formatPrice, isStale, type Snapshot, type Symbol } from '@/lib/market';
import {
  composeMarketViewProse,
  buildMarketViewTrend,
  formatFaMoney,
  type MarketViewAccess,
  type MarketViewEvidenceId,
  type MarketViewEvidenceRow,
  type MarketViewReport,
} from '@/lib/market-view-report';
import { explainEvidenceStatus, USD_GAP_PUBLIC_LABEL } from '@/lib/evidence-status-reason';

function fingerprint(snapshot: Snapshot, evidence: MarketViewEvidenceRow[], symbol?: Symbol) {
  // Rate timestamps do not change report identity; validity/freshness and prices do.
  const payload = JSON.stringify({
    symbol: symbol ?? null,
    mode: snapshot.mode,
    quotes: snapshot.quotes.map(q => [q.symbol, q.buy, q.sell, q.currency, q.unit, isStale(q)]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    evidence: evidence.map(row => [row.id, row.status, row.marketPriceLabel, row.referenceLabel, row.diffPercent, row.formulaVersion]),
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

function moneyLabel(value: number | null | undefined, unit: string, digits = 0): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${formatFaMoney(value, digits)} ${unit}`;
}

function rowStatus(ind: IndicatorValue): MarketViewEvidenceRow['status'] {
  if (ind.status === 'blocked') return 'blocked';
  if (ind.status === 'stale') return 'stale';
  if (ind.status === 'ok') return 'ok';
  return 'unavailable';
}

function toEvidenceRow(args: {
  id: MarketViewEvidenceId;
  ind: IndicatorValue;
  marketLabel: string;
  referenceBasis: string;
  unitNote: string;
  marketUnit: string;
  referenceUnit: string;
  formulaVersion: string | null;
  marketBasis?: 'DIRECT' | 'DERIVED' | null;
  impliedUsdLabel?: string | null;
  referenceDigits?: number;
}): MarketViewEvidenceRow {
  const ok = args.ind.status === 'ok' || args.ind.status === 'stale';
  const status = rowStatus(args.ind);
  return {
    id: args.id,
    marketLabel: args.marketLabel,
    marketPriceLabel: moneyLabel(args.ind.marketPrice, args.marketUnit, args.referenceDigits ?? 0),
    referenceLabel: ok ? moneyLabel(args.ind.reference, args.referenceUnit, args.referenceDigits ?? 0) : null,
    referenceBasis: args.referenceBasis,
    diffPercent: ok ? args.ind.percent : null,
    unitNote: args.unitNote,
    status,
    statusReason: explainEvidenceStatus({
      id: args.id,
      status,
      rawReason: args.ind.reason,
      hasMarketPrice: args.ind.marketPrice != null && args.ind.marketPrice > 0,
    }),
    formulaVersion: args.ind.formulaVersion ?? args.formulaVersion,
    impliedUsdLabel: args.impliedUsdLabel,
    marketBasis: args.marketBasis ?? null,
  };
}

function buildEvidence(indicators: MarketIndicators): MarketViewEvidenceRow[] {
  const impliedUsd = indicators.usdImpliedGold.reference;
  const silverImplied = typeof indicators.silver.extra?.usdImplied === 'number'
    ? indicators.silver.extra.usdImplied
    : null;

  return [
    toEvidenceRow({
      id: 'gold',
      ind: indicators.goldDerived,
      marketLabel: 'طلا · گرم ۱۸ عیار (مشتق از مظنه)',
      referenceBasis: 'ارزش محاسباتی از اونس جهانی × دلار بازار × ۰٫۷۵',
      unitNote: `مبنای DERIVED · مظنه÷۴٫۳۳۱۸ (${MAZANEH_TO_18K_VERSION})؛ با مثقال خام مقایسه نمی‌شود`,
      marketUnit: 'تومان / گرم',
      referenceUnit: 'تومان / گرم',
      formulaVersion: FORMULA_VERSION,
      marketBasis: 'DERIVED',
      impliedUsdLabel: moneyLabel(impliedUsd, 'تومان'),
    }),
    toEvidenceRow({
      id: 'gold_direct',
      ind: indicators.goldDirect,
      marketLabel: 'طلا · گرم ۱۸ عیار (قیمت مستقیم تابلو)',
      referenceBasis: 'ارزش محاسباتی از اونس جهانی × دلار بازار × ۰٫۷۵',
      unitNote: 'مبنای DIRECT · قیمت تابلوی GOLD_18K؛ مستقل از مظنه',
      marketUnit: 'تومان / گرم',
      referenceUnit: 'تومان / گرم',
      formulaVersion: FORMULA_VERSION,
      marketBasis: 'DIRECT',
    }),
    toEvidenceRow({
      id: 'usd',
      ind: indicators.usdImpliedGold,
      marketLabel: 'دلار آزاد در مقایسه با دلار ضمنی طلا',
      referenceBasis: `دلار ضمنی از گرم ۱۸ (${indicators.usdImpliedGold.goldBasis}) و اونس — نه درهم و نه حباب مستقل دلار`,
      unitNote: `${USD_GAP_PUBLIC_LABEL}؛ ارزش بنیادی یا حباب مستقل دلار نیست`,
      marketUnit: 'تومان / دلار',
      referenceUnit: 'تومان / دلار',
      formulaVersion: FORMULA_VERSION,
    }),
    toEvidenceRow({
      id: 'usd_aed',
      ind: indicators.usdFromAed,
      marketLabel: 'دلار آزاد در مقایسه با مرجع درهم',
      referenceBasis: `AED×USD_AED (${indicators.peg.version} · ${indicators.peg.source} · ${indicators.peg.usdAed})`,
      unitNote: `نسخه ${USD_AED_GAP_VERSION}؛ با دلار ضمنی طلا یکی نیست`,
      marketUnit: 'تومان / دلار',
      referenceUnit: 'تومان / دلار',
      formulaVersion: USD_AED_GAP_VERSION,
    }),
    toEvidenceRow({
      id: 'uae_gold',
      ind: indicators.iranUaeGold,
      marketLabel: 'اختلاف ایران با مرجع نظری امارات',
      referenceBasis: `UAE18K نظری (${UAE_GOLD_FORMULA_VERSION}) · نه قیمت خرده‌فروشی دبی`,
      unitNote: `مبنای ایران: ${indicators.iranUaeGold.iranBasis ?? 'نامشخص'} · پگ ${USD_AED_PEG_VERSION}`,
      marketUnit: 'تومان / گرم',
      referenceUnit: 'تومان / گرم',
      formulaVersion: UAE_GOLD_FORMULA_VERSION,
      marketBasis: indicators.iranUaeGold.iranBasis,
    }),
    toEvidenceRow({
      id: 'silver',
      ind: indicators.silver,
      marketLabel: 'نقره ۹۹۹',
      referenceBasis: 'V5.4-SILVER.1 · اونس نقره × دلار × ۰٫۹۹۹ / ۳۱٫۱۰۳۴۷۶۸',
      unitNote: 'قیمت بازار نقره ۹۹۹ مستقیم گرم است؛ مقسوم‌علیه مظنه ندارد',
      marketUnit: 'تومان / گرم',
      referenceUnit: 'تومان / گرم',
      formulaVersion: SILVER_FORMULA_VERSION,
      impliedUsdLabel: moneyLabel(silverImplied, 'تومان'),
    }),
    toEvidenceRow({
      id: 'gold_silver',
      ind: indicators.goldSilverEdge,
      marketLabel: 'لبهٔ تبدیل نظری طلا/نقره',
      referenceBasis: `نسبت جهانی (XAU×۰٫۷۵)/(XAG×۰٫۹۹۹) · ${GOLD_SILVER_RATIO_VERSION}`,
      unitNote: 'بازده قابل اجرای سوآپ نیست؛ با حباب طلا و نقره هم‌پوشان است',
      marketUnit: 'نسبت داخلی',
      referenceUnit: 'نسبت جهانی',
      formulaVersion: GOLD_SILVER_RATIO_VERSION,
      referenceDigits: 4,
    }),
    toEvidenceRow({
      id: 'coin',
      ind: indicators.coin,
      marketLabel: 'سکه',
      referenceBasis: 'برای سکه فقط قیمت تابلو نمایش داده می‌شود',
      unitNote: 'قیمت هر عدد سکه به تومان',
      marketUnit: 'تومان / عدد',
      referenceUnit: 'تومان / عدد',
      formulaVersion: null,
    }),
  ];
}

function focusIdsForSymbol(symbol?: Symbol): MarketViewEvidenceId[] | null {
  if (!symbol) return null;
  if (symbol === 'GOLD_MELTED') return ['gold', 'usd', 'usd_aed', 'uae_gold', 'gold_silver'];
  if (symbol === 'GOLD_18K') return ['gold_direct', 'gold', 'usd', 'usd_aed', 'uae_gold', 'gold_silver'];
  if (symbol === 'USD') return ['usd', 'usd_aed'];
  if (symbol === 'AED') return ['usd_aed', 'uae_gold'];
  if (symbol === 'SILVER_999' || symbol === 'XAG_USD') return ['silver', 'gold_silver'];
  if (symbol === 'SEKE_CASH' || symbol === 'ROB_SEKE') return ['coin'];
  if (symbol === 'XAU_USD') return ['gold', 'gold_direct', 'uae_gold'];
  return null;
}

function freshnessOf(evidence: MarketViewEvidenceRow[], snapshot: Snapshot): MarketViewReport['dataFreshness'] {
  if (snapshot.mode !== 'live' || snapshot.status === 'unavailable' || snapshot.status === 'demo') return 'unavailable';
  const active = evidence.filter(r => r.id !== 'coin');
  if (active.every(r => r.status === 'unavailable' || r.status === 'blocked')) return 'unavailable';
  if (active.some(r => r.status === 'stale') && active.some(r => r.status === 'ok')) return 'mixed';
  if (active.some(r => r.status === 'stale')) return 'stale';
  if (active.some(r => r.status === 'ok')) return 'ok';
  return 'unavailable';
}

function observedAt(snapshot: Snapshot) {
  const times = snapshot.quotes.map(q => Date.parse(q.observedAt)).filter(Number.isFinite);
  if (!times.length) return null;
  return new Date(Math.min(...times)).toISOString();
}

async function historyTrendMeta(symbol?: Symbol | null) {
  try {
    const { db } = await import('@/lib/db');
    const target = symbol ?? 'GOLD_MELTED';
    const rows = await db.symbolHistoryBar.groupBy({
      by: ['resolution'],
      where: { symbol: target },
      _count: { _all: true },
      orderBy: { resolution: 'asc' },
    });
    if (!rows.length) {
      return { historyConnected: false, historyResolution: null as string | null, candleCount: 0 };
    }
    const daily = rows.find(r => r.resolution === '1D');
    const hourly = rows.find(r => r.resolution === '60' || r.resolution === '1H');
    if (hourly && hourly._count._all > 0) {
      return { historyConnected: true, historyResolution: hourly.resolution, candleCount: hourly._count._all };
    }
    return {
      historyConnected: true,
      historyResolution: daily?.resolution ?? rows[0]!.resolution,
      candleCount: daily?._count._all ?? rows[0]!._count._all,
    };
  } catch {
    return { historyConnected: false, historyResolution: '1D' as string | null, candleCount: null as number | null };
  }
}

export function marketViewReportFromSnapshot(
  snapshot: Snapshot,
  access: MarketViewAccess,
  symbol?: Symbol,
  trendMeta?: { historyConnected?: boolean; historyResolution?: string | null; candleCount?: number | null },
): MarketViewReport {
  const indicators = computeMarketIndicators(snapshot);
  const focusIds = focusIdsForSymbol(symbol);
  const asset = instruments.find(item => item.symbol === symbol);
  const quote = snapshot.mode === 'live' ? snapshot.quotes.find(item => item.symbol === symbol) : null;
  const quoteValid = quote && Number.isFinite(Number(quote.sell)) && Number(quote.sell) > 0 && quote.currency === asset?.currency && quote.unit === asset?.unit;
  let evidence = buildEvidence(indicators);
  if (focusIds) evidence = evidence.filter(row => focusIds.includes(row.id));
  if (symbol === 'ROB_SEKE') evidence = evidence.map(row => row.id === 'coin' ? {
    ...row, marketLabel: 'ربع سکه', marketPriceLabel: quoteValid ? moneyLabel(Number(quote.sell), 'تومان / عدد') : null,
  } : row);

  const relevantSymbols = relevantSymbolsForFocus(symbol);
  const relevantSnapshot = { ...snapshot, quotes: snapshot.quotes.filter(q => relevantSymbols.includes(q.symbol)) };
  const dataFreshness = evidence.length && !(symbol === 'SEKE_CASH' || symbol === 'ROB_SEKE')
    ? freshnessOf(evidence, snapshot)
    : quoteValid ? (isStale(quote) ? 'stale' : 'ok') : 'unavailable';
  const prose = composeMarketViewProse(evidence, dataFreshness, { symbol: symbol ?? null });

  if (asset && !evidence.some(row => row.diffPercent != null)) {
    const hasFormula = evidence.some(row => row.id !== 'coin' && row.formulaVersion != null);
    const shortName = asset.short;
    prose.summaryLines = [
      quoteValid ? `قیمت ${shortName} الان ${formatPrice(quote.sell, quote.currency)} / ${asset.unit} است.` : `قیمت معتبر ${shortName} فعلاً در دسترس نیست.`,
      hasFormula ? 'برای محاسبهٔ اختلاف با مرجع، بعضی ورودی‌های لازم نیستند.' : 'برای این نماد هنوز مرجع ارزش‌گذاری مستقل و قواعد تصمیم تأییدشده موجود نیست.',
    ];
    prose.marketSays = quoteValid
      ? `قیمت تابلو ${formatPrice(quote.sell, quote.currency)} / ${asset.unit} است؛ بدون مرجع محاسباتی، اختلاف درصدی ساخته نمی‌شود.`
      : 'بدون قیمت معتبر و مرجع، دلیل عددی ارائه نمی‌شود.';
    prose.reading = null;
    prose.conclusion = prose.decision.reason;
    if (!hasFormula) {
      prose.unconfirmed = [
        ...(dataFreshness === 'stale' ? ['قیمت نمایش‌داده‌شده قدیمی است.'] : []),
      ];
    }
    if (symbol === 'GOLD_18K') {
      prose.unconfirmed.unshift('برای گرم ۱۸ عیار مبنای مستقیم تابلو و مبنای مشتق از مظنه جداگانه در شواهد آمده است.');
    }
  }

  const inputTimes = relevantSnapshot.quotes.map(q => q.observedAt);
  if (new Set(inputTimes).size > 1) {
    prose.unconfirmed.unshift('نرخ‌های ورودی در یک لحظه ثبت نشده‌اند؛ زمان قدیمی‌ترین نرخ در سربرگ آمده است.');
  }
  const dataObservedAtIso = observedAt(relevantSnapshot);
  const generatedAtIso = new Date().toISOString();
  const snapFp = fingerprint(relevantSnapshot, evidence, symbol);

  const full: MarketViewReport = {
    schemaVersion: '1.0',
    reportId: `mvr_${snapFp}`,
    generatedAtIso,
    dataObservedAtIso,
    dataFreshness,
    snapshotFingerprint: snapFp,
    access,
    symbol: symbol ?? null,
    currentQuote: asset && quoteValid ? { label: asset.name, price: formatPrice(quote.sell, quote.currency), unit: asset.unit } : null,
    title: asset ? `تحلیل ${asset.short}` : 'دید بازار',
    summaryLines: prose.summaryLines,
    marketSays: prose.marketSays,
    evidence,
    reading: prose.reading,
    unconfirmed: prose.unconfirmed,
    conclusion: prose.conclusion,
    decision: prose.decision,
    valuationMarks: prose.valuationMarks,
    trend: buildMarketViewTrend({
      historyConnected: trendMeta?.historyConnected,
      historyResolution: trendMeta?.historyResolution ?? '1D',
      candleCount: trendMeta?.candleCount,
      methodApproved: false,
    }),
    changeFromPrior: null,
    details: {
      formulaNotes: [
        `حباب طلا و دلار ضمنی طلا: نسخه ${FORMULA_VERSION} · تبدیل مظنه→گرم۱۸: ${MAZANEH_TO_18K_VERSION}`,
        `حباب نقره: ${SILVER_FORMULA_VERSION}`,
        `دلار مبتنی بر درهم: ${USD_AED_GAP_VERSION} · پگ: ${USD_AED_PEG_VERSION}`,
        `مرجع نظری امارات: ${UAE_GOLD_FORMULA_VERSION} (نه خرده‌فروشی دبی)`,
        `لبهٔ تبدیل نظری طلا/نقره: ${GOLD_SILVER_RATIO_VERSION}`,
        'دلار ضمنی طلا با درهم یا دلار حواله‌ای یکی نیست؛ اونس/دلار و اونس/درهم دو تأیید مستقل نیستند.',
        'آرشیو و مقایسهٔ گزارش‌های قبلی هنوز در محصول ذخیره نمی‌شود.',
      ],
      disclaimer: 'این گزارش توصیف اختلاف قیمت با مرجع محاسباتی است؛ سیگنال خرید، فروش یا تضمین نتیجه نیست.',
    },
  };

  if (access === 'full') return full;

  return {
    ...full,
    access: 'preview',
    summaryLines: [
      prose.summaryLines[0],
      'متن کامل برداشت و نتیجه با دسترسی تحلیل خانگی یا بالاتر در دسترس است.',
    ],
    reading: null,
    conclusion: null,
    decision: prose.decision.kind === 'insufficient_data'
      ? prose.decision
      : {
          kind: prose.decision.kind === 'analysis_inactive' ? 'analysis_inactive' : prose.decision.kind,
          tradeAction: null,
          title: 'پیش‌نمایش تحلیل',
          reason: 'برداشت کامل و وضعیت تصمیم پشت دسترسی تحلیل است؛ قیمت و خلاصهٔ شواهد همین‌جا رایگان‌اند.',
          changeConditions: 'با پلن مجاز یا دورهٔ آزمایش فعال، نتیجهٔ کامل همین‌جا باز می‌شود.',
          valuation: prose.decision.valuation,
        },
    valuationMarks: prose.valuationMarks,
    unconfirmed: [
      ...prose.unconfirmed.slice(0, 2),
      'گزارش کامل و تفسیر ارتباط اعداد پشت دسترسی تحلیل است.',
    ],
  };
}

export async function buildMarketViewReport(access: MarketViewAccess, symbol?: Symbol): Promise<MarketViewReport> {
  const [snapshot, trendMeta] = await Promise.all([
    getPublicSnapshot(),
    historyTrendMeta(symbol),
  ]);
  return marketViewReportFromSnapshot(snapshot, access, symbol, trendMeta);
}
