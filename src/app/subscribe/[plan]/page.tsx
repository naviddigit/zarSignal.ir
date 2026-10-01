import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { getPublishedPlans } from '@/server/plans';
import { planHistoryDays } from '@/lib/history-access';

export const dynamic = 'force-dynamic';

export default async function Subscribe({ params }: { params: Promise<{ plan: string }> }) {
  const { plan: slug } = await params;
  const plan = (await getPublishedPlans()).find(item => item.slug === slug);
  if (!plan) notFound();
  const price = plan.pricingVersions[0];
  const isApi = /api/i.test(plan.slug) || /api/i.test(plan.title);
  const days = planHistoryDays(plan.features);
  const daily = plan.apiLimits?.daily;
  const features = plan.features.filter(f => !f.startsWith('history:'));

  return (
    <main id="main" className="shell content-page subscription-review">
      <Link href="/pricing" className="subscription-back">
        <ArrowRight size={16} aria-hidden="true" />
        همه پلن‌ها
      </Link>
      <header className="subscription-review__head">
        <h1>پلن {plan.title}</h1>
        <p>خلاصه انتخاب شما — هنوز پرداخت آنلاین فعال نیست.</p>
      </header>
      <section className="panel subscription-review__card">
        <h2>خلاصه انتخاب شما</h2>
        <dl>
          <div>
            <dt>مبلغ</dt>
            <dd>{price ? `${new Intl.NumberFormat('fa-IR').format(Number(price.price))} ${price.currency}` : 'در انتظار انتشار'}</dd>
          </div>
          <div>
            <dt>دوره</dt>
            <dd>{price ? ({ MONTHLY: 'ماهانه', QUARTERLY: 'سه‌ماهه', YEARLY: 'سالانه', ONE_TIME: 'یک‌باره' } as const)[price.billingPeriod] : '—'}</dd>
          </div>
          <div>
            <dt>{isApi ? 'سهمیه API' : 'تاریخچه'}</dt>
            <dd>
              {isApi
                ? (daily ? `${new Intl.NumberFormat('fa-IR').format(daily)} درخواست / روز` : 'طبق قرارداد')
                : (days ? `${new Intl.NumberFormat('fa-IR').format(days)} روز` : '۲۴ ساعت رایگان')}
            </dd>
          </div>
        </dl>
        {features.length ? (
          <ul className="subscription-review__features">
            {features.map(f => (
              <li key={f}>
                <Check size={14} aria-hidden="true" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="subscription-payment-status" role="status">
          <strong>فروش آنلاین هنوز آغاز نشده است</strong>
          <p>درگاه پرداخت در حال آماده‌سازی است؛ فعلاً مبلغی کم نمی‌شود. می‌توانید امکانات رایگان را همین حالا ببینید.</p>
        </div>
        <Link className="button" href={isApi ? '/developers' : '/markets'}>
          {isApi ? 'مشاهده مستندات API' : 'ادامه با امکانات رایگان'}
        </Link>
        <Link className="subscription-back subscription-back--soft" href="/pricing">
          <ArrowRight size={14} aria-hidden="true" />
          بازگشت به پلن‌ها
        </Link>
      </section>
    </main>
  );
}
