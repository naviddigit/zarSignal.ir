'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin-auth';
import { defaultFarazConfig, FARAZ_KEY, FARAZ_MIN_POLL_SECONDS, FARAZ_URL, runFarazIngestion, syncFarazHistory, validateFarazUrl } from '@/server/ingestion/faraz';
import { defaultHamrateConfig, HAMRATE_KEY, MIN_POLL_SECONDS, runHamrateIngestion, validateHamrateUrl } from '@/server/ingestion/hamrate';
import { saveLocalSource } from '@/server/ingestion/local-store';
import { runApprovedMarketIngestion } from '@/server/ingestion/run-market';

const done = (kind: 'ok' | 'error', message: string): never => redirect(`/admin/data?${kind}=${encodeURIComponent(message)}`);

export async function saveHamrateSource(formData: FormData) {
  await requireAdmin();
  try {
    const pollSeconds = Number(formData.get('pollSeconds'));
    if (!Number.isInteger(pollSeconds) || pollSeconds < MIN_POLL_SECONDS || pollSeconds > 86400) {
      throw new Error(`فاصله باید بین ${MIN_POLL_SECONDS} تا ۸۶۴۰۰ ثانیه باشد.`);
    }
    const url = validateHamrateUrl(String(formData.get('url') ?? ''));
    const config = await defaultHamrateConfig();
    const enabled = formData.get('enabled') === 'on';
    const source = { key: HAMRATE_KEY, name: 'منبع قبلی (عمومی)', url, pollSeconds, enabled, config };
    try {
      await db.marketSource.upsert({
        where: { key: HAMRATE_KEY },
        create: source,
        update: { url, pollSeconds, enabled, config, name: source.name },
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
      await saveLocalSource(source);
    }
    revalidatePath('/admin/data');
    revalidatePath('/');
  } catch (error) {
    done('error', error instanceof Error ? error.message : 'ذخیره منبع قبلی ناموفق بود.');
  }
  done('ok', 'تنظیمات منبع قبلی ذخیره شد.');
}

export async function saveFarazSource(formData: FormData) {
  await requireAdmin();
  try {
    const pollSeconds = Number(formData.get('pollSeconds'));
    if (!Number.isInteger(pollSeconds) || pollSeconds < FARAZ_MIN_POLL_SECONDS || pollSeconds > 86400) {
      throw new Error(`فاصله باید بین ${FARAZ_MIN_POLL_SECONDS} تا ۸۶۴۰۰ ثانیه باشد.`);
    }
    const url = validateFarazUrl(String(formData.get('url') ?? FARAZ_URL));
    const config = await defaultFarazConfig();
    const enabled = formData.get('enabled') === 'on';
    const source = { key: FARAZ_KEY, name: 'فراز — دیده‌بان ۳', url, pollSeconds, enabled, config };
    try {
      await db.marketSource.upsert({
        where: { key: FARAZ_KEY },
        create: source,
        update: { url, pollSeconds, enabled, config, name: source.name },
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
      await saveLocalSource(source);
    }
    revalidatePath('/admin/data');
    revalidatePath('/');
  } catch (error) {
    done('error', error instanceof Error ? error.message : 'ذخیره فراز ناموفق بود.');
  }
  done('ok', 'تنظیمات فراز ذخیره شد. برای اجرای پیوسته کرون/ورکر را روشن نگه دارید.');
}

export async function runFarazSourceNow() {
  await requireAdmin();
  let count = 0;
  let historyBars = 0;
  try {
    const result = await runFarazIngestion(undefined, undefined, { syncHistory: true });
    count = result.count;
    historyBars = result.historyBars ?? 0;
    if (historyBars === 0) {
      historyBars = (await syncFarazHistory().catch(() => ({ bars: 0 }))).bars;
    }
    revalidatePath('/admin/data');
    revalidatePath('/');
  } catch (error) {
    done('error', error instanceof Error ? error.message : 'دریافت فراز ناموفق بود.');
  }
  done('ok', `${count} قیمت زنده و ${historyBars} میلهٔ تاریخچه ثبت شد.`);
}

export async function runHamrateSourceNow() {
  await requireAdmin();
  let count = 0;
  try {
    const result = await runHamrateIngestion();
    count = result.count;
    revalidatePath('/admin/data');
    revalidatePath('/');
  } catch (error) {
    done('error', error instanceof Error ? error.message : 'دریافت منبع قبلی ناموفق بود.');
  }
  done('ok', `${count} رکورد تازه ثبت شد.`);
}

export async function runApprovedSourcesNow() {
  await requireAdmin();
  try {
    const result = await runApprovedMarketIngestion();
    revalidatePath('/admin/data');
    revalidatePath('/');
    done('ok', `${result.count} رکورد از ${result.results.map(item => item.source).join(' + ')} ثبت شد.`);
  } catch (error) {
    done('error', error instanceof Error ? error.message : 'دریافت منابع تأیید‌شده ناموفق بود.');
  }
}

/** @deprecated use saveHamrateSource / saveFarazSource */
export async function saveMarketSource(formData: FormData) {
  return saveHamrateSource(formData);
}
/** @deprecated use runFarazSourceNow / runApprovedSourcesNow */
export async function runMarketSourceNow() {
  return runApprovedSourcesNow();
}
