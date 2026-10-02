import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createHash } from 'node:crypto';
import { hasCapability } from '@/lib/capabilities';
import { resolveAccountEntitlement } from '@/server/account-entitlement';
import { buildMarketViewReport } from '@/server/market-view-report';
import { instruments } from '@/lib/market';
import { consumeRateLimit } from '@/server/rate-limit';
import { MANUAL_REFRESH_COOLDOWN_MS } from '@/server/feedback-policy';

export const dynamic = 'force-dynamic';

function clientKey(request: Request, userId?: string | null) {
  if (userId) return `market-view-refresh:user:${userId}`;
  const fwd = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = fwd || request.headers.get('x-real-ip') || 'anon';
  return `market-view-refresh:ip:${createHash('sha256').update(ip).digest('hex').slice(0, 24)}`;
}

/** Public market-view JSON — full narrative only when ANALYSIS_BASIC is entitled. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbolParam = url.searchParams.get('symbol');
  const manualRefresh = url.searchParams.get('refresh') === '1'
    || request.headers.get('x-market-view-refresh') === '1';
  const asset = symbolParam ? instruments.find(item => item.symbol.toLowerCase() === symbolParam.toLowerCase()) : undefined;
  if (symbolParam && !asset) return NextResponse.json({ error: 'نماد معتبر نیست' }, { status: 400 });

  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  let full = false;
  if (userId) {
    const entitlement = await resolveAccountEntitlement(userId).catch(() => null);
    full = entitlement ? hasCapability(entitlement.level, 'ANALYSIS_BASIC') : false;
  }

  if (manualRefresh) {
    const gate = await consumeRateLimit(clientKey(request, userId), MANUAL_REFRESH_COOLDOWN_MS).catch(() => null);
    if (gate && !gate.allowed) {
      return NextResponse.json(
        {
          error: 'فاصلهٔ مجاز بین بررسی‌های دستی هنوز تمام نشده است.',
          retryAfterSec: gate.retryAfterSec,
          nextAllowedAt: gate.nextAllowedAt.toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(gate.retryAfterSec),
            'Cache-Control': 'private, no-store',
          },
        },
      );
    }
  }

  const compareFp = url.searchParams.get('fp');
  const report = await buildMarketViewReport(full ? 'full' : 'preview', asset?.symbol);
  const unchanged = Boolean(compareFp && compareFp === report.snapshotFingerprint);

  return NextResponse.json(
    { ...report, unchanged },
    {
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
    },
  );
}
