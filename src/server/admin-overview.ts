import { db } from '@/lib/db';
import { instruments } from '@/lib/market';

export type AdminOverview = {
  sourceMode: 'demo' | 'live'; database: 'connected' | 'unavailable';
  quoteCount: number; userCount: number; activeSubscriptions: number; activeApiKeys: number;
  lastRun: { status: string; count: number; startedAt: Date; finishedAt: Date | null; error: string | null } | null;
  latestQuotes: { symbol: string; source: string; observedAt: Date; fetchedAt: Date }[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const sourceMode = process.env.MARKET_MODE === 'live' ? 'live' : 'demo';
  try {
    const now = new Date();
    const [quoteCount, userCount, activeSubscriptions, activeApiKeys, lastRun, latestRows] = await db.$transaction([
      db.marketQuote.count(), db.user.count(),
      db.subscription.count({ where: { status: 'ACTIVE', startsAt: { lte: now }, expiresAt: { gt: now } } }),
      db.apiKey.count({ where: { revokedAt: null, expiresAt: { gt: now } } }),
      db.ingestionRun.findFirst({ orderBy: { startedAt: 'desc' }, select: { status: true, count: true, startedAt: true, finishedAt: true, error: true } }),
      db.marketQuote.findMany({ distinct: ['symbol'], orderBy: { observedAt: 'desc' }, select: { symbol: true, source: true, observedAt: true, fetchedAt: true } }),
    ]);
    return { sourceMode, database: 'connected', quoteCount, userCount, activeSubscriptions, activeApiKeys, lastRun, latestQuotes: latestRows };
  } catch {
    return { sourceMode, database: 'unavailable', quoteCount: 0, userCount: 0, activeSubscriptions: 0, activeApiKeys: 0, lastRun: null, latestQuotes: instruments.map(asset => ({ symbol: asset.symbol, source: '—', observedAt: new Date(0), fetchedAt: new Date(0) })) };
  }
}
