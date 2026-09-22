'use client';

import { useEffect, useMemo, useState } from 'react';

type Bar = { t: string; o: number; h: number; l: number; c: number; v: number | null };

function pathFor(values: number[], width: number, height: number, pad = 16) {
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = pad + (index / Math.max(values.length - 1, 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function SymbolHistoryChart({ symbol, name }: { symbol: string; name: string }) {
  const [days, setDays] = useState(90);
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/public/markets/${symbol.toLowerCase()}/history?days=${days}&resolution=1D`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
      cache: 'no-store',
    })
      .then(async response => {
        if (!response.ok) throw new Error('history_failed');
        const data = await response.json();
        setBars(Array.isArray(data.bars) ? data.bars : []);
        setError(null);
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setBars([]);
          setError(err instanceof Error ? err.message : 'error');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [symbol, days]);

  const closes = useMemo(
    () => bars.map(bar => bar.c).filter(value => Number.isFinite(value)),
    [bars],
  );
  const path = pathFor(closes, 640, 220);
  const last = closes.at(-1);
  const first = closes[0];
  const change = first && last ? ((last - first) / first) * 100 : null;

  return (
    <section className="panel symbol-history" aria-labelledby={`history-${symbol}`}>
      <div className="bubble-history__head">
        <div>
          <span className="eyebrow">PRICE HISTORY</span>
          <h2 id={`history-${symbol}`}>تاریخچه قیمت {name}</h2>
          <p>میله‌های روزانه ذخیره‌شده در زر‌سیگنال (حدود {days} روز).</p>
        </div>
        <div className="bubble-history__controls" role="group" aria-label="بازه تاریخچه">
          {[30, 90].map(value => (
            <button key={value} type="button" className={days === value ? 'is-on' : ''} aria-pressed={days === value} onClick={() => setDays(value)}>
              {value} روز
            </button>
          ))}
        </div>
      </div>
      {loading ? <p className="bubble-history__empty">در حال بارگذاری…</p> : null}
      {!loading && error ? <p className="bubble-history__empty">تاریخچه در دسترس نیست.</p> : null}
      {!loading && !error && !closes.length ? (
        <p className="bubble-history__empty">هنوز تاریخچه‌ای برای این نماد ثبت نشده است.</p>
      ) : null}
      {!loading && closes.length > 0 ? (
        <>
          <div className="bubble-history__meta">
            <span dir="ltr">{closes.length} bars</span>
            {change != null ? (
              <span className={change >= 0 ? 'is-up' : 'is-down'}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
            ) : null}
          </div>
          <svg viewBox="0 0 640 220" className="bubble-history__chart" role="img" aria-label={`نمودار ${name}`}>
            <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </>
      ) : null}
    </section>
  );
}
