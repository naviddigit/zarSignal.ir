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

export async function getCalculatorAccessPolicy(): Promise<CalculatorAccessPolicy & { available: boolean }> {
  try {
    const row = await withDeadline(
      db.integrationSetting.findUnique({ where: { key: CALCULATOR_ACCESS_SETTING_KEY } }),
      2000,
    );
    if (!row?.publicValue) return { ...defaultCalculatorAccessPolicy, available: true };
    return { ...normalizeCalculatorAccessPolicy(JSON.parse(row.publicValue)), available: true };
  } catch {
    return { ...defaultCalculatorAccessPolicy, available: false };
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
  const decision = decideCalculatorModuleAccess(operation, policy, level, {
    statusLabel,
    settingsAvailable: policy.available,
  });
  return { ...decision, operation };
}
