import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ProfileCompletionForm } from '@/components/profile-completion-form';
import { PhoneInput } from '@/components/phone-input';
import { deferProfileAction } from './actions';
import { getAccountPolicy } from '@/server/account-policy';
import { missingProfileFields, fieldRequired, profileRequired } from '@/lib/account-policy';
import { ProfileDemographics } from '@/components/profile-demographics';
import { Select } from '@/components/ui/select';
import { ensureAccountSchema } from '@/server/account-schema';

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

  await ensureAccountSchema();
  const policy = await getAccountPolicy();
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, phone: true, email: true, firstName: true, lastName: true, city: true, ageGroup: true, customerType: true },
  });
  const jar = await cookies();
  const deferred = jar.get('zs_profile_later')?.value === '1';
  if (user && missingProfileFields(user, policy).length === 0) {
    redirect(next);
  }
  if (deferred && !profileRequired(policy) && !params.error) {
    redirect(next);
  }

  const { firstName, lastName } = splitName(user?.name ?? session.user.name);
  const phoneDefault = user?.phone?.replace(/^\+98/, '0') ?? '';

  return (
    <main id="main" className="auth-page profile-complete-page">
      <section className="auth-card profile-complete-card">
        <span className="eyebrow gold-text">تکمیل حساب</span>
        <h1>یک قدم تا آماده‌شدن</h1>
        <p>{profileRequired(policy) ? 'موارد مشخص‌شده با ستاره لازم‌اند.' : 'تکمیل این اطلاعات اختیاری است.'}</p>
        {user?.email ? <p className="profile-complete-email" dir="ltr">{user.email}</p> : null}

        <ProfileCompletionForm initialError={params.error}>
          <input type="hidden" name="next" value={next} />
          <div className="profile-complete-grid">
            <label>
              <span>نام {fieldRequired(policy, 'firstName') ? '*' : ''}</span>
              <input name="firstName" defaultValue={user?.firstName ?? firstName} autoComplete="given-name" required={fieldRequired(policy, 'firstName')} minLength={2} maxLength={80} placeholder="مثلاً سارا" />
            </label>
            <label>
              <span>نام خانوادگی {fieldRequired(policy, 'lastName') ? '*' : ''}</span>
              <input name="lastName" defaultValue={user?.lastName ?? lastName} autoComplete="family-name" required={fieldRequired(policy, 'lastName')} minLength={2} maxLength={80} placeholder="مثلاً محمدی" />
            </label>
          </div>
          <label>
            <span>شماره موبایل {fieldRequired(policy, 'phone') ? '*' : ''}</span>
            <div className="phone-field">
              <span aria-hidden="true">+98</span>
              <PhoneInput
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                defaultValue={phoneDefault}
                required={fieldRequired(policy, 'phone')}
                placeholder="09121234567"
                dir="ltr"
              />
            </div>
          </label>
          <ProfileDemographics city={user?.city} ageGroup={user?.ageGroup} areaRequired={fieldRequired(policy, 'city')} ageRequired={fieldRequired(policy, 'ageGroup')} />
          {policy.customerTypes.length > 0 ? <Select name="customerType" label={`نوع کاربر ${fieldRequired(policy, 'customerType') ? '*' : '(اختیاری)'}`} defaultValue={user?.customerType && policy.customerTypes.includes(user.customerType) ? user.customerType : ''} required={fieldRequired(policy, 'customerType')} options={policy.customerTypes.map(value => ({ value, label: value }))} /> : null}
        </ProfileCompletionForm>

        {!profileRequired(policy) && <form action={deferProfileAction}>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="later" value="1" />
          <button type="submit" className="profile-complete-later">بعداً پر می‌کنم</button>
        </form>}

        {!profileRequired(policy) && <small>
          <Link href={next}>رد کردن این صفحه</Link>
        </small>}
      </section>
    </main>
  );
}
