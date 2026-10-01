'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { db } from '@/lib/db';
import { hashPassword, validEmail, validPassword } from '@/lib/password';
import { ensureHistorySchema } from '@/server/ensure-schema';

function safeNext(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return '/account';
  if (value.startsWith('/') && !value.startsWith('//') && value.length < 200) return value;
  return '/account';
}

async function ensureAuthSchema() {
  await ensureHistorySchema().catch(() => undefined);
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
  const existing = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (existing?.passwordHash) redirect(`/login?error=exists&next=${encodeURIComponent(next)}`);
  if (existing && !existing.passwordHash) {
    await db.user.update({ where: { id: existing.id }, data: { passwordHash: hashPassword(password), name: name ?? undefined } });
  } else {
    await db.user.create({ data: { email, name, passwordHash: hashPassword(password) } });
  }
  try {
    await signIn('credentials', { email, password, redirectTo: next });
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
  try {
    await signIn('credentials', { email, password, redirectTo: next });
  } catch (error) {
    if (error instanceof AuthError) redirect(`/login?error=credentials&next=${encodeURIComponent(next)}`);
    throw error;
  }
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
