import { isStale, type Quote, type Snapshot } from '@/lib/market';
import type { LiveBubbleCard } from '@/lib/bubbles';
import { goldBubble, usdGap, FORMULA_VERSION } from './bubble-formulas';
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

export function computeLiveBubbles(snapshot: Snapshot): LiveBubbleCard[] {
  const silver: LiveBubbleCard = {
    key: 'SILVER_BUBBLE',
    status: 'blocked',
    percent: null,
    theoretical: null,
    reason: 'قیمت نقره ۹۹۹ داخلی هنوز در فید نیست',
  };

  if (snapshot.mode !== 'live' || snapshot.status === 'unavailable' || snapshot.status === 'demo') {
    return [
      { key: 'GOLD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason: 'داده زنده در دسترس نیست' },
      silver,
      { key: 'USD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason: 'داده زنده در دسترس نیست' },
    ];
  }

  const melted = requireQuote(snapshot, 'GOLD_MELTED');
  const xau = requireQuote(snapshot, 'XAU_USD');
  const usd = requireQuote(snapshot, 'USD');

  if (!melted.ok || !xau.ok || !usd.ok) {
    const reason = !melted.ok ? melted.reason : !xau.ok ? xau.reason : !usd.ok ? usd.reason : 'unavailable';
    return [
      { key: 'GOLD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason },
      silver,
      { key: 'USD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason },
    ];
  }

  try {
    const derived = mazanehTo18k(melted.value);
    const gold = goldBubble({ xauUsd: xau.value, usdIrt: usd.value, market18k: derived.market18k });
    const dollar = usdGap({ xauUsd: xau.value, market18k: derived.market18k, actualUsd: usd.value });
    const stale = melted.stale || xau.stale || usd.stale;
    const status = stale ? 'stale' as const : 'ok' as const;
    const freshness = stale ? 'داده کمی قدیمی است · هنوز محاسبه شده' : 'محاسبه زنده از مظنه';
    return [
      {
        key: 'GOLD_BUBBLE',
        status,
        percent: gold.percent,
        theoretical: gold.theoretical,
        reason: freshness,
        provenance: 'DERIVED',
        formulaVersion: FORMULA_VERSION,
        conversionVersion: MAZANEH_TO_18K_VERSION,
      },
      silver,
      {
        key: 'USD_BUBBLE',
        status,
        percent: dollar.percent,
        theoretical: dollar.theoretical,
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
      silver,
      { key: 'USD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason },
    ];
  }
}
