import Link from 'next/link';
import { ExternalLink, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function AdminSidebarActions() {
  return <div className="admin-sidebar-footer">
    <ThemeToggle />
    <Link className="admin-footer-action" href="/" aria-label="مشاهده سایت" title="مشاهده سایت"><ExternalLink size={16} /></Link>
    <form action="/api/admin/session" method="post">
      <button className="admin-footer-action" type="submit" formMethod="post" formAction="/api/admin/session?_method=delete" aria-label="خروج از مدیریت" title="خروج از مدیریت"><LogOut size={16} /></button>
    </form>
  </div>;
}
