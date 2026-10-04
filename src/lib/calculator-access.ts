import type { AccessLevel } from '@/lib/capabilities';
import { calculatorCatalog, type CalculatorOperation } from '@/lib/calculator-catalog';

export type { CalculatorOperation };
export type CalculatorModule = CalculatorOperation | 'weight' | 'purity';
export const CALCULATOR_ACCESS_SETTING_KEY = 'calculator-module-access-v1';

/** Per-module access: free for everyone, restricted to listed levels, or fully disabled. */
export type CalculatorModuleMode = 'free' | 'plans' | 'disabled';

export type CalculatorModulePolicy = {
  mode: CalculatorModuleMode;
  /** When mode is `plans`, these access levels may run the module (plus FREE if listed). */
  allowedLevels: AccessLevel[];
};

export type CalculatorAccessPolicy = Record<CalculatorModule, CalculatorModulePolicy>;

const ALL_LEVELS: AccessLevel[] = ['FREE', 'HOME', 'PROFESSIONAL', 'ADVANCED_PROFESSIONAL'];

/** Defaults preserve today's public catalog: all approved modules free. */
export const defaultCalculatorAccessPolicy: CalculatorAccessPolicy = {
  weight: { mode: 'free', allowedLevels: [...ALL_LEVELS] },
  purity: { mode: 'free', allowedLevels: [...ALL_LEVELS] },
  mazanehTo18k: { mode: 'free', allowedLevels: [...ALL_LEVELS] },
  market18kToMazaneh: { mode: 'free', allowedLevels: [...ALL_LEVELS] },
  goldBubble: { mode: 'free', allowedLevels: [...ALL_LEVELS] },
  usdGap: { mode: 'free', allowedLevels: [...ALL_LEVELS] },
  silverBubble: { mode: 'free', allowedLevels: [...ALL_LEVELS] },
};

export const CALCULATOR_MODULE_LABELS: Record<CalculatorModule, string> = {
  weight: 'تبدیل واحد وزن',
  purity: 'تبدیل عیار طلا و نقره',
  ...Object.fromEntries((Object.keys(calculatorCatalog) as CalculatorOperation[]).map(op => [op, calculatorCatalog[op].title])),
} as Record<CalculatorModule, string>;

export function normalizeCalculatorAccessPolicy(input: unknown): CalculatorAccessPolicy {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<Record<CalculatorModule, Partial<CalculatorModulePolicy>>>;
  const out = { ...defaultCalculatorAccessPolicy };
  for (const op of Object.keys(defaultCalculatorAccessPolicy) as CalculatorModule[]) {
    const row = raw[op];
    if (!row || typeof row !== 'object') continue;
    const mode = row.mode === 'free' || row.mode === 'plans' || row.mode === 'disabled' ? row.mode : out[op].mode;
    const levels = Array.isArray(row.allowedLevels)
      ? row.allowedLevels.filter((l): l is AccessLevel => ALL_LEVELS.includes(l as AccessLevel))
      : out[op].allowedLevels;
    out[op] = {
      mode,
      allowedLevels: mode === 'free' ? [...ALL_LEVELS] : levels.length ? levels : ['PROFESSIONAL', 'ADVANCED_PROFESSIONAL'],
    };
  }
  return out;
}

export type CalculatorAccessDecision =
  | { ok: true }
  | { ok: false; code: 'disabled' | 'forbidden' | 'trial_expired' | 'settings_error'; message: string };

export function decideCalculatorModuleAccess(
  operation: CalculatorModule,
  policy: CalculatorAccessPolicy,
  level: AccessLevel,
  opts?: { statusLabel?: string | null; settingsAvailable?: boolean },
): CalculatorAccessDecision {
  // settingsAvailable=false is reserved for true policy absence. Callers that fall back to
  // defaultCalculatorAccessPolicy must pass available=true (or omit the flag).
  if (opts?.settingsAvailable === false) {
    return {
      ok: false,
      code: 'settings_error',
      message: 'تنظیمات دسترسی ماشین‌حساب فعلاً قابل خواندن نیست؛ کمی بعد دوباره تلاش کنید.',
    };
  }
  const row = policy[operation] ?? defaultCalculatorAccessPolicy[operation];
  if (!row || row.mode === 'disabled') {
    return { ok: false, code: 'disabled', message: 'این ماژول ماشین‌حساب فعلاً غیرفعال است.' };
  }
  if (row.mode === 'free') return { ok: true };
  if (opts?.statusLabel === 'در انتظار پرداخت') {
    return {
      ok: false,
      code: 'forbidden',
      message: 'اشتراک در انتظار پرداخت است؛ پس از فعال‌سازی می‌توانید محاسبه کنید. حساب خود را ارتقا دهید.',
    };
  }
  if (row.allowedLevels.includes(level)) return { ok: true };
  if (opts?.statusLabel === 'آزمایشی' && row.allowedLevels.includes('HOME')) {
    return { ok: true };
  }
  return {
    ok: false,
    code: 'forbidden',
    message: 'این محاسبه برای پلن فعلی شما فعال نیست. حساب خود را ارتقا دهید.',
  };
}

export function isCalculatorOperation(value: unknown): value is CalculatorOperation {
  return typeof value === 'string' && value in calculatorCatalog;
}
