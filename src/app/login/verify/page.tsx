import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { EMAIL_CHALLENGE_COOKIE } from '@/server/email-verification';
import { verifyEmailCode, resendEmailCode } from '../actions';
import { PendingButton } from '@/components/pending-button';

export const dynamic = 'force-dynamic';
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  if (!(await cookies()).get(EMAIL_CHALLENGE_COOKIE)?.value) redirect('/login');
  const next = params.next?.startsWith('/') && !params.next.startsWith('//') ? params.next : '/account';
  return <main id="main" className="auth-page"><section className="auth-card">
    <h1>تأیید ایمیل</h1><p>کد شش‌رقمی ارسال‌شده به ایمیل را وارد کنید. اعتبار کد ۱۰ دقیقه است.</p>
    <form className="profile-complete-form" action={verifyEmailCode}>
      <input type="hidden" name="next" value={next} />
      <label>کد تأیید<input name="code" inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} dir="ltr" /></label>
      {params.error && <p className="calc-error" role="alert">کد نادرست یا منقضی است. پس از ۵ تلاش، کد تازه بگیرید.</p>}
      <PendingButton className="button" pendingText="در حال بررسی…">تأیید و ورود</PendingButton>
    </form>
    <form action={resendEmailCode}><input type="hidden" name="next" value={next} /><PendingButton className="profile-complete-later" pendingText="در حال ارسال…">ارسال دوباره</PendingButton></form>
    <Link href={`/login?next=${encodeURIComponent(next)}`}>بازگشت به ورود</Link>
  </section></main>;
}
