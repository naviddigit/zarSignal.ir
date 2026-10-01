import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/** Public deploy identity + minimal auth schema health (no secrets/PII). */
export const dynamic = 'force-dynamic';

export async function GET() {
  let passwordHashColumn = false;
  let passwordMigrationApplied = false;
  let dbOk = false;
  try {
    const cols = await db.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'passwordHash'`,
    );
    passwordHashColumn = cols.length > 0;
    const mig = await db.$queryRawUnsafe<{ migration_name: string }[]>(
      `SELECT migration_name FROM "_prisma_migrations"
       WHERE migration_name = '20261001180000_user_password_hash' AND finished_at IS NOT NULL`,
    );
    passwordMigrationApplied = mig.length > 0;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  return NextResponse.json({
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA
      ?? process.env.CF_PAGES_COMMIT_SHA
      ?? process.env.COMMIT_SHA
      ?? null,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    authEmailConfigured: Boolean(process.env.AUTH_SECRET),
    dbOk,
    passwordHashColumn,
    passwordMigrationApplied,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
