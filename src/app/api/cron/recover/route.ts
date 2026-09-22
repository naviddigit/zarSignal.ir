import { NextResponse } from 'next/server';
import { refreshProductionMarket } from '@/server/refresh-market';
import { timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const candidate = bearer;
  if (!candidate || candidate.length < 24 || candidate.startsWith('local-only-')) return false;
  const allowed = [process.env.CRON_SECRET, process.env.ADMIN_BOOTSTRAP_TOKEN].filter(
    (value): value is string => typeof value === 'string' && value.length >= 24 && !value.startsWith('local-only-'),
  );
  return allowed.some(value => value.length === candidate.length && timingSafeEqual(Buffer.from(value), Buffer.from(candidate)));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (process.env.MARKET_MODE !== 'live') {
    return NextResponse.json({ ok: false, reason: 'MARKET_MODE is not live' }, { status: 200 });
  }
  const action = new URL(request.url).searchParams.get('action');
  if (action === 'initialize-chart-plans') {
    const { initializeChartPlans } = await import('@/server/launch-plans');
    return NextResponse.json(await initializeChartPlans(), { headers: { 'Cache-Control': 'no-store' } });
  }
  if (action === 'backfill-bubbles') {
    const { backfillBubbleHistory } = await import('@/server/backfill-bubbles');
    const result = await backfillBubbleHistory({ days: 90 });
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (action === 'history-audit') {
    const { db } = await import('@/lib/db');
    const [bars, bubbles, plans, migrations] = await Promise.all([
      db.symbolHistoryBar.groupBy({ by: ['symbol'], _count: true }),
      db.bubbleSnapshot.groupBy({ by: ['formulaId', 'provenance'], _count: true, _min: { capturedAt: true }, _max: { capturedAt: true } }),
      db.plan.findMany({ select: { slug: true, title: true, active: true, webAvailable: true, features: true, pricingVersions: { select: { price: true, currency: true, active: true, effectiveAt: true } } } }),
      db.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at`.catch(() => []),
    ]);
    return NextResponse.json({ bars, bubbles, plans, migrations }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const result = await refreshProductionMarket({ history: true });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function GET(request: Request) {
  return NextResponse.json({ error: 'use_post' }, { status: 405 });
}
