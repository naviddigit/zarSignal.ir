import { checkDatabase } from '@/server/database-health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = await checkDatabase();
  return Response.json(health, { status: health.status === 'connected' ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
