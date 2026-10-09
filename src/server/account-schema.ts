import { db } from '@/lib/db';

let ready: Promise<void> | undefined;
export function ensureAccountSchema() {
  return ready ??= (async () => {
    for (const field of ['firstName', 'lastName', 'city', 'occupation']) {
      await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "${field}" TEXT`);
    }
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "LoginEvent" (
      "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "provider" TEXT NOT NULL, "ip" TEXT, "country" TEXT, "region" TEXT, "city" TEXT, "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "LoginEvent_userId_createdAt_idx" ON "LoginEvent"("userId", "createdAt" DESC)');
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "EmailChallenge" (
      "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0)`);
  })().catch(error => { ready = undefined; throw error; });
}
