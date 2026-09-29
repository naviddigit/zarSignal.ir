import Link from 'next/link';
import { notFound } from 'next/navigation';
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

  return (
    <main id="main" className="shell content-page subscription-review">
      <Link href="/pricing" className="text-link">← همه پلن‌ها</Link>
      <h1>پلن {plan.title}</h1>
      <section className="panel">
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
        <ul>{plan.features.filter(f => !f.startsWith('history:')).map(f => <li key={f}>{f}</li>)}</ul>
        <div className="subscription-payment-status" role="status">
          <strong>فروش آنلاین هنوز آغاز نشده است</strong>
          <p>درگاه پرداخت در حال آماده‌سازی است؛ فعلاً مبلغی کم نمی‌شود. می‌توانید امکانات رایگان را همین حالا ببینید.</p>
        </div>
        <Link className="button" href={isApi ? '/developers' : '/markets'}>
          {isApi ? 'مشاهده مستندات API' : 'ادامه با امکانات رایگان'}
        </Link>
        <Link className="text-link" href="/pricing">بازگشت به پلن‌ها</Link>
      </section>
    </main>
  );
}
