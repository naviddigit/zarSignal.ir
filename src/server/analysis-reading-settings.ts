import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';
import {
  ANALYSIS_READING_SETTING_KEY,
  defaultAnalysisReadingSettings,
  normalizeAnalysisReadingSettings,
  type AnalysisReadingSettings,
} from '@/lib/analysis-reading-settings';

export async function getAnalysisReadingSettings(): Promise<AnalysisReadingSettings & { fallback: boolean }> {
  try {
    const row = await withDeadline(
      db.integrationSetting.findUnique({ where: { key: ANALYSIS_READING_SETTING_KEY } }),
      2000,
    );
    if (!row?.publicValue) return { ...defaultAnalysisReadingSettings, fallback: true };
    const parsed = JSON.parse(row.publicValue) as unknown;
    return { ...normalizeAnalysisReadingSettings(parsed), fallback: false };
  } catch {
    return { ...defaultAnalysisReadingSettings, fallback: true };
  }
}

export async function persistAnalysisReadingSettings(
  actor: string,
  input: unknown,
): Promise<AnalysisReadingSettings> {
  if (!actor) throw new Error('unauthorized');
  const value = normalizeAnalysisReadingSettings(input);
  await db.integrationSetting.upsert({
    where: { key: ANALYSIS_READING_SETTING_KEY },
    create: {
      key: ANALYSIS_READING_SETTING_KEY,
      category: 'analysis',
      label: 'سرعت خواندن گزارش تحلیل',
      enabled: true,
      publicValue: JSON.stringify(value),
    },
    update: {
      enabled: true,
      publicValue: JSON.stringify(value),
      label: 'سرعت خواندن گزارش تحلیل',
      category: 'analysis',
    },
  });
  return value;
}
