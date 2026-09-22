import { db } from '@/lib/db';
import { canAccessHistory, planHistoryDays, validHistorySubscription } from '@/lib/history-access';
import { withDeadline } from '@/lib/with-deadline';
import { previewCookie, validPreviewSession } from '@/server/chart-preview';

export async function historyAccess(hours: number) {
  if (canAccessHistory(hours)) return true;
  try {
    const { cookies } = await import('next/headers');
    if (validPreviewSession((await cookies()).get(previewCookie)?.value)) return hours <= 90 * 24;
    // Imported lazily: anonymous 24h requests never depend on authentication availability.
    const { auth } = await import('@/auth');
    const session = await withDeadline(auth(), 4_000);
    if (!session?.user?.email) return false;
    return await historyAccessForEmail(hours, session.user.email);
  } catch { return false; } // Session/database failure never unlocks paid data.
}

/** Internal authenticated identity lookup; never accept this email from a request parameter. */
export async function historyAccessForEmail(hours: number, email: string) {
  try {
    const now = new Date();
    const user = await withDeadline(db.user.findUnique({ where: { email }, select: {
      subscriptions: { where: { status: 'ACTIVE', startsAt: { lte: now }, expiresAt: { gt: now } } },
    } }), 4_000);
    const products = user?.subscriptions.filter(s => validHistorySubscription(s, now)).map(s => s.product) ?? [];
    if (!products.length) return false;
    // Subscription.product is the existing plan-slug reference. API-only subscriptions do not qualify.
    const plans = await withDeadline(db.plan.findMany({ where: { slug: { in: products }, active: true, webAvailable: true }, select: { features: true } }), 4_000);
    return plans.some(plan => canAccessHistory(hours, planHistoryDays(plan.features)));
  } catch { return false; }
}

export const privateHistoryHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
