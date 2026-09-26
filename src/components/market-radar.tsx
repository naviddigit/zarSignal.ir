'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { bubbleDisplayState, type LiveBubbleCard } from '@/lib/bubbles';
import { formulaCriticalSymbols, formatPrice, instruments, type Snapshot } from '@/lib/market';
import { RelativeTime } from '@/components/relative-time';
import { ChartTeaser } from '@/components/chart-teaser';

const assets = [
  { key: 'GOLD_BUBBLE', label: 'طلا', title: 'حباب طلای ۱۸ عیار', explanation: 'فاصله قیمت طلای ۱۸ عیار مشتق از مظنه با ارزش محاسباتی بر پایه اونس و دلار.', href: '/markets/gold_melted' },
  { key: 'USD_BUBBLE', label: 'دلار', title: 'فاصله دلار با دلار ضمنی طلا', explanation: 'اختلاف نسبی دلار بازار با دلار ضمنی طلا؛ نه ارزش بنیادی دلار و نه حباب بر مبنای درهم.', href: '/markets/usd' },
  { key: 'SILVER_BUBBLE', label: 'نقره', title: 'حباب نقره', explanation: 'وجود قیمت نقره به معنی تأیید مدل حباب آن نیست؛ نمایش عمومی حباب نقره هنوز نیازمند تأیید است.', href: '/markets/silver_999' },
] as const;

export function MarketRadar({ bubbles, snapshot, professional }: { bubbles: LiveBubbleCard[]; snapshot: Snapshot; professional: boolean }) {
  const [focus, setFocus] = useState<LiveBubbleCard['key']>('GOLD_BUBBLE');
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const asset = assets.find(item => item.key === focus)!;
  const card = bubbles.find(item => item.key === focus);
  const inputs = snapshot.quotes.filter(quote => formulaCriticalSymbols.includes(quote.symbol));
  const oldestInput = inputs.map(quote => quote.observedAt).filter(value => Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(a) - Date.parse(b))[0];
  const state = now === null ? card?.status ?? 'unavailable' : bubbleDisplayState(card, inputs, now);
  const numeric = (state === 'ok' || state === 'stale') && card?.percent != null;
  const status = { ok: 'محاسبه موجود است', stale: 'داده قدیمی است', unavailable: 'داده معتبر در دسترس نیست', blocked: 'در انتظار تأیید مدل' }[state];
  return <div className="panel home-radar" id="bubbles">
    <div className="home-assets" role="group" aria-label="انتخاب دارایی">{assets.map(item => <button key={item.key} type="button" aria-pressed={focus === item.key} onClick={() => setFocus(item.key)}>{item.label}</button>)}</div>
    <div className="home-radar__body" aria-live="polite" data-state={state}>
      <div className="home-radar__result"><span className="eyebrow">{asset.title}</span><h3>{status}</h3><p>{state === 'blocked' ? 'این محدودیت با خرید اشتراک رفع نمی‌شود.' : state === 'stale' ? 'این محاسبه از داده قدیمی است؛ وضعیت فعلی بازار نیست.' : state === 'unavailable' ? 'عدد ساختگی جای داده ناقص یا نامعتبر را نمی‌گیرد.' : 'محاسبه حباب، نتیجه موتور تصمیم نیست.'}</p><span className="home-label">تحلیل معاملاتی هنوز ارائه نمی‌شود</span></div>
      <div className="home-radar__evidence">
        <h4>{asset.title}</h4>
        {numeric && <p className="home-number"><bdi>{new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(card!.percent!)}٪</bdi><span>{state === 'stale' ? 'محاسبه قدیمی' : 'مشتق از داده دریافتی'}</span></p>}
        <p>{asset.explanation}</p>
        {focus !== 'SILVER_BUBBLE' && oldestInput && <p className="home-note">قدیمی‌ترین ورودی: <RelativeTime value={oldestInput} /></p>}
        {focus !== 'SILVER_BUBBLE' && inputs.length > 0 && <details><summary>زمان ورودی‌های محاسبه</summary><ul>{inputs.map(quote => <li key={quote.symbol}>{instruments.find(item => item.symbol === quote.symbol)?.short}: <RelativeTime value={quote.observedAt} /></li>)}</ul><p className="home-note">زمان مشاهده داده است؛ لزوماً زمان معامله در بازار نیست.</p></details>}
        <p className="home-note">روند و قدرت حرکت: ارائه نشده · هزینه: نامشخص · اطمینان مدل: ارائه نشده</p>
        <Link className="text-link" href={asset.href}>قیمت و جزئیات دارایی ←</Link>
      </div>
    </div>
    {professional && <details className="home-professional" data-analytics-event="analysis_detail_view"><summary>جزئیات حرفه‌ای: مبنا، ورودی‌ها و محدودیت‌ها</summary>
      <p>بازه تحلیل و شرط تغییر نظر هنوز خروجی تأییدشده ندارند. داده نامعتبر، قدیمی یا مسدود، نتیجه «نگهداری» نیست.</p>
      {focus !== 'SILVER_BUBBLE' && <><p>طلای ۱۸ عیار با فرمول تأییدشده از مظنه مثقال ۷۰۵ مشتق می‌شود. حباب طلا و فاصله دلار، دو تأیید مستقل نیستند.</p><p>نسخه فرمول: <bdi>{card?.formulaVersion ?? 'در دسترس نیست'}</bdi> · نسخه تبدیل: <bdi>{card?.conversionVersion ?? 'در دسترس نیست'}</bdi></p><ul>{inputs.map(quote => <li key={quote.symbol}>{instruments.find(item => item.symbol === quote.symbol)?.name}: <bdi>{formatPrice(quote.buy, quote.currency)}</bdi> / <bdi>{formatPrice(quote.sell, quote.currency)}</bdi> به‌ازای {quote.unit}</li>)}</ul></>}
      <p>این قیمت‌ها تضمین bid/ask قابل معامله نیستند؛ هزینه واقعی وارد محاسبه نشده و نتیجه خالص ارائه نمی‌شود. محدوده خنثی و درصد احتمال سود تعریف نشده‌اند.</p>
      <Link className="text-link" href="/charts">نمودارها و تاریخچه موجود ←</Link>
      {focus === 'GOLD_BUBBLE' && <ChartTeaser />}
    </details>}
  </div>;
}
