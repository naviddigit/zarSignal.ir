import { NextResponse } from 'next/server';
import { refreshProductionMarket } from '@/server/refresh-market';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Temporary production recover key — single-operator bootstrap until Vercel cron/env is wired. */
const EMERGENCY_KEY = 'zarsignal-emergency-recover-20260922';

function authorized(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const queryKey = new URL(request.url).searchParams.get('key') ?? '';
  const candidate = bearer || queryKey;
  if (!candidate || candidate.length < 24 || candidate.startsWith('local-only-')) return false;
  if (candidate === EMERGENCY_KEY) return true;
  const allowed = [process.env.CRON_SECRET, process.env.ADMIN_BOOTSTRAP_TOKEN].filter(
    (value): value is string => typeof value === 'string' && value.length >= 24 && !value.startsWith('local-only-'),
  );
  return allowed.includes(candidate);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (process.env.MARKET_MODE !== 'live') {
    return NextResponse.json({ ok: false, reason: 'MARKET_MODE is not live' }, { status: 200 });
  }
  const result = await refreshProductionMarket({ history: true });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function GET(request: Request) {
  return POST(request);
}
