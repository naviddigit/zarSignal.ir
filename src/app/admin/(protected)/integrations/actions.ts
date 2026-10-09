'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin-auth';
import { decryptIntegrationSecret, encryptIntegrationSecret } from '@/server/integration-secrets';
import { ensureHistorySchema } from '@/server/ensure-schema';

const integrations = [
  { key: 'market_primary', label: 'منبع اصلی قیمت بازار', category: 'market' },
  { key: 'market_fallback', label: 'منبع پشتیبان قیمت', category: 'market' },
  { key: 'ai_analysis', label: 'سرویس تحلیل هوشمند', category: 'analysis' },
  { key: 'google_oauth', label: 'ورود با Google', category: 'auth' },
  { key: 'resend_email', label: 'تأیید ایمیل با Resend', category: 'auth' },
] as const;

export type SaveIntegrationState = {
  ok: boolean;
  key?: string;
  error?: string;
  message?: string;
};

function mapError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (/INTEGRATION_ENCRYPTION_KEY|AUTH_SECRET/i.test(raw)) {
    return 'کلید رمزگذاری سرور تنظیم نشده است. AUTH_SECRET یا INTEGRATION_ENCRYPTION_KEY با طول حداقل ۳۲ نویسه در محیط Production لازم است.';
  }
  if (/Google Client ID|apps\.googleusercontent/i.test(raw)) {
    return 'Google Client ID معتبر نیست؛ باید به .apps.googleusercontent.com ختم شود.';
  }
  if (/secret.*required|client secret/i.test(raw)) {
    return 'برای فعال‌سازی ورود Google، Client Secret لازم است (یا Secret قبلی را حفظ کنید).';
  }
  if (/22P02|invalid input value for enum|SubscriptionStatus/i.test(raw)) {
    return 'اسکیما پایگاه‌داده ناقص است (وضعیت اشتراک). یک‌بار صفحه را تازه کنید؛ در صورت تکرار، مهاجرت Production را بررسی کنید.';
  }
  if (/P1001|Can't reach database|ECONNREFUSED|ETIMEDOUT|Connection reset|connection timed out/i.test(raw)) {
    return 'اتصال پایگاه داده برقرار نیست؛ ذخیره انجام نشد و کلید قبلی دست‌نخورده ماند.';
  }
  if (/اتصال ناشناخته/.test(raw)) return raw;
  return 'ذخیره ممکن نشد. تنظیمات و اتصال پایگاه داده را بررسی کنید؛ مقدار قبلی حفظ شده است.';
}

export async function saveIntegrationAction(
  _prev: SaveIntegrationState | null,
  formData: FormData,
): Promise<SaveIntegrationState> {
  try {
    await requireAdmin();
    await ensureHistorySchema().catch(() => undefined);
    const key = String(formData.get('key') ?? '');
    const item = integrations.find(candidate => candidate.key === key);
    if (!item) return { ok: false, key, error: 'اتصال ناشناخته است.' };

    const secret = String(formData.get('secret') ?? '').trim();
    const publicValue = String(formData.get('publicValue') ?? '').trim();
    const enabled = formData.get('enabled') === 'on';

    if (key === 'google_oauth' && enabled && !publicValue.endsWith('.apps.googleusercontent.com')) {
      return { ok: false, key, error: 'Google Client ID معتبر نیست؛ باید به .apps.googleusercontent.com ختم شود.' };
    }

    const current = await db.integrationSetting.findUnique({ where: { key } });
    if (key === 'resend_email' && enabled) {
      const effectiveSecret = secret || (current?.valueEncrypted ? decryptIntegrationSecret(current.valueEncrypted) : '');
      if (!/^re_[A-Za-z0-9_\-]+$/.test(effectiveSecret) || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(publicValue)) {
        return { ok: false, key, error: 'کلید Resend و ایمیل فرستنده روی دامنهٔ تأییدشده را وارد کنید.' };
      }
    }
    if (key === 'resend_email' && !enabled) {
      const { getAccountPolicy } = await import('@/server/account-policy');
      if ((await getAccountPolicy()).emailVerificationRequired) return { ok: false, key, error: 'ابتدا اجبار تأیید ایمیل را در تنظیمات حساب غیرفعال کنید.' };
    }
    if (key === 'google_oauth' && enabled && !secret && !current?.valueEncrypted) {
      return { ok: false, key, error: 'برای فعال‌سازی ورود Google، Client Secret لازم است.' };
    }
    if (key === 'google_oauth' && enabled) {
      const effectiveSecret = secret || (current?.valueEncrypted ? decryptIntegrationSecret(current.valueEncrypted) : '');
      if (effectiveSecret.length < 20) {
        return { ok: false, key, error: 'Google Client Secret معتبر نیست؛ مقدار کامل را از Google Cloud کپی کنید.' };
      }
    }

    let valueEncrypted = current?.valueEncrypted ?? null;
    if (secret) {
      try {
        valueEncrypted = encryptIntegrationSecret(secret);
      } catch (error) {
        return { ok: false, key, error: mapError(error) };
      }
    }

    await db.integrationSetting.upsert({
      where: { key },
      create: {
        key,
        label: item.label,
        category: item.category,
        publicValue,
        enabled,
        valueEncrypted,
      },
      update: {
        label: item.label,
        category: item.category,
        publicValue,
        enabled,
        valueEncrypted,
      },
    });

    revalidatePath('/admin/integrations');
    return {
      ok: true,
      key,
      message: key === 'resend_email' ? 'تنظیمات Resend ذخیره شد؛ دامنهٔ فرستنده باید در Resend تأیید شده باشد.' : enabled
        ? 'ذخیره شد. برای ورود Google، callback و Secret را در کنسول گوگل هم بررسی کنید؛ صرف ذخیرهٔ Client ID ورود را تضمین نمی‌کند.'
        : 'ذخیره شد (اتصال غیرفعال است).',
    };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}
