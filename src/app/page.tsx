import Link from 'next/link';
import { ArrowUpLeft, Activity, ShieldCheck, Layers3, Radio, ChevronLeft, Smartphone, Code2, Sparkles, Gauge, CircleHelp, ShieldAlert } from 'lucide-react';
import { MarketBoard } from '@/components/market-board';
import { HeroTicker } from '@/components/hero-ticker';
import { GoldCalculator } from '@/components/gold-calculator';
import { FaqPreview } from '@/components/faq-preview';
import { getPublicSnapshot } from '@/server/quotes';
import { computeLiveBubbles } from '@/server/live-bubbles';

function formatBubblePercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}٪`;
}

export default async function Home() {
  const snapshot = await getPublicSnapshot();
  const bubbles = computeLiveBubbles(snapshot);
  const cards = [
    { key: 'GOLD_BUBBLE' as const, name: 'طلا', symbol: 'Au', type: 'gold', desc: 'فاصله قیمت بازار ۱۸عیار (مشتق از مظنه) با ارزش محاسباتی' },
    { key: 'SILVER_BUBBLE' as const, name: 'نقره', symbol: 'Ag', type: 'silver', desc: 'تا دریافت قیمت نقره ۹۹۹ داخلی فعال نمی‌شود' },
    { key: 'USD_BUBBLE' as const, name: 'دلار', symbol: '$', type: 'currency', desc: 'فاصله دلار بازار با دلار ضمنی از طلا (نه ارزش بنیادی)' },
  ];
  return <main id="main" className="shell"><div className="topline"><span><span className="status-dot"/> دیده‌بان هوشمند بازار ایران</span><span>{snapshot.mode === 'demo' ? 'نسخهٔ پیش‌نمایش · دادهٔ نمونه' : 'قیمت‌ها با زمان و منبع مشخص'}</span></div>
    <section className="hero"><div className="hero-copy hero-reveal"><span className="eyebrow gold-text"><span className="tiny-line"/> یک قدم آگاهانه‌تر</span><h1>بازار را واضح ببین.<br/><span className="gold-text">با آگاهی تصمیم بگیر.</span></h1><p>طلا، نقره و ارز؛ همه در یک قاب.<br/>از شلوغی عددها فاصله بگیر و روی آنچه مهم است تمرکز کن.</p><div className="hero-actions"><Link href="#markets" className="button">کشف بازارها <ArrowUpLeft size={18}/></Link><Link href="/methodology" className="text-link">زرسیگنال چطور کار می‌کند؟ <ChevronLeft size={16}/></Link></div><div className="decision-strip" aria-label="سه پاسخ اصلی زر‌سیگنال"><span><Gauge size={15}/><b>الان چه خبر است؟</b><small>نبض بازار</small></span><span><CircleHelp size={15}/><b>چرا؟</b><small>منبع و روش</small></span><span><ShieldAlert size={15}/><b>ریسک من چیست؟</b><small>تحلیل شفاف</small></span></div><div className="hero-features"><span><ShieldCheck size={16}/> منبع شفاف</span><span><Activity size={16}/> پایش دوره‌ای</span><span><Layers3 size={16}/> نگاه یکپارچه</span></div></div>
    <div className="radar-art" aria-label="تصویر مفهومی رادار بازار، بدون نمایش دادهٔ تحلیلی"><div className="radar-grid"/><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="radar-ray"/><span className="radar-label label-top">XAU / GOLD</span><span className="radar-label label-bottom">MARKET INTELLIGENCE</span><div className="radar-center"><Activity size={38}/><strong>رادار بازار</strong><small>شفافیت در یک نگاه</small></div><span className="radar-token token-gold">Au<small>طلا</small></span><span className="radar-token token-silver">Ag<small>نقره</small></span><span className="radar-token token-dollar">$<small>دلار</small></span><div className="radar-caption"><span className="status-dot"/> سه بازار، یک تصویر روشن</div></div></section>
    <HeroTicker quotes={snapshot.quotes} mode={snapshot.mode}/>
    <section id="bubbles" className="bubble-section section-reveal"><div className="section-heading"><div><span className="eyebrow">BUBBLE RADAR</span><h2>زیر پوست قیمت‌ها</h2></div><Link className="text-link" href="/methodology">حباب بازار چیست؟ <ArrowUpLeft size={15}/></Link></div><div className="bubble-grid">{cards.map((a, i) => {
      const state = bubbles.find(item => item.key === a.key)!;
      const value = state.status === 'ok' && state.percent != null ? formatBubblePercent(state.percent) : '—';
      const caption = state.status === 'ok' ? 'عدد حباب · مشتق از مظنه · سیگنال معامله نیست' : state.status === 'blocked' ? 'قفل Spec' : 'داده کافی نیست';
      return <article className={`panel bubble-card bubble-${a.type}`} key={a.name}><div className="bubble-title"><span className={`asset-icon ${a.type}`}>{a.symbol}</span><h3>حباب {a.name}</h3><span className="muted">۰{i + 1}</span></div><div className="bubble-value">{value}<span>{caption}</span></div><div className="gauge"><span/><span/><span/><i/></div><div className="gauge-labels"><span>منفی</span><span>خنثی</span><span>مثبت</span></div><p>{a.desc}</p><Link href="/methodology">دربارهٔ محاسبه <ArrowUpLeft size={14}/></Link></article>;
    })}</div><p className="subtle-note">حباب طلا و فاصله دلار از مظنه مشتق می‌شوند. حباب نقره و برچسب مثبت/خنثی/منفی تا تأیید Spec قفل‌اند.</p></section>
    <MarketBoard initial={snapshot}/>
    <GoldCalculator quotes={snapshot.quotes}/>
    <section className="product-grid section-reveal"><article className="panel premium-card"><span className="eyebrow gold-text"><Sparkles size={15}/> ZARSIGNAL PREMIUM</span><h2>برای نگاه عمیق‌تر<br/>به حرکت بازار.</h2><p>مسیر توسعهٔ ابزارهای تحلیل، هشدار قیمت و دنبال‌کردن بازارهای منتخب را ببینید.</p><Link className="button" href="/pricing">آشنایی با پریمیوم <ArrowUpLeft size={16}/></Link><span className="premium-decoration" aria-hidden="true">✳</span></article><article className="panel feature-card"><Code2 size={26}/><h3>داده، برای محصول شما</h3><p>یک API نسخه‌بندی‌شده برای اتصال وب‌سایت، اپ و ابزارهای تحلیلی شما.</p><Link href="/developers">مستندات توسعه‌دهندگان <ArrowUpLeft size={15}/></Link><code dir="ltr">GET /api/v1/quotes</code></article><article className="panel feature-card"><Smartphone size={26}/><h3>بازار، همیشه همراهت</h3><p>توسعهٔ اپ مشترک آیفون و اندروید، با تجربهٔ فارسی و اتصال به همین داده‌ها.</p><Link href="/mobile">وضعیت اپلیکیشن <ArrowUpLeft size={15}/></Link><span className="platforms">iOS <span>+</span> Android</span></article></section>
    <FaqPreview/>
    <section className="principles"><Radio size={22}/><div><h3>اعتماد، از شفافیت شروع می‌شود.</h3><p>دادهٔ قدیمی پنهان نمی‌شود، قیمت نمایشی برچسب دارد و پیش‌بینی بدون مدل معتبر منتشر نمی‌شود.</p></div><Link href="/methodology">استاندارد دادهٔ ما <ArrowUpLeft size={16}/></Link></section>
  </main>;
}
