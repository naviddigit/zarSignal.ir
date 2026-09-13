import { load } from 'cheerio';
import { z } from 'zod';
import { instruments, type Quote } from '../../lib/market';
export const sourceConfigSchema = z.object({
  verified: z.literal(true),
  timestampSelector: z.string().min(1),
  timestampAttribute: z.string().min(1).default('datetime'),
  assets: z.array(z.object({ symbol: z.enum(['GOLD_MELTED','XAG_USD','USD','EUR','AED','XAU_USD']), buySelector: z.string().min(1), sellSelector: z.string().min(1), currency: z.enum(['TMN','USD']), unit: z.string().min(1) })).min(1),
}).refine(config => new Set(config.assets.map(a => a.symbol)).size === config.assets.length, 'Duplicate symbol');
export type SourceConfig = z.infer<typeof sourceConfigSchema>;
export function parseDecimal(text: string): string {
  const normalized = text.trim().replace(/[۰-۹]/g, ch => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch))).replace(/[٠-٩]/g, ch => String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch))).replace(/٬/g, ',').replace(/٫/g, '.');
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,6})?$/.test(normalized)) throw new Error('Invalid price format');
  const value = normalized.replaceAll(',', '');
  if (!Number.isFinite(Number(value)) || Number(value) <= 0 || value.split('.')[0].length > 18) throw new Error('Price out of bounds');
  return value;
}
export function parseSource(html: string, inputConfig: unknown, now = new Date()): Quote[] {
  const config = sourceConfigSchema.parse(inputConfig);
  const $ = load(html);
  const timeNodes = $(config.timestampSelector);
  if (timeNodes.length !== 1) throw new Error('Expected one source timestamp');
  const timestamp = timeNodes.attr(config.timestampAttribute);
  if (!timestamp || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(timestamp)) throw new Error('Source timestamp must include date and timezone');
  const observedAt = new Date(timestamp);
  if (!Number.isFinite(observedAt.getTime()) || observedAt.getTime() > now.getTime() + 60_000 || now.getTime() - observedAt.getTime() > 15 * 60_000) throw new Error('Source timestamp is stale or invalid');
  return config.assets.map(asset => {
    const known = instruments.find(a => a.symbol === asset.symbol)!;
    if (known.currency !== asset.currency || known.unit !== asset.unit) throw new Error('Instrument unit mismatch');
    if ($(asset.buySelector).length !== 1 || $(asset.sellSelector).length !== 1) throw new Error(`Ambiguous or missing price for ${asset.symbol}`);
    const buy = parseDecimal($(asset.buySelector).text()); const sell = parseDecimal($(asset.sellSelector).text());
    // Compare exact fixed-point values, never round money through floating-point arithmetic.
    const fixed = (value: string) => { const [integer, fraction = ''] = value.split('.'); return BigInt(integer) * 1_000_000n + BigInt(fraction.padEnd(6,'0')); };
    if (fixed(buy) > fixed(sell)) throw new Error('Buy price exceeds sell price');
    return { symbol: asset.symbol, buy, sell, currency: asset.currency, unit: asset.unit, source:'hamrate', sourceUrl:'https://hamrate.com/', observedAt: observedAt.toISOString(), fetchedAt:now.toISOString() };
  });
}
