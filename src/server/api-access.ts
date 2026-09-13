import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
export class AccessError extends Error { constructor(public status: number, public code: string) { super(code); } }
export function hashApiKey(key: string) { return createHash('sha256').update(key).digest('hex'); }
export function newApiKey() { const secret = `zs_${randomBytes(32).toString('hex')}`; return { secret, prefix: secret.slice(0, 11), keyHash: hashApiKey(secret) }; }
export function readBearer(value: string | null) { if (!value || !/^Bearer zs_[a-f0-9]{64}$/.test(value)) throw new AccessError(401, 'invalid_api_key'); return value.slice(7); }
export async function authorizeApi(request: Request) {
  const keyHash = hashApiKey(readBearer(request.headers.get('authorization')));
  const now = new Date(); const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // Serializable transaction plus retry prevents concurrent quota overspend.
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction(async tx => {
      const key = await tx.apiKey.findUnique({ where: { keyHash } });
      if (!key || key.revokedAt || key.expiresAt <= now) throw new AccessError(401, 'invalid_api_key');
      const subscription = await tx.subscription.findFirst({ where: { userId: key.userId, product: 'api', status: 'ACTIVE', startsAt: { lte: now }, expiresAt: { gt: now } } });
      if (!subscription) throw new AccessError(403, 'subscription_required');
      if (key.dailyLimit <= 0) throw new AccessError(429, 'daily_quota_exceeded');
      await tx.apiUsage.upsert({ where: { apiKeyId_day: { apiKeyId: key.id, day } }, create: { apiKeyId: key.id, day, count: 0 }, update: {} });
      const updated = await tx.apiUsage.updateMany({ where: { apiKeyId: key.id, day, count: { lt: key.dailyLimit } }, data: { count: { increment: 1 } } });
      if (!updated.count) throw new AccessError(429, 'daily_quota_exceeded');
      return { userId: key.userId, apiKeyId: key.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034','P2002'].includes(error.code) && attempt < 2) continue; throw error; }
  }
  throw new AccessError(503, 'temporarily_unavailable');
}
export function apiError(error: unknown) { return Response.json({ error: error instanceof AccessError ? error.code : 'temporarily_unavailable' }, { status: error instanceof AccessError ? error.status : 503, headers: { 'Cache-Control': 'no-store', ...(error instanceof AccessError && error.status === 429 ? { 'Retry-After': String(Math.ceil((new Date().setUTCHours(24,0,0,0)-Date.now())/1000)) } : {}) } }); }
