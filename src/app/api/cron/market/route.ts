import { NextResponse } from 'next/server';
import { runHamrateIngestion } from '@/server/ingestion/hamrate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 24 || secret.startsWith('local-only-')) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (process.env.MARKET_MODE !== 'live') {
    return NextResponse.json({ ok: false, skipped: true, reason: 'MARKET_MODE is not live' }, { status: 200 });
  }
  try {
    const result = await runHamrateIngestion();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'ingestion_failed' }, { status: 502 });
  }
}
