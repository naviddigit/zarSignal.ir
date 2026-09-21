import { NextResponse } from 'next/server';
import { getBubbleHistory } from '@/server/bubble-history';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ranges = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 } as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const formula = url.searchParams.get('formula');
  const range = url.searchParams.get('range') ?? '24h';
  if (formula !== 'GOLD_BUBBLE' && formula !== 'USD_GAP') {
    return NextResponse.json({ error: 'formula must be GOLD_BUBBLE or USD_GAP' }, { status: 400 });
  }
  if (!(range in ranges)) {
    return NextResponse.json({ error: 'range must be 24h, 7d, or 30d' }, { status: 400 });
  }
  try {
    const points = await getBubbleHistory(formula, ranges[range as keyof typeof ranges]);
    return NextResponse.json({
      formula,
      range,
      freeWindowHours: 24,
      gated: range !== '24h',
      points,
      note: 'Historical bubble is stored at capture time and never recomputed from live XAU/USD.',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'history_unavailable' }, { status: 503 });
  }
}
