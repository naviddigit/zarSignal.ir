import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { FARAZ_KEY } from '@/server/ingestion/faraz';
import { formulaCriticalSymbols, instruments, isStale, type Quote, type Snapshot } from '@/lib/market';

const liveQuotes = unstable_cache(async (): Promise<Snapshot> => {
  const [rows, farazSource, hamrateSource] = await Promise.all([
    Promise.all(instruments.map(asset =>
      db.marketQuote.findFirst({ where: { symbol: asset.symbol }, orderBy: { observedAt: 'desc' } }),
    )),
    db.marketSource.findUnique({ where: { key: FARAZ_KEY }, select: { pollSeconds: true, enabled: true } }),
    db.marketSource.findUnique({ where: { key: 'hamrate-web' }, select: { pollSeconds: true, enabled: true } }),
  ]);
  const quotes = rows.flatMap(row => row ? [{
    symbol: row.symbol as Quote['symbol'],
    buy: row.buy.toString(),
    sell: row.sell.toString(),
    currency: row.currency,
    unit: row.unit,
    source: row.source,
    sourceUrl: row.sourceUrl,
    observedAt: row.observedAt.toISOString(),
    fetchedAt: row.fetchedAt.toISOString(),
  }] : []);
  const bySymbol = new Map(quotes.map(quote => [quote.symbol, quote]));
  const criticalOk = formulaCriticalSymbols.every(symbol => {
    const quote = bySymbol.get(symbol);
    return quote && !isStale(quote);
  });
  const status = !quotes.length ? 'unavailable' : criticalOk ? 'ok' : 'stale';
  const pollSeconds = farazSource?.enabled
    ? farazSource.pollSeconds
    : hamrateSource?.enabled
      ? hamrateSource.pollSeconds
      : 60;
  return { mode: 'live', status, quotes, pollSeconds };
}, ['market-quotes-v2'], { revalidate: 60 });

export async function getSnapshot(): Promise<Snapshot> {
  if (process.env.MARKET_MODE === 'demo' || (!process.env.MARKET_MODE && process.env.NODE_ENV !== 'production')) {
    return { mode: 'demo', status: 'demo', quotes: [], pollSeconds: 60 };
  }
  if (process.env.NODE_ENV !== 'production') {
    const { readLocalMarket } = await import('@/server/ingestion/local-store');
    const local = await readLocalMarket();
    if (local.quotes.length) {
      return {
        mode: 'live',
        status: local.quotes.some(quote => isStale(quote)) ? 'stale' : 'ok',
        quotes: local.quotes,
        pollSeconds: local.source?.pollSeconds ?? 60,
      };
    }
  }
  try {
    return await liveQuotes();
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      const { readLocalMarket } = await import('@/server/ingestion/local-store');
      const local = await readLocalMarket();
      return {
        mode: 'live',
        status: !local.quotes.length ? 'unavailable' : local.quotes.some(quote => isStale(quote)) ? 'stale' : 'ok',
        quotes: local.quotes,
        pollSeconds: local.source?.pollSeconds ?? 60,
      };
    }
    return { mode: 'live', status: 'unavailable', quotes: [] };
  }
}

/** Public site + sold API never expose upstream provider name or URL. */
export async function getPublicSnapshot(): Promise<Snapshot> {
  const snapshot = await getSnapshot();
  return {
    ...snapshot,
    quotes: snapshot.quotes.map(quote => ({ ...quote, source: 'زرسیگنال', sourceUrl: null })),
  };
}
