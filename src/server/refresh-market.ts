import { revalidatePath, revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { ensureHistorySchema } from '@/server/ensure-schema';
import { defaultFarazConfig, FARAZ_KEY, FARAZ_URL, runFarazIngestion, syncFarazHistory } from '@/server/ingestion/faraz';
import { HAMRATE_KEY } from '@/server/ingestion/hamrate';

const globalLock = globalThis as unknown as { __zarsignalRefresh?: Promise<RefreshResult> | null };

export type RefreshResult = {
  ok: boolean;
  quotes?: number;
  historyBars?: number;
  snapshots?: number;
  error?: string;
};

async function enableFarazSource() {
  const config = await defaultFarazConfig();
  await db.marketSource.upsert({
    where: { key: FARAZ_KEY },
    create: {
      key: FARAZ_KEY,
      name: 'فراز — دیده‌بان ۳',
      url: FARAZ_URL,
      enabled: true,
      pollSeconds: 60,
      config,
    },
    update: {
      enabled: true,
      url: FARAZ_URL,
      pollSeconds: 60,
      config,
      name: 'فراز — دیده‌بان ۳',
    },
  });
  await db.marketSource.updateMany({
    where: { key: HAMRATE_KEY },
    data: { enabled: false },
  });
}

/** Enable Faraz, ensure history tables, write fresh quotes (+ optional OHLC backfill). */
export async function refreshProductionMarket(opts?: { history?: boolean }): Promise<RefreshResult> {
  if (globalLock.__zarsignalRefresh) return globalLock.__zarsignalRefresh;

  globalLock.__zarsignalRefresh = (async () => {
    try {
      await ensureHistorySchema();
      await enableFarazSource();
      const quotes = await runFarazIngestion(undefined, AbortSignal.timeout(25_000), { syncHistory: false });
      let historyBars = 0;
      if (opts?.history !== false) {
        historyBars = (await syncFarazHistory(undefined, AbortSignal.timeout(45_000)).catch(() => ({ bars: 0 }))).bars;
      }
      revalidateTag('market-quotes-v2', 'max');
      revalidatePath('/');
      revalidatePath('/markets/[symbol]', 'page');
      return {
        ok: true,
        quotes: quotes.count,
        historyBars,
        snapshots: quotes.snapshots ?? 0,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'refresh_failed',
      };
    } finally {
      globalLock.__zarsignalRefresh = null;
    }
  })();

  return globalLock.__zarsignalRefresh;
}
