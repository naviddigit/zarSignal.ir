import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpLeft,
  Bell,
  Calculator,
  ChartNoAxesCombined,
  History,
  LineChart,
  LockKeyhole,
  LogOut,
  Radar,
  Sparkles,
  Store,
  UserRound,
} from 'lucide-react';
import { auth, signOut } from '@/auth';
import { PendingButton } from '@/components/pending-button';
import { FunnelTrack } from '@/components/funnel-track';
import { deleteP0TestAccount } from '@/app/login/actions';
import { resolveAccountEntitlement } from '@/server/account-entitlement';
import { getPublicSnapshot } from '@/server/quotes';
import { instruments } from '@/lib/market';

export const metadata: Metadata = {
  title: 'میز کار من',
  description: 'داشبورد شخصی زرسیگنال — دسترسی‌ها، میانبرها و وضعیت اشتراک.',
  alternates: { canonical: '/account' },
};
export const dynamic = 'force-dynamic';

function faDate(value: Date | string) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(new Date(value));
}

function faNumber(value: number) {
  return new Intl.NumberFormat('fa-IR').format(value);
}

function statusChip(status: 'live' | 'coming_soon' | 'source_required') {
  if (status === 'live') return null;
  if (status === 'coming_soon') return <em className="account-cap__chip">به‌زودی</em>;
  return <em className="account-cap__chip is-blocked">در انتظار Spec</em>;
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
        <span className="eyebrow">میز کار زرسیگنال</span>
        <h1>برای ورود به داشبورد شخصی وارد شوید</h1>
        <p className="lead">اینجا مرکز روزانه شماست: دسترسی پلن، میانبر ابزارها و وضعیت بازار — نه فقط پروفایل.</p>
        <Link className="button" href="/login?next=%2Faccount">ورود / عضویت <ArrowUpLeft size={16} /></Link>
      </main>
    );
  }

  const [entitlement, snapshot] = await Promise.all([
    resolveAccountEntitlement(user.id),
    getPublicSnapshot().catch(() => null),
  ]);

  const gold18 = snapshot?.quotes.find(q => q.symbol === 'GOLD_18K');
  const instrumentLabel = gold18
    ? instruments.find(i => i.symbol === gold18.symbol)?.name ?? 'طلای ۱۸ عیار'
    : null;

  const ownedLive = entitlement.owned.filter(item => item.status === 'live');
  const ownedSoon = entitlement.owned.filter(item => item.status !== 'live');

  return (
    <main id="main" className="shell content-page account-page">
      {signup === '1' ? <FunnelTrack event="signup_complete" /> : null}

      {/* 1. سلام + خلاصه حساب */}
      <header className="account-dash-hero">
        <div className="account-dash-hero__who">
          <span className="account-hero__avatar" aria-hidden="true"><UserRound size={24} /></span>
          <div>
            <p className="account-dash-hero__hello">سلام{user.name ? `، ${user.name}` : ''}</p>
            <h1>{entitlement.planLabel}</h1>
            <p className="account-dash-hero__meta">
              <span className={`account-dash-hero__status is-${entitlement.statusLabel === 'فعال' || entitlement.statusLabel === 'آزمایشی' ? 'on' : 'off'}`}>
                {entitlement.statusLabel}
              </span>
              {entitlement.expiresAt ? <> · تا {faDate(entitlement.expiresAt)}</> : null}
            </p>
          </div>
        </div>
        <Link className="button account-dash-hero__cta" href="/pricing">
          مدیریت پلن <ArrowUpLeft size={15} />
        </Link>
      </header>

      {reserved ? (
        <p className="account-status__note" role="status">
          پلن انتخابی رزرو شد. فعال‌سازی فقط بعد از تأیید پرداخت سمت سرور است.
        </p>
      ) : null}

      {/* 4 first on mobile priority: Quick Actions in first viewports */}
      <section className="account-quick" aria-label="میانبرهای اصلی">
        <h2>برو به کار</h2>
        <div className="account-quick__grid">
          <Link className="account-quick__item is-primary" href="/charts">
            <LineChart size={18} />
            <span>تاریخچه</span>
          </Link>
          <Link className="account-quick__item" href="/calculator">
            <Calculator size={18} />
            <span>ماشین‌حساب</span>
          </Link>
          <Link className="account-quick__item" href="/markets">
            <Store size={18} />
            <span>بازارها</span>
          </Link>
          <Link className="account-quick__item" href="/#bubbles">
            <Radar size={18} />
            <span>رادار حباب</span>
          </Link>
          <Link className="account-quick__item is-muted" href="/pricing">
            <Bell size={18} />
            <span>هشدارها</span>
            <small>به‌زودی</small>
          </Link>
          <Link className="account-quick__item is-muted" href="/pricing">
            <Sparkles size={18} />
            <span>تحلیل امروز</span>
            <small>در انتظار Spec</small>
          </Link>
        </div>
      </section>

      {/* 2. امروز برای شما — empty states, no fake */}
      <section className="account-today" aria-label="امروز برای شما">
        <h2>امروز برای شما</h2>
        <ul className="account-today__list">
          <li>
            <ChartNoAxesCombined size={16} aria-hidden="true" />
            <div>
              <strong>تحلیل امروز</strong>
              <small>موتور تحلیل V5.4 هنوز Spec قطعی ندارد — داده جعلی نشان داده نمی‌شود.</small>
            </div>
            <span className="account-today__state">به‌زودی</span>
          </li>
          <li>
            <Store size={16} aria-hidden="true" />
            <div>
              <strong>آخرین قیمت مهم</strong>
              {gold18 && instrumentLabel ? (
                <small>
                  {instrumentLabel}:{' '}
                  <bdi dir="ltr">{faNumber(Number(gold18.buy))}</bdi> تومان
                </small>
              ) : (
                <small>قیمت زنده فعلاً در دسترس نیست.</small>
              )}
            </div>
            <Link className="text-link" href="/markets">بازار</Link>
          </li>
          <li>
            <Bell size={16} aria-hidden="true" />
            <div>
              <strong>هشدار فعال</strong>
              <small>سامانه هشدار هنوز منتشر نشده است.</small>
            </div>
            <span className="account-today__state">۰</span>
          </li>
          <li>
            <History size={16} aria-hidden="true" />
            <div>
              <strong>عمق تاریخچه شما</strong>
              <small>
                {entitlement.historyDays > 1
                  ? `تا ${faNumber(entitlement.historyDays)} روز فعال است`
                  : '۲۴ ساعت رایگان — با ارتقا عمیق‌تر می‌شود'}
              </small>
            </div>
            <Link className="text-link" href="/charts">نمودار</Link>
          </li>
        </ul>
      </section>

      {/* 3. دسترسی‌های پلن من — from registry */}
      <section className="account-caps" aria-label="دسترسی‌های پلن من">
        <h2>فعال برای شما</h2>
        <ul className="account-caps__list">
          {ownedLive.map(item => (
            <li key={item.id}>
              <span className="account-caps__dot is-on" aria-hidden="true" />
              <strong>{item.label}</strong>
            </li>
          ))}
          {ownedSoon.map(item => (
            <li key={item.id} className="is-soft">
              <span className="account-caps__dot" aria-hidden="true" />
              <strong>{item.label}</strong>
              {statusChip(item.status)}
            </li>
          ))}
        </ul>
      </section>

      {/* 5. ارتقا — only real/coming-soon */}
      <section className="account-upgrade" aria-label="ارتقا">
        <h2>در پلن بالاتر چه باز می‌شود؟</h2>
        {entitlement.upgrade.items.length ? (
          <>
            <p className="account-upgrade__lead">
              {entitlement.upgrade.label ? `قدم بعدی: ${entitlement.upgrade.label}` : 'ارتقا دسترسی'}
            </p>
            <ul className="account-upgrade__list">
              {entitlement.upgrade.items.map(item => (
                <li key={item.label}>
                  <LockKeyhole size={14} aria-hidden="true" />
                  <span>{item.label}</span>
                  {statusChip(item.status)}
                </li>
              ))}
            </ul>
            <Link className="button" href="/pricing">مشاهده پلن‌ها <ArrowUpLeft size={15} /></Link>
          </>
        ) : (
          <p className="lead">بالاترین سطح منطقی فعلی برای شما فعال است. قابلیت‌های Spec-locked تا تأیید منبع فروخته نمی‌شوند.</p>
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
