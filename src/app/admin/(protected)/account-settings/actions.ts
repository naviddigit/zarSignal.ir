'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin-auth';
import { ACCOUNT_POLICY_KEY } from '@/server/account-policy';
import { parseAccountPolicy } from '@/lib/account-policy';
import { getResendConfig } from '@/server/email-verification';

export async function saveAccountPolicy(form: FormData) {
  await requireAdmin();
  const policy = parseAccountPolicy({ emailVerificationRequired: form.get('emailVerificationRequired') === 'on', profileRequired: form.get('profileRequired') === 'on', requiredFields: form.getAll('requiredFields') });
  try {
    if (policy.emailVerificationRequired && !await getResendConfig()) throw new Error('ابتدا اتصال Resend و فرستنده را تنظیم و فعال کنید.');
    if (policy.profileRequired && !policy.requiredFields.length) throw new Error('حداقل یک فیلد اجباری انتخاب کنید.');
    await db.integrationSetting.upsert({ where: { key: ACCOUNT_POLICY_KEY }, create: { key: ACCOUNT_POLICY_KEY, category: 'auth', label: 'تنظیمات حساب', publicValue: JSON.stringify(policy), enabled: true }, update: { publicValue: JSON.stringify(policy) } });
  } catch (error) {
    redirect(`/admin/account-settings?error=${encodeURIComponent(error instanceof Error ? error.message : 'ذخیره ممکن نشد.')}`);
  }
  revalidatePath('/account/complete');
  revalidatePath('/admin/account-settings');
  redirect('/admin/account-settings?saved=1');
}
