'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getAccountPolicy } from '@/server/account-policy';
import { missingProfileFields, profileFields, profileRequired, registrationProfile, profileDemographics } from '@/lib/account-policy';
import { ensureAccountSchema } from '@/server/account-schema';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

const LATER_COOKIE = 'zs_profile_later';

function safeNext(value?: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value : '';
  if (raw.startsWith('/') && !raw.startsWith('//') && raw.length < 200) return raw;
  return '/account';
}

export async function completeProfileAction(form: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const next = safeNext(form.get('next'));
  const later = String(form.get('later') ?? '') === '1';
  const policy = await getAccountPolicy();

  if (later) {
    if (profileRequired(policy)) throw new Error('تکمیل اطلاعات اجباری است.');
    const jar = await cookies();
    jar.set(LATER_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect(next);
  }

  const firstName = String(form.get('firstName') ?? '').trim();
  const lastName = String(form.get('lastName') ?? '').trim();
  const phoneRaw = String(form.get('phone') ?? '').trim();
  const { phone, customerType } = registrationProfile({ phone: phoneRaw, customerType: String(form.get('customerType') ?? '') }, policy);
  const { city, ageGroup } = profileDemographics({ city: String(form.get('city') ?? ''), ageGroup: String(form.get('ageGroup') ?? '') });
  const fields = { firstName, lastName, phone, city, ageGroup, customerType };
  for (const [key, value] of Object.entries(fields)) {
    if (value && (value.length < 2 || value.length > 80)) throw new Error('هر مقدار باید بین ۲ و ۸۰ نویسه باشد.');
  }
  const missing = missingProfileFields(fields, policy);
  if (profileRequired(policy) && missing.length) throw new Error(`این موارد لازم‌اند: ${missing.map(key => profileFields[key]).join('، ')}`);
  await ensureAccountSchema();

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        name: `${firstName} ${lastName}`.trim(),
        phone,
        customerType,
        firstName: firstName || null, lastName: lastName || null, city, ageGroup,
      },
    });
  } catch (error) {
    const failure = error as { code?: string; meta?: { target?: unknown } };
    if (failure?.code === 'P2002' && (Array.isArray(failure.meta?.target) ? failure.meta.target.includes('phone') : typeof failure.meta?.target === 'string' && /phone/i.test(failure.meta.target))) {
      throw new Error('این شماره قبلاً برای حساب دیگری ثبت شده است.');
    }
    console.error('profile-save-failed', { code: failure?.code ?? 'unknown' });
    throw new Error('ذخیره اطلاعات ممکن نشد؛ لطفاً دوباره تلاش کنید.');
  }

  const jar = await cookies();
  jar.delete(LATER_COOKIE);
  revalidatePath('/account');
  revalidatePath('/admin/customers');
  redirect(next);
}

export async function submitProfileAction(form: FormData) {
  try { await completeProfileAction(form); return { error: '' }; }
  catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: error instanceof Error ? error.message : 'ذخیره ممکن نشد.' };
  }
}

export async function deferProfileAction(form: FormData) {
  form.set('later', '1');
  return completeProfileAction(form);
}
