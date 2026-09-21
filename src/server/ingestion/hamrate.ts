import { db } from '@/lib/db';
import { parseSource, sourceConfigSchema, type SourceConfig } from './parser';
import hamrateConfig from '../../../config/hamrate.json';
import { readLocalMarket, saveLocalFailure, saveLocalQuotes } from './local-store';

export const HAMRATE_KEY = 'hamrate-web';
export const HAMRATE_URL = 'https://hamrate.com/';
export const MIN_POLL_SECONDS = 60;
export type MarketSourceSettings = { id?: string; key: string; name: string; url: string; enabled: boolean; pollSeconds: number; config: SourceConfig };

export async function defaultHamrateConfig() {
  return sourceConfigSchema.parse(hamrateConfig);
}

export function validateHamrateUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || !['hamrate.com', 'www.hamrate.com'].includes(url.hostname) || url.username || url.password) throw new Error('فقط آدرس امن hamrate.com مجاز است.');
  url.hash = '';
  return url.toString();
}

export async function getHamrateSettings(): Promise<MarketSourceSettings> {
  const fallback = { key: HAMRATE_KEY, name: 'HamRate (صفحه عمومی)', url: HAMRATE_URL, enabled: false, pollSeconds: 300, config: await defaultHamrateConfig() };
  try {
    const row = await db.marketSource.findUnique({ where: { key: HAMRATE_KEY } });
    if (!row) return fallback;
    return { ...fallback, id: row.id, name: row.name, url: row.url, enabled: row.enabled, pollSeconds: row.pollSeconds, config: sourceConfigSchema.parse(row.config) };
  } catch {
    const local = await readLocalMarket();
    if (local.source?.key === HAMRATE_KEY) {
      return {
        ...fallback,
        name: local.source.name,
        url: local.source.url,
        enabled: local.source.enabled,
        pollSeconds: local.source.pollSeconds,
        config: sourceConfigSchema.parse(local.source.config),
      };
    }
    return fallback;
  }
}

async function fetchHtml(url: string, signal?: AbortSignal) {
  const safeUrl = validateHamrateUrl(url);
  const response = await fetch(safeUrl, { redirect: 'error', cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000), headers: { 'User-Agent': 'ZarSignalMarketBot/1.0 (+https://zarsignal.ir/methodology)', Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'fa-IR,fa;q=0.9' } });
  if (!response.ok) throw new Error(`منبع با وضعیت HTTP ${response.status} پاسخ داد.`);
  if (!response.headers.get('content-type')?.includes('text/html')) throw new Error('نوع پاسخ منبع HTML نیست.');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 2_000_000) throw new Error('حجم پاسخ منبع بیش از حد مجاز است.');
  return new TextDecoder().decode(bytes);
}

export async function runHamrateIngestion(settings?: MarketSourceSettings, signal?: AbortSignal) {
  const source = settings ?? await getHamrateSettings();
  if (!source.enabled) throw new Error('خزنده در پنل مدیریت غیرفعال است.');
  let run: { id: string } | null = null;
  try { run = await db.ingestionRun.create({ data: { source: HAMRATE_KEY, status: 'RUNNING' } }); }
  catch (error) { if (process.env.NODE_ENV === 'production') throw error; }
  try {
    const now = new Date();
    const quotes = parseSource(await fetchHtml(source.url, signal), source.config, now);
    if (!run) { const localQuotes = quotes.map(quote => ({ ...quote, source: 'HamRate', sourceUrl: source.url })); await saveLocalQuotes(localQuotes); return { count: localQuotes.length, observedAt: localQuotes[0]?.observedAt ?? null, storage: 'local' as const }; }
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7382091)`;
      const inserted = await tx.marketQuote.createMany({ data: quotes.map(quote => ({ ...quote, source: 'HamRate', sourceUrl: source.url, observedAt: new Date(quote.observedAt), fetchedAt: new Date(quote.fetchedAt) })), skipDuplicates: true });
      await tx.ingestionRun.update({ where: { id: run!.id }, data: { status: 'SUCCEEDED', count: inserted.count, finishedAt: new Date() } });
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
    return { count: result, observedAt: quotes[0]?.observedAt ?? null, storage: 'postgresql' as const, snapshots: history.saved };

  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'دریافت داده ناموفق بود.';
    if (run) await db.ingestionRun.update({ where: { id: run.id }, data: { status: 'FAILED', error: message, finishedAt: new Date() } }).catch(() => undefined);
    else await saveLocalFailure(message);
    throw error;
  }
}
