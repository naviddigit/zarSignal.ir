import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowUpLeft, Clock3, Gift, History } from 'lucide-react';
import { getPublishedPlans, type BillingPeriod } from '@/server/plans';
import { trialPolicy } from '@/server/analysis-trial';
import { planHistoryDays } from '@/lib/history-access';

export const metadata: Metadata = { title: 'پلن‌ها و اشتراک', alternates: { canonical: '/pricing' } };
export const dynamic = 'force-dynamic';

const periods: Record<BillingPeriod, string> = {
  MONTHLY: 'ماهانه',
  QUARTERLY: 'سه‌ماهه',
  YEARLY: 'سالانه',
  ONE_TIME: 'یک‌باره',
};

export default async function Pricing() {
  const plans = await getPublishedPlans();
  const trial = await trialPolicy();
  const freePlans = plans.filter(plan => {
    const price = plan.pricingVersions[0];
    return price && Number(price.price) === 0;
  });
  const paidPlans = plans.filter(plan => {
    const price = plan.pricingVersions[0];
    return !(price && Number(price.price) === 0);
  });

  return (
    <main id="main" className="shell content-page membership-page">
      <header className="membership-intro">
        <span className="eyebrow">شفاف و ساده</span>
        <h1>اول رایگان ببین؛ بعد اگر لازم شد تاریخچه بگیر</h1>
        <p>
          <b>رایگان:</b> قیمت زنده، حباب طلا، فاصله دلار، نمودار ۲۴ساعت و ماشین‌حساب فعال.
          {' '}
          <b>پولی:</b> فقط بازه تاریخچه بلندتر برای مقایسه روند — نه سیگنال خرید/فروش.
        </p>
        <div className="membership-funnel">
          <Link className="button" href="/markets">۱) دیدن قیمت رایگان <ArrowUpLeft size={16} /></Link>
          <Link className="text-link" href="/calculator">۲) ماشین‌حساب</Link>
          <Link className="text-link" href="#paid-plans">۳) تاریخچه بلند</Link>
        </div>
      </header>

      <section className="membership-free-band" aria-label="آنچه رایگان است">
        <header>
          <Gift size={18} />
          <div>
            <strong>همین حالا بدون پرداخت</strong>
            <p>اگر هنوز قیمت را ندیده‌اید، اول اینجا شروع کنید.</p>
          </div>
        </header>
        <ul>
          <li><Check size={15} /><span>تابلوی قیمت طلا، ارز و سکه با زمان دریافت</span></li>
          <li><Check size={15} /><span>حباب طلا و فاصله دلار (اختلاف قیمت، نه توصیه معامله)</span></li>
          <li><Check size={15} /><span>ماشین‌حساب: وزن، مظنه÷۴٫۳۳۱۸، عیار، حباب طلا</span></li>
          <li><Check size={15} /><span>نمودار ۲۴ ساعت</span></li>
        </ul>
        <Link className="button" href="/markets">شروع رایگان از قیمت‌ها <ArrowUpLeft size={16} /></Link>
      </section>

      {trial.enabled && trial.available && (
        <aside className="membership-trial">
          <Clock3 size={20} />
          <div>
            <strong>
              {new Intl.NumberFormat('fa-IR').format(trial.hours % 24 === 0 ? trial.hours / 24 : trial.hours)}{' '}
              {trial.hours % 24 === 0 ? 'روز' : 'ساعت'} فرصت بررسی تاریخچه
            </strong>
            <p>یک بار برای هر حساب؛ بعد از دیدن قیمت رایگان، اگر خواستید گذشته بازار را تست کنید.</p>
          </div>
          <Link href="/analysis/gold_melted">شروع آزمایشی ←</Link>
        </aside>
      )}

      {freePlans.length > 0 && (
        <div className="membership-grid membership-grid--free">
          {freePlans.map(plan => {
            const price = plan.pricingVersions[0];
            const days = planHistoryDays(plan.features);
            return (
              <article className="membership-card" key={plan.id}>
                <header>
                  <span className="membership-audience">رایگان برای همیشه</span>
                  <h2>{plan.title}</h2>
                </header>
                <div className="membership-price"><strong>رایگان</strong></div>
                <p className="membership-history">تاریخچه پایه <b>{days ? `${new Intl.NumberFormat('fa-IR').format(days)} روز` : '۲۴ ساعت'}</b></p>
                <ul>
                  {plan.features.filter(feature => !feature.startsWith('history:')).map(feature => (
                    <li key={feature}><Check size={16} /><span>{feature}</span></li>
                  ))}
                </ul>
                <Link className="button membership-secondary" href="/markets">شروع رایگان <ArrowUpLeft size={16} /></Link>
              </article>
            );
          })}
        </div>
      )}

      <section id="paid-plans" className="membership-paid-intro">
        <History size={18} />
        <div>
          <h2>پلن‌های تاریخچه</h2>
          <p>فقط وقتی لازم دارید روند گذشته را ببینید. پرداخت آنلاین هنوز فعال نیست؛ الان مبلغی کم نمی‌شود.</p>
        </div>
      </section>

      <div className="membership-grid">
        {paidPlans.map(plan => {
          const price = plan.pricingVersions[0];
          const days = planHistoryDays(plan.features);
          return (
            <article className={`membership-card ${plan.slug === 'home' || plan.slug === 'home-trader-preview' ? 'is-highlighted' : ''}`} key={plan.id}>
              <header>
                <span className="membership-audience">{days >= 90 ? 'بررسی بلندمدت' : 'پیگیری روزانه'}</span>
                <h2>{plan.title}</h2>
              </header>
              <div className="membership-price">
                {price ? (
                  <>
                    <strong>{new Intl.NumberFormat('fa-IR').format(Number(price.price))}</strong>
                    <span>{price.currency} / {periods[price.billingPeriod]}</span>
                  </>
                ) : (
                  <span>قیمت در انتظار انتشار</span>
                )}
              </div>
              <p className="membership-history">
                تاریخچه قابل دسترسی <b>{days ? `${new Intl.NumberFormat('fa-IR').format(days)} روز` : '۲۴ ساعت'}</b>
              </p>
              <ul>
                {plan.features.filter(feature => !feature.startsWith('history:')).map(feature => (
                  <li key={feature}><Check size={16} /><span>{feature}</span></li>
                ))}
              </ul>
              <Link className="button" href={`/subscribe/${plan.slug}`}>
                بررسی پلن {plan.title}
                <ArrowUpLeft size={16} />
              </Link>
            </article>
          );
        })}
      </div>

      {!plans.length && (
        <p className="panel">پلن‌ها هنوز منتشر نشده‌اند. قیمت‌ها و ماشین‌حساب در دسترس شما هستند.</p>
      )}

      <section className="membership-clarity">
        <h2>قبل از خرید بدانید</h2>
        <p>اشتراک = تاریخچه بلندتر. سیگنال قطعی خرید/فروش یا تضمین سود نیست.</p>
        <p>نقره و حباب سکه تا تأیید مدل، عدد تحلیلی نشان نمی‌دهند؛ ابزارهای وزن و عیار فعال‌اند.</p>
        <Link href="/markets">برگرد به امکانات رایگان ←</Link>
      </section>
    </main>
  );
}
