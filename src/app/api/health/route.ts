export function GET() { return Response.json({ service: 'zarsignal', status: 'up', version: '0.1.0' }, { headers: { 'Cache-Control': 'no-store' } }); }
