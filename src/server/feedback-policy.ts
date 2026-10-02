import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';

export const FEEDBACK_COOLDOWN_SETTING_KEY = 'analysis_feedback_cooldown_hours';
export const DEFAULT_FEEDBACK_COOLDOWN_HOURS = 6;
export const MANUAL_REFRESH_COOLDOWN_MS = 30_000;

export async function getFeedbackCooldownHours(): Promise<number> {
  try {
    const row = await withDeadline(
      db.integrationSetting.findUnique({ where: { key: FEEDBACK_COOLDOWN_SETTING_KEY } }),
      2000,
    );
    const hours = Number(row?.publicValue ?? DEFAULT_FEEDBACK_COOLDOWN_HOURS);
    if (!Number.isFinite(hours) || hours < 0 || hours > 168) return DEFAULT_FEEDBACK_COOLDOWN_HOURS;
    return hours;
  } catch {
    return DEFAULT_FEEDBACK_COOLDOWN_HOURS;
  }
}

export async function persistFeedbackCooldownHours(actor: string, hours: number) {
  if (!actor) throw new Error('unauthorized');
  const value = Math.min(168, Math.max(0, Math.round(hours)));
  await db.integrationSetting.upsert({
    where: { key: FEEDBACK_COOLDOWN_SETTING_KEY },
    create: {
      key: FEEDBACK_COOLDOWN_SETTING_KEY,
      category: 'analysis',
      label: 'فاصلهٔ مجاز بین بازخوردهای جدید',
      enabled: true,
      publicValue: String(value),
    },
    update: {
      enabled: true,
      publicValue: String(value),
      label: 'فاصلهٔ مجاز بین بازخوردهای جدید',
      category: 'analysis',
    },
  });
  return value;
}
