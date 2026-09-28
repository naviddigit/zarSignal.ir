 'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { trialPolicy, trialProduct } from '@/server/analysis-trial';
import { instruments } from '@/lib/market';

export async function startAnalysisTrial(form: FormData) {
  const symbol = String(form.get('symbol'));
  if (!instruments.some(asset => asset.symbol.toLowerCase() === symbol)) return;
  const path = `/analysis/${symbol}`;
  const session = await auth();
  if (!session?.user?.email) redirect('/login?next=' + encodeURIComponent(path));
  const policy = await trialPolicy();
  if (!policy.enabled || !policy.available) redirect(path + '?trial=unavailable');
  try {
    await db.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { email: session!.user!.email! } });
      if (!user) throw new Error('User missing');
      // Serialize starts per account: concurrent tabs cannot create repeat trials.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
      const previous = await tx.subscription.findFirst({ where: { userId: user.id, product: trialProduct } });
      if (previous) return;
      const startsAt = new Date();
      await tx.subscription.create({ data: { userId: user.id, product: trialProduct, status: 'ACTIVE', startsAt,
        expiresAt: new Date(startsAt.getTime() + policy.hours * 3600000) } });
    });
  } catch { redirect(path + '?trial=unavailable'); }
  revalidatePath(path);
  redirect(path);
}

export async function acceptAnalysisWarning(form: FormData) {
  const symbol = String(form.get('symbol'));
  if (!instruments.some(asset => asset.symbol.toLowerCase() === symbol) || form.get('acknowledge') !== 'yes') return;
  const path = `/analysis/${symbol}`;
  const { analysisUserId, acknowledgeWarning } = await import('@/server/time-reliability');
  const userId = await analysisUserId();
  if (!userId) redirect('/login?next=' + encodeURIComponent(path));
  let requestId: string | null;
  try { requestId = await acknowledgeWarning(userId, symbol, String(form.get('policyVersion'))); }
  catch { redirect(path + '?warning=retry'); }
  redirect(requestId ? path + '?request=' + encodeURIComponent(requestId) : path);
}
