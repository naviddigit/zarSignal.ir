import { db } from '@/lib/db';

export type DatabaseHealth = {
  status: 'connected' | 'unavailable';
  latencyMs: number | null;
  code: 'ok' | 'connection_refused' | 'authentication_failed' | 'database_missing' | 'migration_required' | 'unknown';
  message: string;
};

export function describeDatabaseError(error: unknown): Pick<DatabaseHealth, 'code' | 'message'> {
  const text = error instanceof Error ? error.message : String(error);
  const lowered = text.toLowerCase();
  if (lowered.includes('p1001') || lowered.includes("can't reach database") || lowered.includes('connection refused')) return { code: 'connection_refused', message: 'PostgreSQL اجرا نیست یا پورت ۵۴۳۲ در دسترس نیست. docker compose up -d postgres را اجرا کنید.' };
  if (lowered.includes('p1000') || lowered.includes('authentication failed')) return { code: 'authentication_failed', message: 'نام کاربری یا رمز PostgreSQL با DATABASE_URL هماهنگ نیست.' };
  if (lowered.includes('p1003') || lowered.includes('database') && lowered.includes('does not exist')) return { code: 'database_missing', message: 'دیتابیس zarsignal ساخته نشده است.' };
  if (lowered.includes('relation') && lowered.includes('does not exist')) return { code: 'migration_required', message: 'اتصال برقرار است اما migrationهای Prisma اجرا نشده‌اند.' };
  return { code: 'unknown', message: 'اتصال دیتابیس ناموفق بود. لاگ سرور و DATABASE_URL را بررسی کنید.' };
}

export async function checkDatabase(): Promise<DatabaseHealth> {
  const startedAt = performance.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: 'connected', latencyMs: Math.round(performance.now() - startedAt), code: 'ok', message: 'اتصال PostgreSQL برقرار است.' };
  } catch (error) {
    return { status: 'unavailable', latencyMs: null, ...describeDatabaseError(error) };
  }
}
