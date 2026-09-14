'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin-auth';
import { defaultHamrateConfig, HAMRATE_KEY, MIN_POLL_SECONDS, runHamrateIngestion, validateHamrateUrl } from '@/server/ingestion/hamrate';

const done = (kind: 'ok' | 'error', message: string): never => redirect(`/admin/data?${kind}=${encodeURIComponent(message)}`);
export async function saveMarketSource(formData: FormData) {
  await requireAdmin();
  try {
    const pollSeconds = Number(formData.get('pollSeconds'));
    if (!Number.isInteger(pollSeconds) || pollSeconds < MIN_POLL_SECONDS || pollSeconds > 86400) throw new Error(`فاصله باید بین ${MIN_POLL_SECONDS} تا ۸۶۴۰۰ ثانیه باشد.`);
    const url = validateHamrateUrl(String(formData.get('url') ?? ''));
    const config = await defaultHamrateConfig();
    await db.marketSource.upsert({ where: { key: HAMRATE_KEY }, create: { key: HAMRATE_KEY, name: 'HamRate (صفحه عمومی)', url, pollSeconds, enabled: formData.get('enabled') === 'on', config }, update: { url, pollSeconds, enabled: formData.get('enabled') === 'on', config } });
    revalidatePath('/admin/data'); revalidatePath('/');
  } catch (error) { done('error', error instanceof Error ? error.message : 'ذخیره تنظیمات ناموفق بود.'); }
  done('ok', 'تنظیمات منبع ذخیره شد. برای اجرای پیوسته worker را اجرا کنید.');
}
export async function runMarketSourceNow() {
  await requireAdmin();
  let count = 0;
  try { const result = await runHamrateIngestion(); count = result.count; revalidatePath('/admin/data'); revalidatePath('/'); }
  catch (error) { done('error', error instanceof Error ? error.message : 'دریافت داده ناموفق بود.'); }
  done('ok', `${count} رکورد تازه ثبت شد.`);
}
