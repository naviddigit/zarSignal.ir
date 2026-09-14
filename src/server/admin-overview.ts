import { db } from '@/lib/db';
import { instruments } from '@/lib/market';

export type AdminOverview = {
  sourceMode: 'demo' | 'live'; database: 'connected' | 'local' | 'unavailable';
  databaseMessage: string; databaseLatencyMs: number | null;
  quoteCount: number; userCount: number; activeSubscriptions: number; activeApiKeys: number;
  lastRun: { status: string; count: number; startedAt: Date; finishedAt: Date | null; error: string | null } | null;
  latestQuotes: { symbol: string; source: string; observedAt: Date; fetchedAt: Date }[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const sourceMode = process.env.MARKET_MODE === 'live' ? 'live' : 'demo';
  if (process.env.NODE_ENV !== 'production') {
    const { readLocalMarket } = await import('@/server/ingestion/local-store');
    const local = await readLocalMarket();
    if (local) return { sourceMode, database: 'local', databaseMessage: 'ذخیره محلی توسعه فعال است؛ PostgreSQL هنگام استقرار جایگزین می‌شود.', databaseLatencyMs: null, quoteCount: local.quotes.length, userCount: 0, activeSubscriptions: 0, activeApiKeys: 0, lastRun: local.lastRun ? { ...local.lastRun, startedAt: new Date(local.lastRun.startedAt), finishedAt: local.lastRun.finishedAt ? new Date(local.lastRun.finishedAt) : null } : null, latestQuotes: instruments.map(asset => { const quote = local.quotes.find(item => item.symbol === asset.symbol); return { symbol: asset.symbol, source: quote?.source ?? '—', observedAt: quote ? new Date(quote.observedAt) : new Date(0), fetchedAt: quote ? new Date(quote.fetchedAt) : new Date(0) }; }) };
  }
  try {
    const now = new Date();
    const [quoteCount, userCount, activeSubscriptions, activeApiKeys, lastRun, latestRows] = await db.$transaction([
      db.marketQuote.count(), db.user.count(),
      db.subscription.count({ where: { status: 'ACTIVE', startsAt: { lte: now }, expiresAt: { gt: now } } }),
      db.apiKey.count({ where: { revokedAt: null, expiresAt: { gt: now } } }),
      db.ingestionRun.findFirst({ orderBy: { startedAt: 'desc' }, select: { status: true, count: true, startedAt: true, finishedAt: true, error: true } }),
      db.marketQuote.findMany({ distinct: ['symbol'], orderBy: { observedAt: 'desc' }, select: { symbol: true, source: true, observedAt: true, fetchedAt: true } }),
    ]);
    return { sourceMode, database: 'connected', databaseMessage: 'اتصال PostgreSQL برقرار است.', databaseLatencyMs: null, quoteCount, userCount, activeSubscriptions, activeApiKeys, lastRun, latestQuotes: latestRows };
  } catch {
    const { checkDatabase } = await import('@/server/database-health');
    const { readLocalMarket } = await import('@/server/ingestion/local-store');
    const health = await checkDatabase();
    const local = process.env.NODE_ENV !== 'production' ? await readLocalMarket() : null;
    if (local) return { sourceMode, database: 'local', databaseMessage: 'ذخیره محلی توسعه فعال است؛ PostgreSQL محیط نهایی هنوز متصل نیست.', databaseLatencyMs: health.latencyMs, quoteCount: local.quotes.length, userCount: 0, activeSubscriptions: 0, activeApiKeys: 0, lastRun: local.lastRun ? { ...local.lastRun, startedAt: new Date(local.lastRun.startedAt), finishedAt: local.lastRun.finishedAt ? new Date(local.lastRun.finishedAt) : null } : null, latestQuotes: instruments.map(asset => { const quote = local.quotes.find(item => item.symbol === asset.symbol); return { symbol: asset.symbol, source: quote?.source ?? '—', observedAt: quote ? new Date(quote.observedAt) : new Date(0), fetchedAt: quote ? new Date(quote.fetchedAt) : new Date(0) }; }) };
    return { sourceMode, database: 'unavailable', databaseMessage: health.message, databaseLatencyMs: health.latencyMs, quoteCount: 0, userCount: 0, activeSubscriptions: 0, activeApiKeys: 0, lastRun: null, latestQuotes: instruments.map(asset => ({ symbol: asset.symbol, source: '—', observedAt: new Date(0), fetchedAt: new Date(0) })) };
  }
}
