import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';
import type { AccessLevel } from '@/lib/capabilities';
import {
  CALCULATOR_ACCESS_SETTING_KEY,
  decideCalculatorModuleAccess,
  defaultCalculatorAccessPolicy,
  isCalculatorOperation,
  normalizeCalculatorAccessPolicy,
  type CalculatorAccessDecision,
  type CalculatorAccessPolicy,
  type CalculatorOperation,
} from '@/lib/calculator-access';

export type CalculatorAccessPolicyState = CalculatorAccessPolicy & {
  /** Usable policy for customer decisions (defaults count as usable). */
  available: boolean;
  /** Admin can persist changes (requires live DB). */
  writable: boolean;
};

/**
 * Read module monetization policy.
 * DB failure must not lock the calculator: fall back to free defaults and mark writable=false.
 */
export async function getCalculatorAccessPolicy(): Promise<CalculatorAccessPolicyState> {
  try {
    const row = await withDeadline(
      db.integrationSetting.findUnique({ where: { key: CALCULATOR_ACCESS_SETTING_KEY } }),
      2000,
    );
    if (!row?.publicValue) return { ...defaultCalculatorAccessPolicy, available: true, writable: true };
    return { ...normalizeCalculatorAccessPolicy(JSON.parse(row.publicValue)), available: true, writable: true };
  } catch {
    return { ...defaultCalculatorAccessPolicy, available: true, writable: false };
  }
}

export async function persistCalculatorAccessPolicy(actor: string, input: unknown): Promise<CalculatorAccessPolicy> {
  if (!actor) throw new Error('unauthorized');
  const value = normalizeCalculatorAccessPolicy(input);
  await db.integrationSetting.upsert({
    where: { key: CALCULATOR_ACCESS_SETTING_KEY },
    create: {
      key: CALCULATOR_ACCESS_SETTING_KEY,
      category: 'access',
      label: 'دسترسی ماژول‌های ماشین‌حساب',
      enabled: true,
      publicValue: JSON.stringify(value),
    },
    update: {
      enabled: true,
      publicValue: JSON.stringify(value),
      label: 'دسترسی ماژول‌های ماشین‌حساب',
      category: 'access',
    },
  });
  return value;
}

export async function resolveCalculatorOperationAccess(
  operation: unknown,
  level: AccessLevel,
  statusLabel?: string | null,
): Promise<CalculatorAccessDecision & { operation?: CalculatorOperation }> {
  if (!isCalculatorOperation(operation)) {
    return { ok: false, code: 'disabled', message: 'عملیات ماشین‌حساب نامعتبر است.' };
  }
  const policy = await getCalculatorAccessPolicy();
  // Always evaluate against a usable policy (defaults if DB is down). Never block with settings_error
  // when free defaults are already applied — that message was masking upgrade / plan gates.
  const decision = decideCalculatorModuleAccess(operation, policy, level, { statusLabel });
  return { ...decision, operation };
}
