'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { instruments } from '@/lib/market';
import { historyRanges, type HistoryRange } from '@/lib/history-access';
import { enoughHistory, type ChartPoint } from '@/lib/chart-data';
import { mergeDailyHistory, snapshotChartPoints, symbolFormula } from '@/lib/chart-history';
import { MarketChart } from './market-chart';
import { Checkbox } from './ui/checkbox';

export function ChartWorkspace({ symbol }: { symbol: string }) {
  const asset = instruments.find(a => a.symbol === symbol)!;
  const formula = symbolFormula(symbol);
  const [range, setRange] = useState<HistoryRange>('24h');
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'locked'>('loading');
  const [price, setPrice] = useState(true), [bubble, setBubble] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const options = { cache: 'no-store' as const, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) };
    setState('loading'); setPoints([]);
    async function read(url: string) {
      const response = await fetch(url, options);
      if (response.status === 403) throw new Error('locked');
      if (!response.ok) throw new Error('unavailable');
      const json = await response.json();
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
    void load().catch(error => { if (!controller.signal.aborted) setState(error.message === 'locked' ? 'locked' : 'error'); });
    return () => controller.abort();
  }, [symbol, formula, range, retry]);
  const enough = enoughHistory(points);
  const bubbleReady = enoughHistory(points.filter(p => Number.isFinite(p.bubble)));
  return <section className="panel chart-workspace" aria-busy={state === 'loading'}>
    <div className="chart-toolbar"><div><h2>{asset.name}</h2><p>قیمت دیده‌بان بدون اسپرد · منبع: زرسیگنال</p></div>
      <div className="bubble-history__controls" aria-label="بازه نمودار">{(Object.keys(historyRanges) as HistoryRange[]).map(r => <button type="button" key={r} aria-pressed={range === r} className={range === r ? 'is-on' : ''} onClick={() => setRange(r)}>{r === '24h' ? '۲۴ ساعت' : `${new Intl.NumberFormat('fa-IR').format(historyRanges[r] / 24)} روز`}{r !== '24h' && <LockKeyhole size={12}/>}</button>)}</div>
    </div>
    <div className="chart-series-controls"><Checkbox label="قیمت · محور چپ" checked={price} onCheckedChange={setPrice}/><Checkbox label="حباب / فاصله · محور راست ٪" checked={Boolean(formula) && bubble} disabled={!formula} onCheckedChange={setBubble}/><span>{range === '24h' ? 'مشاهدات ثبت‌شده در ۲۴ ساعت اخیر' : 'کندل روزانه + محاسبه از قیمت‌های پایانی همان روز'}</span></div>
    {state === 'loading' ? <div className="chart-empty" role="status">در حال دریافت نمودار…</div>
      : state === 'locked' ? <div className="chart-locked"><LockKeyhole size={28}/><h3>۹۰ روز تاریخچه حباب + قیمت — با پریمیوم</h3><p>روند روزهای گذشته را با قیمت و محاسبهٔ همان روز بررسی کنید. بازهٔ ۲۴ ساعت برای همه رایگان است.</p><Link href="/pricing" className="button">باز کردن تاریخچه کامل</Link><Link href="/login">اشتراک دارید؟ وارد شوید</Link></div>
        : state === 'error' ? <div className="chart-empty" role="status">دریافت تاریخچه ممکن نشد.<button onClick={() => setRetry(n => n + 1)}>تلاش دوباره</button></div>
          : !enough ? <div className="chart-empty"><strong>تاریخچه این بازه در حال شکل‌گیری است</strong><p>حداقل ۳ مشاهده در بازه‌ای دست‌کم ۵ دقیقه‌ای برای نمودار لازم است.</p><small>{new Intl.NumberFormat('fa-IR').format(points.length)} مشاهده معتبر · داده فرضی نمایش داده نمی‌شود</small><Link href="/pricing">باز کردن تاریخچه کامل</Link></div>
            : !price && (!bubble || !formula) ? <div className="chart-empty">یک سری را برای نمایش انتخاب کنید.</div>
              : <MarketChart key={`${symbol}-${range}`} points={points} label={asset.name} unit={`${asset.currency === 'USD' ? 'دلار' : 'تومان'} / ${asset.unit}`} candles={range !== '24h' || !formula} showPrice={price} showBubble={Boolean(formula) && bubble && bubbleReady}/>}
    {state === 'ready' && enough && formula && !bubbleReady && <p className="chart-note">قیمت نمایش داده می‌شود؛ برای خط حباب هنوز ۳ ورودی تاریخی هم‌زمان موجود نیست.</p>}
    {!formula && <p className="chart-note">مدل حباب برای این نماد فعال نشده است؛ فقط قیمت نمایش داده می‌شود.</p>}
    <p className="chart-note">{range === '24h' ? 'محاسبه با ورودی‌های ثبت‌شده همان لحظه.' : 'محاسبه تاریخی روزانه، نه حباب لحظه‌ای: قیمت‌های پایانی در روز تقویمی UTC مشترک قرار گرفته‌اند؛ ساعت بسته‌شدن بازارها ممکن است متفاوت باشد.'} حباب طلا از مظنه و تبدیل تأییدشده به ۱۸عیار محاسبه می‌شود. این نمودار توصیه خرید یا فروش نیست.</p>
    {state !== 'locked' && <div className="chart-upgrade"><span>بازهٔ کوتاه رایگان؛ تاریخچه عمیق با اشتراک فعال</span><Link href="/pricing">مشاهده اشتراک‌ها ←</Link></div>}
  </section>;
}
