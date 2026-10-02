import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';
import { accessLevelFromPlan, accessLevelLabel, type AccessLevel } from '@/lib/capabilities';
import { resolveAccountEntitlement } from '@/server/account-entitlement';
import { ensureHistorySchema } from '@/server/ensure-schema';
import { trialProduct } from '@/server/analysis-trial';

export type CustomerListItem = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  planLabel: string;
  statusLabel: string;
  expiresAt: string | null;
  level: AccessLevel;
  accessCreditLabel: string;
};

function creditLabel(expiresAt: Date | null, status: string) {
  if (!expiresAt || status === 'رایگان') return 'بدون اعتبار دسترسی زمانی';
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return 'اعتبار دسترسی منقضی شده';
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 48) return `اعتبار دسترسی باقی‌مانده: ${new Intl.NumberFormat('fa-IR').format(hours)} ساعت`;
  const days = Math.floor(hours / 24);
  return `اعتبار دسترسی باقی‌مانده: ${new Intl.NumberFormat('fa-IR').format(days)} روز`;
}

export async function searchCustomers(query: string, take = 40): Promise<CustomerListItem[]> {
  await ensureHistorySchema().catch(() => undefined);
  const q = query.trim();
  const users = await withDeadline(
    db.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { id: q },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, email: true, name: true, createdAt: true },
    }),
    4000,
  );

  const rows: CustomerListItem[] = [];
  for (const user of users) {
    const entitlement = await resolveAccountEntitlement(user.id).catch(() => null);
    rows.push({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      planLabel: entitlement?.planLabel ?? accessLevelLabel('FREE'),
      statusLabel: entitlement?.statusLabel ?? 'رایگان',
      expiresAt: entitlement?.expiresAt?.toISOString() ?? null,
      level: entitlement?.level ?? 'FREE',
      accessCreditLabel: creditLabel(entitlement?.expiresAt ?? null, entitlement?.statusLabel ?? 'رایگان'),
    });
  }
  return rows;
}

export async function getCustomerDetail(userId: string) {
  await ensureHistorySchema().catch(() => undefined);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true, role: true },
  });
  if (!user) return null;
  const [entitlement, subscriptions, plans, audits] = await Promise.all([
    resolveAccountEntitlement(userId),
    db.subscription.findMany({
      where: { userId },
      orderBy: { startsAt: 'desc' },
      take: 20,
    }),
    db.plan.findMany({
      where: { active: true, webAvailable: true },
      select: { slug: true, title: true },
      orderBy: { title: 'asc' },
    }),
    db.adminAccessAudit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }).catch(() => []),
  ]);
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      role: user.role,
    },
    entitlement,
    subscriptions: subscriptions.map(s => ({
      id: s.id,
      product: s.product,
      status: s.status,
      startsAt: s.startsAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    })),
    plans,
    audits: audits.map(a => ({
      id: a.id,
      actor: a.actor,
      action: a.action,
      reason: a.reason,
      previousValue: a.previousValue,
      nextValue: a.nextValue,
      createdAt: a.createdAt.toISOString(),
    })),
    accessCreditLabel: creditLabel(entitlement.expiresAt, entitlement.statusLabel),
  };
}

export type CustomerAccessMutation = {
  userId: string;
  action: 'set_plan' | 'gift_hours' | 'adjust_hours' | 'set_expires_at' | 'suspend' | 'cancel';
  planSlug?: string;
  hours?: number;
  expiresAtIso?: string;
  reason: string;
};

function previewExpiry(current: Date | null, action: CustomerAccessMutation['action'], hours?: number, expiresAtIso?: string) {
  const now = new Date();
  if (action === 'set_expires_at' && expiresAtIso) return new Date(expiresAtIso);
  if (action === 'gift_hours' || action === 'adjust_hours') {
    const base = current && current > now ? current : now;
    return new Date(base.getTime() + (hours ?? 0) * 3_600_000);
  }
  if (action === 'suspend' || action === 'cancel') return current ?? now;
  return current;
}

export function previewCustomerAccessChange(
  entitlement: Awaited<ReturnType<typeof resolveAccountEntitlement>>,
  mutation: CustomerAccessMutation,
  planTitle?: string | null,
) {
  const nextExpires = previewExpiry(
    entitlement.expiresAt,
    mutation.action,
    mutation.hours,
    mutation.expiresAtIso,
  );
  const immediateExpire = Boolean(nextExpires && nextExpires.getTime() <= Date.now()
    && (mutation.action === 'set_expires_at' || mutation.action === 'adjust_hours'));
  return {
    previous: {
      planLabel: entitlement.planLabel,
      statusLabel: entitlement.statusLabel,
      expiresAt: entitlement.expiresAt?.toISOString() ?? null,
      level: entitlement.level,
    },
    next: {
      planLabel: mutation.action === 'set_plan'
        ? (planTitle ?? mutation.planSlug ?? entitlement.planLabel)
        : entitlement.planLabel,
      statusLabel: mutation.action === 'suspend' ? 'تعلیق‌شده'
        : mutation.action === 'cancel' ? 'لغو شده'
        : immediateExpire ? 'منقضی'
        : entitlement.statusLabel,
      expiresAt: nextExpires?.toISOString() ?? null,
      immediateExpire,
      accessCreditLabel: creditLabel(nextExpires ?? null, immediateExpire ? 'رایگان' : entitlement.statusLabel),
    },
  };
}

