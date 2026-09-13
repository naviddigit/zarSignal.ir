import { authorizeApi, apiError } from '@/server/api-access';
import { getSnapshot } from '@/server/quotes';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { try { await authorizeApi(request); const snapshot = await getSnapshot(); if (snapshot.mode === 'demo' || snapshot.status === 'unavailable') return Response.json({ error:'live_data_unavailable' }, { status:503, headers:{'Cache-Control':'no-store'} }); return Response.json(snapshot, { headers:{'Cache-Control':'no-store'} }); } catch(error) { return apiError(error); } }
