import Link from 'next/link';
import { requireAdmin } from '@/server/admin-auth';
import { AdminNav } from './admin-nav';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="brand">
          زر<span className="gold-text">سیگنال</span>
          <small>MANAGEMENT</small>
        </Link>
        <AdminNav />
        <form action="/api/admin/session" method="post">
          <button className="admin-logout" type="submit" formMethod="post" formAction="/api/admin/session?_method=delete">خروج</button>
        </form>
        <Link className="admin-site-link" href="/">مشاهدهٔ سایت ↗</Link>
      </aside>
      <section className="admin-content">{children}</section>
    </main>
  );
}
