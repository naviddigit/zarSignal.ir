import { db } from '@/lib/db';
import { parseSource, sourceConfigSchema, type SourceConfig } from './parser';
import hamrateConfig from '../../../config/hamrate.json';

export const HAMRATE_KEY = 'hamrate-web';
export const HAMRATE_URL = 'https://hamrate.com/';
export const MIN_POLL_SECONDS = 180;
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
  } catch { return fallback; }
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
  const run = await db.ingestionRun.create({ data: { source: HAMRATE_KEY, status: 'RUNNING' } });
  try {
    const now = new Date();
    const quotes = parseSource(await fetchHtml(source.url, signal), source.config, now);
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7382091)`;
      const inserted = await tx.marketQuote.createMany({ data: quotes.map(quote => ({ ...quote, source: 'HamRate', sourceUrl: source.url, observedAt: new Date(quote.observedAt), fetchedAt: new Date(quote.fetchedAt) })), skipDuplicates: true });
      await tx.ingestionRun.update({ where: { id: run.id }, data: { status: 'SUCCEEDED', count: inserted.count, finishedAt: new Date() } });
      return inserted.count;
    });
    return { count: result, observedAt: quotes[0]?.observedAt ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'دریافت داده ناموفق بود.';
    await db.ingestionRun.update({ where: { id: run.id }, data: { status: 'FAILED', error: message, finishedAt: new Date() } }).catch(() => undefined);
    throw error;
  }
}
