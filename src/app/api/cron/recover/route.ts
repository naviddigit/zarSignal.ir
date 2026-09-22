import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureHistorySchema } from '@/server/ensure-schema';
import { defaultFarazConfig, FARAZ_KEY, FARAZ_URL, runFarazIngestion, syncFarazHistory } from '@/server/ingestion/faraz';
import { HAMRATE_KEY } from '@/server/ingestion/hamrate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!bearer || bearer.length < 24 || bearer.startsWith('local-only-')) return false;
  const allowed = [process.env.CRON_SECRET, process.env.ADMIN_BOOTSTRAP_TOKEN].filter(
    (value): value is string => typeof value === 'string' && value.length >= 24 && !value.startsWith('local-only-'),
  );
  return allowed.includes(bearer);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (process.env.MARKET_MODE !== 'live') {
    return NextResponse.json({ ok: false, reason: 'MARKET_MODE is not live' }, { status: 200 });
  }

  try {
    const schema = await ensureHistorySchema();
    const config = await defaultFarazConfig();
    await db.marketSource.upsert({
      where: { key: FARAZ_KEY },
      create: {
        key: FARAZ_KEY,
        name: 'فراز — دیده‌بان ۳',
        url: FARAZ_URL,
        enabled: true,
        pollSeconds: 60,
        config,
      },
      update: {
        enabled: true,
        url: FARAZ_URL,
        pollSeconds: 60,
        config,
        name: 'فراز — دیده‌بان ۳',
      },
    });
    await db.marketSource.updateMany({
      where: { key: HAMRATE_KEY },
      data: { enabled: false },
    });

    const quotes = await runFarazIngestion(undefined, AbortSignal.timeout(25_000), { syncHistory: false });
    const history = await syncFarazHistory(undefined, AbortSignal.timeout(45_000)).catch((error: unknown) => ({
      bars: 0,
      error: error instanceof Error ? error.message : 'history_failed',
    }));

    return NextResponse.json({
      ok: true,
      schema,
      quotes,
      history,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'recover_failed',
    }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
