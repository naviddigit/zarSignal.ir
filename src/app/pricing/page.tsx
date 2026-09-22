import { planHistoryDays } from '@/lib/history-access';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPlans, type BillingPeriod } from '@/server/plans';

export const metadata: Metadata = { title: 'اشتراک‌ها و تعرفه‌ها', alternates: { canonical: '/pricing' } };
export const dynamic = 'force-dynamic';
const period: Record<BillingPeriod, string> = { MONTHLY: 'ماهانه', QUARTERLY: 'سه‌ماهه', YEARLY: 'سالانه', ONE_TIME: 'یک‌باره' };

export default async function Pricing() {
  const plans = await getPublishedPlans();
  return <main id="main" className="shell content-page"><span className="eyebrow">ZARSIGNAL MEMBERSHIP</span><h1>پلن متناسب با شیوه استفاده شما</h1><p className="lead">رایگان شروع کنید؛ برای مقایسه روند قیمت و حباب در هفته‌ها و ماه‌های گذشته، تاریخچه عمیق‌تر را انتخاب کنید.</p>
    {process.env.NODE_ENV !== 'production' && <p className="admin-message is-ok">تعرفه‌های فعلی فقط برای تست تجربهٔ محصول هستند و فروش واقعی محسوب نمی‌شوند.</p>}
    {plans.length === 0 ? <section className="panel pricing-empty"><h2>تعرفه‌ای هنوز منتشر نشده است</h2><p>فروش فعال نیست و هیچ مبلغی از شما دریافت نمی‌شود.</p></section> : <div className="pricing-grid">{plans.map(plan => {
      const price = plan.pricingVersions[0];
      return <article className="panel" key={plan.id}><span className="eyebrow">{plan.webAvailable ? 'WEB' : ''}{plan.webAvailable && plan.mobileAvailable ? ' + ' : ''}{plan.mobileAvailable ? 'MOBILE' : ''}</span><h2>{plan.title}</h2>{price ? <p className="plan-price"><strong>{new Intl.NumberFormat('fa-IR').format(Number(price.price))}</strong> {price.currency} <small>{period[price.billingPeriod]}</small></p> : <p>قیمت فعال ثبت نشده است.</p>}<p>تاریخچه نمودار: {planHistoryDays(plan.features) ? `${new Intl.NumberFormat('fa-IR').format(planHistoryDays(plan.features))} روز` : '۲۴ ساعت رایگان'}</p><ul>{plan.features.filter(f => !f.startsWith('history:')).map(feature => <li key={feature}>{feature}</li>)}</ul><Link href="/login" className="button">ساخت حساب</Link></article>;
    })}</div>}
    <section className="panel pricing-empty"><h2>پیش از پرداخت</h2><p>قیمت‌های آغازین منتشر شده‌اند، اما درگاه پرداخت هنوز فعال نیست و فعلاً مبلغی دریافت نمی‌شود. تاریخچه فقط روزهای دارای داده معتبر را شامل می‌شود؛ بازه ۹۰روزه به معنی تضمین وجود داده برای همه روزها نیست. هیچ پلنی تضمین سود یا توصیه خرید و فروش نیست.</p></section>
  </main>;
}
