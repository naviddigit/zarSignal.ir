'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

const LATER_COOKIE = 'zs_profile_later';

function safeNext(value?: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value : '';
  if (raw.startsWith('/') && !raw.startsWith('//') && raw.length < 200) return raw;
  return '/account';
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, '').trim();
  if (!digits) return null;
  if (/^09\d{9}$/.test(digits)) return `+98${digits.slice(1)}`;
  if (/^\+989\d{9}$/.test(digits)) return digits;
  if (/^989\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

export async function completeProfileAction(form: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const next = safeNext(form.get('next'));
  const later = String(form.get('later') ?? '') === '1';

  if (later) {
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
  if (firstName.length < 2) throw new Error('نام حداقل ۲ نویسه لازم است.');
  if (lastName.length < 2) throw new Error('نام خانوادگی حداقل ۲ نویسه لازم است.');
  const phone = normalizePhone(phoneRaw);
  if (!phone) throw new Error('شماره موبایل را مثل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.');

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        name: `${firstName} ${lastName}`.trim(),
        phone,
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    if (/Unique constraint|P2002|phone/i.test(raw)) {
      throw new Error('این شماره قبلاً برای حساب دیگری ثبت شده است.');
    }
    throw error;
  }

  const jar = await cookies();
  jar.delete(LATER_COOKIE);
  revalidatePath('/account');
  revalidatePath('/admin/customers');
  redirect(next);
}

export async function deferProfileAction(form: FormData) {
  form.set('later', '1');
  return completeProfileAction(form);
}
