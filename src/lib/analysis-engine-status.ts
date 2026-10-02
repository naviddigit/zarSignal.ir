/**
 * Decision-engine / confirmation-watch readiness.
 * Production has no approved V5.4 engine — engineTrade stays null and /api/v1/analysis is 503.
 * Do not invent thresholds, bid/ask, cost, or trend rules from bubble marks.
 */

import type { Symbol } from '@/lib/market';

export type EngineReadiness = {
  /** True only when an approved, evaluable decision engine is wired for this symbol. */
  active: boolean;
  /** Safe to offer "notify when confirmed" — requires active + evaluable condition rules. */
  canWatchConfirmation: boolean;
  reason: string;
  missing: string[];
};

const MISSING_ENGINE = [
  'متن کامل Master Prompt V5.4 و amendments تأییدشده',
  'قواعد تصمیم، آستانه‌ها، هزینهٔ معامله، bid/ask و روند قابل اجرا',
  'Confidence / Reason Codes / Risk Flags با نگاشت فارسی',
  'AnalysisSnapshot نسخه‌دار و Golden fixtures موتور',
  'endpoint تصمیم غیر-۵۰۳ (امروز /api/v1/analysis → formula_not_configured)',
  'زیرساخت اعلان production: consent، throttle، provider Push/SMS، idempotent delivery',
] as const;

/** Every marketed symbol today: bubble math only — no trade confirmation engine. */
export function engineReadinessForSymbol(_symbol?: Symbol | null): EngineReadiness {
  return {
    active: false,
    canWatchConfirmation: false,
    reason: 'موتور تصمیم تأییدشده برای هیچ نمادی در Production فعال نیست؛ worker فعلی فقط ingestion بازار است.',
    missing: [...MISSING_ENGINE],
  };
}

export function canOfferConfirmationWatch(symbol?: Symbol | null) {
  return engineReadinessForSymbol(symbol).canWatchConfirmation;
}
