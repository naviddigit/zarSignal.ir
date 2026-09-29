'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LockKeyhole, RefreshCw } from 'lucide-react';
import { instruments } from '@/lib/market';
import { historyRanges, type HistoryRange } from '@/lib/history-access';
import { enoughHistory, type ChartPoint } from '@/lib/chart-data';
import { mergeDailyHistory, snapshotChartPoints, symbolFormula, type HistoryBar, type BubblePoint } from '@/lib/chart-history';
import { fetchJson } from '@/lib/fetch-json';
import { MarketChart } from './market-chart';
import { Checkbox } from './ui/checkbox';

export function ChartWorkspace({ symbol, compact = false }: { symbol: string; compact?: boolean }) {
  const asset = instruments.find(a => a.symbol === symbol)!;
  const formula = symbolFormula(symbol);
  const [style, setStyle] = useState<'line' | 'candles'>('line');
  const [range, setRange] = useState<HistoryRange>('24h');
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'locked'>('loading');
  const [price, setPrice] = useState(true), [bubble, setBubble] = useState(true);
  const [retry, setRetry] = useState(0);
  const previousLineRange = useRef<HistoryRange | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading'); setPoints([]);
    async function read(url: string) {
      const json = await fetchJson<{ bars?: HistoryBar[]; points?: BubblePoint[]; error?: string }>(url, controller.signal);
      if (json.error) throw new Error('unavailable');
      return json;
    }
    async function load() {
      const [history, bubbles] = await Promise.all([
        range === '24h' && formula ? Promise.resolve({ bars: [] }) : read(`/api/public/markets/${symbol.toLowerCase()}/history?days=${historyRanges[range] / 24}&resolution=1D`),
        formula ? read(`/api/public/bubbles/history?formula=${formula}&range=${range}`) : Promise.resolve({ points: [] }),
      ]);
      if (controller.signal.aborted) return;
      setPoints(range === '24h' && formula ? snapshotChartPoints(bubbles.points ?? [], symbol) : mergeDailyHistory(history.bars ?? [], bubbles.points ?? []));
      setState('ready');
    }
    void load().catch(error => { if (!controller.signal.aborted) setState(error.message === 'http_403' ? 'locked' : 'error'); });
    return () => controller.abort();
  }, [symbol, formula, range, retry]);
  const enough = enoughHistory(points);
  const bubbleReady = enoughHistory(points.filter(p => Number.isFinite(p.bubble)));
  const ranges = Object.keys(historyRanges) as HistoryRange[];
  return (
    <section className={`panel chart-workspace${compact ? ' is-compact symbol-history' : ''}`} aria-busy={state === 'loading'}>
      <div className="chart-toolbar">
        <div>
          <h2>{asset.name}</h2>
          <p>قیمت دیده‌بان بدون اسپرد · منبع: زرسیگنال</p>
        </div>
      </div>

      <div className="chart-control-stack">
        <div className="chart-control-block">
          <span className="chart-control-label">بازه</span>
          <div className="chart-range-grid" role="group" aria-label="بازه نمودار">
            {ranges.map(r => (
              <button
                type="button"
                key={r}
                aria-pressed={range === r}
                className={range === r ? 'is-on' : ''}
                onClick={() => {
                  previousLineRange.current = null;
                  setRange(r);
                  if (r === '24h') setStyle('line');
                }}
              >
                <span>{r === '24h' ? '۲۴ ساعت' : `${new Intl.NumberFormat('fa-IR').format(historyRanges[r] / 24)} روز`}</span>
                {r !== '24h' ? <LockKeyhole size={12} aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="chart-control-block">
          <span className="chart-control-label">نوع نمودار</span>
          <div className="chart-style-row" role="group" aria-label="نوع نمودار">
            <button
              type="button"
              aria-pressed={style === 'line'}
              className={style === 'line' ? 'is-on' : ''}
              onClick={() => {
                setStyle('line');
                if (previousLineRange.current) {
                  setRange(previousLineRange.current);
                  previousLineRange.current = null;
                }
              }}
            >
              خطی
            </button>
            <button
              type="button"
              aria-pressed={style === 'candles'}
              className={style === 'candles' ? 'is-on' : ''}
              onClick={() => {
                setStyle('candles');
                if (range === '24h') {
                  previousLineRange.current = range;
                  setRange('7d');
                }
              }}
            >
              کندل روزانه
            </button>
            <Link className="chart-market-link" href={`/analysis/${symbol.toLowerCase()}`}>بررسی این بازار ←</Link>
          </div>
        </div>
      </div>

      <div className="chart-series-controls">
        <Checkbox label="قیمت · محور چپ" checked={price} onCheckedChange={setPrice} />
        <Checkbox label="حباب / فاصله · محور راست ٪" checked={Boolean(formula) && bubble} disabled={!formula} onCheckedChange={setBubble} />
        <span>{range === '24h' ? 'مشاهدات ثبت‌شده در ۲۴ ساعت اخیر' : 'کندل روزانه + محاسبه از قیمت‌های پایانی همان روز'}</span>
      </div>
      {state === 'loading' ? <div className="chart-empty" role="status">در حال دریافت نمودار…</div>
        : state === 'locked' ? (
          <div className="chart-locked">
            <LockKeyhole size={24} />
            <h3>این بازه به اشتراک نیاز دارد</h3>
            <p>نمودار ۲۴ ساعت رایگان است؛ ۷ / ۳۰ / ۹۰ روز با پلن تاریخچه باز می‌شود.</p>
            <div className="chart-state-actions">
              <Link href="/pricing#paid-plans" className="button">بررسی پلن‌ها</Link>
              <button className="chart-retry" type="button" onClick={() => { previousLineRange.current = null; setStyle('line'); setRange('24h'); }}>نمودار رایگان</button>
            </div>
          </div>
        )
          : state === 'error' ? <div className="chart-empty" role="status"><strong>نمودار دریافت نشد</strong><p>دوباره تلاش کنید.</p><button type="button" className="chart-retry" onClick={() => setRetry(n => n + 1)}><RefreshCw size={15} />تازه‌سازی نمودار</button></div>
            : !enough ? <div className="chart-empty"><strong>هنوز داده کافی نداریم</strong><p>با ثبت قیمت‌های بیشتر، نمودار این بازه نمایش داده می‌شود.</p></div>
              : !price && (!bubble || !formula) ? <div className="chart-empty">یک سری را برای نمایش انتخاب کنید.</div>
                : <MarketChart key={`${symbol}-${range}`} points={points} label={asset.name} unit={`${asset.currency === 'USD' ? 'دلار' : 'تومان'} / ${asset.unit}`} candles={style === 'candles'} showPrice={price} showBubble={Boolean(formula) && bubble && bubbleReady} />}
      {state === 'ready' && enough && formula && !bubbleReady && <p className="chart-note">قیمت نمایش داده می‌شود؛ برای خط حباب هنوز ۳ ورودی تاریخی هم‌زمان موجود نیست.</p>}
      {!formula && <p className="chart-note">مدل حباب برای این نماد فعال نشده است؛ فقط قیمت نمایش داده می‌شود.</p>}
      <details className="chart-method"><summary>درباره داده‌های نمودار</summary><p className="chart-note">{range === '24h' ? 'محاسبه با ورودی‌های ثبت‌شده همان لحظه.' : 'محاسبه تاریخی روزانه، نه حباب لحظه‌ای: قیمت‌های پایانی در روز تقویمی UTC مشترک قرار گرفته‌اند؛ ساعت بسته‌شدن بازارها ممکن است متفاوت باشد.'} حباب طلا از مظنه و تبدیل تأییدشده به ۱۸عیار محاسبه می‌شود. این نمودار توصیه خرید یا فروش نیست.</p></details>
      {state !== 'locked' && <div className="chart-upgrade"><span>بازهٔ کوتاه رایگان؛ تاریخچه عمیق با اشتراک فعال</span><Link href="/pricing#paid-plans">مشاهده اشتراک‌ها ←</Link></div>}
    </section>
  );
}
