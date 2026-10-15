'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { StoryBackground } from '@/lib/story-backgrounds';
import { saveStoryBackgrounds } from './actions';
import { Input } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
export function StoryBackgroundEditor({ initial }: { initial: StoryBackground[] }) {
  const [rows, setRows] = useState(initial), [pending, setPending] = useState(false), [message, setMessage] = useState('');
  const update = (id: string, value: Partial<StoryBackground>) => setRows(items => items.map(item => item.id === id ? { ...item, ...value } : item));
  return <form className="story-background-editor" onSubmit={async event => {
    event.preventDefault(); setPending(true); setMessage('');
    try { const form = new FormData(); form.set('backgrounds', JSON.stringify(rows)); const result = await saveStoryBackgrounds(form); setMessage(result.error || 'پس‌زمینه‌ها ذخیره شدند.'); }
    catch { setMessage('ارتباط برقرار نشد؛ دوباره تلاش کنید.'); } finally { setPending(false); }
  }}>
    {rows.map(row => <fieldset key={row.id} className="story-background-row"><legend>{row.title || 'طرح جدید'}</legend>
      <div className="story-background-preview" style={{ background: `linear-gradient(${row.start},${row.end})` }}>{row.imageUrl ? <img src={row.imageUrl} alt="پیش‌نمایش پس‌زمینه" /> : null}</div>
      <div className="story-background-fields"><Input label="نام طرح" value={row.title} required maxLength={80} onChange={e => update(row.id, { title: e.target.value })} />
        <Input label="تصویر (اختیاری)" dir="ltr" value={row.imageUrl} placeholder="https://… یا /images/…" onChange={e => update(row.id, { imageUrl: e.target.value })} />
        <div className="ds-actions"><label>رنگ اول <input type="color" value={row.start} onChange={e => update(row.id, { start: e.target.value })} /></label><label>رنگ دوم <input type="color" value={row.end} onChange={e => update(row.id, { end: e.target.value })} /></label><Checkbox label="فعال" checked={row.enabled} onCheckedChange={enabled => update(row.id, { enabled })} /><button type="button" className="ds-ghost-btn" aria-label={`حذف ${row.title}`} onClick={() => setRows(items => items.filter(item => item.id !== row.id))}><Trash2 size={16} /> حذف</button></div>
      </div></fieldset>)}
    <div className="ds-actions"><button type="button" className="ds-ghost-btn" onClick={() => setRows(items => [...items, { id: crypto.randomUUID(), title: '', start: '#07111f', end: '#172a42', imageUrl: '', enabled: true }])}><Plus size={16} /> افزودن پس‌زمینه</button><button className="button" disabled={pending}>{pending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</button></div>
    {message ? <p role="status">{message}</p> : null}
  </form>;
}
