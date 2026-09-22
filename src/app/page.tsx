import Link from 'next/link';
import { ArrowUpLeft, Activity, ShieldCheck, Layers3, Radio, ChevronLeft, Smartphone, Code2, Sparkles, Gauge, CircleHelp, ShieldAlert } from 'lucide-react';
import { MarketBoard } from '@/components/market-board';
import { HeroTicker } from '@/components/hero-ticker';
import { GoldCalculator } from '@/components/gold-calculator';
import { FaqPreview } from '@/components/faq-preview';
import { MarketRadar } from '@/components/market-radar';
import { BubbleBoard } from '@/components/bubble-board';
import { ChartTeaser } from '@/components/chart-teaser';
import { getPublicSnapshot } from '@/server/quotes';
import { computeLiveBubbles } from '@/server/live-bubbles';

// Do not freeze an unavailable/stale snapshot into the deployment's static HTML.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function Home() {
  const snapshot = await getPublicSnapshot();
  const bubbles = computeLiveBubbles(snapshot);
  return <main id="main" className="shell"><div className="topline"><span><span className="status-dot"/> دیده‌بان هوشمند بازار ایران</span><span>{snapshot.status === 'ok' ? 'قیمت دریافت‌شده · محاسبه شفاف' : snapshot.status === 'stale' ? 'آخرین داده ثبت‌شده · قیمت‌ها قدیمی‌اند' : 'در انتظار دریافت داده معتبر'}</span></div>
    <section className="hero"><div className="hero-copy hero-reveal"><span className="eyebrow gold-text"><span className="tiny-line"/> یک قدم آگاهانه‌تر</span><h1>بازار را واضح ببین.<br/><span className="gold-text">با آگاهی تصمیم بگیر.</span></h1><p>قیمت را ببین؛ فاصله‌اش با ارزش محاسباتی را هم ببین.<br/>ساده، شفاف، بدون ادعای تضمین سود.</p><div className="hero-actions"><Link href="#bubbles" className="button">مشاهده حباب‌ها <ArrowUpLeft size={18}/></Link><Link href="/#markets" className="text-link">رفتن به قیمت‌ها <ChevronLeft size={16}/></Link></div><div className="decision-strip" aria-label="سه پاسخ اصلی زر‌سیگنال"><span><Gauge size={15}/><b>الان چه خبر است؟</b><small>نبض بازار</small></span><span><CircleHelp size={15}/><b>چرا؟</b><small>حباب و روش</small></span><span><ShieldAlert size={15}/><b>ریسک من چیست؟</b><small>بدون سیگنال کور</small></span></div><div className="hero-features"><span><ShieldCheck size={16}/> زمان دریافت مشخص</span><span><Activity size={16}/> حباب طلا و دلار</span><span><Layers3 size={16}/> زبان ساده</span></div></div>
    <MarketRadar bubbles={bubbles}/></section>
    <HeroTicker quotes={snapshot.quotes} mode={snapshot.mode}/>
    <BubbleBoard bubbles={bubbles}/>
    <ChartTeaser/>
    <MarketBoard initial={snapshot} bubbles={bubbles}/>
    <GoldCalculator quotes={snapshot.quotes}/>
    <section className="product-grid section-reveal"><article className="panel premium-card"><span className="eyebrow gold-text"><Sparkles size={15}/> ZARSIGNAL PREMIUM</span><h2>برای نگاه عمیق‌تر<br/>به حرکت بازار.</h2><p>مسیر توسعهٔ ابزارهای تحلیل، هشدار قیمت و دنبال‌کردن بازارهای منتخب را ببینید.</p><Link className="button" href="/pricing">آشنایی با پریمیوم <ArrowUpLeft size={16}/></Link><span className="premium-decoration" aria-hidden="true">✳</span></article><article className="panel feature-card"><Code2 size={26}/><h3>داده، برای محصول شما</h3><p>یک API نسخه‌بندی‌شده برای اتصال وب‌سایت، اپ و ابزارهای تحلیلی شما.</p><Link href="/developers">مستندات توسعه‌دهندگان <ArrowUpLeft size={15}/></Link><code dir="ltr">GET /api/v1/quotes</code></article><article className="panel feature-card"><Smartphone size={26}/><h3>بازار، همیشه همراهت</h3><p>توسعهٔ اپ مشترک آیفون و اندروید، با تجربهٔ فارسی و اتصال به همین داده‌ها.</p><Link href="/mobile">وضعیت اپلیکیشن <ArrowUpLeft size={15}/></Link><span className="platforms">iOS <span>+</span> Android</span></article></section>
    <FaqPreview/>
    <section className="principles"><Radio size={22}/><div><h3>اعتماد، از شفافیت شروع می‌شود.</h3><p>دادهٔ قدیمی پنهان نمی‌شود، قیمت نمایشی برچسب دارد و پیش‌بینی بدون مدل معتبر منتشر نمی‌شود.</p></div><Link href="/methodology">استاندارد دادهٔ ما <ArrowUpLeft size={16}/></Link></section>
  </main>;
}
