import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpLeft,
  Calculator,
  LineChart,
  LogOut,
  Newspaper,
  Radar,
  ScanSearch,
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
import { hasCapability } from '@/lib/capabilities';
import { buildMarketViewReport } from '@/server/market-view-report';

export const metadata: Metadata = {
  title: 'میز کار من',
  description: 'داشبورد شخصی زرسیگنال — میانبر ابزارها، وضعیت پلن و قیمت زنده.',
  alternates: { canonical: '/account' },
};
export const dynamic = 'force-dynamic';

function faDate(value: Date | string) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(new Date(value));
}

function faNumber(value: number) {
  return new Intl.NumberFormat('fa-IR').format(value);
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
        <span className="eyebrow">میز کار</span>
        <h1>وارد شوید تا داشبورد باز شود</h1>
        <p className="lead">میانبر بازار، ماشین‌حساب، نمودار و وضعیت پلن — مرکز کار روزانه شما.</p>
        <Link className="button" href="/login?next=%2Faccount">ورود / عضویت <ArrowUpLeft size={16} /></Link>
      </main>
    );
  }

  const [entitlement, snapshot] = await Promise.all([
    resolveAccountEntitlement(user.id),
    getPublicSnapshot().catch(() => null),
  ]);

  const canAnalysis = hasCapability(entitlement.level, 'ANALYSIS_BASIC');
  const marketPreview = await buildMarketViewReport(canAnalysis ? 'full' : 'preview').catch(() => null);

  const gold18 = snapshot?.quotes.find(q => q.symbol === 'GOLD_18K');
  const goldLabel = gold18
    ? instruments.find(i => i.symbol === gold18.symbol)?.name ?? 'طلای ۱۸ عیار'
    : null;
  const liveCaps = entitlement.owned.filter(item => item.status === 'live').slice(0, 6);
  const upgrade = entitlement.upgrade.items.slice(0, 3);

  return (
    <main id="main" className="shell content-page account-page">
      {signup === '1' ? <FunnelTrack event="signup_complete" /> : null}

      <header className="account-dash-hero">
        <div className="account-dash-hero__who">
          <span className="account-hero__avatar" aria-hidden="true"><UserRound size={22} /></span>
          <div>
            <p className="account-dash-hero__hello">سلام{user.name ? `، ${user.name}` : ''}</p>
            <h1>{entitlement.planLabel}</h1>
            <p className="account-dash-hero__meta">
              <span className={`account-dash-hero__status is-${entitlement.statusLabel === 'فعال' || entitlement.statusLabel === 'آزمایشی' ? 'on' : 'off'}`}>
                {entitlement.statusLabel}
              </span>
              {entitlement.expiresAt ? <> · تا {faDate(entitlement.expiresAt)}</> : null}
              {entitlement.historyDays > 1 ? <> · تاریخچه {faNumber(entitlement.historyDays)} روز</> : null}
            </p>
          </div>
        </div>
        <Link className="button account-dash-hero__cta" href="/pricing">پلن‌ها <ArrowUpLeft size={15} /></Link>
      </header>

      {reserved ? (
        <p className="account-status__note" role="status">پلن رزرو شد؛ فعال‌سازی بعد از تأیید پرداخت سرور.</p>
      ) : null}

      <section className="account-quick" aria-label="میانبرها">
        <div className="account-quick__grid">
          <Link className="account-quick__item is-primary" href="/analysis">
            <ScanSearch size={18} /><span>دید بازار</span>
          </Link>
          <Link className="account-quick__item" href="/markets">
            <Store size={18} /><span>بازار</span>
          </Link>
          <Link className="account-quick__item" href="/calculator">
            <Calculator size={18} /><span>ماشین‌حساب</span>
          </Link>
          <Link className="account-quick__item" href="/charts">
            <LineChart size={18} /><span>نمودار</span>
          </Link>
          <Link className="account-quick__item" href="/#bubbles">
            <Radar size={18} /><span>حباب</span>
          </Link>
          <Link className="account-quick__item" href="/pricing">
            <ArrowUpLeft size={18} /><span>ارتقای پلن</span>
          </Link>
        </div>
      </section>

      {marketPreview ? (
        <section className="account-analysis" aria-label="آخرین دید بازار">
          <h2>مشاهده تحلیل بازار</h2>
          <p className="account-analysis__summary">{marketPreview.summaryLines[0]}</p>
          <p className="account-analysis__meta">
            {canAnalysis ? 'دسترسی گزارش کامل فعال است' : 'پیش‌نمایش رایگان · متن کامل با پلن تحلیل'}
          </p>
          <Link className="button" href="/analysis">
            {canAnalysis ? 'باز کردن گزارش کامل' : 'دیدن پیش‌نمایش'} <ArrowUpLeft size={15} />
          </Link>
        </section>
      ) : null}

      <section className="account-today" aria-label="الان در بازار">
        <h2>الان در بازار</h2>
        <ul className="account-today__list">
          <li>
            <Store size={16} aria-hidden="true" />
            <div>
              <strong>{goldLabel ?? 'قیمت زنده'}</strong>
              {gold18 ? (
                <small><bdi dir="ltr">{faNumber(Number(gold18.buy))}</bdi> تومان</small>
              ) : (
                <small>داده فعلاً در دسترس نیست</small>
              )}
            </div>
            <Link className="text-link" href="/markets">باز کردن</Link>
          </li>
          <li>
            <ScanSearch size={16} aria-hidden="true" />
            <div>
              <strong>دید زرسیگنال</strong>
              <small>{canAnalysis ? 'گزارش کامل اختلاف با مرجع' : 'خلاصهٔ رایگان · ارتقا برای متن کامل'}</small>
            </div>
            <Link className="text-link" href="/analysis">تحلیل</Link>
          </li>
          <li>
            <Newspaper size={16} aria-hidden="true" />
            <div>
              <strong>مقاله تازه</strong>
              <small>حباب طلا، مظنه و فاصله دلار را شفاف بخوانید</small>
            </div>
            <Link className="text-link" href="/news">مطالعه</Link>
          </li>
        </ul>
      </section>

      <section className="account-caps" aria-label="فعال برای شما">
        <h2>فعال برای شما</h2>
        <ul className="account-caps__chips">
          {liveCaps.map(item => (
            <li key={item.id}>{item.label}</li>
          ))}
        </ul>
      </section>

      {upgrade.length ? (
        <section className="account-upgrade" aria-label="ارتقا">
          <h2>با ارتقا باز می‌شود</h2>
          <ul className="account-upgrade__list">
            {upgrade.map(item => (
              <li key={item.label}>{item.label}{item.status === 'coming_soon' ? ' · به‌زودی' : ''}</li>
            ))}
          </ul>
          <Link className="button" href="/pricing">مشاهده پلن‌ها <ArrowUpLeft size={15} /></Link>
        </section>
      ) : null}

      <form
        className="account-logout"
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/' });
        }}
      >
        <PendingButton pendingText="در حال خروج…">
          <LogOut size={16} /> خروج
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
