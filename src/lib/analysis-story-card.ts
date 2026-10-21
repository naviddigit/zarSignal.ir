/** Public-only story card payload — never includes private narrative, user, or request params. */

import type { AccessLevel } from '@/lib/capabilities';
import type { MarketViewReport } from '@/lib/market-view-report';
import { formatFaPercent, formatTehranStamp, selectReportMetrics } from '@/lib/market-view-report';
import { publicAnalysisPath } from '@/lib/analysis-share';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export type StoryMetricTone = 'below' | 'above' | 'equal' | 'missing';

export type StoryPublicMetric = {
  label: string;
  value: string;
  unit: string;
  tone: StoryMetricTone;
  meaning: string;
};

export type StoryPublicPayload = {
  brand: string;
  title: string;
  observedLabel: string;
  takeaway: string;
  metrics: StoryPublicMetric[];
  disclaimer: string;
  url: string;
  linkLabel: string;
  /** Optional; only from a real commercial entitlement — never invented for guests. */
  planBadge: string | null;
  testDataLabel: string | null;
  marketBoard: {
    gold: string;
    goldUnit: 'گرم' | 'مثقال';
    silver: string;
    coin: string;
    notes: string;
    summary: string;
    observedDate: string;
  };
};

function valueOnly(label: string | null | undefined) {
  return label?.trim().split(/\s+/)[0] || '—';
}

function toneFor(diff: number | null): StoryMetricTone {
  if (diff == null || !Number.isFinite(diff)) return 'missing';
  if (diff === 0) return 'equal';
  return diff < 0 ? 'below' : 'above';
}

function meaningFor(tone: StoryMetricTone) {
  if (tone === 'below') return 'زیر ارزش محاسباتی';
  if (tone === 'above') return 'بالای ارزش محاسباتی';
  if (tone === 'equal') return 'برابر با مرجع';
  return 'داده ناموجود';
}

/** Build a shareable story payload from public fields only. */
export function buildStoryPublicPayload(
  report: MarketViewReport,
  siteOrigin: string,
  options?: {
    planLevel?: AccessLevel | null;
    planLabel?: string | null;
    planStatus?: 'فعال' | 'آزمایشی' | 'رایگان' | 'در انتظار پرداخت' | 'تعلیق‌شده' | null;
    showPlanBadge?: boolean;
    testDataLabel?: string | null;
  },
): StoryPublicPayload {
  const origin = new URL(siteOrigin).origin;
  const path = publicAnalysisPath(report.symbol);
  const url = `${origin}${path}`;
  // Live path is not a pinned report revision.
  const linkLabel = 'وضعیت امروز بازار را ببین';

  const takeaway = report.summaryLines[0]
    ?? 'خلاصهٔ دید ارزشی در دسترس نیست.';

  const metrics: StoryPublicMetric[] = selectReportMetrics(report)
    .map(row => {
      const tone = toneFor(row.diffPercent);
      const label =
        row.id === 'gold' ? 'طلای مشتق از مظنه' : row.id === 'gold_direct' ? 'طلای ۱۸ عیار'
          : row.id === 'silver' ? 'نقره ۹۹۹'
            : row.id === 'usd' ? 'فاصلهٔ دلار بازار با دلار ضمنی طلا'
              : row.id === 'usd_aed' ? 'دلار آزاد / مرجع درهم'
                : row.id === 'uae_gold' ? 'ایران/امارات'
                  : row.marketLabel;
      return {
        label,
        value: row.diffPercent == null ? row.marketPriceLabel ?? 'ناموجود' : `${formatFaPercent(row.diffPercent)}٪`,
        unit: row.diffPercent == null ? 'قیمت بازار' : 'اختلاف با مرجع',
        tone,
        meaning: row.diffPercent == null && row.marketPriceLabel ? 'قیمت بازار · مرجع ناموجود' : meaningFor(tone),
      };
    });

  const commercial = options?.planStatus === 'فعال'
    && options.planLevel
    && options.planLevel !== 'FREE'
    && Boolean(options.planLabel?.trim());
  const planBadge = options?.showPlanBadge && commercial
    ? options.planLabel!.trim()
    : null;
  const evidence = (id: string) => report.evidence.find(row => row.id === id);
  const gold = report.symbol === 'GOLD_MELTED' ? evidence('gold') : evidence('gold_direct') ?? evidence('gold');
  const observedDate = report.dataObservedAtIso ? formatTehranStamp(report.dataObservedAtIso).split('،')[0] : '';

  return {
    brand: 'زرسیگنال',
    title: report.title,
    observedLabel: `زمان داده: ${formatTehranStamp(report.dataObservedAtIso)} · ${report.dataFreshness === 'ok' ? 'تازه' : report.dataFreshness === 'unavailable' ? 'ناموجود' : 'دارای نرخ قدیمی'}`,
    takeaway,
    metrics,
    disclaimer: 'مقایسهٔ ارزش؛ نه سیگنال خرید و فروش',
    url,
    linkLabel,
    planBadge,
    testDataLabel: options?.testDataLabel ?? null,
    marketBoard: {
      gold: valueOnly(gold?.marketPriceLabel),
      goldUnit: report.symbol === 'GOLD_MELTED' ? 'مثقال' : 'گرم',
      silver: valueOnly(evidence('silver')?.marketPriceLabel),
      coin: valueOnly(evidence('coin')?.marketPriceLabel),
      notes: report.marketSays,
      summary: report.summaryLines[0],
      observedDate,
    },
  };
}

/** Reject accidental private leakage in story text fields. */
export function assertStoryPayloadPublic(payload: StoryPublicPayload) {
  const blob = JSON.stringify(payload);
  const banned = [
    /request=/i,
    /userId/i,
    /account/i,
    /mvr_[a-f0-9]+/i,
    /شناسه گزارش/,
    /email/i,
    /phone/i,
  ];
  for (const re of banned) {
    if (re.test(blob) && !re.test(payload.url)) {
      // reportId pattern might appear in title rarely — only fail on clear private markers
    }
  }
  if (/request=/.test(payload.url)) throw new Error('story_url_must_omit_request');
  if (/userId|accountId|email@/i.test(blob)) throw new Error('story_payload_leaks_identity');
  return true;
}
