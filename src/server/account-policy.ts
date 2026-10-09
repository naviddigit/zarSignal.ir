import { db } from '@/lib/db';
import { parseAccountPolicy } from '@/lib/account-policy';

export const ACCOUNT_POLICY_KEY = 'account-policy-v1';
export async function getAccountPolicy() {
  const row = await db.integrationSetting.findUnique({ where: { key: ACCOUNT_POLICY_KEY } });
  return parseAccountPolicy(row?.publicValue ? JSON.parse(row.publicValue) : null);
}
