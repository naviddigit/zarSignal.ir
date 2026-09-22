'use client';

import { useEffect, useMemo, useState } from 'react';

type Point = {
  t: string;
  marketPrice: number | null;
  theoreticalPrice: number | null;
  bubblePercent: number | null;
  status: string;
};

type Formula = 'GOLD_BUBBLE' | 'USD_GAP';
type Range = '24h' | '7d' | '30d';

const labels: Record<Formula, string> = {
  GOLD_BUBBLE: 'حباب طلا',
  USD_GAP: 'فاصله دلار',
};

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

export function BubbleHistoryChart() {
  const [formula, setFormula] = useState<Formula>('GOLD_BUBBLE');
  const [range, setRange] = useState<Range>('24h');
  const [points, setPoints] = useState<Point[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/public/bubbles/history?formula=${formula}&range=${range}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]), cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('history_failed');
        const data = await response.json();
        setPoints(Array.isArray(data.points) ? data.points : []);
        setError(null);
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setPoints([]);
          setError(err instanceof Error ? err.message : 'error');
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [formula, range]);

  const prices = useMemo(
    () => points.map(point => point.marketPrice).filter((value): value is number => value != null && Number.isFinite(value)),
    [points],
  );
  const bubbles = useMemo(
    () => points.map(point => point.bubblePercent).filter((value): value is number => value != null && Number.isFinite(value)),
    [points],
  );

  const pricePath = pathFor(prices, 640, 240);
  const bubblePath = pathFor(bubbles, 640, 240);

  return (
    <section id="bubble-history" className="panel bubble-history" aria-labelledby="bubble-history-title">
      <div className="bubble-history__head">
        <div>
          <span className="eyebrow">BUBBLE HISTORY</span>
          <h2 id="bubble-history-title">تاریخچه قیمت و حباب</h2>
          <p>هر نقطه با ورودی همان لحظه ذخیره شده؛ با قیمت زنده دوباره حساب نمی‌شود.</p>
        </div>
        <div className="bubble-history__controls">
          <select aria-label="نوع حباب" value={formula} onChange={event => setFormula(event.target.value as Formula)}>
            <option value="GOLD_BUBBLE">{labels.GOLD_BUBBLE}</option>
            <option value="USD_GAP">{labels.USD_GAP}</option>
          </select>
          {(['24h', '7d', '30d'] as Range[]).map(item => (
            <button key={item} type="button" className={range === item ? 'is-on' : ''} onClick={() => setRange(item)}>
              {item === '24h' ? '۲۴ ساعت' : item === '7d' ? '۷ روز' : '۳۰ روز'}
            </button>
          ))}
        </div>
      </div>
      <div className="bubble-history__chart" aria-busy={loading}>
        {loading ? (
          <div className="bubble-history__empty">در حال بارگذاری تاریخچه…</div>
        ) : error ? (
          <div className="bubble-history__empty" role="status">دریافت تاریخچه فعلاً ممکن نیست. قیمت‌های ثبت‌شده در جدول بازار در دسترس‌اند.</div>
        ) : points.length < 2 ? (
          <div className="bubble-history__empty">
            هنوز نقطهٔ کافی ذخیره نشده. با هر دریافت قیمت (هدف: هر دقیقه) تاریخچه ساخته می‌شود.
          </div>
        ) : (
          <svg viewBox="0 0 640 240" role="img" aria-label={`نمودار ${labels[formula]}`}>
            <path d={pricePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
            <path d={bubblePath} fill="none" stroke="var(--success)" strokeWidth="2" strokeDasharray="5 4" opacity="0.9" />
          </svg>
        )}
      </div>
      <div className="bubble-history__legend">
        <span><i className="is-price" /> قیمت بازار</span>
        <span><i className="is-bubble" /> حباب ٪</span>
        {range !== '24h' && <span>بازه‌های بلندتر پس از اشتراک Home کامل می‌شوند.</span>}
      </div>
    </section>
  );
}
