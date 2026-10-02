import { z } from 'zod';
import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';
import { consumeRateLimit, peekRateLimit } from '@/server/rate-limit';
import { getFeedbackCooldownHours } from '@/server/feedback-policy';
import { ensureHistorySchema } from '@/server/ensure-schema';

const reportIdSchema = z.string().trim().regex(/^mvr_[a-f0-9]{8,64}$/i).max(80);
const schemaVersionSchema = z.string().trim().regex(/^\d+\.\d+$/).max(16);
const symbolSchema = z.string().trim().max(32).optional().nullable();

export const analysisReadInput = z.object({
  reportId: reportIdSchema,
  schemaVersion: schemaVersionSchema,
  symbol: symbolSchema,
});

export const analysisFeedbackInput = z.object({
  reportId: reportIdSchema,
  schemaVersion: schemaVersionSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().nullable(),
});

export type AnalysisReadInput = z.infer<typeof analysisReadInput>;
export type AnalysisFeedbackInput = z.infer<typeof analysisFeedbackInput>;

/** Record one completed reading; unique per user+report+version so retries/tabs do not inflate. */
export async function recordAnalysisRead(userId: string, input: AnalysisReadInput) {
  const parsed = analysisReadInput.parse(input);
  await withDeadline(
    db.analysisRead.upsert({
      where: {
        userId_reportId_schemaVersion: {
          userId,
          reportId: parsed.reportId,
          schemaVersion: parsed.schemaVersion,
        },
      },
      create: {
        userId,
        reportId: parsed.reportId,
        schemaVersion: parsed.schemaVersion,
        symbol: parsed.symbol ?? null,
      },
      update: {},
    }),
    3000,
  );
  return countAnalysisReads(userId);
}

export async function countAnalysisReads(userId: string) {
  return withDeadline(db.analysisRead.count({ where: { userId } }), 2000);
}

export async function getAnalysisFeedback(userId: string, reportId: string, schemaVersion: string) {
  const id = reportIdSchema.parse(reportId);
  const version = schemaVersionSchema.parse(schemaVersion);
  return withDeadline(
    db.analysisFeedback.findUnique({
      where: {
        userId_reportId_schemaVersion: {
          userId,
          reportId: id,
          schemaVersion: version,
        },
      },
      select: { id: true, rating: true, comment: true, updatedAt: true },
    }),
    2000,
  );
}

export type SaveFeedbackResult =
  | { ok: true; mode: 'create' | 'edit'; feedback: { rating: number; comment: string | null; updatedAt: Date } }
  | { ok: false; code: 'rate_limited'; nextAllowedAt: Date; retryAfterSec: number };

/**
 * Upsert editable feedback.
 * Edit of the same report row is always allowed.
 * Creating a *new* feedback row is gated by admin-configurable cooldown (default 6h).
 */
export async function saveAnalysisFeedback(userId: string, input: AnalysisFeedbackInput): Promise<SaveFeedbackResult> {
  await ensureHistorySchema().catch(() => undefined);
  const parsed = analysisFeedbackInput.parse(input);
  const comment = parsed.comment?.trim() ? parsed.comment.trim() : null;

  const existing = await db.analysisFeedback.findUnique({
    where: {
      userId_reportId_schemaVersion: {
        userId,
        reportId: parsed.reportId,
        schemaVersion: parsed.schemaVersion,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    const hours = await getFeedbackCooldownHours();
    const cooldownMs = hours * 3_600_000;
    if (cooldownMs > 0) {
      const gate = await consumeRateLimit(`feedback:new:${userId}`, cooldownMs);
      if (!gate.allowed) {
        return {
          ok: false,
          code: 'rate_limited',
          nextAllowedAt: gate.nextAllowedAt,
          retryAfterSec: gate.retryAfterSec,
        };
      }
    }
  }

  const feedback = await withDeadline(
    db.analysisFeedback.upsert({
      where: {
        userId_reportId_schemaVersion: {
          userId,
          reportId: parsed.reportId,
          schemaVersion: parsed.schemaVersion,
        },
      },
      create: {
        userId,
        reportId: parsed.reportId,
        schemaVersion: parsed.schemaVersion,
        rating: parsed.rating,
        comment,
      },
      update: {
        rating: parsed.rating,
        comment,
      },
      select: { rating: true, comment: true, updatedAt: true },
    }),
    3000,
  );

  return { ok: true, mode: existing ? 'edit' : 'create', feedback };
}

export async function feedbackNewAvailability(userId: string) {
  const hours = await getFeedbackCooldownHours();
  if (hours <= 0) return { allowed: true as const, nextAllowedAt: null as string | null, cooldownHours: hours };
  const peek = await peekRateLimit(`feedback:new:${userId}`);
  return {
    allowed: peek.allowed,
    nextAllowedAt: peek.nextAllowedAt?.toISOString() ?? null,
    retryAfterSec: 'retryAfterSec' in peek ? peek.retryAfterSec : null,
    cooldownHours: hours,
  };
}
