'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'نمای کلی', exact: true },
  { href: '/admin/maintenance', label: 'وضعیت سایت' },
  { href: '/admin/data', label: 'داده و دریافت' },
  { href: '/admin/integrations', label: 'اتصال‌ها و API' },
  { href: '/admin/customers', label: 'مشتری‌ها' },
  { href: '/admin/feedback', label: 'بازخوردها' },
  { href: '/admin/plans', label: 'تعرفه‌ها و قیمت' },
  { href: '/admin/products', label: 'اشتراک و مشتریان API' },
  { href: '/admin/analysis', label: 'مدل تحلیل' },
  { href: '/admin/analysis-settings', label: 'تنظیمات تحلیل' },
  { href: '/admin/calculator-layout', label: 'چیدمان ماشین‌حساب' },
  { href: '/admin/content', label: 'محتوای صفحه اصلی' },
  { href: '/admin/seo', label: 'جست‌وجو و محتوا' },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname() || '/admin';
  return (
    <nav aria-label="ناوبری مدیریت">
      {LINKS.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className={isActive(pathname, link.href, 'exact' in link && link.exact) ? 'is-active' : undefined}
          aria-current={isActive(pathname, link.href, 'exact' in link && link.exact) ? 'page' : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
