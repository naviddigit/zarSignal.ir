import { db } from '@/lib/db';
import { ensureHistorySchema } from '@/server/ensure-schema';
import { withDeadline } from '@/lib/with-deadline';

export type FeedbackListFilters = {
  rating?: number;
  symbol?: string;
  reviewed?: 'all' | 'reviewed' | 'unreviewed';
  fromIso?: string;
  toIso?: string;
  page?: number;
  pageSize?: number;
};

export async function listAnalysisFeedback(filters: FeedbackListFilters = {}) {
  await ensureHistorySchema().catch(() => undefined);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (filters.rating && filters.rating >= 1 && filters.rating <= 5) where.rating = filters.rating;
  if (filters.reviewed === 'reviewed') where.reviewedAt = { not: null };
  if (filters.reviewed === 'unreviewed') where.reviewedAt = null;
  if (filters.fromIso || filters.toIso) {
    where.updatedAt = {
      ...(filters.fromIso ? { gte: new Date(filters.fromIso) } : {}),
      ...(filters.toIso ? { lte: new Date(filters.toIso) } : {}),
    };
  }

  // Symbol is not a column on AnalysisFeedback — filter via AnalysisRead join when requested.
  let userReportFilter: { userId: string; reportId: string }[] | null = null;
  if (filters.symbol?.trim()) {
    const reads = await db.analysisRead.findMany({
      where: { symbol: filters.symbol.trim().toUpperCase() },
      select: { userId: true, reportId: true },
      take: 2000,
    }).catch(() => []);
    userReportFilter = reads;
    if (userReportFilter.length === 0) {
      return { rows: [], total: 0, page, pageSize, stats: await feedbackStats() };
    }
    where.OR = userReportFilter.map(r => ({ userId: r.userId, reportId: r.reportId }));
  }

  const [total, rows, stats] = await Promise.all([
    withDeadline(db.analysisFeedback.count({ where }), 4000),
    withDeadline(
      db.analysisFeedback.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      4000,
    ),
    feedbackStats(),
  ]);

  const reportIds = [...new Set(rows.map(r => r.reportId))];
  const reads = reportIds.length
    ? await db.analysisRead.findMany({
        where: { reportId: { in: reportIds } },
        select: { reportId: true, symbol: true, userId: true },
        take: 500,
      }).catch(() => [])
    : [];

  return {
    page,
    pageSize,
    total,
    stats,
    rows: rows.map(row => {
      const read = reads.find(r => r.reportId === row.reportId && r.userId === row.userId)
        ?? reads.find(r => r.reportId === row.reportId);
      return {
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        reportId: row.reportId,
        schemaVersion: row.schemaVersion,
        symbol: read?.symbol ?? null,
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
        reviewedBy: row.reviewedBy,
        updatedAt: row.updatedAt.toISOString(),
        user: {
          id: row.user.id,
          email: row.user.email,
          name: row.user.name,
        },
      };
    }),
  };
}

async function feedbackStats() {
  const [total, reviewed, byRating] = await Promise.all([
    db.analysisFeedback.count(),
    db.analysisFeedback.count({ where: { reviewedAt: { not: null } } }),
    db.analysisFeedback.groupBy({
      by: ['rating'],
      _count: { _all: true },
    }),
  ]);
  return {
    total,
    reviewed,
    unreviewed: Math.max(0, total - reviewed),
    byRating: Object.fromEntries(byRating.map(r => [String(r.rating), r._count._all])),
  };
}

export async function markFeedbackReviewed(actor: string, feedbackId: string, reviewed: boolean) {
  if (!actor) throw new Error('unauthorized');
  await ensureHistorySchema();
  const previous = await db.analysisFeedback.findUnique({
    where: { id: feedbackId },
    select: { id: true, userId: true, reviewedAt: true, reviewedBy: true, rating: true },
  });
  if (!previous) throw new Error('بازخورد یافت نشد.');

  const updated = await db.analysisFeedback.update({
    where: { id: feedbackId },
    data: reviewed
      ? { reviewedAt: new Date(), reviewedBy: actor }
      : { reviewedAt: null, reviewedBy: null },
    select: { id: true, reviewedAt: true, reviewedBy: true, userId: true },
  });

  await db.adminAccessAudit.create({
    data: {
      actor,
      userId: previous.userId,
      action: reviewed ? 'feedback_reviewed' : 'feedback_unreviewed',
      reason: 'تغییر وضعیت بررسی بازخورد',
      previousValue: {
        feedbackId: previous.id,
        reviewedAt: previous.reviewedAt?.toISOString() ?? null,
        reviewedBy: previous.reviewedBy,
        rating: previous.rating,
      },
      nextValue: {
        feedbackId: updated.id,
        reviewedAt: updated.reviewedAt?.toISOString() ?? null,
        reviewedBy: updated.reviewedBy,
      },
    },
  });

  return updated;
}
