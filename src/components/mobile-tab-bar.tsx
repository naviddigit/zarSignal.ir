'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Calculator, Home, Layers3, Store } from 'lucide-react';

const tabs = [
  { href: '/', label: 'خانه', icon: Home, match: (path: string) => path === '/' },
  { href: '/markets', label: 'قیمت‌ها', icon: Store, match: (path: string) => path.startsWith('/markets') },
  { href: '/calculator', label: 'ماشین حساب', icon: Calculator, match: (path: string) => path.startsWith('/calculator') },
  { href: '/methodology', label: 'آموزش', icon: Activity, match: (path: string) => path.startsWith('/methodology') || path.startsWith('/faq') },
  { href: '/pricing', label: 'بیشتر', icon: Layers3, match: (path: string) => path.startsWith('/pricing') },
] as const;

/**
 * Fixed mobile app tab bar — Next.js client navigation (no full reload).
 * Hidden on admin surfaces and desktop.
 */
export function MobileTabBar() {
  const pathname = usePathname() || '/';
  if (pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/calculator')) return null;

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
              prefetch
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
