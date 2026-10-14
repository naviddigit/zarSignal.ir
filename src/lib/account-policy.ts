export const profileFields = { firstName: 'نام', lastName: 'نام خانوادگی', phone: 'شماره موبایل', city: 'شهر فعالیت', occupation: 'حوزه فعالیت', customerType: 'نوع کاربر' } as const;
export type ProfileField = keyof typeof profileFields;
export type AccountPolicy = { emailVerificationRequired: boolean; profileRequired: boolean; requiredFields: ProfileField[]; phoneRequired: boolean; customerTypeRequired: boolean; customerTypes: string[] };
export const defaultAccountPolicy: AccountPolicy = { emailVerificationRequired: false, profileRequired: false, requiredFields: ['firstName', 'lastName', 'phone'], phoneRequired: false, customerTypeRequired: false, customerTypes: ['خانگی', 'حرفه‌ای'] };

export function parseAccountPolicy(raw: unknown): AccountPolicy {
  const value = raw as Partial<AccountPolicy> | null;
  return {
    emailVerificationRequired: value?.emailVerificationRequired === true,
    profileRequired: value?.profileRequired === true,
    phoneRequired: value?.phoneRequired === true,
    customerTypeRequired: value?.customerTypeRequired === true,
    customerTypes: Array.isArray(value?.customerTypes) ? [...new Set(value.customerTypes.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(item => item.length >= 2 && item.length <= 80))].slice(0, 30) : [...defaultAccountPolicy.customerTypes],
    requiredFields: Array.isArray(value?.requiredFields) ? [...new Set(value.requiredFields.filter(key => typeof key === 'string' && Object.hasOwn(profileFields, key)))] : [...defaultAccountPolicy.requiredFields],
  };
}

export function fieldRequired(policy: AccountPolicy, field: ProfileField) {
  return policy.profileRequired && policy.requiredFields.includes(field) || field === 'phone' && policy.phoneRequired || field === 'customerType' && policy.customerTypeRequired;
}

export function profileRequired(policy: AccountPolicy) {
  return policy.profileRequired || policy.phoneRequired || policy.customerTypeRequired;
}

export function missingProfileFields(user: { name?: string | null; firstName?: string | null; lastName?: string | null; phone?: string | null; city?: string | null; occupation?: string | null; customerType?: string | null }, policy: AccountPolicy) {
  const parts = user.name?.trim().split(/\s+/) ?? [];
  const fields = [...new Set([...policy.requiredFields, ...(policy.phoneRequired ? ['phone' as const] : []), ...(policy.customerTypeRequired ? ['customerType' as const] : [])])];
  return fields.filter(key => {
    if (profileRequired(policy) && !fieldRequired(policy, key)) return false;
    if (key === 'customerType') return !user.customerType || !policy.customerTypes.includes(user.customerType);
    if (key === 'phone') return !normalizePhone(user.phone ?? '');
    return !(key === 'firstName' ? user.firstName || parts[0] : key === 'lastName' ? user.lastName || parts.slice(1).join(' ') : user[key])?.trim();
  });
}

export function normalizePhone(raw: string) {
  const latin = raw.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const digits = latin.replace(/[\s()-]/g, '');
  if (!digits) return null;
  if (/^09\d{9}$/.test(digits)) return `+98${digits.slice(1)}`;
  if (/^\+989\d{9}$/.test(digits)) return digits;
  if (/^989\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

export function registrationProfile(raw: { phone: string; customerType: string }, policy: AccountPolicy) {
  const phone = normalizePhone(raw.phone.trim());
  const customerType = raw.customerType.trim() || null;
  if (raw.phone.trim() && !phone || fieldRequired(policy, 'phone') && !phone) throw new Error('شماره موبایل معتبر وارد کنید.');
  if (customerType && !policy.customerTypes.includes(customerType) || fieldRequired(policy, 'customerType') && !customerType) throw new Error('نوع کاربر را از گزینه‌های موجود انتخاب کنید.');
  return { phone, customerType };
}
