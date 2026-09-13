import { authorizeApi, apiError } from '@/server/api-access';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { try { await authorizeApi(request); return Response.json({ error: 'formula_not_configured', value: null, targets: null }, { status:503, headers:{'Cache-Control':'no-store'} }); } catch(error) { return apiError(error); } }
