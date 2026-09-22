import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';
import { FARAZ_KEY } from '@/server/ingestion/faraz-meta';
import { formulaCriticalSymbols, instruments, isStale, type Quote, type Snapshot } from '@/lib/market';
import { refreshProductionMarket } from '@/server/refresh-market';

async function readLiveQuotes(): Promise<Snapshot> {
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
  const missingCritical = formulaCriticalSymbols.some(symbol => !bySymbol.get(symbol));
  const missingInstruments = instruments.some(asset => !bySymbol.get(asset.symbol));
  const status = !quotes.length || missingCritical
    ? 'unavailable'
    : criticalOk && !missingInstruments
      ? 'ok'
      : 'stale';
  const pollSeconds = farazSource?.enabled
    ? farazSource.pollSeconds
    : hamrateSource?.enabled
      ? hamrateSource.pollSeconds
      : 60;
  return { mode: 'live', status, quotes, pollSeconds };
}

const liveQuotes = unstable_cache(readLiveQuotes, ['market-quotes-v2'], { revalidate: 60, tags: ['market-quotes-v2'] });

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
    let snapshot = await withDeadline(liveQuotes(), 5_000);
    const needsRefresh = snapshot.status !== 'ok'
      || snapshot.quotes.length < instruments.length
      || snapshot.quotes.some(quote => isStale(quote));
    if (needsRefresh && process.env.MARKET_MODE === 'live') {
      await withDeadline(refreshProductionMarket({ history: true }), 55_000).catch(() => null);
      snapshot = await withDeadline(readLiveQuotes(), 5_000);
    }
    return snapshot;
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
