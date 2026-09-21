import { getFarazSettings, runFarazIngestion } from './faraz';
import { getHamrateSettings, runHamrateIngestion } from './hamrate';

/** Run every admin-approved (enabled) market source. Faraz is preferred when both succeed. */
export async function runApprovedMarketIngestion(signal?: AbortSignal) {
  const [faraz, hamrate] = await Promise.all([getFarazSettings(), getHamrateSettings()]);
  const results: { source: string; count: number; observedAt: string | null; storage?: string; snapshots?: number; historyBars?: number }[] = [];
  const errors: { source: string; message: string }[] = [];

  if (faraz.enabled) {
    try {
      const result = await runFarazIngestion(faraz, signal);
      results.push({ source: 'faraz', ...result });
    } catch (error) {
      errors.push({ source: 'faraz', message: error instanceof Error ? error.message : 'faraz_failed' });
    }
  }

  if (hamrate.enabled) {
    try {
      const result = await runHamrateIngestion(hamrate, signal);
      results.push({ source: 'hamrate', ...result });
    } catch (error) {
      errors.push({ source: 'hamrate', message: error instanceof Error ? error.message : 'hamrate_failed' });
    }
  }

  if (!faraz.enabled && !hamrate.enabled) {
    throw new Error('هیچ منبع تأیید‌شده‌ای فعال نیست. در ادمین یکی از منابع را فعال کنید.');
  }
  if (!results.length) {
    throw new Error(errors.map(item => `${item.source}: ${item.message}`).join(' | ') || 'ingestion_failed');
  }

  return {
    ok: true,
    results,
    errors,
    count: results.reduce((sum, item) => sum + item.count, 0),
  };
}
