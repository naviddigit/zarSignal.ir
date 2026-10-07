import type { CalculatorField } from './calculator-catalog';
import { isStale, type Quote, type Snapshot } from './market';
import { USD_AED_PEG, TROY_OZ_GRAMS } from '@/server/bubble-formulas';
import { mazanehTo18k } from './mazaneh-to-18k';
function midQuote(quote: Quote) {
  const buy = Number(quote.buy);
  const sell = Number(quote.sell);
  if (buy > 0 && sell > 0) return buy <= sell ? (buy + sell) / 2 : null;
  return buy > 0 ? buy : sell > 0 ? sell : null;
}

export function resolveCalculatorLiveValue(field: CalculatorField, snapshot: Snapshot) {
  if (snapshot.mode !== 'live' || !field.symbol) return null;

  // ۱۸ عیار برای حباب/تبدیل همیشه از مثقال زنده ÷ ۴٫۳۳۱۸ — نه قیمت جداگانهٔ دیده‌بان.
  if (field.symbol === 'GOLD_18K') {
    const melted = snapshot.quotes.find(q => q.symbol === 'GOLD_MELTED');
    if (melted && !isStale(melted) && melted.currency === 'TMN' && melted.unit === 'مثقال') {
      const mid = midQuote(melted);
      if (mid != null) {
        try {
          return {
            value: mazanehTo18k(mid).market18k,
            observedAt: melted.observedAt,
            source: 'زرسیگنال · مشتق از مثقال زنده با ÷ ۴٫۳۳۱۸',
          };
        } catch { /* fall through */ }
      }
    }
    return null;
  }

  const quote = snapshot.quotes.find(q => q.symbol === field.symbol);
  if (quote && !isStale(quote) && quote.currency === field.currency && quote.unit === field.quoteUnit) {
    const mid = midQuote(quote);
    if (mid != null) return { value: field.key === 'uae18' ? mid * USD_AED_PEG / TROY_OZ_GRAMS * .75 : mid, observedAt: quote.observedAt, source: 'زرسیگنال · میانگین دو سمت یا قیمت دیده‌بان' };
  }
  return null;
}
