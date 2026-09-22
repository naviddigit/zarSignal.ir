import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { instruments, type Quote, type Symbol } from '@/lib/market';
import farazConfig from '../../../config/faraz.json';
import { FARAZ_KEY, FARAZ_MIN_POLL_SECONDS, FARAZ_URL } from './faraz-meta';
import { readLocalMarket, saveLocalFailure, saveLocalQuotes } from './local-store';

export { FARAZ_KEY, FARAZ_MIN_POLL_SECONDS, FARAZ_URL } from './faraz-meta';

const symbolEnum = z.enum([
  'GOLD_MELTED', 'GOLD_18K', 'XAU_USD', 'XAG_USD', 'SILVER_999', 'USD', 'AED', 'SEKE_CASH', 'ROB_SEKE',
]);

export const farazConfigSchema = z.object({
  verified: z.literal(true),
  baseUrl: z.string().url(),
  watchlistLabel: z.string().min(1),
  historyResolution: z.enum(['1', '5', '15', '30', '60', '240', '1D', '1W', '1M']).default('1D'),
  historyDays: z.number().int().min(7).max(400).default(90),
  assets: z.array(z.object({
    farazSymbol: z.string().min(1),
    symbol: symbolEnum,
    currency: z.enum(['TMN', 'USD']),
    unit: z.string().min(1),
  })).min(1),
}).refine(config => new Set(config.assets.map(a => a.symbol)).size === config.assets.length, 'Duplicate ZarSignal symbol');

export type FarazConfig = z.infer<typeof farazConfigSchema>;
export type FarazSourceSettings = {
  id?: string;
  key: string;
  name: string;
  url: string;
  enabled: boolean;
  pollSeconds: number;
  config: FarazConfig;
};

type FarazQuotePayload = Record<string, {
  symbol?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  high?: number;
  low?: number;
  volume?: number;
}>;

type FarazHistoryPayload = Record<string, {
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
  t?: number[];
}>;

export async function defaultFarazConfig() {
  return farazConfigSchema.parse(farazConfig);
}

export function validateFarazUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || !['faraz.io', 'www.faraz.io'].includes(url.hostname) || url.username || url.password) {
    throw new Error('فقط آدرس امن faraz.io مجاز است.');
  }
  url.hash = '';
  return url.origin + '/';
}

export async function getFarazSettings(): Promise<FarazSourceSettings> {
  const fallback: FarazSourceSettings = {
    key: FARAZ_KEY,
    name: 'فراز — دیده‌بان ۳',
    url: FARAZ_URL,
    enabled: true,
    pollSeconds: 60,
    config: await defaultFarazConfig(),
  };
  try {
    const row = await db.marketSource.findUnique({ where: { key: FARAZ_KEY } });
    if (!row) return fallback;
    return {
      ...fallback,
      id: row.id,
      name: row.name,
      url: row.url,
      enabled: row.enabled,
      pollSeconds: row.pollSeconds,
      config: farazConfigSchema.parse(row.config),
    };
  } catch {
    const local = await readLocalMarket();
    if (local.source?.key === FARAZ_KEY) {
      return {
        ...fallback,
        name: local.source.name,
        url: local.source.url,
        enabled: local.source.enabled,
        pollSeconds: local.source.pollSeconds,
        config: farazConfigSchema.parse(local.source.config),
      };
    }
    return fallback;
  }
}

export function priceToFixed(price: number): string {
  if (!Number.isFinite(price) || price <= 0) throw new Error('قیمت نامعتبر از فراز');
  const fixed = price.toFixed(6).replace(/\.?0+$/, '');
  return fixed.includes('.') ? fixed : `${fixed}.0`;
}

