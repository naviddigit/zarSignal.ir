import { searchCustomers } from '@/server/admin-customers';
import { CustomersWorkspace } from './customers-workspace';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  let rows: Awaited<ReturnType<typeof searchCustomers>> = [];
  let dbError = false;
  try {
    rows = await searchCustomers(q);
  } catch {
    dbError = true;
  }

  return (
    <>
      <header className="admin-title">
        <div>
          <span className="eyebrow">CUSTOMERS</span>
          <h1>مدیریت مشتری‌ها</h1>
          <p>جست‌وجو، ویرایش پروفایل، پلن و اعتبار دسترسی زمانی. سوابق پرداخت دست‌کاری نمی‌شوند.</p>
        </div>
        <span className={`ds-meta-chip ${dbError ? '' : 'is-ok'}`.trim()}>
          {dbError ? 'دیتابیس قطع' : 'PostgreSQL متصل'}
        </span>
      </header>

      {dbError ? (
        <p className="form-error admin-message" role="alert">
          اتصال پایگاه داده برقرار نیست؛ فهرست مشتری‌ها خوانده نشد. این به‌معنای خالی‌بودن مشتری‌ها نیست — تا اتصال PostgreSQL درست نشود جست‌وجو و ویرایش کار نمی‌کند.
        </p>
      ) : null}

      <CustomersWorkspace initialQuery={q} initialRows={rows} dbError={dbError} />
    </>
  );
}
