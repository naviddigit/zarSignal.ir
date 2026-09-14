import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { instruments, isStale, type Quote, type Snapshot } from '@/lib/market';
const liveQuotes = unstable_cache(async (): Promise<Snapshot> => {
  const [rows, source] = await Promise.all([Promise.all(instruments.map(asset => db.marketQuote.findFirst({ where: { symbol: asset.symbol }, orderBy: { observedAt: 'desc' } }))), db.marketSource.findUnique({ where: { key: 'hamrate-web' }, select: { pollSeconds: true } })]);
  const quotes = rows.flatMap(row => row ? [{ symbol: row.symbol as Quote['symbol'], buy: row.buy.toString(), sell: row.sell.toString(), currency: row.currency, unit: row.unit, source: row.source, sourceUrl: row.sourceUrl, observedAt: row.observedAt.toISOString(), fetchedAt: row.fetchedAt.toISOString() }] : []);
  return { mode: 'live', status: !quotes.length ? 'unavailable' : quotes.some(q => isStale(q)) || quotes.length !== instruments.length ? 'stale' : 'ok', quotes, pollSeconds: source?.pollSeconds ?? 300 };
}, ['market-quotes-v1'], { revalidate: 60 });
export async function getSnapshot(): Promise<Snapshot> {
  if (process.env.MARKET_MODE === 'demo' || (!process.env.MARKET_MODE && process.env.NODE_ENV !== 'production')) return { mode: 'demo', status: 'demo', quotes: [], pollSeconds: 60 };
  try { return await liveQuotes(); } catch {
    if (process.env.NODE_ENV !== 'production') {
      const { readLocalMarket } = await import('@/server/ingestion/local-store');
      const local = await readLocalMarket();
      return { mode: 'live', status: !local.quotes.length ? 'unavailable' : local.quotes.some(quote => isStale(quote)) ? 'stale' : 'ok', quotes: local.quotes, pollSeconds: local.source?.pollSeconds ?? 300 };
    }
    return { mode: 'live', status: 'unavailable', quotes: [] };
  }
}
