import { checkDatabase } from '@/server/database-health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = await checkDatabase();
  return Response.json(health, { status: health.status === 'unavailable' ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
}
