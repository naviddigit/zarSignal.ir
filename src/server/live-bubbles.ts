import 'server-only';
import { isStale, type Quote, type Snapshot } from '@/lib/market';
import { goldBubble, usdGap, FORMULA_VERSION } from './bubble-formulas';
import { mazanehTo18k, MAZANEH_TO_18K_VERSION } from './mazaneh-to-18k';

export type LiveBubbleCard = {
  key: 'GOLD_BUBBLE' | 'SILVER_BUBBLE' | 'USD_BUBBLE';
  status: 'ok' | 'unavailable' | 'blocked';
  percent: number | null;
  theoretical: number | null;
  reason: string;
  provenance?: 'DERIVED' | 'LIVE';
  formulaVersion?: string;
  conversionVersion?: string;
};

const mid = (quote: Quote) => (Number(quote.buy) + Number(quote.sell)) / 2;

function requireFresh(snapshot: Snapshot, symbol: Quote['symbol']) {
  const quote = snapshot.quotes.find(item => item.symbol === symbol);
  if (!quote) return { ok: false as const, reason: `missing_${symbol}` };
  if (isStale(quote)) return { ok: false as const, reason: `stale_${symbol}` };
  const value = mid(quote);
  if (!Number.isFinite(value) || value <= 0) return { ok: false as const, reason: `invalid_${symbol}` };
  if (quote.currency === 'IRR') return { ok: false as const, reason: 'rial_toman_mismatch' };
  return { ok: true as const, quote, value };
}

export function computeLiveBubbles(snapshot: Snapshot): LiveBubbleCard[] {
  if (snapshot.mode !== 'live' || snapshot.status === 'unavailable' || snapshot.status === 'demo') {
    return [
      { key: 'GOLD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason: 'live_data_unavailable' },
      { key: 'SILVER_BUBBLE', status: 'blocked', percent: null, theoretical: null, reason: 'SPEC_BLOCKER: SILVER_999_MARKET feed missing' },
      { key: 'USD_BUBBLE', status: 'unavailable', percent: null, theoretical: null, reason: 'live_data_unavailable' },
    ];
  }

  const melted = requireFresh(snapshot, 'GOLD_MELTED');
  const xau = requireFresh(snapshot, 'XAU_USD');
  const usd = requireFresh(snapshot, 'USD');

  const silver: LiveBubbleCard = {
    key: 'SILVER_BUBBLE',
    status: 'blocked',
    percent: null,
    theoretical: null,
    reason: 'SPEC_BLOCKER: SILVER_999_MARKET feed یا تبدیل تأییدشده نداریم',
  };

  if (!melted.ok || !xau.ok || !usd.ok) {
    const reason = !melted.ok ? melted.reason : !xau.ok ? xau.reason : (usd as { reason: string }).reason;
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
    return [
      {
        key: 'GOLD_BUBBLE',
        status: 'ok',
        percent: gold.percent,
        theoretical: gold.theoretical,
        reason: 'computed',
        provenance: 'DERIVED',
        formulaVersion: FORMULA_VERSION,
        conversionVersion: MAZANEH_TO_18K_VERSION,
      },
      silver,
      {
        key: 'USD_BUBBLE',
        status: 'ok',
        percent: dollar.percent,
        theoretical: dollar.theoretical,
        reason: 'computed_as_USD_GAP',
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
