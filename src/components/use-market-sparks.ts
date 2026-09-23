'use client';

import { useEffect, useState } from 'react';
import { fetchJson } from '@/lib/fetch-json';
import { enoughHistory, type ChartPoint } from '@/lib/chart-data';
import { snapshotChartPoints, symbolFormula, type BubblePoint, type HistoryBar } from '@/lib/chart-history';
import type { Symbol } from '@/lib/market';

export type SparkSeries = { price: number[]; bubble?: number[] };

/**
 * Loads compact 24h spark data for visible symbols.
 * Gold/USD reuse bubble history; other symbols use daily close history when available.
 */
export function useMarketSparks(symbols: Symbol[]) {
  const [sparks, setSparks] = useState<Partial<Record<Symbol, SparkSeries>>>({});
  const key = symbols.slice().sort().join(',');

  useEffect(() => {
    if (!symbols.length) return;
    const controller = new AbortController();
    async function load() {
      const next: Partial<Record<Symbol, SparkSeries>> = {};
      const needsGold = symbols.some(s => s === 'GOLD_MELTED' || s === 'GOLD_18K');
      const needsUsd = symbols.includes('USD');
      const plain = symbols.filter(s => !symbolFormula(s));

      const tasks: Promise<void>[] = [];
      if (needsGold) {
        tasks.push((async () => {
          try {
            const data = await fetchJson<{ points?: BubblePoint[] }>('/api/public/bubbles/history?formula=GOLD_BUBBLE&range=24h', controller.signal, 10_000);
            for (const symbol of ['GOLD_MELTED', 'GOLD_18K'] as const) {
              if (!symbols.includes(symbol)) continue;
              const points = snapshotChartPoints(data.points ?? [], symbol);
              if (!enoughHistory(points)) continue;
              next[symbol] = {
                price: points.map(p => p.value),
                bubble: points.every(p => Number.isFinite(p.bubble)) ? points.map(p => p.bubble!) : undefined,
              };
            }
          } catch { /* keep empty spark */ }
        })());
      }
      if (needsUsd) {
        tasks.push((async () => {
          try {
            const data = await fetchJson<{ points?: BubblePoint[] }>('/api/public/bubbles/history?formula=USD_GAP&range=24h', controller.signal, 10_000);
            const points = snapshotChartPoints(data.points ?? [], 'USD');
            if (enoughHistory(points)) {
              next.USD = {
                price: points.map(p => p.value),
                bubble: points.every(p => Number.isFinite(p.bubble)) ? points.map(p => p.bubble!) : undefined,
              };
            }
          } catch { /* keep empty spark */ }
        })());
      }
      for (const symbol of plain) {
        tasks.push((async () => {
          try {
            const data = await fetchJson<{ bars?: HistoryBar[] }>(`/api/public/markets/${symbol.toLowerCase()}/history?days=30&resolution=1D`, controller.signal, 10_000);
            const closes = (data.bars ?? []).map(b => b.c).filter(v => Number.isFinite(v) && v > 0);
            if (closes.length >= 3) next[symbol] = { price: closes };
          } catch { /* keep empty spark */ }
        })());
      }
      await Promise.all(tasks);
      if (!controller.signal.aborted) setSparks(next);
    }
    void load();
    return () => controller.abort();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return sparks;
}

export function sparkFromPoints(points: ChartPoint[]): SparkSeries | null {
  if (!enoughHistory(points)) return null;
  return {
    price: points.map(p => p.value),
    bubble: points.every(p => Number.isFinite(p.bubble)) ? points.map(p => p.bubble!) : undefined,
  };
}
