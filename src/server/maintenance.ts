import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';

export const MAINTENANCE_KEY = 'site-maintenance-v1';
export const defaultMaintenanceMessage = 'زرسیگنال، مرجع تخصصی دیده‌بان بازار طلا و ارز و بررسی حباب سکه و طلا، در حال تعمیر و به‌روزرسانی است. به‌زودی با داده‌ها و ابزارهای دقیق‌تر برمی‌گردیم.';

export type MaintenanceSettings = { enabled: boolean; message: string; writable: boolean };

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  try {
    const row = await withDeadline(db.integrationSetting.findUnique({ where: { key: MAINTENANCE_KEY } }), 2000);
    const message = row?.publicValue?.trim() || defaultMaintenanceMessage;
    return { enabled: row?.enabled === true, message, writable: true };
  } catch {
    // Fail open so a database outage never strands the public site in maintenance mode.
    return { enabled: false, message: defaultMaintenanceMessage, writable: false };
  }
}

export async function saveMaintenanceSettings(actor: string, enabled: boolean, message: string) {
  if (!actor) throw new Error('unauthorized');
  const clean = message.trim();
  if (clean.length < 20 || clean.length > 600) throw new Error('invalid_message');
  await db.integrationSetting.upsert({
    where: { key: MAINTENANCE_KEY },
    create: { key: MAINTENANCE_KEY, category: 'site', label: 'وضعیت تعمیر سایت', enabled, publicValue: clean },
    update: { enabled, publicValue: clean },
  });
}
