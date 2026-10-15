import { db } from '@/lib/db';

const shared = globalThis as unknown as { accountSchemaReady?: Promise<void> };
export function ensureAccountSchema() {
  return shared.accountSchemaReady ??= (async () => {
    const [schema] = await db.$queryRawUnsafe<{ columns: string[] | null; loginTable: string | null; loginIndex: string | null; emailTable: string | null }[]>(`
      SELECT (SELECT array_agg(column_name::text) FROM information_schema.columns WHERE table_schema='public' AND table_name='User') AS columns,
      to_regclass('public."LoginEvent"')::text AS "loginTable", to_regclass('public."LoginEvent_userId_createdAt_idx"')::text AS "loginIndex",
      to_regclass('public."EmailChallenge"')::text AS "emailTable"`);
    for (const field of ['firstName', 'lastName', 'city', 'occupation', 'customerType', 'ageGroup']) {
      if (schema?.columns?.includes(field)) continue;
      await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "${field}" TEXT`);
    }
    if (!schema?.loginTable) await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "LoginEvent" (
      "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "provider" TEXT NOT NULL, "ip" TEXT, "country" TEXT, "region" TEXT, "city" TEXT, "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    if (!schema?.loginIndex) await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "LoginEvent_userId_createdAt_idx" ON "LoginEvent"("userId", "createdAt" DESC)');
    if (!schema?.emailTable) await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "EmailChallenge" (
      "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0)`);
  })().catch(error => { shared.accountSchemaReady = undefined; throw error; });
}
