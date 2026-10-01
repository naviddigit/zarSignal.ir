import { isStale, type Quote, type Snapshot } from '@/lib/market';
import type { LiveBubbleCard } from '@/lib/bubbles';
import { goldBubble, silverBubbleV54, usdGap, FORMULA_VERSION, SILVER_FORMULA_VERSION, SILVER_PURITY_999, TROY_OZ_GRAMS } from './bubble-formulas';
import { mazanehTo18k, MAZANEH_TO_18K_VERSION } from './mazaneh-to-18k';

export type { LiveBubbleCard };
const mid = (quote: Quote) => (Number(quote.buy) + Number(quote.sell)) / 2;

function requireQuote(snapshot: Snapshot, symbol: Quote['symbol']) {
  const quote = snapshot.quotes.find(item => item.symbol === symbol);
  if (!quote) return { ok: false as const, reason: `missing_${symbol}` };
  const value = mid(quote);
  if (!Number.isFinite(value) || value <= 0) return { ok: false as const, reason: `invalid_${symbol}` };
  if (quote.currency === 'IRR') return { ok: false as const, reason: 'rial_toman_mismatch' };
  return { ok: true as const, quote, value, stale: isStale(quote) };
}

function computeSilverCard(snapshot: Snapshot, usd: ReturnType<typeof requireQuote>): LiveBubbleCard {
  const xag = requireQuote(snapshot, 'XAG_USD');
  const silver = requireQuote(snapshot, 'SILVER_999');

  if (!usd.ok) {
    return {
      key: 'SILVER_BUBBLE',
      status: 'unavailable',
      percent: null,
      theoretical: null,
      reason: usd.reason,
      formulaVersion: SILVER_FORMULA_VERSION,
    };
  }

  if (!xag.ok) {
    return {
      key: 'SILVER_BUBBLE',
      status: 'unavailable',
      percent: null,
      theoretical: null,
      reason: xag.reason,
      formulaVersion: SILVER_FORMULA_VERSION,
    };
  }

  // Spec §7: without SILVER_999, theoretical alone is allowed but gap/premium must stay null.
  if (!silver.ok) {
    try {
      const theoOnly = (xag.value * usd.value) / TROY_OZ_GRAMS * SILVER_PURITY_999;
      return {
        key: 'SILVER_BUBBLE',
        status: 'unavailable',
        percent: null,
        theoretical: theoOnly,
        gap: null,
        marketPrice: null,
        usdImplied: null,
        silverUsdGapPct: null,
        reason: 'قیمت بازار نقره ۹۹۹ نیست؛ حباب محاسبه نمی‌شود',
        formulaVersion: SILVER_FORMULA_VERSION,
      };
    } catch {
      return {
        key: 'SILVER_BUBBLE',
        status: 'unavailable',
        percent: null,
        theoretical: null,
        reason: silver.reason,
        formulaVersion: SILVER_FORMULA_VERSION,
      };
    }
  }

  try {
    const result = silverBubbleV54({
      xagUsd: xag.value,
      usdIrt: usd.value,
      silver999Market: silver.value,
    });
    const stale = xag.stale || usd.stale || silver.stale;
    const observedTimes = [xag.quote.observedAt, usd.quote.observedAt, silver.quote.observedAt]
      .map(t => Date.parse(t))
      .filter(Number.isFinite);
    const observedAt = observedTimes.length
      ? new Date(Math.max(...observedTimes)).toISOString()
      : silver.quote.observedAt;
    return {
      key: 'SILVER_BUBBLE',
      status: stale ? 'stale' : 'ok',
      percent: result.silverPremiumPct,
      theoretical: result.silverTheo999,
      gap: result.silverGap,
      marketPrice: result.silver999Market,
      usdImplied: result.usdImpliedSilver,
      silverUsdGapPct: result.silverUsdGapPct,
      observedAt,
      reason: stale
        ? 'داده قدیمی · اختلاف قیمت · سیگنال خرید/فروش نیست'
        : 'اختلاف قیمت · سیگنال خرید/فروش نیست',
      provenance: 'LIVE',
      formulaVersion: SILVER_FORMULA_VERSION,
    };
  } catch (error) {
    return {
      key: 'SILVER_BUBBLE',
      status: 'unavailable',
      percent: null,
      theoretical: null,
      reason: error instanceof Error ? error.message : 'calculation_failed',
      formulaVersion: SILVER_FORMULA_VERSION,
    };
  }
}

export function computeLiveBubbles(snapshot: Snapshot): LiveBubbleCard[] {
  if (snapshot.mode !== 'live' || snapshot.status === 'unavailable' || snapshot.status === 'demo') {
    return [
      { key: 'GOLD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason: 'داده زنده در دسترس نیست' },
      { key: 'SILVER_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason: 'داده زنده در دسترس نیست', formulaVersion: SILVER_FORMULA_VERSION },
      { key: 'USD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason: 'داده زنده در دسترس نیست' },
    ];
  }

  const melted = requireQuote(snapshot, 'GOLD_MELTED');
  const xau = requireQuote(snapshot, 'XAU_USD');
  const usd = requireQuote(snapshot, 'USD');
  const silverCard = computeSilverCard(snapshot, usd);

  if (!melted.ok || !xau.ok || !usd.ok) {
    const reason = !melted.ok ? melted.reason : !xau.ok ? xau.reason : !usd.ok ? usd.reason : 'unavailable';
    return [
      { key: 'GOLD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason },
      silverCard,
      { key: 'USD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason },
    ];
  }

  try {
    const derived = mazanehTo18k(melted.value);
    const gold = goldBubble({ xauUsd: xau.value, usdIrt: usd.value, market18k: derived.market18k });
    const dollar = usdGap({ xauUsd: xau.value, market18k: derived.market18k, actualUsd: usd.value });
    const stale = melted.stale || xau.stale || usd.stale;
    const status = stale ? 'stale' as const : 'ok' as const;
    const freshness = stale ? 'محاسبه از داده قدیمی · قیمت لحظه‌ای نیست' : 'محاسبه از آخرین مظنه دریافت‌شده';
    return [
      {
        key: 'GOLD_BUBBLE',
        status,
        percent: gold.percent,
        theoretical: gold.theoretical,
        gap: gold.gap,
        marketPrice: derived.market18k,
        reason: freshness,
        provenance: 'DERIVED',
        formulaVersion: FORMULA_VERSION,
        conversionVersion: MAZANEH_TO_18K_VERSION,
      },
      silverCard,
      {
        key: 'USD_BUBBLE',
        status,
        percent: dollar.percent,
        theoretical: dollar.theoretical,
        gap: dollar.gap,
        marketPrice: usd.value,
        reason: freshness,
        provenance: 'DERIVED',
        formulaVersion: FORMULA_VERSION,
        conversionVersion: MAZANEH_TO_18K_VERSION,
      },
    ];
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'calculation_failed';
    return [
      { key: 'GOLD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason },
      silverCard,
      { key: 'USD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason },
    ];
  }
}
