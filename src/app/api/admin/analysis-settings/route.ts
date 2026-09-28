import { adminIdentity } from '@/server/admin-auth';
import { persistWarningPolicy } from '@/server/time-reliability';
import { validWarningWindow } from '@/lib/time-reliability';
export async function POST(request: Request) {
  // Protect cookie-authenticated writes against cross-origin form submissions.
  const expectedOrigin = `${new URL(request.url).protocol}//${request.headers.get('host')}`;
  if (request.headers.get('origin') !== expectedOrigin) return Response.json({ error: 'forbidden' }, { status: 403 });
  const actor = await adminIdentity();
  if (!actor) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !validWarningWindow(body.warningStart, body.warningEnd)) return Response.json({ error: 'invalid_window' }, { status: 400 });
  try {
    const policy = await persistWarningPolicy(actor, body.warningStart, body.warningEnd);
    return Response.json({ policy }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'storage_unavailable' }, { status: 503 }); }
}
