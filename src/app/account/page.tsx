import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpLeft,
  BellOff,
  Calculator,
  CreditCard,
  History,
  LogOut,
  Store,
  UserRound,
} from 'lucide-react';
import { auth, signOut } from '@/auth';
import { db } from '@/lib/db';
import { PendingButton } from '@/components/pending-button';
import { deleteP0TestAccount } from '@/app/login/actions';

export const metadata: Metadata = {
  title: 'حساب من',
  description: 'پروفایل، اشتراک و دسترسی‌های زرسیگنال.',
  alternates: { canonical: '/account' },
};
export const dynamic = 'force-dynamic';

const statusFa: Record<string, string> = {
  PENDING: 'در انتظار پرداخت',
  ACTIVE: 'فعال',
  CANCELED: 'لغو شده',
  EXPIRED: 'منقضی',
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ reserved?: string }>;
}) {
  const { reserved } = await searchParams;
  const session = await auth().catch(() => null);
  const user = session?.user;

  if (!user?.id) {
    return (
      <main id="main" className="shell content-page account-page">
        <span className="eyebrow">حساب کاربری</span>
        <h1>برای پروفایل وارد شوید</h1>
        <p className="lead">بعد از ورود، اشتراک و دسترسی تاریخچه اینجا می‌آید.</p>
        <Link className="button" href="/login?next=%2Faccount">ورود / عضویت <ArrowUpLeft size={16} /></Link>
      </main>
    );
  }

  const subscriptions = await db.subscription.findMany({
    where: { userId: user.id },
    orderBy: { startsAt: 'desc' },
    take: 20,
  }).catch(() => []);

  const hasActive = subscriptions.some(s => s.status === 'ACTIVE');
  const hasPending = subscriptions.some(s => s.status === 'PENDING');

  return (
    <main id="main" className="shell content-page account-page">
      <span className="eyebrow">پروفایل</span>
      <header className="account-hero">
        <span className="account-hero__avatar" aria-hidden="true"><UserRound size={26} /></span>
        <div>
          <h1>{user.name || 'کاربر زرسیگنال'}</h1>
          <p>{user.email || 'حساب فعال'}</p>
        </div>
      </header>

      {reserved ? (
        <p className="lead" role="status">
          پلن «{reserved}» ثبت شد (در انتظار پرداخت). درگاه هنوز فعال نیست.
        </p>
      ) : null}

      <section className="account-subs" aria-label="اشتراک‌ها">
        <h2>اشتراک‌های من</h2>
        {subscriptions.length ? (
          <ul className="account-subs__list">
            {subscriptions.map(item => (
              <li key={item.id}>
                <strong>{item.product}</strong>
                <span>{statusFa[item.status] ?? item.status}</span>
                <small>
                  تا {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(item.expiresAt)}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            هنوز اشتراکی ثبت نشده.{' '}
            <Link className="text-link" href="/pricing">انتخاب پلن ←</Link>
          </p>
        )}
      </section>

      <section className="account-access" aria-label="وضعیت دسترسی">
        <h2>الان چه چیزی باز است؟</h2>
        <ul className="account-access__list">
          <li>
            <Store size={16} aria-hidden="true" />
            <div>
              <strong>قیمت و حباب زنده</strong>
              <small>همیشه رایگان</small>
            </div>
          </li>
          <li>
            <Calculator size={16} aria-hidden="true" />
            <div>
              <strong>ماشین‌حساب تأییدشده</strong>
              <small>همیشه رایگان</small>
            </div>
          </li>
          <li>
            <History size={16} aria-hidden="true" />
            <div>
              <strong>تاریخچه نمودار</strong>
              <small>
                {hasActive
                  ? 'طبق پلن فعال شما'
                  : hasPending
                    ? 'پلن ثبت شده؛ بعد از پرداخت فعال می‌شود'
                    : '۲۴ ساعت رایگان · ۷/۳۰/۹۰ روز با اشتراک'}
              </small>
            </div>
          </li>
          <li className="is-muted">
            <BellOff size={16} aria-hidden="true" />
            <div>
              <strong>هشدار و اعلان قیمت</strong>
              <small>هنوز در محصول فعال نیست — بعد از تأیید Source منتشر می‌شود</small>
            </div>
          </li>
          <li>
            <CreditCard size={16} aria-hidden="true" />
            <div>
              <strong>بعد از خرید چه می‌شود؟</strong>
              <small>فعلاً فقط عمق تاریخچه (و در پلن API، سهمیه درخواست). سیگنال خرید/فروش نیست.</small>
            </div>
          </li>
        </ul>
        <div className="account-access__actions">
          <Link className="button" href="/pricing">پلن‌ها</Link>
          <Link className="text-link" href="/markets">تابلوی قیمت ←</Link>
        </div>
      </section>

      <form
        className="account-logout"
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/' });
        }}
      >
        <PendingButton pendingText="در حال خروج…">
          <LogOut size={16} /> خروج از حساب
        </PendingButton>
      </form>

      {user.email && /^zs\.p0\.auth\./i.test(user.email) ? (
        <form className="account-logout" action={deleteP0TestAccount}>
          <PendingButton pendingText="در حال پاک‌سازی…">حذف حساب آزمایشی P0</PendingButton>
        </form>
      ) : null}
    </main>
  );
}
