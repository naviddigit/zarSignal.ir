import { NextResponse } from 'next/server';
import { activateSubscriptionFromPayment } from '@/server/payments/activate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Provider webhook stub.
 * Activation is server-confirmed only — never trust client “paid” flags.
 * Live Zaripal/Bale verification lands here once secrets + signature checks are wired.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'webhook_not_configured' }, { status: 503 });
  }
  const header = request.headers.get('x-zarsignal-webhook') ?? '';
  if (header !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      provider?: 'zarinpal' | 'bale' | 'manual_ops';
      providerReference?: string;
      userId?: string;
      product?: string;
      amountRial?: string | number;
    };
    if (!body.provider || !body.providerReference || !body.userId || !body.product || body.amountRial == null) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }
    // TODO(SOURCE_REQUIRED): verify authority_id / ref_id with provider API before activate.
    const result = await activateSubscriptionFromPayment({
      provider: body.provider,
      providerReference: body.providerReference,
      userId: body.userId,
      product: body.product,
      amountRial: BigInt(body.amountRial),
      verifiedAt: new Date(),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'activate_failed',
    }, { status: 400 });
  }
}
