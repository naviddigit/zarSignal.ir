import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { hasCapability } from '@/lib/capabilities';
import { resolveAccountEntitlement } from '@/server/account-entitlement';
import { MarketAlertsClient } from '@/components/market-alerts-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'هشدار تغییر بازار',
  description: 'شرط عبور قیمت یا اختلاف با مرجع — هشدار تغییر بازار، نه توصیهٔ خرید یا فروش.',
  alternates: { canonical: '/alerts' },
};

export default async function AlertsPage() {
  const session = await auth().catch(() => null);
  const entitlement = session?.user?.id
    ? await resolveAccountEntitlement(session.user.id).catch(() => null)
    : null;
  const canManage = Boolean(
    entitlement
    && hasCapability(entitlement.level, 'BASIC_ALERTS')
    && entitlement.statusLabel !== 'در انتظار پرداخت',
  );

  return (
    <main id="main" className="shell content-page">
      <nav className="chart-breadcrumb" aria-label="مسیر">
        <Link href="/">خانه</Link>
        <span>/</span>
        <span>هشدار تغییر بازار</span>
      </nav>
      <header className="admin-title">
        <div>
          <span className="eyebrow">پایش تغییرات</span>
          <h1>هشدار تغییر بازار</h1>
          <p>
            عبور قیمت، عبور اختلاف با مرجع، یا تغییر معتبر نسبت طلا/نقره.
            این‌ها توصیهٔ خرید/فروش نیستند. ارزیابی روی سرور پس از دادهٔ معتبر جدید انجام می‌شود.
          </p>
        </div>
      </header>
      {!session?.user ? (
        <p><Link className="button" href={`/login?next=${encodeURIComponent('/alerts')}`}>ورود برای مدیریت هشدار</Link></p>
      ) : null}
      <MarketAlertsClient canManage={canManage} />
    </main>
  );
}
