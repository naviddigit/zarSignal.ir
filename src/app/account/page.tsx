import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpLeft,
  BellOff,
  Calculator,
  ChartNoAxesCombined,
  CreditCard,
  History,
  LineChart,
  LockKeyhole,
  LogOut,
  Radar,
  Store,
  UserRound,
} from 'lucide-react';
import { auth, signOut } from '@/auth';
import { db } from '@/lib/db';
import { planHistoryDays } from '@/lib/history-access';
import { PendingButton } from '@/components/pending-button';
import { FunnelTrack } from '@/components/funnel-track';
import { deleteP0TestAccount } from '@/app/login/actions';
import { analysisTrial } from '@/server/analysis-trial';
import { getPublishedPlans } from '@/server/plans';

export const metadata: Metadata = {
  title: 'حساب من',
  description: 'وضعیت اشتراک، دسترسی تاریخچه و میان‌برهای زرسیگنال.',
  alternates: { canonical: '/account' },
};
export const dynamic = 'force-dynamic';

const statusFa: Record<string, string> = {
  PENDING: 'در انتظار پرداخت',
  ACTIVE: 'فعال',
  CANCELED: 'لغو شده',
  EXPIRED: 'منقضی',
};

function faDate(value: Date | string) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(new Date(value));
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ reserved?: string; signup?: string }>;
}) {
  const { reserved, signup } = await searchParams;
  const session = await auth().catch(() => null);
  const user = session?.user;

  if (!user?.id) {
    return (
      <main id="main" className="shell content-page account-page">
        <span className="eyebrow">عضویت زرسیگنال</span>
        <h1>برای دیدن دسترسی‌ها وارد شوید</h1>
        <p className="lead">اینجا وضعیت اشتراک، عمق تاریخچه نمودار و میان‌بر ابزارهاست — نه صفحه عمومی بازار.</p>
        <Link className="button" href="/login?next=%2Faccount">ورود / عضویت <ArrowUpLeft size={16} /></Link>
      </main>
    );
  }

  const [subscriptions, plans, trial] = await Promise.all([
    db.subscription.findMany({
      where: { userId: user.id },
      orderBy: { startsAt: 'desc' },
      take: 20,
    }).catch(() => []),
    getPublishedPlans().catch(() => []),
    analysisTrial().catch(() => ({ enabled: false, hours: 24, available: false, loggedIn: true, used: false, expiresAt: null as string | null })),
  ]);

  const active = subscriptions.find(s => s.status === 'ACTIVE' && !String(s.product).startsWith('__'));
  const pending = subscriptions.find(s => s.status === 'PENDING' && !String(s.product).startsWith('__'));
  const activePlan = active ? plans.find(p => p.slug === active.product) : null;
  const historyDays = activePlan ? planHistoryDays(activePlan.features) : 0;
  const trialLive = Boolean(trial.enabled && trial.expiresAt && new Date(trial.expiresAt) > new Date());

  let membershipLabel = 'حساب رایگان';
  let membershipDetail = 'قیمت زنده و ماشین‌حساب تأییدشده همیشه باز است. عمق بیشتر تاریخچه با اشتراک.';
  if (active && historyDays > 0) {
    membershipLabel = `اشتراک فعال · تاریخچه ${new Intl.NumberFormat('fa-IR').format(historyDays)} روز`;
    membershipDetail = `تا ${faDate(active.expiresAt)} · پلن «${active.product}»`;
  } else if (pending) {
    membershipLabel = 'در انتظار پرداخت';
    membershipDetail = `پلن «${pending.product}» ثبت شده؛ بعد از تأیید سرور درگاه، تاریخچه باز می‌شود.`;
  } else if (trialLive && trial.expiresAt) {
    membershipLabel = `آزمایش تاریخچه · ${new Intl.NumberFormat('fa-IR').format(trial.hours)} ساعت`;
    membershipDetail = `تا ${faDate(trial.expiresAt)}`;
  }

  return (
    <main id="main" className="shell content-page account-page">
      {signup === '1' ? <FunnelTrack event="signup_complete" /> : null}

      <span className="eyebrow">عضویت زرسیگنال</span>
      <header className="account-hero">
        <span className="account-hero__avatar" aria-hidden="true"><UserRound size={26} /></span>
        <div>
          <h1>{user.name || 'کاربر زرسیگنال'}</h1>
          <p>{user.email || 'حساب فعال'}</p>
        </div>
      </header>

      <section className="account-status" aria-label="وضعیت عضویت">
        <div className={`account-status__badge${active ? ' is-active' : pending ? ' is-pending' : ''}`}>
          <CreditCard size={18} aria-hidden="true" />
          <div>
            <strong>{membershipLabel}</strong>
            <small>{membershipDetail}</small>
          </div>
        </div>
        {reserved ? (
          <p className="account-status__note" role="status">
            پلن «{reserved}» رزرو شد. فعال‌سازی فقط بعد از تأیید پرداخت سمت سرور است.
          </p>
        ) : null}
        <div className="account-status__actions">
          {active ? (
            <Link className="button" href="/charts">باز کردن نمودار <ArrowUpLeft size={15} /></Link>
          ) : (
            <Link className="button" href="/pricing">ارتقا دسترسی تاریخچه <ArrowUpLeft size={15} /></Link>
          )}
          <Link className="text-link" href="/pricing">مقایسه پلن‌ها</Link>
        </div>
      </section>

      <section className="account-shortcuts" aria-label="ابزارهای شما">
        <h2>از کجا شروع کنید</h2>
        <div className="account-grid">
          <Link className="account-card" href="/markets">
            <Store size={18} />
            <span>
              <strong>تابلوی قیمت</strong>
              <small>قیمت و حباب زنده — رایگان</small>
            </span>
            <ArrowUpLeft size={16} />
          </Link>
          <Link className="account-card" href="/calculator">
            <Calculator size={18} />
            <span>
              <strong>ماشین‌حساب</strong>
              <small>تبدیل و حباب با منبع مشخص</small>
            </span>
            <ArrowUpLeft size={16} />
          </Link>
          <Link className="account-card" href="/#bubbles">
            <Radar size={18} />
            <span>
              <strong>رادار حباب</strong>
              <small>طلا، نقره، فاصله دلار</small>
            </span>
            <ArrowUpLeft size={16} />
          </Link>
          <Link className="account-card" href="/charts">
            <LineChart size={18} />
            <span>
              <strong>نمودار تاریخچه</strong>
              <small>
                {historyDays > 0
                  ? `تا ${new Intl.NumberFormat('fa-IR').format(historyDays)} روز با پلن شما`
                  : trialLive
                    ? 'در دوره آزمایشی'
                    : '۲۴ ساعت رایگان · عمق بیشتر با اشتراک'}
              </small>
            </span>
            <ArrowUpLeft size={16} />
          </Link>
        </div>
      </section>

      <section className="account-access" aria-label="شفافیت دسترسی">
        <h2>چه چیزی باز است؟</h2>
        <ul className="account-access__list">
          <li>
            <Store size={16} aria-hidden="true" />
            <div>
              <strong>قیمت و حباب زنده</strong>
              <small>همیشه رایگان — هسته شفافیت محصول</small>
            </div>
          </li>
          <li>
            <Calculator size={16} aria-hidden="true" />
            <div>
              <strong>ماشین‌حساب تأییدشده</strong>
              <small>رایگان؛ فقط ماژول‌هایی که Source دارند</small>
            </div>
          </li>
          <li>
            <History size={16} aria-hidden="true" />
            <div>
              <strong>عمق تاریخچه نمودار</strong>
              <small>
                {historyDays > 0
                  ? `پلن شما: ${new Intl.NumberFormat('fa-IR').format(historyDays)} روز`
                  : 'قابل پولی‌سازی از ادمین (۷ / ۳۰ / ۹۰ روز) — الان پلن فعال ندارید'}
              </small>
            </div>
          </li>
          <li className="is-muted">
            <ChartNoAxesCombined size={16} aria-hidden="true" />
            <div>
              <strong>تحلیل V5.4 (اطمینان، دلیل، ریسک، فرصت)</strong>
              <small>هنوز منتشر نشده — بعد از Spec؛ همان بخشی که ارزش اشتراک را بالا می‌برد</small>
            </div>
          </li>
          <li className="is-muted">
            <BellOff size={16} aria-hidden="true" />
            <div>
              <strong>هشدار قیمت</strong>
              <small>SOURCE_REQUIRED — حدس نمی‌زنیم</small>
            </div>
          </li>
          <li className="is-muted">
            <LockKeyhole size={16} aria-hidden="true" />
            <div>
              <strong>سیگنال خرید/فروش رنگی</strong>
              <small>ممنوع محصولی تا Spec صریح مجتبی</small>
            </div>
          </li>
        </ul>
      </section>

      <section className="account-subs" aria-label="اشتراک‌ها">
        <h2>تاریخچه اشتراک</h2>
        {subscriptions.filter(s => !String(s.product).startsWith('__')).length ? (
          <ul className="account-subs__list">
            {subscriptions.filter(s => !String(s.product).startsWith('__')).map(item => (
              <li key={item.id}>
                <strong>{item.product}</strong>
                <span>{statusFa[item.status] ?? item.status}</span>
                <small>تا {faDate(item.expiresAt)}</small>
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
