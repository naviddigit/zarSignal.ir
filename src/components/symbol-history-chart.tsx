'use client';

import { useEffect, useState } from 'react';
import { MarketChart } from './market-chart';
import { chartPoints, type ChartPoint } from '@/lib/chart-data';
import { instruments } from '@/lib/market';

type Bar = { t: string; o: number; h: number; l: number; c: number };

export function SymbolHistoryChart({ symbol, name }: { symbol: string; name: string }) {
  const [days, setDays] = useState(90);
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const asset = instruments.find(item => item.symbol === symbol);
  const unit = `${asset?.currency === 'USD' ? 'دلار' : 'تومان'} / ${asset?.unit ?? ''}`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`/api/public/markets/${symbol.toLowerCase()}/history?days=${days}&resolution=1D`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]), cache: 'no-store',
    }).then(async response => {
      if (!response.ok) throw new Error('history_failed');
      const data = await response.json();
      if (controller.signal.aborted) return;
      const bars: Bar[] = Array.isArray(data.bars) ? data.bars : [];
      setPoints(chartPoints(bars.filter(b => [b.o, b.h, b.l, b.c].every(v => Number.isFinite(v) && v > 0)
        && b.h >= Math.max(b.o, b.c) && b.l <= Math.min(b.o, b.c)).map(b => ({ ...b, value: b.c }))));
    }).catch(() => { if (!controller.signal.aborted) { setError(true); setPoints([]); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [symbol, days]);

  return <section className="panel symbol-history" aria-labelledby={`history-${symbol}`} aria-busy={loading}>
    <div className="bubble-history__head"><div><span className="eyebrow">PRICE HISTORY</span>
      <h2 id={`history-${symbol}`}>تاریخچه قیمت {name}</h2>
      <p>باز، بیشینه، کمینه و بسته‌شدن هر روز · زمان تهران · منبع: زرسیگنال</p>
    </div><div className="bubble-history__controls" role="group" aria-label="بازه تاریخچه">
      {[30, 90].map(value => <button key={value} type="button" className={days === value ? 'is-on' : ''} aria-pressed={days === value} onClick={() => setDays(value)}>{new Intl.NumberFormat('fa-IR').format(value)} روز</button>)}
    </div></div>
    {loading ? <div className="chart-empty" role="status">در حال دریافت تاریخچه…</div>
      : error ? <div className="chart-empty" role="status">تاریخچه فعلاً در دسترس نیست. دوباره بازه را انتخاب کنید.</div>
        : points.length < 2 ? <div className="chart-empty">هنوز داده کافی برای نمایش نمودار ثبت نشده است.</div>
          : <><div className="chart-summary">{new Intl.NumberFormat('fa-IR').format(points.length)} کندل روزانه <span>برای جزئیات روی نمودار حرکت کنید یا لمس کنید</span></div>
            <MarketChart key={`${symbol}-${days}`} points={points} label="قیمت روزانه" unit={unit} candles/>
          </>}
  </section>;
}
