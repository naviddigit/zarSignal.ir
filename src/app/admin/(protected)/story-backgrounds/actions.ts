'use server';
import { requireAdmin } from '@/server/admin-auth';
import { db } from '@/lib/db';
import { parseStoryBackgrounds } from '@/lib/story-backgrounds';
import { storyBackgroundsKey } from '@/server/story-backgrounds';
import { revalidatePath } from 'next/cache';
export async function saveStoryBackgrounds(form: FormData) {
  await requireAdmin();
  let value;
  try { value = parseStoryBackgrounds(JSON.parse(String(form.get('backgrounds') ?? '[]'))); }
  catch (error) { return { error: error instanceof Error ? error.message : 'اطلاعات معتبر نیست.' }; }
  try {
    await db.integrationSetting.upsert({ where: { key: storyBackgroundsKey }, create: { key: storyBackgroundsKey, category: 'content', label: 'پس‌زمینه‌های استوری', enabled: true, publicValue: JSON.stringify(value) }, update: { publicValue: JSON.stringify(value), enabled: true } });
    revalidatePath('/api/public/story-backgrounds'); revalidatePath('/admin/story-backgrounds');
    return { error: '', saved: true };
  } catch { return { error: 'ذخیره نشد؛ دوباره تلاش کنید.' }; }
}
