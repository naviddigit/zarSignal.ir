import Link from 'next/link';
import { Activity, ArrowUpLeft, Calculator, UserRound } from 'lucide-react';
import { auth } from '@/auth';
import { ThemeToggle } from './theme-toggle';
import { InstallApp } from './install-app';

export async function Header() {
  const session = await auth().catch(() => null);
  const user = session?.user;
  const label = user?.name?.trim() || user?.email?.split('@')[0] || 'حساب من';

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark"><Activity size={26} /></span>
          <span>
            زر<span className="gold-text">سیگنال</span>
            <small>ZARSIGNAL</small>
          </span>
        </Link>

        <nav aria-label="ناوبری اصلی">
          <Link href="/markets">بازارها</Link>
          <Link href="/#bubbles">رادار حباب</Link>
          <Link href="/pricing">اشتراک</Link>
          <Link href="/methodology">روش داده</Link>
        </nav>

        <div className="header-actions">
          <Link className="header-tool" href="/calculator" aria-label="ماشین‌حساب" title="ماشین‌حساب">
            <Calculator size={19} />
          </Link>
          <ThemeToggle />
          <InstallApp />
          {user ? (
            <Link className="button small-button header-auth" href="/account" title={user.email ?? label}>
              <UserRound size={16} aria-hidden="true" />
              <span className="header-auth__label">{label}</span>
            </Link>
          ) : (
            <Link className="button small-button header-auth" href="/login">
              ورود <ArrowUpLeft size={16} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
