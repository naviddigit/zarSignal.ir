import Link from 'next/link';
import { Activity } from 'lucide-react';
import { AdminNav } from './admin-nav';
import { AdminSidebarActions } from './admin-sidebar-actions';

export function AdminSidebar() {
  return <aside className="admin-sidebar">
    <Link href="/admin" className="admin-brand"><Activity size={22} aria-hidden /><span>زرسیگنال<small>پنل مدیریت</small></span></Link>
    <AdminNav />
    <AdminSidebarActions />
  </aside>;
}