async function fetchFarazQuotes(config: FarazConfig, signal?: AbortSignal): Promise<FarazQuotePayload> {
  const names = config.assets.map(asset => asset.farazSymbol);
  const url = new URL('/api/public/market/get-data', validateFarazUrl(config.baseUrl));
  url.searchParams.set('symbolNames', JSON.stringify(names));
  const response = await fetch(url, {
    cache: 'no-store',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ZarSignalMarketBot/1.0 (+https://zarsignal.ir/methodology)',
    },
  });
  if (!response.ok) throw new Error(`فراز با وضعیت HTTP ${response.status} پاسخ داد.`);
  const data = await response.json() as FarazQuotePayload;
  if (!data || typeof data !== 'object') throw new Error('پاسخ قیمت فراز نامعتبر است.');
  return data;
}

async function fetchFarazHistory(config: FarazConfig, farazSymbols: string[], signal?: AbortSignal): Promise<FarazHistoryPayload> {
  const merged: FarazHistoryPayload = {};
  for (let i = 0; i < farazSymbols.length; i += 11) {
    const chunk = farazSymbols.slice(i, i + 11);
    const url = new URL('/api/public/trading-view/chart-history', validateFarazUrl(config.baseUrl));
    url.searchParams.set('symbolNames', JSON.stringify(chunk));
    url.searchParams.set('resolution', config.historyResolution);
    const response = await fetch(url, {
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45_000)]) : AbortSignal.timeout(45_000),
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ZarSignalMarketBot/1.0 (+https://zarsignal.ir/methodology)',
      },
    });
    if (!response.ok) throw new Error(`تاریخچه فراز HTTP ${response.status}`);
    Object.assign(merged, await response.json() as FarazHistoryPayload);
  }
  return merged;
}

export function mapQuotes(payload: FarazQuotePayload, config: FarazConfig, now: Date): Quote[] {
  return config.assets.map(asset => {
    const known = instruments.find(item => item.symbol === asset.symbol);
    if (!known) throw new Error(`نماد داخلی ناشناخته: ${asset.symbol}`);
    if (known.currency !== asset.currency || known.unit !== asset.unit) throw new Error(`واحد نماد ${asset.symbol} با تنظیمات همخوان نیست.`);
    const row = payload[asset.farazSymbol];
    const price = row?.price;
    if (typeof price !== 'number') throw new Error(`قیمت ${asset.farazSymbol} در پاسخ فراز نبود.`);
    const value = priceToFixed(price);
    return {
      symbol: asset.symbol as Symbol,
      buy: value,
      sell: value,
      currency: asset.currency,
      unit: asset.unit,
      source: 'Faraz',
      sourceUrl: FARAZ_URL,
      observedAt: now.toISOString(),
      fetchedAt: now.toISOString(),
    };
  });
}

export async function syncFarazHistory(settings?: FarazSourceSettings, signal?: AbortSignal) {
  const source = settings ?? await getFarazSettings();
  const config = source.config;
  const farazSymbols = config.assets.map(asset => asset.farazSymbol);
  const history = await fetchFarazHistory(config, farazSymbols, signal);
  const cutoff = Date.now() - config.historyDays * 86_400_000;
  let saved = 0;

  for (const asset of config.assets) {
    const series = history[asset.farazSymbol];
    if (!series?.t?.length || !series.c?.length) continue;
    const rows = series.t.flatMap((ts, index) => {
      const openTime = new Date(ts * 1000);
      if (openTime.getTime() < cutoff) return [];
      const open = series.o?.[index];
      const high = series.h?.[index];
      const low = series.l?.[index];
      const close = series.c?.[index];
      const volume = series.v?.[index];
      if (typeof open !== 'number' || typeof high !== 'number' || typeof low !== 'number' || typeof close !== 'number') return [];
      if (![open, high, low, close].every(Number.isFinite)) return [];
      return [{
        symbol: asset.symbol,
        source: FARAZ_KEY,
        resolution: config.historyResolution,
        openTime,
        open,
        high,
        low,
        close,
        volume: typeof volume === 'number' && Number.isFinite(volume) ? volume : null,
      }];
    });
    if (!rows.length) continue;
    // One parameterized query per symbol, not hundreds of network round trips.
    saved += await db.$executeRaw(Prisma.sql`
      INSERT INTO "SymbolHistoryBar"
        ("id", "symbol", "source", "resolution", "openTime", "open", "high", "low", "close", "volume", "fetchedAt")
      VALUES ${Prisma.join(rows.map(row => Prisma.sql`(
        ${randomUUID()}, ${row.symbol}, ${row.source}, ${row.resolution}, ${row.openTime},
        ${row.open}, ${row.high}, ${row.low}, ${row.close}, ${row.volume}, ${new Date()}
      )`))}
      ON CONFLICT ("source", "symbol", "resolution", "openTime") DO UPDATE SET
        "open" = EXCLUDED."open", "high" = EXCLUDED."high", "low" = EXCLUDED."low",
        "close" = EXCLUDED."close", "volume" = EXCLUDED."volume", "fetchedAt" = EXCLUDED."fetchedAt"
    `);
  }
  return { bars: saved };
}

