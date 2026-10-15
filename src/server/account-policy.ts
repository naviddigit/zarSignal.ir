import { db } from '@/lib/db';
import { parseAccountPolicy } from '@/lib/account-policy';

export const ACCOUNT_POLICY_KEY = 'account-policy-v1';
let cached: { until: number; value: ReturnType<typeof loadPolicy> } | undefined;
async function loadPolicy() {
  const row = await db.integrationSetting.findUnique({ where: { key: ACCOUNT_POLICY_KEY } });
  return parseAccountPolicy(row?.publicValue ? JSON.parse(row.publicValue) : null);
}
export function clearAccountPolicyCache() { cached = undefined; }
export async function getAccountPolicy() {
  if (cached && cached.until > Date.now()) return cached.value;
  const value = loadPolicy();
  cached = { until: Date.now() + 5000, value };
  try { return await value; }
  catch (error) { if (cached?.value === value) cached = undefined; throw error; }
}
