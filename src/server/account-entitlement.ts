import { db } from '@/lib/db';
import { planHistoryDays, validHistorySubscription } from '@/lib/history-access';
import {
  accessLevelFromPlan,
  accessLevelLabel,
  capabilityRowsFor,
  isInternalProduct,
  planDisplayName,
  upgradePreview,
  type AccessLevel,
} from '@/lib/capabilities';
import { trialPolicy, trialProduct } from '@/server/analysis-trial';
import { withDeadline } from '@/lib/with-deadline';

export type AccountEntitlement = {
  level: AccessLevel;
  planLabel: string;
  statusLabel: 'فعال' | 'در انتظار پرداخت' | 'آزمایشی' | 'رایگان' | 'تعلیق‌شده';
  expiresAt: Date | null;
  historyDays: number;
  owned: ReturnType<typeof capabilityRowsFor>;
  upgrade: ReturnType<typeof upgradePreview>;
};

export async function resolveAccountEntitlement(userId: string): Promise<AccountEntitlement> {
  const now = new Date();
  const [subscriptions, plans] = await Promise.all([
    withDeadline(db.subscription.findMany({
      where: { userId },
      orderBy: { startsAt: 'desc' },
      take: 30,
    }), 4000).catch(() => []),
    withDeadline(db.plan.findMany({
      where: { active: true, webAvailable: true },
      select: { slug: true, title: true, features: true },
    }), 4000).catch(() => []),
  ]);

  const commercialSuspended = subscriptions.find(s =>
    !isInternalProduct(s.product) && s.status === 'SUSPENDED' && plans.some(p => p.slug === s.product),
  );
  const commercialActive = subscriptions.find(s =>
    !isInternalProduct(s.product) && validHistorySubscription(s, now) && plans.some(p => p.slug === s.product),
  );
  const commercialPending = subscriptions.find(s =>
    !isInternalProduct(s.product) && s.status === 'PENDING',
  );
  const trialActive = subscriptions.find(s =>
    s.product === trialProduct
    && validHistorySubscription(s, now),
  );

  if (commercialSuspended) {
    const plan = plans.find(p => p.slug === commercialSuspended.product);
    return {
      level: 'FREE',
      planLabel: planDisplayName(commercialSuspended.product, plan?.title),
      statusLabel: 'تعلیق‌شده',
      expiresAt: commercialSuspended.expiresAt,
      historyDays: 1,
      owned: capabilityRowsFor('FREE', 1),
      upgrade: upgradePreview('FREE'),
    };
  }

  if (commercialActive) {
    const plan = plans.find(p => p.slug === commercialActive.product);
    const level = accessLevelFromPlan(plan ?? { slug: commercialActive.product });
    const historyDays = plan ? planHistoryDays(plan.features) : 0;
    const days = historyDays || (level === 'HOME' ? 30 : level === 'FREE' ? 1 : 90);
    return {
      level,
      planLabel: planDisplayName(commercialActive.product, plan?.title),
      statusLabel: 'فعال',
      expiresAt: commercialActive.expiresAt,
      historyDays: days,
      owned: capabilityRowsFor(level, days),
      upgrade: upgradePreview(level),
    };
  }

  if (trialActive && (await trialPolicy()).enabled) {
    const level: AccessLevel = 'HOME';
    return {
      level,
      planLabel: 'دسترسی آزمایشی',
      statusLabel: 'آزمایشی',
      expiresAt: trialActive.expiresAt,
      historyDays: 30,
      owned: capabilityRowsFor(level, 30),
      upgrade: upgradePreview(level),
    };
  }

  if (commercialPending) {
    const plan = plans.find(p => p.slug === commercialPending.product);
    return {
      level: 'FREE',
      planLabel: planDisplayName(commercialPending.product, plan?.title),
      statusLabel: 'در انتظار پرداخت',
      expiresAt: commercialPending.expiresAt,
      historyDays: 1,
      owned: capabilityRowsFor('FREE', 1),
      upgrade: upgradePreview('FREE'),
    };
  }

  return {
    level: 'FREE',
    planLabel: accessLevelLabel('FREE'),
    statusLabel: 'رایگان',
    expiresAt: null,
    historyDays: 1,
    owned: capabilityRowsFor('FREE', 1),
    upgrade: upgradePreview('FREE'),
  };
}
