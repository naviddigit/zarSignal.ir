/** Public analysis reading / typing controls — stored as IntegrationSetting publicValue JSON. */

export const ANALYSIS_READING_SETTING_KEY = 'analysis-reading-v1';

export type AnalysisReadingSettings = {
  /** Base typing speed in characters (graphemes) per second. */
  baseCps: number;
  /** Multiplier applied when the reader picks the fast control (1× stays at baseCps). */
  fastMultiplier: number;
  /** Delay before advancing a fade/reveal section (ms). */
  sectionAppearMs: number;
};

export const defaultAnalysisReadingSettings: AnalysisReadingSettings = {
  baseCps: 45,
  fastMultiplier: 2,
  sectionAppearMs: 300,
};

export const ANALYSIS_READING_BOUNDS = {
  baseCps: { min: 15, max: 80 },
  fastMultiplier: { min: 1, max: 2 },
  sectionAppearMs: { min: 80, max: 2000 },
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function normalizeAnalysisReadingSettings(input: unknown): AnalysisReadingSettings {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<AnalysisReadingSettings>;
  const base = Number(raw.baseCps);
  const fast = Number(raw.fastMultiplier);
  const delay = Number(raw.sectionAppearMs);
  return {
    baseCps: Number.isFinite(base)
      ? clamp(Math.round(base), ANALYSIS_READING_BOUNDS.baseCps.min, ANALYSIS_READING_BOUNDS.baseCps.max)
      : defaultAnalysisReadingSettings.baseCps,
    fastMultiplier: Number.isFinite(fast)
      ? clamp(Math.round(fast * 100) / 100, ANALYSIS_READING_BOUNDS.fastMultiplier.min, ANALYSIS_READING_BOUNDS.fastMultiplier.max)
      : defaultAnalysisReadingSettings.fastMultiplier,
    sectionAppearMs: Number.isFinite(delay)
      ? clamp(Math.round(delay), ANALYSIS_READING_BOUNDS.sectionAppearMs.min, ANALYSIS_READING_BOUNDS.sectionAppearMs.max)
      : defaultAnalysisReadingSettings.sectionAppearMs,
  };
}

export function effectiveTypingCps(settings: AnalysisReadingSettings, speed: 1 | 2) {
  const cps = speed === 2 ? settings.baseCps * settings.fastMultiplier : settings.baseCps;
  return clamp(cps, ANALYSIS_READING_BOUNDS.baseCps.min, ANALYSIS_READING_BOUNDS.baseCps.max * ANALYSIS_READING_BOUNDS.fastMultiplier.max);
}

export function readingSpeedLabel(settings: AnalysisReadingSettings, speed: 1 | 2) {
  const cps = Math.round(effectiveTypingCps(settings, speed));
  const fa = new Intl.NumberFormat('fa-IR').format(cps);
  return speed === 1
    ? `سرعت واقعی · ${fa} نویسه در ثانیه`
    : `حالت سریع · ${fa} نویسه در ثانیه`;
}
