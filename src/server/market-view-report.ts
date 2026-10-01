import { createHash } from 'crypto';
import { getPublicSnapshot } from '@/server/quotes';
import { computeLiveBubbles } from '@/server/live-bubbles';
import { FORMULA_VERSION, SILVER_FORMULA_VERSION } from '@/server/bubble-formulas';
import { MAZANEH_TO_18K_VERSION } from '@/server/mazaneh-to-18k';
import { instruments, formatPrice, isStale, type Snapshot, type Symbol } from '@/lib/market';
import {
  composeMarketViewProse,
  formatFaMoney,
  type MarketViewAccess,
  type MarketViewEvidenceRow,
  type MarketViewReport,
} from '@/lib/market-view-report';

function fingerprint(snapshot: Snapshot, bubbles: ReturnType<typeof computeLiveBubbles>) {
  const payload = JSON.stringify({
    mode: snapshot.mode,
    status: snapshot.status,
    quotes: snapshot.quotes.map(q => [q.symbol, q.buy, q.sell, q.observedAt]),
    bubbles: bubbles.map(b => [b.key, b.status, b.percent, b.theoretical, b.marketPrice, b.formulaVersion]),
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

function moneyLabel(value: number | null | undefined, unit: string, digits = 0): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${formatFaMoney(value, digits)} ${unit}`;
}

function buildEvidence(bubbles: ReturnType<typeof computeLiveBubbles>, snapshot: Snapshot): MarketViewEvidenceRow[] {
  const gold = bubbles.find(b => b.key === 'GOLD_BUBBLE');
  const silver = bubbles.find(b => b.key === 'SILVER_BUBBLE');
  const usd = bubbles.find(b => b.key === 'USD_BUBBLE');
  const coin = snapshot.mode === 'live' ? snapshot.quotes.find(q => q.symbol === 'SEKE_CASH' && q.currency === 'TMN' && q.unit === 'عدد') : null;
  const coinPrice = coin ? Number(coin.sell) : null;

  const goldOk = gold && (gold.status === 'ok' || gold.status === 'stale') && gold.percent != null;
  const silverOk = silver && (silver.status === 'ok' || silver.status === 'stale') && silver.percent != null;
  const usdOk = usd && (usd.status === 'ok' || usd.status === 'stale') && usd.percent != null;

  return [
    {
      id: 'gold',
      marketLabel: 'طلا · گرم ۱۸ عیار (مشتق از مظنه)',
      marketPriceLabel: goldOk ? moneyLabel(gold!.marketPrice, 'تومان / گرم') : null,
      referenceLabel: goldOk ? moneyLabel(gold!.theoretical, 'تومان / گرم') : null,
      referenceBasis: 'ارزش محاسباتی از اونس جهانی × دلار بازار × ۰٫۷۵',
      diffPercent: goldOk ? gold!.percent : null,
      unitNote: 'مظنه آب‌شده به گرم ۱۸ تبدیل شده؛ با مثقال خام مقایسه نمی‌شود',
      status: gold?.status === 'blocked' ? 'blocked' : gold?.status === 'stale' ? 'stale' : goldOk ? 'ok' : 'unavailable',
      statusReason: goldOk ? null : (gold?.reason ?? 'در دسترس نیست'),
      formulaVersion: gold?.formulaVersion ?? FORMULA_VERSION,
      impliedUsdLabel: goldOk ? moneyLabel(usd?.theoretical, 'تومان') : null,
    },
    {
      id: 'usd',
      marketLabel: 'دلار آزاد بازار',
      marketPriceLabel: usdOk ? moneyLabel(usd!.marketPrice, 'تومان / دلار') : null,
      referenceLabel: usdOk ? moneyLabel(usd!.theoretical, 'تومان / دلار') : null,
      referenceBasis: 'دلار ضمنی طلا (از گرم ۱۸ و اونس) — نه درهم و نه نرخ صرافی اجباری',
      diffPercent: usdOk ? usd!.percent : null,
      unitNote: 'فاصلهٔ دلار بازار با دلار ضمنی طلا؛ ارزش بنیادی دلار نیست',
      status: usd?.status === 'blocked' ? 'blocked' : usd?.status === 'stale' ? 'stale' : usdOk ? 'ok' : 'unavailable',
      statusReason: usdOk ? null : (usd?.reason ?? 'در دسترس نیست'),
      formulaVersion: usd?.formulaVersion ?? FORMULA_VERSION,
    },
    {
      id: 'silver',
      marketLabel: 'نقره ۹۹۹',
      marketPriceLabel: silverOk ? moneyLabel(silver!.marketPrice, 'تومان / گرم') : null,
      referenceLabel: silverOk ? moneyLabel(silver!.theoretical, 'تومان / گرم') : null,
      referenceBasis: 'V5.4-SILVER.1 · اونس نقره × دلار × ۰٫۹۹۹ / ۳۱٫۱۰۳۴۷۶۸',
      diffPercent: silverOk ? silver!.percent : null,
      unitNote: 'قیمت بازار نقره ۹۹۹ مستقیم گرم است؛ مقسوم‌علیه مظنه ندارد',
      status: silver?.status === 'blocked' ? 'blocked' : silver?.status === 'stale' ? 'stale' : silverOk ? 'ok' : 'unavailable',
      statusReason: silverOk ? null : (silver?.reason ?? 'در دسترس نیست'),
      formulaVersion: silver?.formulaVersion ?? SILVER_FORMULA_VERSION,
      impliedUsdLabel: silverOk ? moneyLabel(silver?.usdImplied, 'تومان') : null,
    },
    {
      id: 'coin',
      marketLabel: 'سکه',
      marketPriceLabel: coinPrice != null && coinPrice > 0 ? moneyLabel(coinPrice, 'تومان / عدد') : null,
      referenceLabel: null,
      referenceBasis: 'مبنای ارزش و حباب سکه در مشخصات محصول تأیید نشده است',
      diffPercent: null,
      unitNote: 'SPEC_BLOCKER · بدون فرمول قطعی منتشر نمی‌شود',
      status: 'blocked',
      statusReason: 'حباب سکه در موتور تأییدشده فعال نیست',
      formulaVersion: null,
    },
  ];
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
  // Oldest input, so a fresh quote cannot make older calculation inputs look fresh.
  return new Date(Math.min(...times)).toISOString();
}

export function marketViewReportFromSnapshot(snapshot: Snapshot, access: MarketViewAccess, symbol?: Symbol): MarketViewReport {
  const bubbles = computeLiveBubbles(snapshot);
  const focusId = symbol === 'GOLD_MELTED' || symbol === 'GOLD_18K' ? 'gold'
    : symbol === 'USD' ? 'usd' : symbol === 'SILVER_999' ? 'silver'
    : symbol === 'SEKE_CASH' ? 'coin' : null;
  const asset = instruments.find(item => item.symbol === symbol);
  const quote = snapshot.mode === 'live' ? snapshot.quotes.find(item => item.symbol === symbol) : null;
  const quoteValid = quote && Number.isFinite(Number(quote.sell)) && Number(quote.sell) > 0 && quote.currency === asset?.currency && quote.unit === asset?.unit;
  const evidence = buildEvidence(bubbles, snapshot).filter(row => !symbol || row.id === focusId);
  const relevantSymbols: readonly Symbol[] = !symbol
    ? ['GOLD_MELTED', 'XAU_USD', 'USD', 'SILVER_999', 'XAG_USD']
    : focusId === 'gold' || focusId === 'usd' ? ['GOLD_MELTED', 'XAU_USD', 'USD']
    : focusId === 'silver' ? ['SILVER_999', 'XAG_USD', 'USD'] : [symbol];
  const relevantSnapshot = { ...snapshot, quotes: snapshot.quotes.filter(q => relevantSymbols.includes(q.symbol)) };
  const dataFreshness = evidence.length && focusId !== 'coin' ? freshnessOf(evidence, snapshot)
    : quoteValid ? isStale(quote) ? 'stale' : 'ok' : 'unavailable';
  const prose = composeMarketViewProse(evidence, dataFreshness);
  if (asset && !evidence.some(row => row.diffPercent != null)) {
    const hasFormula = focusId === 'gold' || focusId === 'silver' || focusId === 'usd';
    prose.summaryLines = [quoteValid ? `قیمت ${asset.name}: ${formatPrice(quote.sell, quote.currency)} / ${asset.unit}.` : `قیمت معتبر ${asset.name} فعلاً در دسترس نیست.`,
      hasFormula ? 'برای محاسبهٔ اختلاف با مرجع، بعضی ورودی‌های لازم در دسترس نیستند.' : 'برای این نماد هنوز مرجع ارزش‌گذاری مستقل و قواعد تصمیم تأییدشده در محصول موجود نیست.'];
    prose.marketSays = asset.category === 'gold' || asset.category === 'silver'
      ? 'قیمت این نماد ورودی بررسی بازار است؛ افزایش یا کاهش قیمت به‌تنهایی کافی نیست تا آن را ارزان یا گران بدانیم.'
      : 'این نرخ را باید با مرجع مستقل و هزینهٔ واقعی تبدیل مقایسه کرد؛ فاصلهٔ دلار ضمنی طلا جای این مرجع را نمی‌گیرد.';
    if (!hasFormula) prose.unconfirmed = ['مرجع ارزش‌گذاری و قواعد تصمیم این نماد تأیید نشده‌اند.', ...(dataFreshness === 'stale' ? ['قیمت نمایش‌داده‌شده قدیمی است.'] : [])];
  }
  const inputTimes = relevantSnapshot.quotes.map(q => q.observedAt);
  if (new Set(inputTimes).size > 1) prose.unconfirmed.unshift('زمان مشاهدهٔ ورودی‌ها یکسان نیست؛ مقایسهٔ حاضر را Snapshot دقیقاً هم‌زمان در نظر نگیرید.');
  const dataObservedAtIso = observedAt(relevantSnapshot);
  const generatedAtIso = new Date().toISOString();
  const snapFp = fingerprint(relevantSnapshot, bubbles.filter(b => !symbol || b.key === (focusId === 'gold' ? 'GOLD_BUBBLE' : focusId === 'usd' ? 'USD_BUBBLE' : focusId === 'silver' ? 'SILVER_BUBBLE' : '')));

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
    title: asset ? `تحلیل ${asset.name}` : 'دید زرسیگنال به بازار',
    summaryLines: prose.summaryLines,
    marketSays: prose.marketSays,
    evidence,
    reading: prose.reading,
    unconfirmed: prose.unconfirmed,
    conclusion: prose.conclusion,
    decision: prose.decision,
    valuationMarks: prose.valuationMarks,
    changeFromPrior: null,
    details: {
      formulaNotes: [
        `حباب طلا و فاصله دلار: نسخه ${FORMULA_VERSION} · تبدیل مظنه→گرم۱۸: ${MAZANEH_TO_18K_VERSION}`,
        `حباب نقره: ${SILVER_FORMULA_VERSION}`,
        'دلار ضمنی طلا با درهم یا دلار حواله‌ای یکی نیست.',
        'آرشیو و مقایسهٔ گزارش‌های قبلی هنوز در محصول ذخیره نمی‌شود.',
      ],
      disclaimer: 'این گزارش توصیف اختلاف قیمت با مرجع محاسباتی است؛ سیگنال خرید، فروش یا تضمین نتیجه نیست.',
    },
  };

  if (access === 'full') return full;

  // Preview: keep evidence labels + freshness, shorten narrative, hide private reading/conclusion.
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
          kind: 'needs_confirmation',
          tradeAction: null,
          title: 'پیش‌نمایش تحلیل',
          reason: 'برداشت کامل و کارت نتیجه پشت دسترسی تحلیل است؛ قیمت و خلاصهٔ شواهد همین‌جا رایگان‌اند.',
          changeConditions: 'با پلن مجاز یا دورهٔ آزمایش فعال، نتیجهٔ کامل همین‌جا باز می‌شود.',
        },
    // Public preview may show valuation chips from evidence already visible — not private prose.
    valuationMarks: prose.valuationMarks,
    unconfirmed: [
      ...prose.unconfirmed.slice(0, 2),
      'گزارش کامل و تفسیر ارتباط اعداد پشت دسترسی تحلیل است.',
    ],
  };
}

export async function buildMarketViewReport(access: MarketViewAccess, symbol?: Symbol): Promise<MarketViewReport> {
  return marketViewReportFromSnapshot(await getPublicSnapshot(), access, symbol);
}
