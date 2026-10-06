import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';
import { defaultCalculatorNavigation, normalizeCalculatorNavigation, type CalculatorNavigation } from '@/lib/calculator-navigation';

export const CALCULATOR_NAVIGATION_KEY = 'calculator-navigation-v1';

export async function getCalculatorNavigation(): Promise<CalculatorNavigation & { writable: boolean }> {
  try {
    const row = await withDeadline(db.integrationSetting.findUnique({ where: { key: CALCULATOR_NAVIGATION_KEY } }), 2000);
    return { ...normalizeCalculatorNavigation(row?.publicValue ? JSON.parse(row.publicValue) : defaultCalculatorNavigation), writable: true };
  } catch {
    return { ...defaultCalculatorNavigation, writable: false };
  }
}

export async function persistCalculatorNavigation(actor: string, input: unknown) {
  if (!actor) throw new Error('unauthorized');
  const navigation = normalizeCalculatorNavigation(input);
  await db.integrationSetting.upsert({
    where: { key: CALCULATOR_NAVIGATION_KEY },
    create: { key: CALCULATOR_NAVIGATION_KEY, category: 'calculator', label: 'چیدمان ماشین‌حساب', enabled: true, publicValue: JSON.stringify(navigation) },
    update: { publicValue: JSON.stringify(navigation) },
  });
  return navigation;
}
