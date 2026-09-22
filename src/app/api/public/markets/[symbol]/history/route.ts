import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { instruments } from '@/lib/market';
import { withDeadline } from '@/lib/with-deadline';
import { ensureHistorySchema } from '@/server/ensure-schema';
import { historyAccess, privateHistoryHeaders } from '@/server/history-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ symbol: string }> }) {
  const { searchParams } = new URL(request.url);
  const symbolRaw = (await context.params).symbol.toUpperCase();
  const asset = instruments.find(item => item.symbol === symbolRaw);
  if (!asset) return NextResponse.json({ error: 'unknown_symbol' }, { status: 404 });

  const days = Number(searchParams.get('days') ?? 1);
  if (![1, 7, 30, 90].includes(days)) return NextResponse.json({ error: 'invalid_days' }, { status: 400 });
  const resolution = searchParams.get('resolution') ?? '1D';
  if (resolution !== '1D') return NextResponse.json({ error: 'invalid_resolution' }, { status: 400 });
  if (!await historyAccess(days * 24)) return NextResponse.json({ symbol: asset.symbol, gated: true, freeWindowHours: 24, bars: [], upgradeUrl: '/pricing' }, { status: 403, headers: privateHistoryHeaders });
  const since = new Date(Date.now() - days * 86_400_000);

  try {
    await ensureHistorySchema().catch(() => undefined);
    const rows = await withDeadline(db.symbolHistoryBar.findMany({
      where: { symbol: asset.symbol, resolution, openTime: { gte: since } },
      orderBy: { openTime: 'asc' },
      select: {
        openTime: true,
        open: true,
        high: true,
        low: true,
        close: true,
        volume: true,
      },
    }), 5_000);

    return NextResponse.json({
      symbol: asset.symbol,
      name: asset.name,
      resolution,
      days,
      bars: rows.map(row => ({
        t: row.openTime.toISOString(),
        o: Number(row.open),
        h: Number(row.high),
        l: Number(row.low),
        c: Number(row.close),
        v: row.volume == null ? null : Number(row.volume),
      })),
    }, { headers: privateHistoryHeaders });
  } catch {
    return NextResponse.json({
      symbol: asset.symbol,
      name: asset.name,
      resolution,
      days,
      bars: [],
      error: 'history_unavailable',
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
