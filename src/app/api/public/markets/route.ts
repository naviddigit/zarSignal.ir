import { getPublicSnapshot } from '@/server/quotes';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.get('fresh') === '1';
  const snapshot = await getPublicSnapshot(fresh);
  // Calculator refresh can use available quotes even when another market is missing.
  const unavailable = snapshot.status === 'unavailable' && (!fresh || snapshot.quotes.length === 0);
  return Response.json(snapshot, { status: unavailable ? 503 : 200, headers: { 'Cache-Control': fresh || snapshot.status === 'unavailable' ? 'no-store' : 'public, s-maxage=30, stale-while-revalidate=30' } });
}
