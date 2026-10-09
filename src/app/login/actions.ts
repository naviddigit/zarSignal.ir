'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { db } from '@/lib/db';
import { hashPassword, validEmail, validPassword, verifyPassword } from '@/lib/password';
import { ensureHistorySchema } from '@/server/ensure-schema';
import { getAccountPolicy } from '@/server/account-policy';
import { sendVerificationCode, EMAIL_CHALLENGE_COOKIE } from '@/server/email-verification';
import { ensureAccountSchema } from '@/server/account-schema';
import { cookies } from 'next/headers';

function safeNext(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return '/account';
  if (value.startsWith('/') && !value.startsWith('//') && value.length < 200) return value;
  return '/account';
}

async function ensureAuthSchema() {
  await ensureHistorySchema().catch(() => undefined);
  await ensureAccountSchema();
}

export async function registerWithEmail(formData: FormData) {
  await ensureAuthSchema();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const name = String(formData.get('name') ?? '').trim().slice(0, 80) || null;
  const next = safeNext(formData.get('next'));
  if (!validEmail(email) || !validPassword(password)) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  // Existing Google accounts must never acquire a password through an unauthenticated signup.
  if (existing) redirect(`/login?error=exists&next=${encodeURIComponent(next)}`);
  const user = await db.user.create({ data: { email, name, passwordHash: hashPassword(password) } });
  if ((await getAccountPolicy()).emailVerificationRequired) await beginVerification(user, next);
  try {
    await signIn('credentials', { email, password, redirectTo: `/account/complete?next=${encodeURIComponent(next.includes('?') ? `${next}&signup=1` : `${next}?signup=1`)}` });
  } catch (error) {
    if (error instanceof AuthError) redirect(`/login?error=signin&next=${encodeURIComponent(next)}`);
    throw error;
  }
}

export async function loginWithEmail(formData: FormData) {
  await ensureAuthSchema();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next'));
  if (!validEmail(email) || !validPassword(password)) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, passwordHash: true, emailVerified: true } });
  if (user?.passwordHash && verifyPassword(password, user.passwordHash) && !user.emailVerified && (await getAccountPolicy()).emailVerificationRequired) await beginVerification(user, next);
  try {
    await signIn('credentials', { email, password, redirectTo: `/account/complete?next=${encodeURIComponent(next)}` });
  } catch (error) {
    if (error instanceof AuthError) redirect(`/login?error=credentials&next=${encodeURIComponent(next)}`);
    throw error;
  }
}

async function beginVerification(user: { id: string; email: string | null }, next: string): Promise<never> {
  try { await sendVerificationCode(user); }
  catch (error) { redirect(`/login?error=mail&message=${encodeURIComponent(error instanceof Error ? error.message : 'ارسال ایمیل ناموفق بود.')}&next=${encodeURIComponent(next)}`); }
  redirect(`/login/verify?next=${encodeURIComponent(next)}`);
}

export async function verifyEmailCode(form: FormData) {
  const next = safeNext(form.get('next'));
  const code = String(form.get('code') ?? '').replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  try {
    await signIn('credentials', { code, redirectTo: `/account/complete?next=${encodeURIComponent(next)}` });
  } catch (error) {
    if (error instanceof AuthError) redirect(`/login/verify?error=code&next=${encodeURIComponent(next)}`);
    throw error;
  }
}

export async function resendEmailCode(form: FormData) {
  const next = safeNext(form.get('next'));
  const id = (await cookies()).get(EMAIL_CHALLENGE_COOKIE)?.value;
  const challenge = id ? await db.emailChallenge.findUnique({ where: { id }, include: { user: { select: { id: true, email: true } } } }) : null;
  if (!challenge || challenge.expiresAt < new Date()) redirect('/login');
  await beginVerification(challenge.user, next);
}

/** Reserve a PENDING subscription for the authenticated user (payment gateway still offline). */
export async function reserveSubscription(formData: FormData) {
  const slug = String(formData.get('plan') ?? '').trim();
  const next = `/subscribe/${encodeURIComponent(slug)}`;
  const { auth } = await import('@/auth');
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!/^[a-z0-9-]{2,64}$/i.test(slug)) redirect('/pricing');

  const plan = await db.plan.findFirst({ where: { slug, active: true }, select: { slug: true } });
  if (!plan) redirect('/pricing');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60_000);
  const existing = await db.subscription.findFirst({
    where: { userId: session.user.id, product: plan.slug, status: { in: ['PENDING', 'ACTIVE'] } },
    orderBy: { startsAt: 'desc' },
  });
  if (!existing) {
    await db.subscription.create({
      data: {
        userId: session.user.id,
        product: plan.slug,
        status: 'PENDING',
        startsAt: now,
        expiresAt,
      },
    });
  }
  redirect(`/account?reserved=${encodeURIComponent(plan.slug)}`);
}

/** Self-delete for disposable P0 auth test accounts only. */
export async function deleteP0TestAccount() {
  const { auth, signOut } = await import('@/auth');
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? '';
  if (!session?.user?.id || !/^zs\.p0\.auth\./i.test(email)) {
    redirect('/account');
  }
  const userId = session.user.id;
  await db.subscription.deleteMany({ where: { userId } });
  await db.analysisAcknowledgement.deleteMany({ where: { userId } }).catch(() => undefined);
  await db.account.deleteMany({ where: { userId } }).catch(() => undefined);
  await db.session.deleteMany({ where: { userId } }).catch(() => undefined);
  await db.apiKey.deleteMany({ where: { userId } }).catch(() => undefined);
  await db.payment.deleteMany({ where: { userId } }).catch(() => undefined);
  await db.user.delete({ where: { id: userId } });
  try {
    await signOut({ redirectTo: '/login?cleaned=1' });
  } catch {
    redirect('/login?cleaned=1');
  }
}