/** Atomic commercial subscription swap — does not create parallel ACTIVE commercial rows. */
export async function applyCustomerAccessChange(actor: string, mutation: CustomerAccessMutation) {
  if (!actor) throw new Error('unauthorized');
  if (!mutation.reason?.trim() || mutation.reason.trim().length < 3) {
    throw new Error('دلیل تغییر حداقل ۳ نویسه لازم است.');
  }
  await ensureHistorySchema();
  const entitlementBefore = await resolveAccountEntitlement(mutation.userId);
  const plans = await db.plan.findMany({ where: { active: true, webAvailable: true }, select: { slug: true, title: true } });
  const plan = mutation.planSlug ? plans.find(p => p.slug === mutation.planSlug) : null;
  if (mutation.action === 'set_plan' && !plan) throw new Error('پلن انتخاب‌شده معتبر نیست.');

  const preview = previewCustomerAccessChange(entitlementBefore, mutation, plan?.title);

  const result = await db.$transaction(async tx => {
    const now = new Date();
    const commercial = await tx.subscription.findMany({
      where: {
        userId: mutation.userId,
        status: { in: ['ACTIVE', 'PENDING', 'SUSPENDED'] },
        NOT: { product: trialProduct },
      },
      orderBy: { startsAt: 'desc' },
    });

    let active = commercial.find(s => s.status === 'ACTIVE' || s.status === 'SUSPENDED') ?? commercial[0] ?? null;

    if (mutation.action === 'set_plan' && plan) {
      // Expire other commercial actives, then upsert one ACTIVE row.
      for (const row of commercial) {
        if (active && row.id === active.id) continue;
        if (row.status === 'ACTIVE' || row.status === 'SUSPENDED' || row.status === 'PENDING') {
          await tx.subscription.update({
            where: { id: row.id },
            data: { status: 'CANCELED', expiresAt: now },
          });
        }
      }
      const expiresAt = active && active.expiresAt > now
        ? active.expiresAt
        : new Date(now.getTime() + 30 * 24 * 3_600_000);
      if (active) {
        active = await tx.subscription.update({
          where: { id: active.id },
          data: { product: plan.slug, status: 'ACTIVE', startsAt: now, expiresAt },
        });
      } else {
        active = await tx.subscription.create({
          data: {
            userId: mutation.userId,
            product: plan.slug,
            status: 'ACTIVE',
            startsAt: now,
            expiresAt,
          },
        });
      }
    } else if (mutation.action === 'gift_hours' || mutation.action === 'adjust_hours') {
      const hours = Number(mutation.hours);
      if (!Number.isFinite(hours) || hours === 0) throw new Error('ساعت هدیه/تعدیل نامعتبر است.');
      if (!active) {
        if (hours < 0) throw new Error('اشتراک فعالی برای کاهش زمان وجود ندارد.');
        const home = plans.find(p => accessLevelFromPlan(p) === 'HOME') ?? plans[0];
        if (!home) throw new Error('پلنی برای هدیه در دسترس نیست.');
        active = await tx.subscription.create({
          data: {
            userId: mutation.userId,
            product: home.slug,
            status: 'ACTIVE',
            startsAt: now,
            expiresAt: new Date(now.getTime() + hours * 3_600_000),
          },
        });
      } else {
        const base = active.expiresAt > now ? active.expiresAt : now;
        active = await tx.subscription.update({
          where: { id: active.id },
          data: {
            status: 'ACTIVE',
            expiresAt: new Date(base.getTime() + hours * 3_600_000),
          },
        });
      }
    } else if (mutation.action === 'set_expires_at') {
      if (!mutation.expiresAtIso) throw new Error('تاریخ انقضا لازم است.');
      const expiresAt = new Date(mutation.expiresAtIso);
      if (!Number.isFinite(expiresAt.getTime())) throw new Error('تاریخ انقضا نامعتبر است.');
      if (!active) throw new Error('اشتراک فعالی برای تنظیم انقضا وجود ندارد.');
      active = await tx.subscription.update({
        where: { id: active.id },
        data: { expiresAt, status: expiresAt <= now ? 'EXPIRED' : 'ACTIVE' },
      });
    } else if (mutation.action === 'suspend') {
      if (!active) throw new Error('اشتراک فعالی برای تعلیق وجود ندارد.');
      active = await tx.subscription.update({
        where: { id: active.id },
        data: { status: 'SUSPENDED' },
      });
    } else if (mutation.action === 'cancel') {
      if (!active) throw new Error('اشتراک فعالی برای لغو وجود ندارد.');
      active = await tx.subscription.update({
        where: { id: active.id },
        data: { status: 'CANCELED', expiresAt: now },
      });
    }

    await tx.adminAccessAudit.create({
      data: {
        actor,
        userId: mutation.userId,
        action: mutation.action,
        reason: mutation.reason.trim(),
        previousValue: preview.previous,
        nextValue: {
          ...preview.next,
          subscriptionId: active?.id ?? null,
          product: active?.product ?? null,
          status: active?.status ?? null,
          expiresAt: active?.expiresAt?.toISOString() ?? null,
        },
      },
    });

    return active;
  });

  const entitlementAfter = await resolveAccountEntitlement(mutation.userId);
  return { subscription: result, entitlementBefore, entitlementAfter, preview };
}
