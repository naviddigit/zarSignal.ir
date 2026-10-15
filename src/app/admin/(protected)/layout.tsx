import { requireAdmin } from '@/server/admin-auth';
import { AdminSidebar } from './admin-sidebar';
import './admin-design-system.css';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return (
    <main id="main" className="admin-shell">
      <AdminSidebar />
      <section className="admin-content">{children}</section>
    </main>
  );
}
