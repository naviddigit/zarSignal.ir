import { NextResponse } from 'next/server';
import { getBubbleHistory } from '@/server/bubble-history';
import { withDeadline } from '@/lib/with-deadline';
import { ensureHistorySchema } from '@/server/ensure-schema';
import { historyRanges as ranges } from '@/lib/history-access';
import { historyAccess, privateHistoryHeaders } from '@/server/history-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const formula = url.searchParams.get('formula');
  const range = url.searchParams.get('range') ?? '24h';
  if (formula !== 'GOLD_BUBBLE' && formula !== 'USD_GAP') {
    return NextResponse.json({ error: 'formula must be GOLD_BUBBLE or USD_GAP' }, { status: 400 });
  }
  if (!(range in ranges)) {
    return NextResponse.json({ error: 'invalid_range' }, { status: 400 });
  }
  if (!await historyAccess(ranges[range as keyof typeof ranges])) return NextResponse.json({ formula, range, gated: true, freeWindowHours: 24, points: [], upgradeUrl: '/pricing' }, { status: 403, headers: privateHistoryHeaders });
  try {
    await ensureHistorySchema().catch(() => undefined);
    const points = await withDeadline(getBubbleHistory(formula, ranges[range as keyof typeof ranges]), 5_000);
    return NextResponse.json({
      formula,
      range,
      freeWindowHours: 24,
      gated: false,
      points,
      note: 'Historical bubble is stored at capture time and never recomputed from live XAU/USD.',
    }, { headers: privateHistoryHeaders });
  } catch {
    return NextResponse.json({
      formula,
      range,
      freeWindowHours: 24,
      gated: false,
      points: [],
      error: 'history_unavailable',
      note: 'Historical bubble is stored at capture time and never recomputed from live XAU/USD.',
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
