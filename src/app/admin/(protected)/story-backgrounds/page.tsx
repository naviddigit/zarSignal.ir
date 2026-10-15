import { getStoryBackgrounds } from '@/server/story-backgrounds';
import { StoryBackgroundEditor } from './story-background-editor';
export const dynamic = 'force-dynamic';
export default async function StoryBackgroundsPage() {
  const backgrounds = await getStoryBackgrounds();
  return <><header className="admin-title"><div><span className="eyebrow">استودیوی استوری</span><h1>پس‌زمینه‌های استوری</h1><p>طرح رنگی یا تصویر عمودی دلخواه اضافه کنید؛ کاربر طرح فعال را هنگام ساخت استوری انتخاب می‌کند.</p></div></header><StoryBackgroundEditor initial={backgrounds} /></>;
}
