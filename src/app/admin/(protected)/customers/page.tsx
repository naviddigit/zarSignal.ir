import { searchCustomers } from '@/server/admin-customers';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function faDate(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const rows = await searchCustomers(q).catch(() => []);

  return (
    <>
      <header className="admin-title">
        <div>
          <span className="eyebrow">CUSTOMERS</span>
          <h1>مدیریت مشتری‌ها</h1>
          <p>جست‌وجو، پلن فعلی، وضعیت، انقضا و اعتبار دسترسی زمانی. سوابق پرداخت دست‌کاری نمی‌شوند.</p>
        </div>
      </header>

      <form className="admin-card" method="get" action="/admin/customers">
        <label>
          <span>جست‌وجو (ایمیل، نام یا شناسه)</span>
          <input className="ds-input" name="q" defaultValue={q} placeholder="مثلاً user@example.com" dir="ltr" />
        </label>
        <button type="submit" className="button small-button">جست‌وجو</button>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>مشتری</th>
              <th>پلن</th>
              <th>وضعیت</th>
              <th>انقضا (تهران)</th>
              <th>اعتبار دسترسی</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6}>مشتری‌ای یافت نشد.</td></tr>
            ) : rows.map(row => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name || '—'}</strong>
                  <div dir="ltr">{row.email || row.id}</div>
                </td>
                <td>{row.planLabel}</td>
                <td>{row.statusLabel}</td>
                <td>{faDate(row.expiresAt)}</td>
                <td>{row.accessCreditLabel}</td>
                <td><Link className="button small-button" href={`/admin/customers/${row.id}`}>مدیریت</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
