import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';
import { defaultWarningPolicy, validWarningWindow, timeReliability, type WarningPolicy } from '@/lib/time-reliability';

function normalize(row: { version: string; timezone: string; warningStart: string; warningEnd: string } | null): WarningPolicy {
  return row?.timezone === 'Asia/Tehran' && validWarningWindow(row.warningStart, row.warningEnd)
    ? { version: row.version, timezone: 'Asia/Tehran', warningStart: row.warningStart, warningEnd: row.warningEnd } : { ...defaultWarningPolicy };
}
export async function getWarningPolicy() {
  try {
    const row = await withDeadline(db.analysisTimePolicy.findFirst({ orderBy: { id: 'desc' } }), 2000);
    return { ...normalize(row), fallback: !row || !validWarningWindow(row.warningStart, row.warningEnd) || row.timezone !== 'Asia/Tehran' };
  } catch { return { ...defaultWarningPolicy, fallback: true }; }
}
// Only called after server-side admin authorization. Policy and audit commit together.
export async function persistWarningPolicy(actor: string, start: string, end: string) {
  if (!actor || !validWarningWindow(start, end)) throw new Error('Invalid policy');
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7382093)`;
    const previous = normalize(await tx.analysisTimePolicy.findFirst({ orderBy: { id: 'desc' } }));
    const policy = await tx.analysisTimePolicy.create({ data: { warningStart: start, warningEnd: end, actor } });
    await tx.analysisPolicyAudit.create({ data: { actor, policyVersion: policy.version, previousValue: { ...previous }, newValue: { ...normalize(policy) } } });
    return normalize(policy);
  });
}
export async function analysisUserId() {
  try {
    const { auth } = await import('@/auth');
    const session = await withDeadline(auth(), 3000);
    if (!session?.user?.email) return null;
    return (await withDeadline(db.user.findUnique({ where: { email: session.user.email }, select: { id: true } }), 2000))?.id ?? null;
  } catch { return null; }
}
export async function acknowledgedRequest(userId: string | null, requestId: string | undefined, assetId: string, version: string) {
  if (!userId || !requestId || requestId.length > 100) return false;
  try {
    return Boolean(await withDeadline(db.analysisAcknowledgement.findFirst({ where: { userId, requestId, assetId, warningPolicyVersion: version } }), 2000));
  } catch { return false; }
}
export async function acknowledgeWarning(userId: string, assetId: string, expectedVersion: string) {
  if (!userId) throw new Error('Authentication required');
  // Same lock as policy writes: policy cannot change between validation and acceptance.
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7382093)`;
    const policy = normalize(await tx.analysisTimePolicy.findFirst({ orderBy: { id: 'desc' } }));
    if (policy.version !== expectedVersion) throw new Error('Policy changed');
    if (timeReliability(policy) !== 'WARNING') return null;
    const row = await tx.analysisAcknowledgement.create({ data: { userId, assetId, requestId: randomUUID(), warningPolicyVersion: policy.version } });
    return row.requestId;
  });
}
