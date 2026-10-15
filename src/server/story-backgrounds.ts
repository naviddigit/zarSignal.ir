import { db } from '@/lib/db';
import { parseStoryBackgrounds } from '@/lib/story-backgrounds';
export const storyBackgroundsKey = 'story-backgrounds-v1';
export async function getStoryBackgrounds() {
  const row = await db.integrationSetting.findUnique({ where: { key: storyBackgroundsKey } });
  return parseStoryBackgrounds(row?.publicValue ? JSON.parse(row.publicValue) : []);
}
