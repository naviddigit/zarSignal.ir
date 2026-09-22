export const historyRanges = { '24h': 24, '7d': 168, '30d': 720, '90d': 2160 } as const;
export type HistoryRange = keyof typeof historyRanges;

/** Explicit Plan.features entitlement, never inferred from role, price or marketing copy. */
export function planHistoryDays(features: unknown): number {
  if (!Array.isArray(features)) return 0;
  return Math.max(0, ...features.flatMap(value => {
    const match = typeof value === 'string' && /^history:(7|30|90)d$/.exec(value);
    return match ? [Number(match[1])] : [];
  }));
}

export function canAccessHistory(hours: number, paidDays = 0) {
  return Number.isFinite(hours) && hours > 0 && hours <= Math.max(24, paidDays * 24);
}

export function validHistorySubscription(subscription: { status: string; startsAt: Date; expiresAt: Date }, now = new Date()) {
  return subscription.status === 'ACTIVE' && subscription.startsAt <= now && subscription.expiresAt > now;
}
