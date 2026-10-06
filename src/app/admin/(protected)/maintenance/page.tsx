import { getMaintenanceSettings } from '@/server/maintenance';
import { requireAdmin } from '@/server/admin-auth';
import { updateMaintenance } from './actions';
import '../admin-settings.css';

export const dynamic = 'force-dynamic';

export default async function MaintenanceAdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const [settings, params] = await Promise.all([getMaintenanceSettings(), searchParams]);
  return <>
    <header className="admin-title"><div><span className="eyebrow">SITE STATUS</span><h1>وضعیت سایت</h1><p>هنگام تعمیر، بازدیدکنندگان پیام موقت می‌بینند و مدیریت از مسیر /admin باز می‌ماند.</p></div></header>
    <form action={updateMaintenance} className="admin-card maintenance-admin-form">
      <h2>حالت تعمیر و به‌روزرسانی</h2>
      <p>صفحهٔ اصلی با متن برند و پاسخ عادی باز می‌ماند؛ دیگر صفحه‌های عمومی پاسخ موقت ۵۰۳ می‌دهند. بسته‌بودن چندروزه ممکن است به رتبهٔ صفحات داخلی آسیب بزند.</p>
      <label className="maintenance-admin-toggle"><input type="checkbox" name="enabled" defaultChecked={settings.enabled} disabled={!settings.writable} /><span>بستن موقت سایت</span></label>
      <label htmlFor="maintenance-message">متن پیام برای بازدیدکنندگان</label>
      <textarea id="maintenance-message" name="message" minLength={20} maxLength={600} rows={5} required defaultValue={settings.message} disabled={!settings.writable} />
      <p>عنوان «در حال تعمیر و به‌روزرسانی هستیم» و لوگوی زرسیگنال همراه این متن نمایش داده می‌شود.</p>
      <button className="button" type="submit" disabled={!settings.writable}>ذخیره وضعیت سایت</button>
      {settings.enabled && <p role="status" className="admin-message">سایت اکنون در حالت تعمیر است. برای بازگشایی، تیک بالا را بردارید و ذخیره کنید.</p>}
      {!settings.writable && <p role="alert" className="form-error">اتصال پایگاه داده برقرار نیست؛ تغییر وضعیت فعلاً ذخیره نمی‌شود.</p>}
      {params.saved && <p role="status">تنظیمات ذخیره شد.</p>}
      {params.error && <p role="alert" className="form-error">ذخیره ممکن نشد؛ متن و اتصال پایگاه داده را بررسی کنید.</p>}
    </form>
  </>;
}
