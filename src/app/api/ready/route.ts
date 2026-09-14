import { checkDatabase } from '@/server/database-health';
export const dynamic = 'force-dynamic';
export async function GET() {
  const database = await checkDatabase();
  const ready = database.status !== 'unavailable';
  return Response.json({ status: ready ? 'ready' : 'unavailable', mode: process.env.MARKET_MODE === 'live' ? 'live' : 'demo', database }, { status: ready ? 200 : 503, headers: { 'Cache-Control':'no-store' } });
}
