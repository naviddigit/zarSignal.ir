'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Pin, ChevronUp, ChevronDown } from 'lucide-react';

const LINKS = [
  { href: '/admin', label: 'نمای کلی', exact: true },
  { href: '/admin/maintenance', label: 'وضعیت سایت' },
  { href: '/admin/data', label: 'داده و دریافت' },
  { href: '/admin/integrations', label: 'اتصال‌ها و API' },
  { href: '/admin/account-settings', label: 'تنظیمات حساب و ثبت‌نام' },
  { href: '/admin/customers', label: 'مشتری‌ها' },
  { href: '/admin/feedback', label: 'بازخوردها' },
  { href: '/admin/plans', label: 'تعرفه‌ها و قیمت' },
  { href: '/admin/products', label: 'اشتراک و مشتریان API' },
  { href: '/admin/analysis', label: 'مدل تحلیل' },
  { href: '/admin/analysis-settings', label: 'تنظیمات تحلیل' },
  { href: '/admin/calculator-layout', label: 'چیدمان ماشین‌حساب' },
  { href: '/admin/content', label: 'محتوای صفحه اصلی' },
  { href: '/admin/story-backgrounds', label: 'پس‌زمینه‌های استوری' },
  { href: '/admin/seo', label: 'جست‌وجو و محتوا' },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname() || '/admin';
  const [layout, setLayout] = useState<{ order: string[]; pins: string[] }>({ order: [], pins: [] });
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem('zs-admin-nav-v1') || '{}'); setLayout({ order: Array.isArray(saved.order) ? saved.order.filter((item: unknown) => typeof item === 'string') : [], pins: Array.isArray(saved.pins) ? saved.pins.filter((item: unknown) => typeof item === 'string') : [] }); } catch { /* Keep the default menu when storage is unavailable. */ }
  }, []);
  const hrefs = [...new Set([...layout.order, ...LINKS.map(link => link.href)])];
  const links = [...LINKS].sort((a, b) => Number(layout.pins.includes(b.href)) - Number(layout.pins.includes(a.href)) || hrefs.indexOf(a.href) - hrefs.indexOf(b.href));
  function save(next: typeof layout) { setLayout(next); try { localStorage.setItem('zs-admin-nav-v1', JSON.stringify(next)); } catch { /* Session changes still work without persistent storage. */ } }
  function move(index: number, delta: number) {
    const target = index + delta;
    if (!links[target] || layout.pins.includes(links[index].href) !== layout.pins.includes(links[target].href)) return;
    const order = links.map(link => link.href); [order[index], order[target]] = [order[target], order[index]]; save({ ...layout, order });
  }
  return (
    <nav aria-label="ناوبری مدیریت">
      {links.map((link, index) => (
        <div className="admin-nav-item" key={link.href}>
        <Link
          key={link.href}
          href={link.href}
          className={isActive(pathname, link.href, 'exact' in link && link.exact) ? 'is-active' : undefined}
          aria-current={isActive(pathname, link.href, 'exact' in link && link.exact) ? 'page' : undefined}
        >
          {link.label}
          {layout.pins.includes(link.href) ? <Pin className="admin-nav-pin" size={12} fill="currentColor" aria-hidden /> : null}
        </Link>
        <div className="admin-nav-controls">
          <button type="button" aria-label={`پین ${link.label}`} aria-pressed={layout.pins.includes(link.href)} onClick={() => save({ ...layout, pins: layout.pins.includes(link.href) ? layout.pins.filter(href => href !== link.href) : [...layout.pins, link.href] })}><Pin size={13} /></button>
          <button type="button" aria-label={`بالا بردن ${link.label}`} disabled={!links[index - 1] || layout.pins.includes(link.href) !== layout.pins.includes(links[index - 1].href)} onClick={() => move(index, -1)}><ChevronUp size={14} /></button>
          <button type="button" aria-label={`پایین بردن ${link.label}`} disabled={!links[index + 1] || layout.pins.includes(link.href) !== layout.pins.includes(links[index + 1].href)} onClick={() => move(index, 1)}><ChevronDown size={14} /></button>
        </div></div>
      ))}
    </nav>
  );
}
