import { BrainCircuit, DatabaseZap, Save, ShieldCheck } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { PendingButton } from '@/components/pending-button';
import { requireAdmin } from '@/server/admin-auth';
import { encryptIntegrationSecret } from '@/server/integration-secrets';

const integrations = [
  { key: 'market_primary', label: 'منبع اصلی قیمت بازار', category: 'market', description: 'API اصلی برای دریافت نرخ‌ها در صورت تهیه سرویس رسمی.', placeholder: 'https://api.example.com/v1', icon: DatabaseZap },
  { key: 'market_fallback', label: 'منبع پشتیبان قیمت', category: 'market', description: 'مسیر جایگزین برای زمانی که منبع اصلی پاسخ نمی‌دهد.', placeholder: 'https://backup.example.com/v1', icon: ShieldCheck },
  { key: 'ai_analysis', label: 'سرویس تحلیل هوشمند', category: 'analysis', description: 'اتصال مدل تحلیل پس از تعریف خروجی، محدودیت و معیار ارزیابی.', placeholder: 'https://api.example.com', icon: BrainCircuit },
] as const;

async function saveIntegration(formData: FormData) {
  'use server';
  await requireAdmin();
  const key = String(formData.get('key') ?? '');
  const item = integrations.find(candidate => candidate.key === key);
  if (!item) throw new Error('اتصال ناشناخته است.');
  const secret = String(formData.get('secret') ?? '').trim();
  const publicValue = String(formData.get('url') ?? '').trim();
  const enabled = formData.get('enabled') === 'on';
  const current = await db.integrationSetting.findUnique({ where: { key } });
  await db.integrationSetting.upsert({ where: { key }, create: { key, label: item.label, category: item.category, publicValue, enabled, valueEncrypted: secret ? encryptIntegrationSecret(secret) : null }, update: { label: item.label, category: item.category, publicValue, enabled, valueEncrypted: secret ? encryptIntegrationSecret(secret) : current?.valueEncrypted } });
  revalidatePath('/admin/integrations');
}

export default async function IntegrationsPage() {
  let configured = new Map<string, { publicValue: string | null; enabled: boolean; hasSecret: boolean }>();
  try { const rows = await db.integrationSetting.findMany({ select: { key: true, publicValue: true, enabled: true, valueEncrypted: true } }); configured = new Map(rows.map(row => [row.key, { publicValue: row.publicValue, enabled: row.enabled, hasSecret: Boolean(row.valueEncrypted) }])); } catch {}
  return <><header className="admin-title"><div><span className="eyebrow">INTEGRATIONS</span><h1>اتصال سرویس‌ها و API</h1><p>وضعیت، آدرس و کلید هر سرویس را جداگانه مدیریت کنید. کلید ذخیره‌شده هیچ‌وقت به مرورگر برگردانده نمی‌شود.</p></div></header>
  <div className="integration-grid">{integrations.map(item => { const state = configured.get(item.key); const Icon = item.icon; return <form action={saveIntegration} className="admin-card integration-card" key={item.key}><input type="hidden" name="key" value={item.key}/><div className="integration-head"><span className="integration-icon"><Icon size={22}/></span><div><h2>{item.label}</h2><p>{item.description}</p></div><span className={state?.enabled ? 'run-status' : 'run-status failed'}>{state?.enabled ? 'فعال' : 'غیرفعال'}</span></div><div className="integration-fields"><label><span>آدرس سرویس</span><input name="url" type="url" defaultValue={state?.publicValue ?? ''} placeholder={item.placeholder} dir="ltr"/></label><label><span>کلید API</span><input name="secret" type="password" placeholder={state?.hasSecret ? 'کلید ذخیره شده؛ برای حفظ آن خالی بگذارید' : 'کلید جدید'} autoComplete="new-password" dir="ltr"/></label></div><div className="integration-actions"><label className="integration-switch"><input name="enabled" type="checkbox" defaultChecked={state?.enabled}/><span>اتصال فعال باشد</span></label><PendingButton className="button small-button" pendingText="در حال ذخیره…"><Save size={15}/> ذخیره امن</PendingButton></div></form>; })}</div></>;
}
