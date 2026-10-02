import { CustomerAccessForm } from '../customer-access-form';
import { formatTehranDateTime } from '@/lib/tehran-datetime';
import { getCustomerDetail } from '@/server/admin-customers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCustomerDetail(id).catch(() => null);
  if (!detail) notFound();

  return (
    <>
      <header className="admin-title">
        <div>
          <span className="eyebrow">CUSTOMER</span>
          <h1>{detail.user.name || detail.user.email || detail.user.id}</h1>
          <p dir="ltr">{detail.user.email || detail.user.id}</p>
          <p>
            پلن فعلی: {detail.entitlement.planLabel} · وضعیت: {detail.entitlement.statusLabel}
            {detail.entitlement.expiresAt
              ? ` · انقضا: ${formatTehranDateTime(detail.entitlement.expiresAt)}`
              : ''}
          </p>
          <p>{detail.accessCreditLabel}</p>
        </div>
        <Link className="button small-button" href="/admin/customers">بازگشت</Link>
      </header>

      <section>
        <h2>تغییر دسترسی</h2>
        <p>پرداخت‌ها دست‌کاری نمی‌شوند. تغییر پلن اتمیک است و اشتراک موازی فعال ایجاد نمی‌کند.</p>
        <CustomerAccessForm
          userId={detail.user.id}
          currentExpiresAt={detail.entitlement.expiresAt?.toISOString() ?? null}
          plans={detail.plans}
        />
      </section>

      <section className="admin-card">
        <h2>اشتراک‌ها</h2>
        <ul>
          {detail.subscriptions.length === 0 ? <li>اشتراکی ثبت نشده.</li> : detail.subscriptions.map(s => (
            <li key={s.id}>
              <bdi>{s.product}</bdi> · {s.status}
              {' · '}{formatTehranDateTime(new Date(s.startsAt))}
              {' → '}{formatTehranDateTime(new Date(s.expiresAt))}
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <h2>سوابق دستی (audit)</h2>
        <ul>
          {detail.audits.length === 0 ? <li>سابقه‌ای نیست.</li> : detail.audits.map(a => (
            <li key={a.id}>
              {formatTehranDateTime(new Date(a.createdAt))} · {a.actor} · {a.action}
              {a.reason ? ` · ${a.reason}` : ''}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
