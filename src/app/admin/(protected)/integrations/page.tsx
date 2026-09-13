import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin-auth';
import { encryptIntegrationSecret } from '@/server/integration-secrets';

const integrations = [
  { key: 'market_primary', label: 'منبع اصلی قیمت بازار', category: 'market', placeholder: 'https://api.example.com/v1' },
  { key: 'market_fallback', label: 'منبع پشتیبان قیمت', category: 'market', placeholder: 'https://backup.example.com/v1' },
  { key: 'ai_analysis', label: 'سرویس تحلیل هوشمند', category: 'analysis', placeholder: 'https://api.example.com' },
] as const;

async function saveIntegration(formData: FormData) {
  'use server';
  await requireAdmin();
  const key = String(formData.get('key') ?? '');
  const item = integrations.find((candidate) => candidate.key === key);
  if (!item) throw new Error('Unknown integration');
  const secret = String(formData.get('secret') ?? '').trim();
  const publicValue = String(formData.get('url') ?? '').trim();
  const enabled = formData.get('enabled') === 'on';
  const current = await db.integrationSetting.findUnique({ where: { key } });
  await db.integrationSetting.upsert({
    where: { key },
    create: { key, label: item.label, category: item.category, publicValue, enabled, valueEncrypted: secret ? encryptIntegrationSecret(secret) : null },
    update: { label: item.label, category: item.category, publicValue, enabled, valueEncrypted: secret ? encryptIntegrationSecret(secret) : current?.valueEncrypted },
  });
  revalidatePath('/admin/integrations');
}

export default async function IntegrationsPage() {
  let configured = new Map<string, { publicValue: string | null; enabled: boolean; hasSecret: boolean }>();
  try {
    const rows = await db.integrationSetting.findMany({ select: { key: true, publicValue: true, enabled: true, valueEncrypted: true } });
    configured = new Map(rows.map((row) => [row.key, { publicValue: row.publicValue, enabled: row.enabled, hasSecret: Boolean(row.valueEncrypted) }]));
  } catch {}
  return <><div className="admin-title"><div><span className="eyebrow">INTEGRATIONS</span><h1>اتصال سرویس‌ها و API</h1><p>کلیدهای ذخیره‌شده از دیتابیس به مرورگر بازگردانده نمی‌شوند.</p></div></div><div className="integration-grid">{integrations.map((item)=>{const state=configured.get(item.key);return <form action={saveIntegration} className="admin-card integration-card" key={item.key}><input type="hidden" name="key" value={item.key}/><div className="integration-head"><div><h2>{item.label}</h2><small>{item.category}</small></div><span className={state?.enabled?'run-status':'run-status failed'}>{state?.enabled?'فعال':'غیرفعال'}</span></div><label>آدرس سرویس<input name="url" type="url" defaultValue={state?.publicValue ?? ''} placeholder={item.placeholder} dir="ltr"/></label><label>کلید API<input name="secret" type="password" placeholder={state?.hasSecret?'کلید ذخیره شده؛ برای حفظ آن خالی بگذارید':'کلید جدید'} autoComplete="new-password" dir="ltr"/></label><label className="integration-switch"><input name="enabled" type="checkbox" defaultChecked={state?.enabled}/> فعال‌بودن اتصال</label><button className="button small-button" type="submit">ذخیرهٔ امن</button></form>})}</div></>;
}
