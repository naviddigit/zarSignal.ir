import { load } from 'cheerio';
import { z } from 'zod';
import { instruments, type Quote } from '../../lib/market';
export const sourceConfigSchema = z.object({
  verified: z.literal(true),
  timestampSelector: z.string().min(1),
  timestampAttribute: z.enum(['datetime', 'text']).default('datetime'),
  timeZoneOffset: z.string().regex(/^[+-]\d\d:\d\d$/).optional(),
  assets: z.array(z.object({ symbol: z.enum(['GOLD_MELTED','XAG_USD','USD','EUR','AED','XAU_USD','DUBAI_GOLD_OZ']), buySelector: z.string().min(1), sellSelector: z.string().min(1), textSuffix: z.enum(['USD']).optional(), currency: z.enum(['TMN','USD']), unit: z.string().min(1) })).min(1),
}).refine(config => new Set(config.assets.map(a => a.symbol)).size === config.assets.length, 'Duplicate symbol');
export type SourceConfig = z.infer<typeof sourceConfigSchema>;
export function parseDecimal(text: string): string {
  const normalized = text.trim().replace(/[\u06f0-\u06f9]/g, ch => String(ch.charCodeAt(0) - 0x06f0)).replace(/[\u0660-\u0669]/g, ch => String(ch.charCodeAt(0) - 0x0660)).replace(/\u066c/g, ',').replace(/\u066b/g, '.');
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,6})?$/.test(normalized)) throw new Error('Invalid price format');
  const value = normalized.replaceAll(',', '');
  if (!Number.isFinite(Number(value)) || Number(value) <= 0 || value.split('.')[0].length > 18) throw new Error('Price out of bounds');
  return value;
}
function sourceObservedAt(raw: string, config: SourceConfig, now: Date) {
  if (config.timestampAttribute === 'datetime') return new Date(raw);
  const clock = raw.trim().replace(/[\u06f0-\u06f9]/g, char => String(char.charCodeAt(0) - 0x06f0)).replace(/[\u0660-\u0669]/g, char => String(char.charCodeAt(0) - 0x0660));
  if (!config.timeZoneOffset || !/^\d{1,2}:\d{2}:\d{2}$/.test(clock)) throw new Error('Source clock or timezone is invalid');
  const offsetMinutes = (config.timeZoneOffset.startsWith('-') ? -1 : 1) * (Number(config.timeZoneOffset.slice(1, 3)) * 60 + Number(config.timeZoneOffset.slice(4, 6)));
  const localNow = new Date(now.getTime() + offsetMinutes * 60_000);
  const [hours, minutes, seconds] = clock.split(':').map(Number);
  let candidate = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), hours, minutes, seconds) - offsetMinutes * 60_000;
  if (candidate - now.getTime() > 12 * 60 * 60_000) candidate -= 24 * 60 * 60_000;
  if (now.getTime() - candidate > 12 * 60 * 60_000) candidate += 24 * 60 * 60_000;
  return new Date(candidate);
}
export function parseSource(html: string, inputConfig: unknown, now = new Date()): Quote[] {
  const config = sourceConfigSchema.parse(inputConfig);
  const $ = load(html);
  const timeNodes = $(config.timestampSelector);
  if (timeNodes.length !== 1) throw new Error('Expected one source timestamp');
  const timestamp = config.timestampAttribute === 'text' ? timeNodes.text() : timeNodes.attr(config.timestampAttribute);
  if (!timestamp) throw new Error('Source timestamp is missing');
  if (config.timestampAttribute === 'datetime' && !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(timestamp)) throw new Error('Source timestamp must include date and timezone');
  const observedAt = sourceObservedAt(timestamp, config, now);
  if (!Number.isFinite(observedAt.getTime()) || observedAt.getTime() > now.getTime() + 60_000 || now.getTime() - observedAt.getTime() > 15 * 60_000) throw new Error('Source timestamp is stale or invalid');
  return config.assets.map(asset => {
    const known = instruments.find(a => a.symbol === asset.symbol)!;
    if (known.currency !== asset.currency || known.unit !== asset.unit) throw new Error('Instrument unit mismatch');
    if ($(asset.buySelector).length !== 1 || $(asset.sellSelector).length !== 1) throw new Error(`Ambiguous or missing price for ${asset.symbol}`);
    const directText = (selector: string) => { const value = $(selector).contents().first().text().trim(); return asset.textSuffix && value.endsWith(asset.textSuffix) ? value.slice(0, -asset.textSuffix.length).trim() : value; };
    const buy = parseDecimal(directText(asset.buySelector)); const sell = parseDecimal(directText(asset.sellSelector));
    // Compare exact fixed-point values, never round money through floating-point arithmetic.
    const fixed = (value: string) => { const [integer, fraction = ''] = value.split('.'); return BigInt(integer) * 1_000_000n + BigInt(fraction.padEnd(6,'0')); };
    if (fixed(buy) > fixed(sell)) throw new Error('Buy price exceeds sell price');
    return { symbol: asset.symbol, buy, sell, currency: asset.currency, unit: asset.unit, source:'hamrate', sourceUrl:'https://hamrate.com/', observedAt: observedAt.toISOString(), fetchedAt:now.toISOString() };
  });
}
