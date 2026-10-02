import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  analysisFeedbackInput,
  feedbackNewAvailability,
  getAnalysisFeedback,
  saveAnalysisFeedback,
} from '@/server/analysis-engagement';
import { ensureHistorySchema } from '@/server/ensure-schema';

export const dynamic = 'force-dynamic';

async function requireUserId() {
  const session = await auth().catch(() => null);
  return session?.user?.id ?? null;
}

/** GET ?reportId=&schemaVersion= — existing editable feedback for this report. */
export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'ورود لازم است' }, { status: 401 });
  const url = new URL(request.url);
  const reportId = url.searchParams.get('reportId') ?? '';
  const schemaVersion = url.searchParams.get('schemaVersion') ?? '';
  try {
    await ensureHistorySchema().catch(() => undefined);
    const [feedback, availability] = await Promise.all([
      getAnalysisFeedback(userId, reportId, schemaVersion),
      feedbackNewAvailability(userId),
    ]);
    return NextResponse.json(
      {
        feedback: feedback
          ? { rating: feedback.rating, comment: feedback.comment, updatedAt: feedback.updatedAt }
          : null,
        nextAllowedAt: availability.nextAllowedAt,
        canCreateNew: availability.allowed,
        cooldownHours: availability.cooldownHours,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'شناسه یا نسخهٔ گزارش معتبر نیست' }, { status: 400 });
  }
}

/** POST: create or update one feedback row per user+report+version. */
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'ورود لازم است' }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 400 });
  }
  const parsed = analysisFeedbackInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'امتیاز یا متن بازخورد معتبر نیست' }, { status: 400 });
  }
  try {
    await ensureHistorySchema().catch(() => undefined);
    const result = await saveAnalysisFeedback(userId, parsed.data);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: 'فاصلهٔ مجاز بین بازخوردهای جدید هنوز تمام نشده است.',
          nextAllowedAt: result.nextAllowedAt.toISOString(),
          retryAfterSec: result.retryAfterSec,
        },
        { status: 429, headers: { 'Retry-After': String(result.retryAfterSec) } },
      );
    }
    return NextResponse.json(
      {
        feedback: result.feedback,
        saved: true,
        mode: result.mode,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'ذخیرهٔ بازخورد ممکن نشد' }, { status: 503 });
  }
}
