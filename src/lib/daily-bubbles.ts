import { goldBubble, usdGap, FORMULA_VERSION } from '@/server/bubble-formulas';
import { mazanehTo18k, MAZANEH_TO_18K_VERSION } from '@/lib/mazaneh-to-18k';

export const DAILY_PROVENANCE = 'faraz-daily-sync-v1';
export type DailyClose = { symbol: string; openTime: Date; close: number };

/** Join completed UTC calendar days only. Missing inputs are skipped, never carried forward. */
export function synchronizedDailyBubbles(bars: DailyClose[], now = new Date()) {
  const days = new Map<string, Map<string, DailyClose>>();
  const today = now.toISOString().slice(0, 10);
  for (const bar of bars) {
    if (!Number.isFinite(bar.openTime.getTime()) || !Number.isFinite(bar.close) || bar.close <= 0) continue;
    const day = bar.openTime.toISOString().slice(0, 10);
    if (day >= today) continue;
    const group = days.get(day) ?? new Map<string, DailyClose>();
    if (group.has(bar.symbol)) throw new Error('ambiguous_daily_input');
    group.set(bar.symbol, bar); days.set(day, group);
  }
  return [...days].sort(([a], [b]) => a.localeCompare(b)).flatMap(([day, group]) => {
    const melted = group.get('GOLD_MELTED'), xau = group.get('XAU_USD'), usd = group.get('USD');
    if (!melted || !xau || !usd) return [];
    const market18k = mazanehTo18k(melted.close).market18k;
    return [{
      id: `${DAILY_PROVENANCE}:${day}:f${FORMULA_VERSION}:c${MAZANEH_TO_18K_VERSION}`,
      day, capturedAt: new Date(`${day}T23:59:59.999Z`), melted, xau, usd, market18k,
      gold: goldBubble({ market18k, xauUsd: xau.close, usdIrt: usd.close }),
      dollar: usdGap({ market18k, xauUsd: xau.close, actualUsd: usd.close }),
    }];
  });
}
