import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';

export const trialProduct = '__analysis_trial';
export const trialSettingKey = 'analysis-trial-hours';
export async function trialPolicy() {
  try {
    const row = await withDeadline(db.integrationSetting.findUnique({ where: { key: trialSettingKey } }), 4000);
    const hours = row ? Number(row.publicValue) : 24;
    return { enabled: row ? row.enabled : true, hours: Number.isInteger(hours) && hours >= 1 && hours <= 720 ? hours : 24, available: true };
  } catch { return { enabled: false, hours: 24, available: false }; }
}

export async function analysisTrial() {
  try {
    const { auth } = await import('@/auth');
    const [session, policy] = await Promise.all([withDeadline(auth(), 4000), trialPolicy()]);
    if (!session?.user?.email) return { ...policy, loggedIn: false, expiresAt: null, used: false };
    const user = await withDeadline(db.user.findUnique({ where: { email: session.user.email }, select: {
      subscriptions: { where: { product: trialProduct }, orderBy: { startsAt: 'asc' }, take: 1 },
    } }), 4000);
    const trial = user?.subscriptions[0];
    return { ...policy, loggedIn: Boolean(user), used: Boolean(trial), expiresAt: policy.enabled && trial?.status === 'ACTIVE' ? trial.expiresAt.toISOString() : null };
  } catch { return { enabled: false, available: false, hours: 24, loggedIn: false, used: false, expiresAt: null }; }
}
