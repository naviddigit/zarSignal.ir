import { z } from 'zod';
import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';

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
      select: { rating: true, comment: true, updatedAt: true },
    }),
    2000,
  );
}

/** Upsert editable feedback; one row per user+report+version. */
export async function saveAnalysisFeedback(userId: string, input: AnalysisFeedbackInput) {
  const parsed = analysisFeedbackInput.parse(input);
  const comment = parsed.comment?.trim() ? parsed.comment.trim() : null;
  return withDeadline(
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
}
