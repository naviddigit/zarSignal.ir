import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { instruments, isStale, type Quote, type Snapshot } from '@/lib/market';
const liveQuotes = unstable_cache(async (): Promise<Snapshot> => {
  const rows = await Promise.all(instruments.map(asset => db.marketQuote.findFirst({ where: { symbol: asset.symbol }, orderBy: { observedAt: 'desc' } })));
  const quotes = rows.flatMap(row => row ? [{ symbol: row.symbol as Quote['symbol'], buy: row.buy.toString(), sell: row.sell.toString(), currency: row.currency, unit: row.unit, source: row.source, sourceUrl: row.sourceUrl, observedAt: row.observedAt.toISOString(), fetchedAt: row.fetchedAt.toISOString() }] : []);
  return { mode: 'live', status: !quotes.length ? 'unavailable' : quotes.some(q => isStale(q)) || quotes.length !== instruments.length ? 'stale' : 'ok', quotes };
}, ['market-quotes-v1'], { revalidate: 60 });
export async function getSnapshot(): Promise<Snapshot> {
  if (process.env.MARKET_MODE === 'demo' || (!process.env.MARKET_MODE && process.env.NODE_ENV !== 'production')) return { mode: 'demo', status: 'demo', quotes: [] };
  try { return await liveQuotes(); } catch { return { mode: 'live', status: 'unavailable', quotes: [] }; }
}
