import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = { title: 'ورود مدیریت', robots: { index: false, follow: false } };
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main id="main" className="admin-login"><section className="admin-login-card"><Link href="/" className="brand">زر<span className="gold-text">سیگنال</span></Link><span className="eyebrow">ADMIN ACCESS</span><h1>ورود به مدیریت</h1><p>این بخش فقط برای مدیر سامانه است. کد دسترسی در محیط سرور نگهداری می‌شود.</p>{error === '1' && <p className="form-error" role="alert">کد دسترسی درست نیست.</p>}{error === 'config' && <p className="form-error" role="alert">کلیدهای امنیتی محیط تنظیم نشده‌اند.</p>}<form action="/api/admin/session" method="post"><label htmlFor="token">کد دسترسی مدیر</label><input id="token" name="token" type="password" minLength={24} autoComplete="current-password" required/><button className="button" type="submit">ورود امن</button></form><Link className="text-link" href="/">بازگشت به سایت</Link></section></main>;
}
