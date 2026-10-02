import { db } from '@/lib/db';
import { ensureHistorySchema } from '@/server/ensure-schema';

export type RateLimitResult =
  | { allowed: true; nextAllowedAt: Date }
  | { allowed: false; nextAllowedAt: Date; retryAfterSec: number };

/** Atomic cooldown: only advances nextAllowedAt when currently allowed. */
export async function consumeRateLimit(id: string, cooldownMs: number, now = new Date()): Promise<RateLimitResult> {
  await ensureHistorySchema().catch(() => undefined);
  const nextAllowedAt = new Date(now.getTime() + Math.max(0, cooldownMs));
  const updated = await db.$executeRawUnsafe(
    `INSERT INTO "RateLimitBucket" ("id", "nextAllowedAt", "updatedAt")
     VALUES ($1, $2, $3)
     ON CONFLICT ("id") DO UPDATE
       SET "nextAllowedAt" = EXCLUDED."nextAllowedAt",
           "updatedAt" = EXCLUDED."updatedAt"
     WHERE "RateLimitBucket"."nextAllowedAt" <= $3`,
    id,
    nextAllowedAt,
    now,
  );

  if (Number(updated) > 0) {
    return { allowed: true, nextAllowedAt };
  }

  const row = await db.rateLimitBucket.findUnique({ where: { id }, select: { nextAllowedAt: true } });
  const blockedUntil = row?.nextAllowedAt ?? nextAllowedAt;
  const retryAfterSec = Math.max(1, Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000));
  return { allowed: false, nextAllowedAt: blockedUntil, retryAfterSec };
}

export async function peekRateLimit(id: string, now = new Date()) {
  await ensureHistorySchema().catch(() => undefined);
  const row = await db.rateLimitBucket.findUnique({ where: { id }, select: { nextAllowedAt: true } }).catch(() => null);
  if (!row || row.nextAllowedAt <= now) return { allowed: true as const, nextAllowedAt: null as Date | null };
  return {
    allowed: false as const,
    nextAllowedAt: row.nextAllowedAt,
    retryAfterSec: Math.max(1, Math.ceil((row.nextAllowedAt.getTime() - now.getTime()) / 1000)),
  };
}
