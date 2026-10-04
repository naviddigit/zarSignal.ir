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
  let loadError: string | null = null;
  try {
    rows = await searchCustomers(q);
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error ?? '');
    loadError = /deadline|timeout|timed out/i.test(raw)
      ? 'خواندن فهرست طول کشید؛ دوباره تلاش کنید.'
      : 'اتصال پایگاه داده برقرار نیست؛ فهرست مشتری‌ها خوانده نشد.';
  }
  const dbError = Boolean(loadError);

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

      {loadError ? (
        <p className="form-error admin-message" role="alert">
          {loadError} این به‌معنای خالی‌بودن مشتری‌ها نیست.
        </p>
      ) : null}

      <CustomersWorkspace initialQuery={q} initialRows={rows} dbError={dbError} />
    </>
  );
}
