import Link from 'next/link';
import { FaqPreview } from '@/components/faq-preview';
import { HomeExperience } from '@/components/home-experience';
import { getPublicSnapshot } from '@/server/quotes';
import { computeLiveBubbles } from '@/server/live-bubbles';
import './homepage.css';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function Home() {
  const snapshot = await getPublicSnapshot();
  return <main id="main" className="shell homepage">
    <HomeExperience snapshot={snapshot} bubbles={computeLiveBubbles(snapshot)} />
    <section className="home-method" aria-labelledby="method-title">
      <div><span className="eyebrow">از عدد تا درک موقعیت</span><h2 id="method-title">چه چیزی بررسی می‌شود؟</h2></div>
      <div className="home-method__grid">
        <article><span>۰۱ / ارزش نسبی</span><h3>قیمت چه فاصله‌ای دارد؟</h3><p>حباب طلا، فاصله قیمت با ارزش محاسباتی را نشان می‌دهد؛ به‌تنهایی توصیه خرید نیست.</p></article>
        <article><span>۰۲ / روند و قدرت حرکت</span><h3>جهت حرکت تأیید شده؟</h3><p>تحلیل معتبر روند و قدرت حرکت هنوز ارائه نمی‌شود. عدد حباب جای این بررسی را نمی‌گیرد.</p></article>
        <article><span>۰۳ / هزینه و ریسک</span><h3>بعد از هزینه چه می‌ماند؟</h3><p>بدون هزینه و قیمت قابل معامله، نتیجه خالص یا پیشنهاد تبدیل ارائه نمی‌شود.</p></article>
      </div>
      <Link className="text-link" href="/methodology">روش محاسبه و محدودیت‌های داده ←</Link>
    </section>
    <section id="sample-analysis" className="panel home-sample" aria-labelledby="sample-title" data-analytics-event="sample_analysis_view">
      <span className="home-label">نمونه آموزشی — وضعیت فعلی بازار نیست</span>
      <h2 id="sample-title">حباب کمتر، یعنی وقت خرید؟</h2>
      <p>فرض کنید قیمت طلا پایین‌تر از ارزش محاسباتی آن باشد. این فقط یک مقایسه نسبی است؛ برای تصمیم، روند، هزینه و اعتبار داده نیز باید بررسی شوند.</p>
      <dl className="home-evidence"><div><dt>شاهد</dt><dd>فاصله قیمت با مبنای محاسباتی</dd></div><div><dt>اطلاعات ناکافی</dt><dd>روند، قدرت حرکت و هزینه معامله</dd></div><div><dt>نتیجه آموزشی</dt><dd>این شاهد به‌تنهایی برای تصمیم کافی نیست؛ نتیجه «نگهداری» هم صادر نشده است.</dd></div></dl>
      <details><summary>گزارش کامل چه چیزهایی لازم دارد؟</summary><p>بازه تحلیل، ورودی‌های معتبر و زمان‌دار، دلایل تأییدشده، هزینه، ریسک و شرط تغییر نظر باید از موتور معتبر بیایند. تا آماده‌شدن آن، جهت تبدیل، اطمینان مدل و قیمت هدف نمایش داده نمی‌شود.</p><p>حباب طلا و فاصله دلار ضمنی از یک رابطه مشتق می‌شوند؛ دو تأیید مستقل نیستند. کیفیت داده نیز احتمال سود نیست.</p></details>
      <p className="home-note">بدون تضمین سود · این نمونه گزارش زنده نیست و هیچ اعلانی تولید نمی‌کند.</p>
    </section>
    <section className="panel home-next" aria-labelledby="next-title"><div><h2 id="next-title">وقتی وضعیت تغییر کرد، باخبر شو</h2><p>هشدار شخصی و ارسال پیامک یا واتساپ هنوز فعال نیست. وضعیت فعلی این مسیر را ببینید.</p></div><Link className="text-link" href="/alerts">وضعیت هشدارهای من ←</Link></section>
    <section className="home-tools" aria-label="ابزارها و مسیرهای بیشتر"><Link href="/calculator">ماشین‌حساب طلا و تبدیل وزن</Link><Link href="/charts">نمودارها و تاریخچه موجود</Link><Link href="/pricing">تعرفه‌ها و وضعیت اشتراک</Link><Link href="/developers">برای کسب‌وکارها</Link></section>
    <p className="home-note">پرداخت هنوز فعال نیست. امکانات در حال توسعه، خدمت قابل خرید محسوب نمی‌شوند.</p>
    <FaqPreview />
  </main>;
}
