import { calculateProfessional } from '@/server/professional-calculator';
import { getPublicSnapshot } from '@/server/quotes';
import type { Snapshot } from '@/lib/market';
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 5000) return Response.json({ error: 'درخواست بیش از حد بزرگ است.' }, { status: 413 });
    const body = JSON.parse(text);
    const live = Object.values(body?.inputs ?? {}).some(input => (input as { provenance?: string })?.provenance === 'LIVE');
    const snapshot: Snapshot = live ? await getPublicSnapshot() : { mode: 'live', status: 'unavailable', quotes: [] };
    return Response.json(calculateProfessional(body, snapshot), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'ورودی یا داده زنده معتبر نیست؛ واحد و تازگی قیمت‌ها را بررسی کنید یا مقدار دستی وارد کنید.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}

