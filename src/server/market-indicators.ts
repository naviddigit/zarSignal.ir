/**
 * Shared Premium R01.2 / V5.7 market indicators from a synchronized snapshot.
 * Used by market-view report (and any product surface that must not fork formulas).
 * Does not emit BUY/SELL/HOLD.
 */

import { isStale, type Quote, type Snapshot, type Symbol } from '@/lib/market';
import {
  FORMULA_VERSION,
  GOLD_SILVER_RATIO_VERSION,
  SILVER_FORMULA_VERSION,
  UAE_GOLD_FORMULA_VERSION,
  USD_AED_GAP_VERSION,
  USD_AED_PEG,
  USD_AED_PEG_SOURCE,
  USD_AED_PEG_VERSION,
  goldBubble,
  goldSilverConversionEdge,
  silverBubbleV54,
  uae18kTheoretical,
  usdFromAedGap,
  usdGap,
} from './bubble-formulas';
import { mazanehTo18k, MAZANEH_TO_18K_VERSION } from './mazaneh-to-18k';

export type IndicatorStatus = 'ok' | 'stale' | 'unavailable' | 'blocked';
export type Gold18Basis = 'DIRECT' | 'DERIVED';

export type IndicatorValue = {
  status: IndicatorStatus;
  percent: number | null;
  marketPrice: number | null;
  reference: number | null;
  gap: number | null;
  reason: string;
  formulaVersion: string | null;
  observedAt: string | null;
  extra?: Record<string, number | string | null>;
};

export type MarketIndicators = {
  /** گرم ۱۸ مشتق از مظنه در برابر اونس×دلار */
  goldDerived: IndicatorValue & { basis: 'DERIVED'; conversionVersion: string };
  /** گرم ۱۸ مستقیم تابلو در برابر اونس×دلار */
  goldDirect: IndicatorValue & { basis: 'DIRECT' };
  /** دلار ضمنی طلا — نه حباب مستقل دلار */
  usdImpliedGold: IndicatorValue & { goldBasis: Gold18Basis };
  /** دلار مبتنی بر درهم و فاصله با دلار بازار */
  usdFromAed: IndicatorValue;
  /** مرجع نظری امارات و اختلاف ایران */
  iranUaeGold: IndicatorValue & { iranBasis: Gold18Basis | null };
  silver: IndicatorValue;
  /** لبهٔ تبدیل نظری طلا/نقره */
  goldSilverEdge: IndicatorValue & {
    worldRatio: number | null;
    localRatio: number | null;
  };
  coin: IndicatorValue;
  peg: {
    usdAed: number;
    version: typeof USD_AED_PEG_VERSION;
    source: typeof USD_AED_PEG_SOURCE;
  };
};

const mid = (quote: Quote) => (Number(quote.buy) + Number(quote.sell)) / 2;

function requireQuote(snapshot: Snapshot, symbol: Symbol) {
  const quote = snapshot.quotes.find(item => item.symbol === symbol);
  if (!quote) return { ok: false as const, reason: `missing_${symbol}` };
  const value = mid(quote);
  if (!Number.isFinite(value) || value <= 0) return { ok: false as const, reason: `invalid_${symbol}` };
  if (quote.currency === 'IRR') return { ok: false as const, reason: 'rial_toman_mismatch' };
  return { ok: true as const, quote, value, stale: isStale(quote) };
}

function observedOf(...quotes: Array<{ observedAt: string } | undefined | null>) {
  const times = quotes
    .filter(Boolean)
    .map(q => Date.parse(q!.observedAt))
    .filter(Number.isFinite);
  if (!times.length) return null;
  return new Date(Math.min(...times)).toISOString();
}

function unavailable(reason: string, formulaVersion: string | null = null): IndicatorValue {
  return {
    status: 'unavailable',
    percent: null,
    marketPrice: null,
    reference: null,
    gap: null,
    reason,
    formulaVersion,
    observedAt: null,
  };
}

function firstFailReason(...parts: Array<{ ok: boolean; reason: string } | { ok: true } | false | null | undefined>): string {
  for (const part of parts) {
    if (!part) continue;
    if ('ok' in part && !part.ok) return part.reason;
  }
  return 'unavailable';
}

/** Symbols required in fingerprint / freshness for overall market-view. */
export const MARKET_VIEW_OVERALL_SYMBOLS: readonly Symbol[] = [
  'GOLD_MELTED',
  'GOLD_18K',
  'XAU_USD',
  'USD',
  'AED',
  'SILVER_999',
  'XAG_USD',
  'SEKE_CASH',
];

