export const profileFields = { firstName: 'نام', lastName: 'نام خانوادگی', phone: 'شماره موبایل', city: 'شهر فعالیت', occupation: 'حوزه فعالیت' } as const;
export type ProfileField = keyof typeof profileFields;
export type AccountPolicy = { emailVerificationRequired: boolean; profileRequired: boolean; requiredFields: ProfileField[] };
export const defaultAccountPolicy: AccountPolicy = { emailVerificationRequired: false, profileRequired: false, requiredFields: ['firstName', 'lastName', 'phone'] };

export function parseAccountPolicy(raw: unknown): AccountPolicy {
  const value = raw as Partial<AccountPolicy> | null;
  return {
    emailVerificationRequired: value?.emailVerificationRequired === true,
    profileRequired: value?.profileRequired === true,
    requiredFields: Array.isArray(value?.requiredFields) ? [...new Set(value.requiredFields.filter(key => typeof key === 'string' && Object.hasOwn(profileFields, key)))] : [...defaultAccountPolicy.requiredFields],
  };
}

export function missingProfileFields(user: { name?: string | null; firstName?: string | null; lastName?: string | null; phone?: string | null; city?: string | null; occupation?: string | null }, policy: AccountPolicy) {
  const parts = user.name?.trim().split(/\s+/) ?? [];
  return policy.requiredFields.filter(key => !(key === 'firstName' ? user.firstName || parts[0] : key === 'lastName' ? user.lastName || parts.slice(1).join(' ') : user[key])?.trim());
}
