/** Public-only story card payload — never includes private narrative, user, or request params. */

import type { AccessLevel } from '@/lib/capabilities';
import type { MarketViewReport } from '@/lib/market-view-report';
import { formatFaPercent, formatTehranStamp } from '@/lib/market-view-report';
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
};

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
    planStatus?: 'فعال' | 'آزمایشی' | 'رایگان' | 'در انتظار پرداخت' | null;
    showPlanBadge?: boolean;
    testDataLabel?: string | null;
  },
): StoryPublicPayload {
  const origin = siteOrigin.replace(/\/$/, '');
  const path = publicAnalysisPath(report.symbol);
  const url = `${origin}${path}`;
  // Live path is not a pinned report revision.
  const linkLabel = 'مشاهده خلاصهٔ بازار';

  const takeaway = report.decision.valuation?.detail
    ?? report.summaryLines[0]
    ?? 'خلاصهٔ دید ارزشی در دسترس نیست.';

  const metrics: StoryPublicMetric[] = report.evidence
    .filter(row => row.id !== 'coin' && (row.status === 'ok' || row.status === 'stale') && row.diffPercent != null)
    .slice(0, 3)
    .map(row => {
      const tone = toneFor(row.diffPercent);
      return {
        label: row.id === 'gold' ? 'طلا' : row.id === 'silver' ? 'نقره ۹۹۹' : row.id === 'usd' ? 'فاصلهٔ دلار بازار با دلار ضمنی طلا' : row.marketLabel,
        value: `${formatFaPercent(row.diffPercent!)}٪`,
        unit: 'اختلاف با مرجع',
        tone,
        meaning: meaningFor(tone),
      };
    });

  const commercial = options?.planStatus === 'فعال'
    && options.planLevel
    && options.planLevel !== 'FREE'
    && Boolean(options.planLabel?.trim());
  const planBadge = options?.showPlanBadge && commercial
    ? options.planLabel!.trim()
    : null;

  return {
    brand: 'زرسیگنال',
    title: report.title,
    observedLabel: `زمان داده: ${formatTehranStamp(report.dataObservedAtIso)} به وقت تهران`,
    takeaway,
    metrics,
    disclaimer: 'مقایسهٔ ارزش؛ نه سیگنال خرید و فروش',
    url,
    linkLabel,
    planBadge,
    testDataLabel: options?.testDataLabel ?? null,
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
