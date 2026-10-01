import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set([
  'landing_view', 'market_view', 'bubble_view', 'calculator_open', 'calculator_complete',
  'analysis_preview_view', 'signup_start', 'signup_complete', 'pricing_view', 'plan_select',
  'checkout_start', 'payment_success', 'payment_failed', 'subscription_activated',
  'analysis_view', 'alert_created', 'chart_marker_open', 'education_open', 'returning_user',
]);

/** Accept growth events without PII persistence yet — foundation for 50k funnel. */
export async function POST(request: Request) {
  try {
    const body = await request.json() as { event?: string; props?: unknown; path?: string; ts?: string };
    if (!body.event || !ALLOWED.has(body.event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    // Persistence/warehouse wiring comes after provider choice — acknowledge only.
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
