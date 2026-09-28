import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';
import { defaultHomeContent, parseHomeContent } from '@/lib/home-content';
export const homeContentKey = 'homepage-content-v1';
export async function getHomeContent() {
  try {
    const row = await withDeadline(db.integrationSetting.findUnique({where:{key:homeContentKey}}),2000);
    return row?.publicValue ? parseHomeContent(JSON.parse(row.publicValue)) ?? defaultHomeContent : defaultHomeContent;
  } catch { return defaultHomeContent; }
}
