/** Public, version-agnostic share text for market-view reports.
 * Never includes full narrative, private details, user data, or request params.
 */

import type { MarketViewReport } from '@/lib/market-view-report';
import { formatTehranStamp } from '@/lib/market-view-report';

export function publicAnalysisPath(symbol?: string | null) {
  if (!symbol) return '/analysis';
  return `/analysis/${symbol.toLowerCase()}`;
}

export function buildPublicShareSummary(
  report: MarketViewReport,
  siteOrigin: string,
): { title: string; text: string; url: string } {
  const path = publicAnalysisPath(report.symbol);
  const origin = siteOrigin.replace(/\/$/, '');
  const url = `${origin}${path}`;
  const market = report.title;
  const when = formatTehranStamp(report.dataObservedAtIso);
  const valuation = report.decision.valuation;
  const view = valuation?.detail ?? report.summaryLines[0];
  const text = [
    market,
    `زمان داده: ${when}`,
    `دید ارزشی: ${view}`,
    'زرسیگنال',
    url,
  ].join('\n');
  return { title: market, text, url };
}
