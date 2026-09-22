'use client';

import { useEffect, useState } from 'react';
import { MarketChart } from './market-chart';
import { chartPoints, enoughHistory } from '@/lib/chart-data';

type Point = { t: string; marketPrice: number | null; bubblePercent: number | null; status: string };
type Formula = 'GOLD_BUBBLE' | 'USD_GAP';
type Range = '24h' | '7d' | '30d';
const labels = { GOLD_BUBBLE: 'حباب طلا', USD_GAP: 'فاصله دلار' };

export function BubbleHistoryChart() {
  const [formula, setFormula] = useState<Formula>('GOLD_BUBBLE');
  const [range, setRange] = useState<Range>('24h');
  const [points, setPoints] = useState<Point[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`/api/public/bubbles/history?formula=${formula}&range=${range}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]), cache: 'no-store',
    }).then(async response => {
      if (!response.ok) throw new Error('history_failed');
      const data = await response.json();
      if (!controller.signal.aborted) setPoints(Array.isArray(data.points) ? data.points : []);
    }).catch(() => { if (!controller.signal.aborted) { setPoints([]); setError(true); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [formula, range]);

  // Both series use the same valid timestamps. Never compress missing observations separately.
  const paired = points.filter(p => p.marketPrice !== null && p.bubblePercent !== null
    && Number.isFinite(p.marketPrice) && Number.isFinite(p.bubblePercent));
  const prices = chartPoints(paired.map(p => ({ t: p.t, value: p.marketPrice! })));
  const bubbles = chartPoints(paired.map(p => ({ t: p.t, value: p.bubblePercent! })));
  const ready = enoughHistory(prices);

  return <section id="bubble-history" className="panel bubble-history" aria-labelledby="bubble-history-title">
    <div className="bubble-history__head"><div><span className="eyebrow">BUBBLE HISTORY</span>
      <h2 id="bubble-history-title">تاریخچه قیمت و حباب</h2><p>هر محاسبه با ورودی همان لحظه ثبت می‌شود؛ تاریخچه حباب از تاریخچه کندل‌ها جداست.</p>
    </div><div className="bubble-history__controls">
      <select aria-label="نوع حباب" value={formula} onChange={event => setFormula(event.target.value as Formula)}>
        <option value="GOLD_BUBBLE">حباب طلا</option><option value="USD_GAP">فاصله دلار</option>
      </select>
      {(['24h', '7d', '30d'] as Range[]).map(item => <button key={item} type="button" className={range === item ? 'is-on' : ''} aria-pressed={range === item} onClick={() => setRange(item)}>{item === '24h' ? '۲۴ ساعت' : item === '7d' ? '۷ روز' : '۳۰ روز'}</button>)}
    </div></div>
    <div className="bubble-history-body" aria-busy={loading}>
      {loading ? <div className="chart-empty" role="status">در حال دریافت تاریخچه…</div>
        : error ? <div className="chart-empty" role="status">دریافت تاریخچه فعلاً ممکن نیست. قیمت‌های ثبت‌شده در جدول بازار در دسترس‌اند.</div>
          : !ready ? <div className="chart-empty" role="status"><strong>تاریخچه در حال شکل‌گیری است</strong><p>برای رسم نمودار، حداقل ۳ مشاهده معتبر با فاصله زمانی مجموعاً ۵ دقیقه نیاز است.</p><small>{new Intl.NumberFormat('fa-IR').format(prices.length)} مشاهده ثبت‌شده در این بازه · خط فرضی نمایش داده نمی‌شود</small></div>
            : <><div className="chart-legend"><span>● قیمت بازار · تومان</span><span>● {labels[formula]} · درصد</span><small>دو محور مستقل؛ زمان‌های مشترک</small></div>
              <MarketChart key={`${formula}-${range}-price`} points={prices} label="قیمت بازار" unit="تومان"/>
              <MarketChart key={`${formula}-${range}-bubble`} points={bubbles} label={labels[formula]} unit="٪" percent/>
            </>}
    </div>
  </section>;
}
