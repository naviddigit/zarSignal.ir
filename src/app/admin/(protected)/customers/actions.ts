'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/server/admin-auth';
import {
  applyCustomerAccessChange,
  getCustomerDetail,
  previewCustomerAccessChange,
  searchCustomers,
  type CustomerAccessMutation,
} from '@/server/admin-customers';
import { resolveAccountEntitlement } from '@/server/account-entitlement';
import { db } from '@/lib/db';

export type CustomerActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  preview?: ReturnType<typeof previewCustomerAccessChange>;
};

function parseMutation(form: FormData): CustomerAccessMutation {
  const action = String(form.get('action') ?? '') as CustomerAccessMutation['action'];
  const hoursRaw = String(form.get('hours') ?? '').trim();
  const hours = hoursRaw === '' ? undefined : Number(hoursRaw);
  return {
    userId: String(form.get('userId') ?? ''),
    action,
    planSlug: String(form.get('planSlug') ?? '').trim() || undefined,
    hours: Number.isFinite(hours) ? hours : undefined,
    expiresAtIso: String(form.get('expiresAtIso') ?? '').trim() || undefined,
    reason: String(form.get('reason') ?? ''),
  };
}

export async function previewCustomerAction(
  _prev: CustomerActionState | null,
  form: FormData,
): Promise<CustomerActionState> {
  try {
    await requireAdmin();
    const mutation = parseMutation(form);
    if (!mutation.userId) return { ok: false, error: 'مشتری مشخص نیست.' };
    const entitlement = await resolveAccountEntitlement(mutation.userId);
    const plan = mutation.planSlug
      ? await db.plan.findUnique({ where: { slug: mutation.planSlug }, select: { title: true } })
      : null;
    return {
      ok: true,
      preview: previewCustomerAccessChange(entitlement, mutation, plan?.title),
      message: 'پیش‌نمایش آماده است؛ هنوز ذخیره نشده.',
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'پیش‌نمایش ممکن نشد.' };
  }
}

export async function applyCustomerAction(
  _prev: CustomerActionState | null,
  form: FormData,
): Promise<CustomerActionState> {
  try {
    const actor = await requireAdmin();
    const mutation = parseMutation(form);
    const result = await applyCustomerAccessChange(actor, mutation);
    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${mutation.userId}`);
    revalidatePath('/account');
    revalidatePath('/analysis', 'layout');
    return {
      ok: true,
      message: 'تغییر دسترسی ذخیره شد و entitlement مشتری به‌روز شد.',
      preview: {
        previous: {
          planLabel: result.entitlementBefore.planLabel,
          statusLabel: result.entitlementBefore.statusLabel,
          expiresAt: result.entitlementBefore.expiresAt?.toISOString() ?? null,
          level: result.entitlementBefore.level,
        },
        next: {
          planLabel: result.entitlementAfter.planLabel,
          statusLabel: result.entitlementAfter.statusLabel,
          expiresAt: result.entitlementAfter.expiresAt?.toISOString() ?? null,
          immediateExpire: Boolean(
            result.entitlementAfter.expiresAt
            && result.entitlementAfter.expiresAt.getTime() <= Date.now(),
          ),
          accessCreditLabel: result.entitlementAfter.statusLabel === 'رایگان'
            ? 'بدون اعتبار دسترسی زمانی'
            : `وضعیت: ${result.entitlementAfter.statusLabel}`,
        },
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'ذخیرهٔ تغییر ممکن نشد.' };
  }
}

export async function loadCustomers(query: string) {
  await requireAdmin();
  return searchCustomers(query);
}

export async function loadCustomer(userId: string) {
  await requireAdmin();
  return getCustomerDetail(userId);
}
