import { calculateProfessional } from '@/server/professional-calculator';
import { getPublicSnapshot } from '@/server/quotes';
import { resolveCalculatorOperationAccess } from '@/server/calculator-access';
import { resolveAccountEntitlement } from '@/server/account-entitlement';
import { auth } from '@/auth';
import type { Snapshot } from '@/lib/market';

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 5000) {
      return Response.json({ error: 'درخواست بیش از حد بزرگ است.' }, { status: 413 });
    }
    const body = JSON.parse(text);

    const session = await auth().catch(() => null);
    const entitlement = session?.user?.id
      ? await resolveAccountEntitlement(session.user.id).catch(() => null)
      : null;
    const level = entitlement?.level ?? 'FREE';
    const access = await resolveCalculatorOperationAccess(
      body?.operation,
      level,
      entitlement?.statusLabel ?? null,
    );
    if (!access.ok) {
      const status = access.code === 'settings_error' ? 503 : access.code === 'disabled' ? 403 : 403;
      return Response.json(
        { error: access.message, code: access.code },
        { status, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const live = Object.values(body?.inputs ?? {}).some(
      input => (input as { provenance?: string })?.provenance === 'LIVE',
    );
    const snapshot: Snapshot = live
      ? await getPublicSnapshot()
      : { mode: 'live', status: 'unavailable', quotes: [] };
    return Response.json(calculateProfessional(body, snapshot), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json(
      { error: 'ورودی یا داده زنده معتبر نیست؛ واحد و تازگی قیمت‌ها را بررسی کنید یا مقدار دستی وارد کنید.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
