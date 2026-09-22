import { chartPoints, type ChartPoint } from '@/lib/chart-data';
import { market18kToMazaneh } from '@/lib/mazaneh-to-18k';

export type HistoryBar = { t: string; o: number; h: number; l: number; c: number };
export type BubblePoint = { t: string; marketPrice: number | null; bubblePercent: number | null; cadence?: string };
export const symbolFormula = (symbol: string) => ['GOLD_MELTED', 'GOLD_18K'].includes(symbol) ? 'GOLD_BUBBLE' : symbol === 'USD' ? 'USD_GAP' : null;

export function mergeDailyHistory(bars: HistoryBar[], bubbles: BubblePoint[]): ChartPoint[] {
  const daily = new Map(bubbles.filter(p => p.cadence === 'daily' && Number.isFinite(p.bubblePercent) && Number.isFinite(Date.parse(p.t)))
    .map(p => [p.t.slice(0, 10), p]));
  return chartPoints(bars.filter(b => [b.o, b.h, b.l, b.c].every(v => Number.isFinite(v) && v > 0) && b.h >= Math.max(b.o, b.c) && b.l <= Math.min(b.o, b.c)).map(b => {
    const bubble = daily.get(b.t.slice(0, 10));
    return { ...b, value: b.c, bubble: bubble?.bubblePercent ?? undefined, bubbleAt: bubble?.t };
  }));
}

export function snapshotChartPoints(bubbles: BubblePoint[], symbol: string): ChartPoint[] {
  return chartPoints(bubbles.filter(p => p.cadence !== 'daily' && p.marketPrice != null && p.marketPrice > 0 && Number.isFinite(p.bubblePercent)).map(p => ({
    t: p.t, value: symbol === 'GOLD_MELTED' ? market18kToMazaneh(p.marketPrice!) : p.marketPrice!, bubble: p.bubblePercent!, bubbleAt: p.t,
  })));
}
