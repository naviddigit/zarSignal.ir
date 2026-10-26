import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthCapabilities } from '@/auth';

/** Public deploy identity + minimal auth schema health (no secrets/PII). */
export const dynamic = 'force-dynamic';

function authPublicHost() {
  for (const raw of [process.env.AUTH_URL, process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (!raw) continue;
    try {
      return new URL(raw).host;
    } catch {
      return 'invalid';
    }
  }
  return null;
}

export async function GET() {
  let passwordHashColumn = false;
  let passwordMigrationApplied = false;
  let dbOk = false;
  let customerTypeColumn = false;
  try {
    const cols = await db.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'User' AND column_name IN ('passwordHash', 'customerType')`,
    );
    passwordHashColumn = cols.some(column => column.column_name === 'passwordHash');
    customerTypeColumn = cols.some(column => column.column_name === 'customerType');
    const mig = await db.$queryRawUnsafe<{ migration_name: string }[]>(
      `SELECT migration_name FROM "_prisma_migrations"
       WHERE migration_name = '20261001180000_user_password_hash' AND finished_at IS NOT NULL`,
    );
    passwordMigrationApplied = mig.length > 0;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const authHost = authPublicHost();
  const authCapabilities = await getAuthCapabilities().catch(() => ({ google: false, email: false, phone: false }));

  return NextResponse.json({
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || process.env.COMMIT_SHA || null,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    authEmailConfigured: Boolean(process.env.AUTH_SECRET),
    authGoogleConfigured: authCapabilities.google,
    authPublicHost: authHost,
    authHostLooksLocal: Boolean(authHost && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(authHost)),
    adminBootstrapConfigured: Boolean(
      process.env.ADMIN_BOOTSTRAP_TOKEN
      && process.env.ADMIN_SESSION_SECRET
      && process.env.ADMIN_BOOTSTRAP_TOKEN.length >= 24
      && process.env.ADMIN_SESSION_SECRET.length >= 32
      && !(process.env.NODE_ENV === 'production' && (
        process.env.ADMIN_BOOTSTRAP_TOKEN.startsWith('local-only-')
        || process.env.ADMIN_SESSION_SECRET.startsWith('local-only-')
      )),
    ),
    dbOk,
    passwordHashColumn,
    customerTypeColumn,
    passwordMigrationApplied,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
