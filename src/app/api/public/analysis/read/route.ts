import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  analysisReadInput,
  countAnalysisReads,
  recordAnalysisRead,
} from '@/server/analysis-engagement';
import { ensureHistorySchema } from '@/server/ensure-schema';

export const dynamic = 'force-dynamic';

async function requireUserId() {
  const session = await auth().catch(() => null);
  return session?.user?.id ?? null;
}

/** GET: signed-in user's study-read count (not a recoverable archive). */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'ورود لازم است' }, { status: 401 });
  try {
    await ensureHistorySchema().catch(() => undefined);
    const count = await countAnalysisReads(userId);
    return NextResponse.json(
      { count, kind: 'study_reads' as const },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'شمارش ممکن نشد' }, { status: 503 });
  }
}

/** POST: record one completed reveal for this report version (idempotent). */
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'ورود لازم است' }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 400 });
  }
  const parsed = analysisReadInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'شناسه یا نسخهٔ گزارش معتبر نیست' }, { status: 400 });
  }
  try {
    await ensureHistorySchema().catch(() => undefined);
    const count = await recordAnalysisRead(userId, parsed.data);
    return NextResponse.json(
      { count, kind: 'study_reads' as const, recorded: true },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'ثبت مطالعه ممکن نشد' }, { status: 503 });
  }
}
