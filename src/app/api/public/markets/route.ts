import { getPublicSnapshot } from '@/server/quotes';
export const dynamic = 'force-dynamic';
export async function GET() { const snapshot = await getPublicSnapshot(); return Response.json(snapshot, { status: snapshot.status === 'unavailable' ? 503 : 200, headers: { 'Cache-Control': snapshot.status === 'unavailable' ? 'no-store' : 'public, s-maxage=30, stale-while-revalidate=30' } }); }
