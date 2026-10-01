/**
 * Payment confirmation — ACTIVE subscription only after server verifies provider callback.
 * Client-side “payment success” must never unlock access.
 */

import { db } from '@/lib/db';

export type PaymentProvider = 'zarinpal' | 'bale' | 'manual_ops';

export type ConfirmedPayment = {
  provider: PaymentProvider;
  providerReference: string;
  userId: string;
  product: string;
  amountRial: bigint;
  verifiedAt: Date;
};

/**
 * Atomically record a verified payment and activate (or create) subscription.
 * Duplicate providerReference is a no-op success (idempotent).
 */
export async function activateSubscriptionFromPayment(payment: ConfirmedPayment) {
  if (!payment.userId || !payment.product || !payment.providerReference) {
    throw new Error('payment_payload_incomplete');
  }
  if (payment.amountRial <= 0n) throw new Error('payment_amount_invalid');

  return db.$transaction(async tx => {
    const existing = await tx.payment.findUnique({
      where: { providerReference: payment.providerReference },
      select: { id: true, status: true },
    });
    if (existing?.status === 'VERIFIED') {
      return { ok: true as const, duplicate: true };
    }

    if (existing) {
      await tx.payment.update({
        where: { id: existing.id },
        data: { status: 'VERIFIED', verifiedAt: payment.verifiedAt },
      });
    } else {
      await tx.payment.create({
        data: {
          userId: payment.userId,
          provider: payment.provider,
          providerReference: payment.providerReference,
          amountRial: payment.amountRial,
          status: 'VERIFIED',
          verifiedAt: payment.verifiedAt,
        },
      });
    }

    const now = payment.verifiedAt;
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60_000);
    const pending = await tx.subscription.findFirst({
      where: { userId: payment.userId, product: payment.product, status: 'PENDING' },
      orderBy: { startsAt: 'desc' },
    });
    if (pending) {
      await tx.subscription.update({
        where: { id: pending.id },
        data: { status: 'ACTIVE', startsAt: now, expiresAt },
      });
    } else {
      await tx.subscription.create({
        data: {
          userId: payment.userId,
          product: payment.product,
          status: 'ACTIVE',
          startsAt: now,
          expiresAt,
        },
      });
    }
    return { ok: true as const, duplicate: false };
  });
}
