import { Activity, Mail } from 'lucide-react';
import Link from 'next/link';
import { auth, getAuthCapabilities, signIn, signOut } from '@/auth';
import { PendingButton } from '@/components/pending-button';
import { loginWithEmail, registerWithEmail } from '@/app/login/actions';

export const dynamic = 'force-dynamic';

function safeNext(value?: string) {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && value.length < 200) return value;
  return '/account';
}

const errors: Record<string, string> = {
  invalid: 'ایمیل یا رمز عبور معتبر نیست (رمز حداقل ۸ کاراکتر).',
  exists: 'این ایمیل قبلاً ثبت شده؛ وارد شوید.',
  credentials: 'ایمیل یا رمز عبور نادرست است.',
  signin: 'ورود پس از ثبت‌نام ناموفق بود؛ دوباره تلاش کنید.',
  config: 'ورود ایمیلی موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeNext(params.next);
  const mode = params.mode === 'register' ? 'register' : 'login';
  const session = await auth().catch(() => null);
  const authCapabilities = await getAuthCapabilities();
  const errorText = params.error ? errors[params.error] ?? 'ورود ناموفق بود.' : null;
  // Email/password is the production path. Never hide it behind Google/SMS placeholders.
  const emailReady = authCapabilities.email;

  return (
    <main id="main" className="auth-page">
      <section className="auth-card">
        <Link href="/" className="brand">
          <span className="brand-mark"><Activity size={26} /></span>
          <span>زر<span className="gold-text">سیگنال</span></span>
        </Link>

        {session?.user ? (
          <>
            <h1>خوش آمدید</h1>
            <p>{session.user.email ?? session.user.name}</p>
            <div className="auth-session-actions">
              <Link className="button" href={returnTo}>ادامه به حساب</Link>
              <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}>
                <PendingButton pendingText="در حال خروج…">خروج از حساب</PendingButton>
              </form>
            </div>
          </>
        ) : (
          <>
            <span className="eyebrow gold-text">حساب کاربری زرسیگنال</span>
            <h1>{mode === 'register' ? 'ثبت‌نام با ایمیل' : 'ورود با ایمیل'}</h1>
            <p>مسیر اصلی ورود همین فرم است. پرداخت آنلاین هنوز فعال نیست.</p>
            {errorText ? <p className="calc-error" role="alert">{errorText}</p> : null}

            <div className="auth-methods">
              {emailReady ? (
                <form className="email-login" action={mode === 'register' ? registerWithEmail : loginWithEmail}>
                  <input type="hidden" name="next" value={returnTo} />
                  {mode === 'register' ? (
                    <>
                      <label htmlFor="name">نام (اختیاری)</label>
                      <div className="phone-field">
                        <input id="name" name="name" autoComplete="name" placeholder="نام نمایشی" />
                      </div>
                    </>
                  ) : null}
                  <label htmlFor="email">ایمیل</label>
                  <div className="phone-field">
                    <Mail size={18} aria-hidden="true" />
                    <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
                  </div>
                  <label htmlFor="password">رمز عبور</label>
                  <div className="phone-field">
                    <input id="password" name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={8} placeholder="حداقل ۸ کاراکتر" />
                  </div>
                  <PendingButton className="button" pendingText={mode === 'register' ? 'در حال ثبت…' : 'در حال ورود…'}>
                    {mode === 'register' ? 'ثبت‌نام و ورود' : 'ورود با ایمیل'}
                  </PendingButton>
                  <small className="auth-config-note">
                    {mode === 'register' ? (
                      <Link href={`/login?next=${encodeURIComponent(returnTo)}`}>قبلاً حساب دارید؟ ورود</Link>
                    ) : (
                      <Link href={`/login?mode=register&next=${encodeURIComponent(returnTo)}`}>حساب ندارید؟ ثبت‌نام</Link>
                    )}
                  </small>
                </form>
              ) : (
                <div className="auth-unavailable" role="alert">
                  <Mail size={18} />
                  <div>
                    <strong>ورود با ایمیل موقتاً قطع است</strong>
                    <small>پیکربندی سرور ناقص است؛ تیم فنی در حال رفع است.</small>
                  </div>
                </div>
              )}

              {authCapabilities.google ? (
                <>
                  <div className="auth-divider"><span>یا</span></div>
                  <form action={async () => { 'use server'; await signIn('google', { redirectTo: returnTo }); }}>
                    <PendingButton className="google-button" pendingText="در حال اتصال…">
                      <b>G</b> ادامه با گوگل
                    </PendingButton>
                  </form>
                </>
              ) : null}

              {/* Disabled providers stay out of the primary path — one quiet note only. */}
              {!authCapabilities.google || !authCapabilities.phone ? (
                <p className="auth-alt-note">
                  گوگل و پیامک هنوز فعال نیستند؛ فعلاً فقط ایمیل.
                </p>
              ) : null}
            </div>
            <small>با ورود، قوانین استفاده و حریم خصوصی زرسیگنال را می‌پذیرید.</small>
          </>
        )}
      </section>
    </main>
  );
}
