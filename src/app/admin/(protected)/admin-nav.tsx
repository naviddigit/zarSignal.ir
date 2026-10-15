'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Pin, ChevronUp, ChevronDown, Search, Menu, LayoutDashboard, Users, SlidersHorizontal, FileText, Server, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/field';
import { OverlaySheet } from '@/components/ui/overlay-sheet';

const GROUPS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'people', label: 'کاربران و فروش', icon: Users },
  { id: 'market', label: 'بازار و ابزارها', icon: SlidersHorizontal },
  { id: 'content', label: 'محتوا و انتشار', icon: FileText },
  { id: 'system', label: 'سیستم و اتصال‌ها', icon: Server },
];
const LINKS = [
  { href: '/admin', label: 'نمای کلی', group: '', exact: true },
  { href: '/admin/maintenance', label: 'وضعیت سایت', group: 'system' },
  { href: '/admin/data', label: 'داده و دریافت', group: 'system' },
  { href: '/admin/integrations', label: 'اتصال‌ها و API', group: 'system' },
  { href: '/admin/account-settings', label: 'حساب و ثبت‌نام', group: 'people' },
  { href: '/admin/customers', label: 'مشتری‌ها', group: 'people' },
  { href: '/admin/feedback', label: 'بازخوردها', group: 'people' },
  { href: '/admin/plans', label: 'تعرفه‌ها و قیمت', group: 'people' },
  { href: '/admin/products', label: 'اشتراک و API', group: 'people' },
  { href: '/admin/analysis', label: 'مدل تحلیل', group: 'market' },
  { href: '/admin/analysis-settings', label: 'تنظیمات تحلیل', group: 'market' },
  { href: '/admin/calculator-layout', label: 'چیدمان ماشین‌حساب', group: 'market' },
  { href: '/admin/content', label: 'صفحه اصلی', group: 'content' },
  { href: '/admin/story-backgrounds', label: 'پس‌زمینه استوری', group: 'content' },
  { href: '/admin/seo', label: 'جست‌وجو و محتوا', group: 'content' },
] as const;
type NavLink = typeof LINKS[number];
const active = (pathname: string, link: NavLink) => pathname === link.href || (!('exact' in link) && pathname.startsWith(`${link.href}/`));
const normalize = (value: string) => value.replaceAll('ي', 'ی').replaceAll('ك', 'ک').replaceAll('‌', ' ').toLowerCase().trim();

export function AdminNav() {
  const pathname = usePathname() || '/admin';
  const [layout, setLayout] = useState<{ order: string[]; pins: string[] }>({ order: [], pins: [] });
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(() => LINKS.find(link => active(pathname, link))?.group || null);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem('zs-admin-nav-v1') || '{}'); setLayout({ order: Array.isArray(saved.order) ? saved.order.filter((item: unknown) => typeof item === 'string') : [], pins: Array.isArray(saved.pins) ? saved.pins.filter((item: unknown) => typeof item === 'string') : [] }); } catch { /* Defaults remain usable without storage. */ }
  }, []);
  useEffect(() => { setMobileOpen(false); setOpenGroup(LINKS.find(link => active(pathname, link))?.group || null); }, [pathname]);
  const hrefs = [...new Set([...layout.order, ...LINKS.map(link => link.href)])];
  const links = [...LINKS].sort((a, b) => hrefs.indexOf(a.href) - hrefs.indexOf(b.href));
  const matches = (link: NavLink) => normalize(link.label).includes(normalize(query));
  const pinned = links.filter(link => layout.pins.includes(link.href));
  function save(next: typeof layout) { setLayout(next); try { localStorage.setItem('zs-admin-nav-v1', JSON.stringify(next)); } catch { /* Session changes still work. */ } }
  function move(items: NavLink[], index: number, delta: number) {
    if (!items[index + delta]) return;
    const order = links.map(link => link.href);
    const from = order.indexOf(items[index].href), to = order.indexOf(items[index + delta].href);
    [order[from], order[to]] = [order[to], order[from]];
    save({ ...layout, order });
  }
  function rows(items: NavLink[]) {
    return items.map((link, index) => <div className="admin-nav-item" key={link.href}>
      <Link href={link.href} title={link.label} className={active(pathname, link) ? 'is-active' : undefined} aria-current={active(pathname, link) ? 'page' : undefined} onClick={() => setMobileOpen(false)}>
        {link.href === '/admin' ? <LayoutDashboard size={16} aria-hidden /> : null}<span>{link.label}</span>
        {layout.pins.includes(link.href) ? <Pin className="admin-nav-pin" size={12} fill="currentColor" aria-hidden /> : null}
      </Link>
      <div className="admin-nav-controls">
        <button type="button" title="پین" aria-label={`پین ${link.label}`} aria-pressed={layout.pins.includes(link.href)} onClick={() => save({ ...layout, pins: layout.pins.includes(link.href) ? layout.pins.filter(href => href !== link.href) : [...layout.pins, link.href] })}><Pin size={13} /></button>
        <button type="button" title="بالا" aria-label={`بالا بردن ${link.label}`} disabled={index === 0 || !!query} onClick={() => move(items, index, -1)}><ChevronUp size={14} /></button>
        <button type="button" title="پایین" aria-label={`پایین بردن ${link.label}`} disabled={index === items.length - 1 || !!query} onClick={() => move(items, index, 1)}><ChevronDown size={14} /></button>
      </div>
    </div>);
  }
  function content(surface: string) {
    return <nav className="admin-navigation" aria-label="ناوبری مدیریت">
      <div className="admin-nav-search"><Search size={15} aria-hidden /><Input aria-label="جست‌وجوی منوی مدیریت" placeholder="جست‌وجوی بخش‌ها…" value={query} onChange={event => setQuery(event.target.value)} /></div>
      {pinned.some(matches) ? <section className="admin-nav-pinned"><small><Pin size={12} aria-hidden /> پین‌شده</small>{rows(pinned.filter(matches))}</section> : null}
      {rows(links.filter(link => !link.group && !layout.pins.includes(link.href) && matches(link)))}
      {GROUPS.map(group => {
        const items = links.filter(link => link.group === group.id && !layout.pins.includes(link.href) && matches(link));
        if (!items.length) return null;
        const expanded = !!query || openGroup === group.id;
        const Icon = group.icon;
        return <section className="admin-nav-group" key={group.id}>
          <button className="admin-nav-group-toggle" type="button" aria-expanded={expanded} aria-controls={`admin-nav-${surface}-${group.id}`} onClick={() => setOpenGroup(expanded ? null : group.id)}><Icon size={16} aria-hidden /><span>{group.label}</span><ChevronDown size={14} aria-hidden /></button>
          <div id={`admin-nav-${surface}-${group.id}`} hidden={!expanded}>{rows(items)}</div>
        </section>;
      })}
      {!links.some(matches) ? <p className="admin-nav-empty">بخشی پیدا نشد.</p> : null}
    </nav>;
  }
  return <>
    <div className="admin-nav-desktop">{content('desktop')}</div>
    <button type="button" className="admin-nav-mobile-trigger" aria-haspopup="dialog" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={18} />منوی مدیریت</button>
    <OverlaySheet open={mobileOpen} title="مدیریت زرسیگنال" onClose={() => setMobileOpen(false)}>{mobileOpen ? <div className="admin-nav-drawer">{content('mobile')}</div> : null}</OverlaySheet>
  </>;
}
