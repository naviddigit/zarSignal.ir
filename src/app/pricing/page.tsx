import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowUpLeft, Clock3, Gift, History, Code2 } from 'lucide-react';
import { getPublishedPlans, type BillingPeriod, type ManagedPlan } from '@/server/plans';
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

function isApiPlan(plan: ManagedPlan) {
  return /api/i.test(plan.slug) || /api/i.test(plan.title);
}

function isPaid(plan: ManagedPlan) {
  const price = plan.pricingVersions[0];
  return !(price && Number(price.price) === 0);
}

export default async function Pricing() {
  const plans = await getPublishedPlans();
  const trial = await trialPolicy();
  const freePlans = plans.filter(plan => !isPaid(plan) && !isApiPlan(plan));
  const historyPlans = plans.filter(plan => isPaid(plan) && !isApiPlan(plan));
  const apiPlans = plans.filter(isApiPlan);

  return (
    <main id="main" className="shell content-page membership-page">
      <header className="membership-intro">
        <span className="eyebrow">شفاف و ساده</span>
        <h1>اول رایگان ببین؛ بعد تاریخچه یا API بخر</h1>
        <p>
          <b>رایگان:</b> قیمت، حباب طلا، فاصله دلار، نمودار ۲۴ساعت، ماشین‌حساب.
          {' '}
          <b>تاریخچه:</b> ۷ / ۳۰ / ۹۰ روز.
          {' '}
          <b>API:</b> کلید و سهمیه برای اتصال به سیستم خودتان.
        </p>
        <div className="membership-funnel">
          <Link className="button" href="/markets">۱) قیمت رایگان <ArrowUpLeft size={16} /></Link>
          <Link className="text-link" href="#paid-plans">۲) تاریخچه</Link>
          <Link className="text-link" href="#api-plans">۳) API</Link>
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
          <li><Check size={15} /><span>تابلوی قیمت با زمان دریافت</span></li>
          <li><Check size={15} /><span>حباب طلا و فاصله دلار</span></li>
          <li><Check size={15} /><span>ماشین‌حساب فعال (وزن، مظنه÷۴٫۳۳۱۸، عیار)</span></li>
          <li><Check size={15} /><span>نمودار ۲۴ ساعت — بازه‌های قفل‌شده در پلن تاریخچه</span></li>
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
            <p>یک بار برای هر حساب؛ بعد از دیدن قیمت رایگان.</p>
          </div>
          <Link href="/analysis/gold_melted">شروع آزمایشی ←</Link>
        </aside>
      )}

      {freePlans.length > 0 && (
        <div className="membership-grid membership-grid--free">
          {freePlans.map(plan => {
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
          <p>باز کردن ۷ / ۳۰ / ۹۰ روز روی نمودار. پرداخت آنلاین هنوز فعال نیست؛ الان مبلغی کم نمی‌شود.</p>
        </div>
      </section>

      <div className="membership-grid">
        {historyPlans.map(plan => {
          const price = plan.pricingVersions[0];
          const days = planHistoryDays(plan.features);
          return (
            <article className={`membership-card ${plan.slug === 'home' || plan.slug.includes('home') ? 'is-highlighted' : ''}`} key={plan.id}>
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

      <section id="api-plans" className="membership-paid-intro">
        <Code2 size={18} />
        <div>
          <h2>پلن API برای کسب‌وکار</h2>
          <p>کلید Bearer، سهمیه روزانه، و قیمت با منبع/زمان برای اتصال به سایت، ربات یا داشبورد خودتان. جزئیات فنی در صفحه توسعه‌دهندگان است.</p>
        </div>
      </section>

      {apiPlans.length > 0 ? (
        <div className="membership-grid">
          {apiPlans.map(plan => {
            const price = plan.pricingVersions[0];
            const daily = plan.apiLimits?.daily;
            return (
              <article className="membership-card" key={plan.id}>
                <header>
                  <span className="membership-audience">برای توسعه‌دهنده و کسب‌وکار</span>
                  <h2>{plan.title}</h2>
                </header>
                <div className="membership-price">
                  {price && Number(price.price) === 0 ? (
                    <strong>رایگان</strong>
                  ) : price ? (
                    <>
                      <strong>{new Intl.NumberFormat('fa-IR').format(Number(price.price))}</strong>
                      <span>{price.currency} / {periods[price.billingPeriod]}</span>
                    </>
                  ) : (
                    <span>قیمت در انتظار انتشار</span>
                  )}
                </div>
                <p className="membership-history">
                  سهمیه روزانه <b>{daily ? `${new Intl.NumberFormat('fa-IR').format(daily)} درخواست` : 'طبق قرارداد'}</b>
                </p>
                <ul>
                  {plan.features.filter(feature => !feature.startsWith('history:')).map(feature => (
                    <li key={feature}><Check size={16} /><span>{feature}</span></li>
                  ))}
                  <li><Check size={16} /><span>مستندات: /developers</span></li>
                </ul>
                <div className="membership-card__actions">
                  <Link className="button" href={`/subscribe/${plan.slug}`}>درخواست پلن API <ArrowUpLeft size={16} /></Link>
                  <Link className="text-link" href="/developers">مشاهده مستندات ←</Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <article className="panel membership-api-fallback">
          <h3>API زرسیگنال</h3>
          <p>endpointهای `/api/v1/quotes` و `/api/v1/analysis` آماده‌اند. فروش کلید به‌زودی از همین صفحه فعال می‌شود؛ فعلاً مستندات را ببینید و برای دسترسی تجاری پیام بدهید.</p>
          <div className="membership-funnel">
            <Link className="button" href="/developers">مستندات API <ArrowUpLeft size={16} /></Link>
            <Link className="text-link" href="/subscribe/api">ثبت علاقه به API ←</Link>
          </div>
        </article>
      )}

      {!plans.length && (
        <p className="panel">پلن‌ها هنوز منتشر نشده‌اند. قیمت‌ها و ماشین‌حساب در دسترس شما هستند.</p>
      )}

      <section className="membership-clarity">
        <h2>قبل از خرید بدانید</h2>
        <p>تاریخچه = گذشته بازار. API = اتصال داده به سیستم شما. هیچ‌کدام سیگنال قطعی یا تضمین سود نیست.</p>
        <p>پرداخت آنلاین هنوز فعال نیست؛ انتخاب پلن الان مبلغی کم نمی‌کند.</p>
        <Link href="/markets">برگرد به امکانات رایگان ←</Link>
      </section>
    </main>
  );
}
