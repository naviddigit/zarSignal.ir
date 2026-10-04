import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatTehranDateTime } from '@/lib/tehran-datetime';
import { getCustomerDetail } from '@/server/admin-customers';
import { CustomerAccessForm } from '../customer-access-form';
import { CustomerProfileForm } from '../customer-profile-form';

export const dynamic = 'force-dynamic';

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let dbError = false;
  const detail = await getCustomerDetail(id).catch(() => {
    dbError = true;
    return null;
  });

  if (dbError) {
    return (
      <>
        <header className="admin-title">
          <div>
            <span className="eyebrow">CUSTOMER</span>
            <h1>جزئیات مشتری</h1>
            <p>اتصال پایگاه داده برقرار نیست.</p>
          </div>
          <Link className="button small-button" href="/admin/customers">بازگشت</Link>
        </header>
        <p className="form-error admin-message" role="alert">
          جزئیات مشتری خوانده نشد. پس از برقراری PostgreSQL دوباره تلاش کنید.
        </p>
      </>
    );
  }

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

      <section className="customers-detail-stack">
        <div>
          <h2>پروفایل</h2>
          <CustomerProfileForm
            userId={detail.user.id}
            name={detail.user.name}
            phone={detail.user.phone}
            email={detail.user.email}
          />
        </div>

        <div>
          <h2>تغییر دسترسی</h2>
          <p>پرداخت‌ها دست‌کاری نمی‌شوند. تغییر پلن اتمیک است و اشتراک موازی فعال ایجاد نمی‌کند.</p>
          <CustomerAccessForm
            userId={detail.user.id}
            currentExpiresAt={detail.entitlement.expiresAt?.toISOString() ?? null}
            plans={detail.plans}
          />
        </div>

        <section className="admin-card">
          <h2>اشتراک‌ها</h2>
          <ul className="customers-detail-list">
            {detail.subscriptions.length === 0 ? (
              <li>اشتراکی ثبت نشده.</li>
            ) : detail.subscriptions.map(subscription => (
              <li key={subscription.id}>
                <bdi>{subscription.product}</bdi> · {subscription.status}
                {' · '}{formatTehranDateTime(new Date(subscription.startsAt))}
                {' → '}{formatTehranDateTime(new Date(subscription.expiresAt))}
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-card">
          <h2>سوابق دستی (audit)</h2>
          <ul className="customers-detail-list">
            {detail.audits.length === 0 ? (
              <li>سابقه‌ای نیست.</li>
            ) : detail.audits.map(audit => (
              <li key={audit.id}>
                {formatTehranDateTime(new Date(audit.createdAt))} · {audit.actor} · {audit.action}
                {audit.reason ? ` · ${audit.reason}` : ''}
              </li>
            ))}
          </ul>
        </section>
      </section>
    </>
  );
}