export function relevantSymbolsForFocus(symbol?: Symbol | null): readonly Symbol[] {
  if (!symbol) return MARKET_VIEW_OVERALL_SYMBOLS;
  if (symbol === 'GOLD_MELTED') return ['GOLD_MELTED', 'GOLD_18K', 'XAU_USD', 'USD', 'AED'];
  if (symbol === 'GOLD_18K') return ['GOLD_18K', 'GOLD_MELTED', 'XAU_USD', 'USD', 'AED'];
  if (symbol === 'USD') return ['USD', 'AED', 'GOLD_MELTED', 'GOLD_18K', 'XAU_USD'];
  if (symbol === 'AED') return ['AED', 'USD', 'XAU_USD', 'GOLD_18K', 'GOLD_MELTED'];
  if (symbol === 'SILVER_999') return ['SILVER_999', 'XAG_USD', 'USD', 'GOLD_18K', 'GOLD_MELTED', 'XAU_USD'];
  if (symbol === 'SEKE_CASH' || symbol === 'ROB_SEKE') return ['SEKE_CASH', 'ROB_SEKE', 'GOLD_MELTED', 'GOLD_18K', 'XAU_USD', 'USD'];
  return [symbol];
}

export function computeMarketIndicators(snapshot: Snapshot): MarketIndicators {
  const peg: MarketIndicators['peg'] = {
    usdAed: USD_AED_PEG,
    version: USD_AED_PEG_VERSION,
    source: USD_AED_PEG_SOURCE,
  };

  const coinBlocked: IndicatorValue = {
    status: 'blocked',
    percent: null,
    marketPrice: null,
    reference: null,
    gap: null,
    reason: 'reference_inactive',
    formulaVersion: null,
    observedAt: null,
  };

  if (snapshot.mode !== 'live' || snapshot.status === 'unavailable' || snapshot.status === 'demo') {
    const reason = 'داده زنده در دسترس نیست';
    return {
      goldDerived: { ...unavailable(reason, FORMULA_VERSION), basis: 'DERIVED', conversionVersion: MAZANEH_TO_18K_VERSION },
      goldDirect: { ...unavailable(reason, FORMULA_VERSION), basis: 'DIRECT' },
      usdImpliedGold: { ...unavailable(reason, FORMULA_VERSION), goldBasis: 'DERIVED' },
      usdFromAed: unavailable(reason, USD_AED_GAP_VERSION),
      iranUaeGold: { ...unavailable(reason, UAE_GOLD_FORMULA_VERSION), iranBasis: null },
      silver: unavailable(reason, SILVER_FORMULA_VERSION),
      goldSilverEdge: {
        ...unavailable(reason, GOLD_SILVER_RATIO_VERSION),
        worldRatio: null,
        localRatio: null,
      },
      coin: coinBlocked,
      peg,
    };
  }

  const melted = requireQuote(snapshot, 'GOLD_MELTED');
  const gold18 = requireQuote(snapshot, 'GOLD_18K');
  const xau = requireQuote(snapshot, 'XAU_USD');
  const usd = requireQuote(snapshot, 'USD');
  const aed = requireQuote(snapshot, 'AED');
  const xag = requireQuote(snapshot, 'XAG_USD');
  const silver = requireQuote(snapshot, 'SILVER_999');
  const coinQ = requireQuote(snapshot, 'SEKE_CASH');

  let derived18k: number | null = null;
  let derivedStale = false;
  let derivedObserved: string | null = null;
  let derivedReason = 'missing_GOLD_MELTED';
  if (melted.ok) {
    try {
      derived18k = mazanehTo18k(melted.value).market18k;
      derivedStale = melted.stale;
      derivedObserved = melted.quote.observedAt;
      derivedReason = 'ok';
    } catch (error) {
      derivedReason = error instanceof Error ? error.message : 'mazaneh_failed';
    }
  } else {
    derivedReason = melted.reason;
  }

  const goldDerived: MarketIndicators['goldDerived'] = (() => {
    if (derived18k == null || !xau.ok || !usd.ok) {
      return {
        ...unavailable(
          derived18k == null ? derivedReason : firstFailReason(xau, usd),
          FORMULA_VERSION,
        ),
        basis: 'DERIVED',
        conversionVersion: MAZANEH_TO_18K_VERSION,
      };
    }
    try {
      const result = goldBubble({ xauUsd: xau.value, usdIrt: usd.value, market18k: derived18k });
      const stale = derivedStale || xau.stale || usd.stale;
      return {
        status: stale ? 'stale' : 'ok',
        percent: result.percent,
        marketPrice: derived18k,
        reference: result.theoretical,
        gap: result.gap,
        reason: stale ? 'input_stale' : 'ok',
        formulaVersion: FORMULA_VERSION,
        observedAt: observedOf(melted.ok ? melted.quote : null, xau.quote, usd.quote),
        basis: 'DERIVED',
        conversionVersion: MAZANEH_TO_18K_VERSION,
      };
    } catch (error) {
      return {
        ...unavailable(error instanceof Error ? error.message : 'calculation_failed', FORMULA_VERSION),
        basis: 'DERIVED',
        conversionVersion: MAZANEH_TO_18K_VERSION,
      };
    }
  })();

  const goldDirect: MarketIndicators['goldDirect'] = (() => {
    if (!gold18.ok || !xau.ok || !usd.ok) {
      return {
        ...unavailable(firstFailReason(gold18, xau, usd), FORMULA_VERSION),
        basis: 'DIRECT',
      };
    }
    try {
      const result = goldBubble({ xauUsd: xau.value, usdIrt: usd.value, market18k: gold18.value });
      const stale = gold18.stale || xau.stale || usd.stale;
      return {
        status: stale ? 'stale' : 'ok',
        percent: result.percent,
        marketPrice: gold18.value,
        reference: result.theoretical,
        gap: result.gap,
        reason: stale ? 'input_stale' : 'ok',
        formulaVersion: FORMULA_VERSION,
        observedAt: observedOf(gold18.quote, xau.quote, usd.quote),
        basis: 'DIRECT',
      };
    } catch (error) {
      return {
        ...unavailable(error instanceof Error ? error.message : 'calculation_failed', FORMULA_VERSION),
        basis: 'DIRECT',
      };
    }
  })();

  /** دلار ضمنی طلا: ترجیح مبنا DIRECT وقتی موجود؛ وگرنه DERIVED. */
  const usdImpliedGold: MarketIndicators['usdImpliedGold'] = (() => {
    const useDirect = goldDirect.status === 'ok' || goldDirect.status === 'stale';
    const market18k = useDirect ? goldDirect.marketPrice : goldDerived.marketPrice;
    const goldBasis: Gold18Basis = useDirect ? 'DIRECT' : 'DERIVED';
    if (market18k == null || !xau.ok || !usd.ok) {
      return {
        ...unavailable(
          market18k == null ? 'missing_market18k' : firstFailReason(xau, usd),
          FORMULA_VERSION,
        ),
        goldBasis,
      };
    }
    try {
      const result = usdGap({ market18k, xauUsd: xau.value, actualUsd: usd.value });
      const stale =
        (useDirect ? goldDirect.status === 'stale' : goldDerived.status === 'stale')
        || xau.stale
        || usd.stale;
      return {
        status: stale ? 'stale' : 'ok',
        percent: result.percent,
        marketPrice: usd.value,
        reference: result.theoretical,
        gap: result.gap,
        reason: stale ? 'input_stale' : 'ok',
        formulaVersion: FORMULA_VERSION,
        observedAt: observedOf(
          useDirect && gold18.ok ? gold18.quote : melted.ok ? melted.quote : null,
          xau.quote,
          usd.quote,
        ),
        goldBasis,
        extra: { impliedUsd: result.theoretical },
      };
    } catch (error) {
      return {
        ...unavailable(error instanceof Error ? error.message : 'calculation_failed', FORMULA_VERSION),
        goldBasis,
      };
    }
  })();

  const usdFromAedInd: IndicatorValue = (() => {
    if (!aed.ok || !usd.ok) {
      return unavailable(firstFailReason(aed, usd), USD_AED_GAP_VERSION);
    }
    try {
      const result = usdFromAedGap({ aedToman: aed.value, usdMarket: usd.value, usdAed: peg.usdAed });
      const stale = aed.stale || usd.stale;
      return {
        status: stale ? 'stale' : 'ok',
        percent: result.percent,
        marketPrice: usd.value,
        reference: result.usdFromAed,
        gap: result.gap,
        reason: stale ? 'input_stale' : 'ok',
        formulaVersion: USD_AED_GAP_VERSION,
        observedAt: observedOf(aed.quote, usd.quote),
        extra: { usdAed: result.usdAed, pegVersion: result.pegVersion },
      };
    } catch (error) {
      return unavailable(error instanceof Error ? error.message : 'calculation_failed', USD_AED_GAP_VERSION);
    }
  })();

  const iranUaeGold: MarketIndicators['iranUaeGold'] = (() => {
    const useDirect = goldDirect.status === 'ok' || goldDirect.status === 'stale';
    const iranGold18 = useDirect ? goldDirect.marketPrice : goldDerived.marketPrice;
    const iranBasis: Gold18Basis | null = iranGold18 == null ? null : useDirect ? 'DIRECT' : 'DERIVED';
    if (iranGold18 == null || !xau.ok || !aed.ok) {
      return {
        ...unavailable(
          iranGold18 == null ? 'missing_iran_gold18' : firstFailReason(xau, aed),
          UAE_GOLD_FORMULA_VERSION,
        ),
        iranBasis,
      };
    }
    try {
      const result = uae18kTheoretical({
        xauUsd: xau.value,
        aedToman: aed.value,
        iranGold18,
        usdAed: peg.usdAed,
      });
      const stale =
        (useDirect ? goldDirect.status === 'stale' : goldDerived.status === 'stale')
        || xau.stale
        || aed.stale;
      return {
        status: stale ? 'stale' : 'ok',
        percent: result.percent,
        marketPrice: iranGold18,
        reference: result.uae18kTomanPerGram,
        gap: result.gap,
        reason: stale ? 'input_stale' : 'ok',
        formulaVersion: UAE_GOLD_FORMULA_VERSION,
        observedAt: observedOf(
          useDirect && gold18.ok ? gold18.quote : melted.ok ? melted.quote : null,
          xau.quote,
          aed.quote,
        ),
        iranBasis,
        extra: {
          uae18kAedPerGram: result.uae18kAedPerGram,
          usdAed: result.usdAed,
          pegVersion: result.pegVersion,
        },
      };
    } catch (error) {
      return {
        ...unavailable(error instanceof Error ? error.message : 'calculation_failed', UAE_GOLD_FORMULA_VERSION),
        iranBasis,
      };
    }
  })();

  const silverInd: IndicatorValue = (() => {
    if (!xag.ok || !usd.ok || !silver.ok) {
      return unavailable(firstFailReason(xag, usd, silver), SILVER_FORMULA_VERSION);
    }
    try {
      const result = silverBubbleV54({
        xagUsd: xag.value,
        usdIrt: usd.value,
        silver999Market: silver.value,
      });
      const stale = xag.stale || usd.stale || silver.stale;
      return {
        status: stale ? 'stale' : 'ok',
        percent: result.silverPremiumPct,
        marketPrice: result.silver999Market,
        reference: result.silverTheo999,
        gap: result.silverGap,
        reason: stale ? 'input_stale' : 'ok',
        formulaVersion: SILVER_FORMULA_VERSION,
        observedAt: observedOf(xag.quote, usd.quote, silver.quote),
        extra: {
          usdImplied: result.usdImpliedSilver,
          silverUsdGapPct: result.silverUsdGapPct,
        },
      };
    } catch (error) {
      return unavailable(error instanceof Error ? error.message : 'calculation_failed', SILVER_FORMULA_VERSION);
    }
  })();

  const goldSilverEdge: MarketIndicators['goldSilverEdge'] = (() => {
    const useDirect = goldDirect.status === 'ok' || goldDirect.status === 'stale';
    const gold18Price = useDirect ? goldDirect.marketPrice : goldDerived.marketPrice;
    if (gold18Price == null || !xau.ok || !xag.ok || !silver.ok) {
      return {
        ...unavailable(
          gold18Price == null ? 'missing_gold18' : firstFailReason(xau, xag, silver),
          GOLD_SILVER_RATIO_VERSION,
        ),
        worldRatio: null,
        localRatio: null,
      };
    }
    try {
      const result = goldSilverConversionEdge({
        xauUsd: xau.value,
        xagUsd: xag.value,
        gold18: gold18Price,
        silver999: silver.value,
      });
      const stale =
        (useDirect ? goldDirect.status === 'stale' : goldDerived.status === 'stale')
        || xau.stale
        || xag.stale
        || silver.stale;
      return {
        status: stale ? 'stale' : 'ok',
        percent: result.edgePercent,
        marketPrice: result.localRatio,
        reference: result.worldRatio,
        gap: result.localRatio - result.worldRatio,
        reason: stale ? 'input_stale' : 'ok',
        formulaVersion: GOLD_SILVER_RATIO_VERSION,
        observedAt: observedOf(
          useDirect && gold18.ok ? gold18.quote : melted.ok ? melted.quote : null,
          xau.quote,
          xag.quote,
          silver.quote,
        ),
        worldRatio: result.worldRatio,
        localRatio: result.localRatio,
      };
    } catch (error) {
      return {
        ...unavailable(error instanceof Error ? error.message : 'calculation_failed', GOLD_SILVER_RATIO_VERSION),
        worldRatio: null,
        localRatio: null,
      };
    }
  })();

  const coin: IndicatorValue = {
    ...coinBlocked,
    marketPrice: coinQ.ok ? coinQ.value : null,
    observedAt: coinQ.ok ? coinQ.quote.observedAt : null,
    reason: 'reference_inactive',
  };

  return {
    goldDerived,
    goldDirect,
    usdImpliedGold,
    usdFromAed: usdFromAedInd,
    iranUaeGold,
    silver: silverInd,
    goldSilverEdge,
    coin,
    peg,
  };
}
