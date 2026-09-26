'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  return <header className="site-header"><div className="shell header-inner">
    <Link href="/" className="brand"><span className="brand-mark"><Activity size={26}/></span><span>زر<span className="gold-text">سیگنال</span><small>ZARSIGNAL</small></span></Link>
    <nav className="primary-nav" aria-label="ناوبری اصلی"><Link href="/markets">وضعیت بازار</Link><Link href="/#analysis">تحلیل‌ها</Link><Link href="/pricing">اشتراک</Link><Link href="/methodology">روش تحلیل</Link></nav>
    <div className="header-actions"><Link className="header-login" href="/login">ورود</Link><details className="header-more" onClick={event => { if ((event.target as HTMLElement).closest('a')) event.currentTarget.open = false; }} onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}><summary aria-label="منوی بیشتر">بیشتر</summary><div className="header-more__panel"><ThemeToggle/><Link href="/markets">وضعیت بازار</Link><Link href="/#analysis">تحلیل‌ها</Link><Link href="/alerts">هشدارهای من</Link><Link href="/calculator">ماشین‌حساب</Link><Link href="/pricing">اشتراک</Link><Link href="/methodology">روش تحلیل</Link><Link href="/developers">برای کسب‌وکارها</Link><Link href="/mobile">اپلیکیشن</Link></div></details></div>
  </div></header>;
}
