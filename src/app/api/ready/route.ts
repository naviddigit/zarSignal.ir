import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (process.env.MARKET_MODE === 'demo') return Response.json({status:'ready',mode:'demo',database:'not_required'},{headers:{'Cache-Control':'no-store'}});
  try { await db.$queryRaw`SELECT 1`; return Response.json({status:'ready',mode:'live'},{headers:{'Cache-Control':'no-store'}}); }
  catch { return Response.json({status:'unavailable',component:'database'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
