import { db } from '@/lib/db';
import { IntegrationCardForm } from '@/components/integration-card-form';
import { ensureHistorySchema } from '@/server/ensure-schema';

export const dynamic = 'force-dynamic';

const integrations = [
  { key: 'market_primary', label: 'منبع اصلی قیمت بازار', description: 'API اصلی برای دریافت نرخ‌ها در صورت تهیه سرویس رسمی.', placeholder: 'https://api.example.com/v1' },
  { key: 'market_fallback', label: 'منبع پشتیبان قیمت', description: 'مسیر جایگزین برای زمانی که منبع اصلی پاسخ نمی‌دهد.', placeholder: 'https://backup.example.com/v1' },
  { key: 'ai_analysis', label: 'سرویس تحلیل هوشمند', description: 'اتصال مدل تحلیل پس از تعریف خروجی، محدودیت و معیار ارزیابی.', placeholder: 'https://api.example.com' },
  { key: 'google_oauth', label: 'ورود با Google', description: 'Client ID و Client Secret گوگل را امن ذخیره می‌کند. صرف ذخیرهٔ Client ID ورود را تضمین نمی‌کند.', placeholder: '000000000000-….apps.googleusercontent.com' },
  { key: 'resend_email', label: 'تأیید ایمیل با Resend', description: 'کلید API و ایمیل فرستنده روی دامنهٔ تأییدشدهٔ Resend. سپس اجبار تأیید ایمیل را در تنظیمات حساب فعال کنید.', placeholder: 'verify@zarsignal.ir' },
] as const;

export default async function IntegrationsPage() {
  await ensureHistorySchema().catch(() => undefined);
  let configured = new Map<string, { publicValue: string | null; enabled: boolean; hasSecret: boolean }>();
  try {
    const rows = await db.integrationSetting.findMany({
      select: { key: true, publicValue: true, enabled: true, valueEncrypted: true },
    });
    configured = new Map(rows.map(row => [
      row.key,
      { publicValue: row.publicValue, enabled: row.enabled, hasSecret: Boolean(row.valueEncrypted) },
    ]));
  } catch { /* keep empty */ }

  return (
    <>
      <header className="admin-title">
        <div>
          <span className="eyebrow">INTEGRATIONS</span>
          <h1>اتصال سرویس‌ها و API</h1>
          <p>وضعیت، آدرس و کلید هر سرویس را جداگانه مدیریت کنید. کلید ذخیره‌شده هیچ‌وقت به مرورگر برگردانده نمی‌شود. خطای اعتبارسنجی داخل همان فرم نمایش داده می‌شود.</p>
        </div>
      </header>
      <div className="integration-grid">
        {integrations.map(item => {
          const state = configured.get(item.key);
          return (
            <IntegrationCardForm
              key={item.key}
              itemKey={item.key}
              label={item.label}
              description={item.description}
              placeholder={item.placeholder}
              google={item.key === 'google_oauth'}
              publicValue={state?.publicValue ?? null}
              enabled={Boolean(state?.enabled)}
              hasSecret={Boolean(state?.hasSecret)}
            />
          );
        })}
      </div>
    </>
  );
}
