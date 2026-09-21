import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { instruments } from '@/lib/market';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolRaw = (searchParams.get('symbol') ?? '').toUpperCase();
  const asset = instruments.find(item => item.symbol === symbolRaw);
  if (!asset) return NextResponse.json({ error: 'unknown_symbol' }, { status: 404 });

  const days = Math.min(Math.max(Number(searchParams.get('days') ?? 90) || 90, 7), 400);
  const resolution = searchParams.get('resolution') ?? '1D';
  const since = new Date(Date.now() - days * 86_400_000);

  try {
    const rows = await db.symbolHistoryBar.findMany({
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
    });

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
    });
  } catch {
    return NextResponse.json({ symbol: asset.symbol, name: asset.name, resolution, days, bars: [] });
  }
}
