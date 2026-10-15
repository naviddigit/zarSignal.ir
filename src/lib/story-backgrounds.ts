export type StoryBackground = { id: string; title: string; start: string; end: string; imageUrl: string; enabled: boolean };
export function parseStoryBackgrounds(raw: unknown): StoryBackground[] {
  if (!Array.isArray(raw) || raw.length > 200) throw new Error('فهرست پس‌زمینه معتبر نیست.');
  const ids = new Set<string>();
  return raw.map(item => {
    if (!item || typeof item !== 'object') throw new Error('طرح معتبر نیست.');
    const { id, title, start, end } = item;
    const imageUrl = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '';
    if (typeof id !== 'string' || !/^[\w-]{1,80}$/.test(id) || ids.has(id) || typeof title !== 'string' || !title.trim() || title.length > 80 || !/^#[0-9a-f]{6}$/i.test(start) || !/^#[0-9a-f]{6}$/i.test(end)) throw new Error('نام، رنگ یا شناسهٔ طرح معتبر نیست.');
    if (imageUrl.length > 2048 || imageUrl && !(imageUrl.startsWith('/') && !imageUrl.startsWith('//') && !imageUrl.includes('\\'))) {
      if (imageUrl.length > 2048 || !/^https:\/\//i.test(imageUrl)) throw new Error('آدرس تصویر باید HTTPS یا مسیر تصویر داخل سایت باشد.');
      try { const url = new URL(imageUrl); if (url.username || url.password) throw new Error(); } catch { throw new Error('آدرس تصویر معتبر نیست.'); }
    }
    ids.add(id);
    return { id, title: title.trim(), start, end, imageUrl, enabled: item.enabled !== false };
  });
}
