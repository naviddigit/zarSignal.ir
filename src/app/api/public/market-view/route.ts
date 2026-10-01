import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasCapability } from '@/lib/capabilities';
import { resolveAccountEntitlement } from '@/server/account-entitlement';
import { buildMarketViewReport } from '@/server/market-view-report';
import { instruments } from '@/lib/market';

export const dynamic = 'force-dynamic';

/** Public market-view JSON — full narrative only when ANALYSIS_BASIC is entitled. */
export async function GET(request: Request) {
  const symbolParam = new URL(request.url).searchParams.get('symbol');
  const asset = symbolParam ? instruments.find(item => item.symbol.toLowerCase() === symbolParam.toLowerCase()) : undefined;
  if (symbolParam && !asset) return NextResponse.json({ error: 'نماد معتبر نیست' }, { status: 400 });
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  let full = false;
  if (userId) {
    const entitlement = await resolveAccountEntitlement(userId).catch(() => null);
    full = entitlement ? hasCapability(entitlement.level, 'ANALYSIS_BASIC') : false;
  }
  const report = await buildMarketViewReport(full ? 'full' : 'preview', asset?.symbol);
  return NextResponse.json(report, {
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
}
