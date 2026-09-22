import type { Metadata } from 'next';
import { PendingButton } from '@/components/pending-button';
export const metadata: Metadata = { title: 'بازبینی خصوصی نمودار', robots: { index: false, follow: false } };
export default async function Preview({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main id="main" className="shell content-page"><section className="panel preview-access"><h1>بازبینی خصوصی نمودار</h1><p>کد خصوصی مالک پروژه را وارد کنید. دسترسی فقط برای مشاهده تاریخچه و به مدت دو ساعت فعال می‌شود؛ مجوز مدیریت یا تغییر داده نمی‌دهد.</p>{error && <p className="form-error">کد معتبر نیست.</p>}<form method="post" action="/api/charts/preview"><label>کد خصوصی<input name="code" type="password" autoComplete="off" dir="ltr" required maxLength={128}/></label><PendingButton>باز کردن تاریخچه</PendingButton></form><form method="post" action="/api/charts/preview"><input type="hidden" name="action" value="logout"/><button className="text-link">بستن دسترسی خصوصی</button></form></section></main>;
}
