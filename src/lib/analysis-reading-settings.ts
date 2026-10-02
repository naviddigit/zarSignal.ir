/** Public analysis reading / typing controls — stored as IntegrationSetting publicValue JSON. */

export const ANALYSIS_READING_SETTING_KEY = 'analysis-reading-v1';

export type AnalysisReadingSettings = {
  /** Base typing speed in characters (graphemes) per second. */
  baseCps: number;
  /** Legacy persisted field retained for compatibility; the reader's 2× control is always exactly 2×. */
  fastMultiplier: number;
  maxCps?: number;
  /** Delay before advancing a fade/reveal section (ms). */
  sectionAppearMs: number;
};

export const defaultAnalysisReadingSettings: AnalysisReadingSettings = {
  baseCps: 45,
  fastMultiplier: 2,
  maxCps: 160,
  sectionAppearMs: 220,
};

export const ANALYSIS_READING_BOUNDS = {
  baseCps: { min: 15, max: 80 },
  fastMultiplier: { min: 1, max: 2 },
  maxCps: { min: 30, max: 160 },
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
  const maxCps = Number.isFinite(Number(raw.maxCps)) ? clamp(Number(raw.maxCps), 30, 160) : 160;
  return {
    baseCps: Number.isFinite(base)
      ? clamp(Math.round(base), ANALYSIS_READING_BOUNDS.baseCps.min, Math.min(80, maxCps / 2))
      : Math.min(defaultAnalysisReadingSettings.baseCps, maxCps / 2),
    maxCps,
    fastMultiplier: Number.isFinite(fast)
      ? clamp(Math.round(fast * 100) / 100, ANALYSIS_READING_BOUNDS.fastMultiplier.min, ANALYSIS_READING_BOUNDS.fastMultiplier.max)
      : defaultAnalysisReadingSettings.fastMultiplier,
    sectionAppearMs: Number.isFinite(delay)
      ? clamp(Math.round(delay), ANALYSIS_READING_BOUNDS.sectionAppearMs.min, ANALYSIS_READING_BOUNDS.sectionAppearMs.max)
      : defaultAnalysisReadingSettings.sectionAppearMs,
  };
}

export function effectiveTypingCps(settings: AnalysisReadingSettings, speed: 1 | 2) {
  const normalized = normalizeAnalysisReadingSettings(settings);
  return normalized.baseCps * speed;
}

export function readingSpeedLabel(settings: AnalysisReadingSettings, speed: 1 | 2) {
  const cps = Math.round(effectiveTypingCps(settings, speed));
  const fa = new Intl.NumberFormat('fa-IR').format(cps);
  return speed === 1
    ? `سرعت واقعی · ${fa} نویسه در ثانیه`
    : `حالت سریع · ${fa} نویسه در ثانیه`;
}
