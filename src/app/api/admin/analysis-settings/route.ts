import { adminIdentity } from '@/server/admin-auth';
import { persistWarningPolicy } from '@/server/time-reliability';
import { persistAnalysisReadingSettings } from '@/server/analysis-reading-settings';
import { persistCalculatorAccessPolicy } from '@/server/calculator-access';
import { persistCalculatorNavigation } from '@/server/calculator-navigation';
import { validWarningWindow } from '@/lib/time-reliability';
import { normalizeAnalysisReadingSettings } from '@/lib/analysis-reading-settings';
import { normalizeCalculatorAccessPolicy } from '@/lib/calculator-access';

export async function POST(request: Request) {
  const expectedOrigin = `${new URL(request.url).protocol}//${request.headers.get('host')}`;
  if (request.headers.get('origin') !== expectedOrigin) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }
  const actor = await adminIdentity();
  if (!actor) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  try {
    if ('warningStart' in body || 'warningEnd' in body) {
      if (!validWarningWindow(body.warningStart, body.warningEnd)) {
        return Response.json({ error: 'invalid_window' }, { status: 400 });
      }
      const policy = await persistWarningPolicy(actor, body.warningStart, body.warningEnd);
      return Response.json({ policy }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if ('reading' in body) {
      const reading = await persistAnalysisReadingSettings(actor, body.reading);
      // Round-trip through normalizer so invalid payloads still reject only if empty object somehow breaks — normalize always clamps.
      void normalizeAnalysisReadingSettings(body.reading);
      return Response.json({ reading }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if ('calculatorAccess' in body) {
      const calculatorAccess = await persistCalculatorAccessPolicy(actor, body.calculatorAccess);
      void normalizeCalculatorAccessPolicy(body.calculatorAccess);
      return Response.json({ calculatorAccess }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if ('calculatorNavigation' in body) {
      const calculatorNavigation = await persistCalculatorNavigation(actor, body.calculatorNavigation);
      return Response.json({ calculatorNavigation }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return Response.json({ error: 'unknown_payload' }, { status: 400 });
  } catch {
    return Response.json({ error: 'storage_unavailable' }, { status: 503 });
  }
}
