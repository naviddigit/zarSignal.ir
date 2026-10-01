import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpLeft,
  BookOpen,
  Calculator,
  CreditCard,
  HelpCircle,
  LogOut,
  Smartphone,
  Store,
  UserRound,
} from 'lucide-react';
import { auth, signOut } from '@/auth';
import { PendingButton } from '@/components/pending-button';

export const metadata: Metadata = {
  title: 'حساب من',
  description: 'پروفایل، اشتراک و میانبرهای موبایل زرسیگنال.',
  alternates: { canonical: '/account' },
};
export const dynamic = 'force-dynamic';

const shortcuts = [
  { href: '/pricing', label: 'اشتراک و پلن‌ها', hint: 'تاریخچه و API', Icon: CreditCard },
  { href: '/markets', label: 'قیمت‌ها', hint: 'تابلوی بازار', Icon: Store },
  { href: '/calculator', label: 'ماشین‌حساب', hint: 'وزن، مظنه، عیار', Icon: Calculator },
  { href: '/methodology', label: 'آموزش', hint: 'روش داده و تحلیل', Icon: BookOpen },
  { href: '/faq', label: 'پرسش‌های متداول', hint: 'پاسخ سریع', Icon: HelpCircle },
  { href: '/mobile', label: 'نصب اپ', hint: 'اندروید و iOS', Icon: Smartphone },
] as const;

export default async function AccountPage() {
  const session = await auth().catch(() => null);
  const user = session?.user;

  if (!user) {
    return (
      <main id="main" className="shell content-page account-page">
        <span className="eyebrow">حساب کاربری</span>
        <h1>برای پروفایل وارد شوید</h1>
        <p className="lead">بعد از ورود، اشتراک، میانبرهای موبایل و تنظیمات حساب اینجاست.</p>
        <Link className="button" href="/login?next=%2Faccount">ورود / عضویت <ArrowUpLeft size={16} /></Link>
        <Link className="text-link" href="/pricing">مشاهده پلن‌ها بدون ورود ←</Link>
      </main>
    );
  }

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

      <section className="account-grid" aria-label="میانبرهای حساب">
        {shortcuts.map(item => {
          const Icon = item.Icon;
          return (
            <Link key={item.href} href={item.href} className="account-card">
              <Icon size={18} strokeWidth={1.9} />
              <span>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
              <ArrowUpLeft size={16} />
            </Link>
          );
        })}
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
    </main>
  );
}
