import type { LiveBubbleCard } from '@/lib/bubbles';
import { isStale, type Quote, type Snapshot } from '@/lib/market';
import { computeMarketIndicators } from '@/server/market-indicators';

/** Homepage dollar comparison: market USD versus the AED-implied USD reference. */
export function computeHeroDollar(snapshot: Snapshot): LiveBubbleCard {
  const unavailable = (reason: string): LiveBubbleCard => ({
    key: 'USD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason,
  });
  if (snapshot.mode !== 'live') return unavailable('دادهٔ زنده در دسترس نیست');

  const usd = snapshot.quotes.find(quote => quote.symbol === 'USD');
  const aed = snapshot.quotes.find(quote => quote.symbol === 'AED');
  if (!usd || !aed) return unavailable('نرخ دلار یا درهم در دسترس نیست');
  const valid = (quote: Quote, unit: string) => {
    const buy = Number(quote.buy);
    const sell = Number(quote.sell);
    return quote.currency === 'TMN' && quote.unit === unit
      && Number.isFinite(buy) && Number.isFinite(sell)
      && buy > 0 && sell > 0 && buy <= sell;
  };
  if (!valid(usd, 'دلار') || !valid(aed, 'درهم')) return unavailable('واحد یا قیمت دلار و درهم معتبر نیست');
  const usdTime = Date.parse(usd.observedAt);
  const aedTime = Date.parse(aed.observedAt);
  if (!Number.isFinite(usdTime) || !Number.isFinite(aedTime) || Math.abs(usdTime - aedTime) > 15 * 60_000) {
    return unavailable('زمان نرخ دلار و درهم هم‌خوان نیست');
  }

  const indicator = computeMarketIndicators(snapshot).usdFromAed;
  if (indicator.percent == null || indicator.reference == null) return unavailable('محاسبهٔ مرجع درهم ممکن نشد');
  const stale = isStale(usd) || isStale(aed);
  return {
    key: 'USD_BUBBLE',
    status: stale ? 'stale' : 'ok',
    percent: indicator.percent,
    theoretical: indicator.reference,
    gap: indicator.gap,
    marketPrice: indicator.marketPrice,
    reason: stale ? 'دادهٔ دلار یا درهم قدیمی است' : 'فاصلهٔ دلار آزاد با مرجع درهم؛ سیگنال معامله نیست',
    provenance: 'DERIVED',
    formulaVersion: indicator.formulaVersion ?? undefined,
    observedAt: indicator.observedAt,
  };
}
