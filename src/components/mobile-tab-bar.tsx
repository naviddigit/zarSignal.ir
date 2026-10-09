'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Activity, Calculator, CreditCard, Home, Store, UserRound } from 'lucide-react';

type Tab = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (path: string) => boolean;
};

const guestTabs: Tab[] = [
  { href: '/', label: 'خانه', icon: Home, match: path => path === '/' },
  { href: '/markets', label: 'قیمت‌ها', icon: Store, match: path => path.startsWith('/markets') },
  { href: '/calculator', label: 'ماشین حساب', icon: Calculator, match: path => path.startsWith('/calculator') },
  { href: '/methodology', label: 'آموزش', icon: Activity, match: path => path.startsWith('/methodology') || path.startsWith('/faq') },
  { href: '/pricing', label: 'اشتراک', icon: CreditCard, match: path => path.startsWith('/pricing') || path.startsWith('/subscribe') },
];

const memberTabs: Tab[] = [
  { href: '/', label: 'خانه', icon: Home, match: path => path === '/' },
  { href: '/markets', label: 'قیمت‌ها', icon: Store, match: path => path.startsWith('/markets') },
  { href: '/calculator', label: 'ماشین حساب', icon: Calculator, match: path => path.startsWith('/calculator') },
  { href: '/methodology', label: 'آموزش', icon: Activity, match: path => path.startsWith('/methodology') || path.startsWith('/faq') },
  { href: '/account', label: 'پروفایل', icon: UserRound, match: path => path.startsWith('/account') || path.startsWith('/pricing') || path.startsWith('/subscribe') },
];

/**
 * Fixed mobile app tab bar — Next.js client navigation (no full reload).
 * Logged-in users see Profile instead of Pricing.
 */
export function MobileTabBar() {
  const pathname = usePathname() || '/';
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(response => (response.ok ? response.json() : null))
      .then(session => {
        if (!alive) return;
        setSignedIn(Boolean(session?.user));
      })
      .catch(() => {
        if (alive) setSignedIn(false);
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  if (pathname.startsWith('/admin')) return null;

  const tabs = signedIn ? memberTabs : guestTabs;

  return (
    <nav className="mobile-tab-bar" aria-label="منوی موبایل">
      <div className="mobile-tab-bar__inner">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`mobile-tab-bar__item${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              prefetch={false}
            >
              <span className="mobile-tab-bar__icon"><Icon size={22} strokeWidth={active ? 2.4 : 1.9} /></span>
              <span className="mobile-tab-bar__label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
