import { checkDatabase } from '@/server/database-health';
export const dynamic = 'force-dynamic';
export async function GET() {
  const database = await checkDatabase();
  return Response.json({ status: database.status === 'connected' ? 'ready' : 'unavailable', mode: process.env.MARKET_MODE === 'live' ? 'live' : 'demo', database }, { status: database.status === 'connected' ? 200 : 503, headers: { 'Cache-Control':'no-store' } });
}
