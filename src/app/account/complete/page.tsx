import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { PendingButton } from '@/components/pending-button';
import { completeProfileAction, deferProfileAction } from './actions';

export const dynamic = 'force-dynamic';

function safeNext(value?: string) {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && value.length < 200) return value;
  return '/account';
}

function splitName(name: string | null | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent('/account/complete')}`);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, phone: true, email: true },
  });
  const jar = await cookies();
  const deferred = jar.get('zs_profile_later')?.value === '1';
  if (user?.phone && user.name?.trim() && user.name.trim().includes(' ')) {
    redirect(next);
  }
  if (deferred && !params.error) {
    redirect(next);
  }

  const { firstName, lastName } = splitName(user?.name ?? session.user.name);
  const phoneDefault = user?.phone?.replace(/^\+98/, '0') ?? '';

  return (
    <main id="main" className="auth-page profile-complete-page">
      <section className="auth-card profile-complete-card">
        <span className="eyebrow gold-text">تکمیل حساب</span>
        <h1>یک قدم تا آماده‌شدن</h1>
        <p>نام، نام‌خانوادگی و موبایل را وارد کنید. تأیید پیامکی به‌زودی فعال می‌شود؛ فعلاً شماره ذخیره می‌شود.</p>
        {user?.email ? <p className="profile-complete-email" dir="ltr">{user.email}</p> : null}
        {params.error ? <p className="calc-error" role="alert">{params.error}</p> : null}

        <form
          className="profile-complete-form"
          action={async formData => {
            'use server';
            try {
              await completeProfileAction(formData);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'ذخیره ممکن نشد.';
              redirect(`/account/complete?next=${encodeURIComponent(String(formData.get('next') || '/account'))}&error=${encodeURIComponent(message)}`);
            }
          }}
        >
          <input type="hidden" name="next" value={next} />
          <div className="profile-complete-grid">
            <label>
              <span>نام</span>
              <input name="firstName" defaultValue={firstName} autoComplete="given-name" required minLength={2} placeholder="مثلاً سارا" />
            </label>
            <label>
              <span>نام خانوادگی</span>
              <input name="lastName" defaultValue={lastName} autoComplete="family-name" required minLength={2} placeholder="مثلاً محمدی" />
            </label>
          </div>
          <label>
            <span>شماره موبایل</span>
            <div className="phone-field">
              <span aria-hidden="true">+98</span>
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                defaultValue={phoneDefault}
                required
                placeholder="09121234567"
                dir="ltr"
              />
            </div>
          </label>
          <PendingButton className="button" pendingText="در حال ذخیره…">ادامه</PendingButton>
        </form>

        <form action={deferProfileAction}>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="later" value="1" />
          <button type="submit" className="profile-complete-later">بعداً پر می‌کنم</button>
        </form>

        <small>
          <Link href={next}>رد کردن این صفحه</Link>
        </small>
      </section>
    </main>
  );
}
