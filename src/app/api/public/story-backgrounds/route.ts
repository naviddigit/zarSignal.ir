import { getStoryBackgrounds } from '@/server/story-backgrounds';
export async function GET() {
  try { return Response.json({ backgrounds: (await getStoryBackgrounds()).filter(item => item.enabled) }, { headers: { 'Cache-Control': 'public, max-age=30' } }); }
  catch { return Response.json({ backgrounds: [], error: 'unavailable' }, { status: 503 }); }
}