export async function runFarazIngestion(settings?: FarazSourceSettings, signal?: AbortSignal, opts?: { syncHistory?: boolean }) {
  const source = settings ?? await getFarazSettings();
  if (!source.enabled) throw new Error('منبع فراز در پنل مدیریت غیرفعال است.');
  let run: { id: string } | null = null;
  try {
    run = await db.ingestionRun.create({ data: { source: FARAZ_KEY, status: 'RUNNING' } });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw error;
  }

  try {
    const payload = await fetchFarazQuotes(source.config, signal);
    const quotes = mapQuotes(payload, source.config, new Date());
    if (!run) {
      await saveLocalQuotes(quotes);
      return { count: quotes.length, observedAt: quotes[0]?.observedAt ?? null, storage: 'local' as const, historyBars: 0 };
    }

    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7382092)`;
      const inserted = await tx.marketQuote.createMany({
        data: quotes.map(quote => ({
          symbol: quote.symbol,
          buy: quote.buy,
          sell: quote.sell,
          currency: quote.currency,
          unit: quote.unit,
          source: quote.source,
          sourceUrl: quote.sourceUrl ?? FARAZ_URL,
          observedAt: new Date(quote.observedAt),
          fetchedAt: new Date(quote.fetchedAt),
        })),
        skipDuplicates: true,
      });
      await tx.ingestionRun.update({
        where: { id: run!.id },
        data: { status: 'SUCCEEDED', count: inserted.count, finishedAt: new Date() },
      });
      return inserted.count;
    });

    const { recordBubbleSnapshots } = await import('@/server/bubble-history');
    const history = await recordBubbleSnapshots(
      quotes.map(quote => ({
        symbol: quote.symbol,
        buy: Number(quote.buy),
        sell: Number(quote.sell),
        observedAt: new Date(quote.observedAt),
      })),
      'live',
    ).catch(() => ({ saved: 0 }));

    let historyBars = 0;
    if (opts?.syncHistory === true) {
      const shouldSeed = await db.symbolHistoryBar.count({
        where: {
          source: FARAZ_KEY,
          fetchedAt: { gte: new Date(Date.now() - 20 * 60 * 60_000) },
        },
      }).then(count => count === 0).catch(() => true);
      if (shouldSeed) {
        historyBars = (await syncFarazHistory(source, signal).catch(() => ({ bars: 0 }))).bars;
      }
    }

    return {
      count: result,
      observedAt: quotes[0]?.observedAt ?? null,
      storage: 'postgresql' as const,
      snapshots: history.saved,
      historyBars,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'دریافت داده از فراز ناموفق بود.';
    if (run) {
      await db.ingestionRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', error: message, finishedAt: new Date() },
      }).catch(() => undefined);
    } else {
      await saveLocalFailure(message);
    }
    throw error;
  }
}
