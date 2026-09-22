import { mazanehTo18k, market18kToMazaneh } from '@/server/mazaneh-to-18k';

export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 1_000) return Response.json({ error: 'invalid_request' }, { status: 413 });

  try {
    const body = await request.json() as { operation?: string; value?: unknown };
    const value = Number(body.value);
    if (!Number.isFinite(value) || value <= 0) throw new Error('invalid_value');

    if (body.operation === 'mazanehTo18k') {
      const result = mazanehTo18k(value);
      return Response.json({ value: result.market18k, version: result.formulaVersion });
    }
    if (body.operation === 'market18kToMazaneh') {
      return Response.json({ value: market18kToMazaneh(value) });
    }
    return Response.json({ error: 'invalid_operation' }, { status: 400 });
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }
}
