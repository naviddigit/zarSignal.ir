'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LockKeyhole, RefreshCw } from 'lucide-react';
import { instruments } from '@/lib/market';
import { historyRanges, type HistoryRange } from '@/lib/history-access';
import { enoughHistory, type ChartPoint } from '@/lib/chart-data';
import { mergeDailyHistory, snapshotChartPoints, symbolFormula, type HistoryBar, type BubblePoint } from '@/lib/chart-history';
import { fetchJson } from '@/lib/fetch-json';
import { OverlaySheet } from '@/components/ui/overlay-sheet';
import { MarketChart } from './market-chart';

const RANGE_LABEL: Record<HistoryRange, string> = {
  '24h': '۲۴س',
  '7d': '۷ر',
  '30d': '۳۰ر',
  '90d': '۹۰ر',
};

type Props = {
  symbol: string;
  compact?: boolean;
  /** Hide market-page cross-link when already on analysis. */
  hideMarketLink?: boolean;
};

/** Minimal TradingView-style workspace: one toolbar, one plot, paywalled ranges. */
export function ChartWorkspace({ symbol, compact = false, hideMarketLink = false }: Props) {
  const asset = instruments.find(a => a.symbol === symbol)!;
  const formula = symbolFormula(symbol);
  const [style, setStyle] = useState<'line' | 'candles'>('line');
  const [range, setRange] = useState<HistoryRange>('24h');
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showBubble, setShowBubble] = useState(Boolean(formula));
  const [retry, setRetry] = useState(0);
  const [lockedRanges, setLockedRanges] = useState<Set<HistoryRange>>(() => new Set(['7d', '30d', '90d']));
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeRange, setUpgradeRange] = useState<HistoryRange>('7d');
  const previousLineRange = useRef<HistoryRange | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/public/markets/${symbol.toLowerCase()}/history?days=7&resolution=1D`, { signal: controller.signal })
      .then(response => {
        if (response.ok) setLockedRanges(new Set());
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [symbol]);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    async function read(url: string) {
      const json = await fetchJson<{ bars?: HistoryBar[]; points?: BubblePoint[]; error?: string }>(url, controller.signal);
      if (json.error) throw new Error('unavailable');
      return json;
    }
    async function load() {
      const [history, bubbles] = await Promise.all([
        range === '24h' && formula ? Promise.resolve({ bars: [] as HistoryBar[] }) : read(`/api/public/markets/${symbol.toLowerCase()}/history?days=${historyRanges[range] / 24}&resolution=1D`),
        formula ? read(`/api/public/bubbles/history?formula=${formula}&range=${range}`) : Promise.resolve({ points: [] as BubblePoint[] }),
      ]);
      if (controller.signal.aborted) return;
      setPoints(range === '24h' && formula ? snapshotChartPoints(bubbles.points ?? [], symbol) : mergeDailyHistory(history.bars ?? [], bubbles.points ?? []));
      setState('ready');
      if (range !== '24h') {
        setLockedRanges(current => {
          if (!current.has(range)) return current;
          const next = new Set(current);
          next.delete(range);
          return next;
        });
      }
    }
    void load().catch(error => {
      if (controller.signal.aborted) return;
      if (error.message === 'http_403') {
        setLockedRanges(current => new Set(current).add(range));
        setUpgradeRange(range);
        setUpgradeOpen(true);
        previousLineRange.current = null;
        setStyle('line');
        setRange('24h');
        return;
      }
      setState('error');
    });
    return () => controller.abort();
  }, [symbol, formula, range, retry]);

  const enough = enoughHistory(points);
  const bubbleReady = enoughHistory(points.filter(p => Number.isFinite(p.bubble)));
  const ranges = Object.keys(historyRanges) as HistoryRange[];

  function openUpgrade(next: HistoryRange) {
    setUpgradeRange(next);
    setUpgradeOpen(true);
  }

  function selectRange(next: HistoryRange) {
    if (next !== '24h' && lockedRanges.has(next)) {
      openUpgrade(next);
      return;
    }
    previousLineRange.current = null;
    setRange(next);
    if (next === '24h') setStyle('line');
  }

  return (
    <section className={`tv-chart chart-workspace${compact ? ' is-compact symbol-history' : ''}`} aria-busy={state === 'loading'} data-follow-keep>
      <header className="tv-chart__bar">
        <div className="tv-chart__title">
          <strong>{asset.name}</strong>
          <span>قیمت · بدون اسپرد</span>
        </div>
        <div className="tv-chart__ranges" role="group" aria-label="بازه زمانی">
          {ranges.map(r => {
            const locked = r !== '24h' && lockedRanges.has(r);
            return (
              <button
                type="button"
                key={r}
                aria-pressed={range === r}
                className={range === r ? 'is-on' : locked ? 'is-locked' : undefined}
                title={locked ? 'نیاز به ارتقای حساب' : undefined}
                onClick={() => selectRange(r)}
              >
                {RANGE_LABEL[r]}
                {locked ? <LockKeyhole size={11} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
        <div className="tv-chart__modes" role="group" aria-label="نوع نمودار">
          <button
            type="button"
            aria-pressed={style === 'line'}
            className={style === 'line' ? 'is-on' : undefined}
            onClick={() => {
              setStyle('line');
              if (previousLineRange.current) {
                selectRange(previousLineRange.current);
                previousLineRange.current = null;
              }
            }}
          >
            خط
          </button>
          <button
            type="button"
            aria-pressed={style === 'candles'}
            className={style === 'candles' ? 'is-on' : undefined}
            onClick={() => {
              if (range === '24h') {
                if (lockedRanges.has('7d')) {
                  openUpgrade('7d');
                  return;
                }
                previousLineRange.current = range;
                setStyle('candles');
                setRange('7d');
                return;
              }
              setStyle('candles');
            }}
          >
            کندل
          </button>
          {formula ? (
            <button
              type="button"
              aria-pressed={showBubble}
              className={showBubble ? 'is-on' : undefined}
              onClick={() => setShowBubble(v => !v)}
            >
              حباب٪
            </button>
          ) : null}
        </div>
      </header>

      {state === 'loading' ? (
        <div className="tv-chart__empty" role="status">در حال بارگذاری…</div>
      ) : state === 'error' ? (
        <div className="tv-chart__empty" role="status">
          <p>نمودار دریافت نشد.</p>
          <button type="button" className="button small-button" onClick={() => setRetry(n => n + 1)}>
            <RefreshCw size={14} /> تلاش دوباره
          </button>
        </div>
      ) : !enough ? (
        <div className="tv-chart__empty">هنوز دادهٔ کافی برای این بازه نیست.</div>
      ) : (
        <MarketChart
          key={`${symbol}-${range}-${style === 'candles' ? 'candles' : 'line'}`}
          points={points}
          label={asset.name}
          unit={`${asset.currency === 'USD' ? 'دلار' : 'تومان'} / ${asset.unit}`}
          candles={style === 'candles'}
          showPrice
          showBubble={Boolean(formula) && showBubble && bubbleReady}
          minimal
        />
      )}

      {!hideMarketLink ? (
        <p className="tv-chart__foot">
          <Link href={`/analysis/${symbol.toLowerCase()}`}>تحلیل این بازار ←</Link>
        </p>
      ) : (
        <p className="tv-chart__foot">۲۴س رایگان · ۷ / ۳۰ / ۹۰ روز با اشتراک</p>
      )}

      <OverlaySheet open={upgradeOpen} title="ارتقا حساب" onClose={() => setUpgradeOpen(false)}>
        <div className="chart-upgrade-sheet">
          <p>
            بازهٔ {RANGE_LABEL[upgradeRange]} با اشتراک فعال در دسترس است. برای دیدن تاریخچهٔ بیشتر از ۲۴ ساعت، حسابتان را ارتقا دهید.
          </p>
          <Link href="/pricing#paid-plans" className="button" onClick={() => setUpgradeOpen(false)}>
            مشاهده تعرفه‌ها
          </Link>
        </div>
      </OverlaySheet>
    </section>
  );
}
