import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '@/lib/db';

export type BillingPeriod = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONE_TIME';
export type ManagedPricing = { id: string; planId: string; price: string; currency: string; billingPeriod: BillingPeriod; discount: string | null; effectiveAt: Date; active: boolean };
export type ManagedPlan = { id: string; title: string; slug: string; features: string[]; apiLimits: { daily?: number } | null; active: boolean; displayOrder: number; webAvailable: boolean; mobileAvailable: boolean; pricingVersions: ManagedPricing[] };
type StoredPricing = Omit<ManagedPricing, 'effectiveAt'> & { effectiveAt: string };
type StoredPlan = Omit<ManagedPlan, 'pricingVersions'> & { pricingVersions: StoredPricing[] };
type PlanWrite = Omit<ManagedPlan, 'id' | 'pricingVersions' | 'apiLimits'> & { apiLimits?: Record<string, number> };

const file = path.join(process.cwd(), '.data', 'plans.json');
const useLocal = () => process.env.NODE_ENV !== 'production';

const developmentPlanPresets: StoredPlan[] = [
  { id: 'dev-free', title: 'رایگان آزمایشی', slug: 'free-preview', features: ['مشاهده قیمت‌ها با منبع و زمان دریافت', 'ماشین‌حساب سریع بازار', 'دسترسی به روش محاسبه و محتوای آموزشی'], apiLimits: { daily: 0 }, active: true, displayOrder: 10, webAvailable: true, mobileAvailable: true, pricingVersions: [{ id: 'dev-free-monthly', planId: 'dev-free', price: '0', currency: 'تومان', billingPeriod: 'MONTHLY', discount: null, effectiveAt: '2026-09-15T00:00:00.000Z', active: true }] },
  { id: 'dev-home', title: 'معامله‌گر خانگی آزمایشی', slug: 'home-trader-preview', features: ['فهرست بازارهای منتخب', 'ماشین‌حساب‌ها و مدیریت سرمایه', 'پیش‌نمایش هشدار قیمت', 'تاریخچه محدود داده'], apiLimits: { daily: 0 }, active: true, displayOrder: 20, webAvailable: true, mobileAvailable: true, pricingVersions: [{ id: 'dev-home-monthly', planId: 'dev-home', price: '249000', currency: 'تومان', billingPeriod: 'MONTHLY', discount: null, effectiveAt: '2026-09-15T00:00:00.000Z', active: true }] },
  { id: 'dev-pro', title: 'حرفه‌ای آزمایشی', slug: 'professional-preview', features: ['ابزارهای حرفه‌ای تحلیل', 'حسابداری و مدیریت ریسک پس از تأیید مشخصات', 'هشدارها و بازارهای بیشتر', 'پشتیبانی اولویت‌دار'], apiLimits: { daily: 1000 }, active: true, displayOrder: 30, webAvailable: true, mobileAvailable: true, pricingVersions: [{ id: 'dev-pro-monthly', planId: 'dev-pro', price: '799000', currency: 'تومان', billingPeriod: 'MONTHLY', discount: null, effectiveAt: '2026-09-15T00:00:00.000Z', active: true }] },
  { id: 'dev-api', title: 'API آزمایشی', slug: 'api-preview', features: ['دسترسی نسخه‌بندی‌شده به قیمت‌ها', 'نمایش منبع و زمان دریافت', 'کلید مستقل و محدودیت مصرف', 'مستندات توسعه‌دهندگان'], apiLimits: { daily: 10000 }, active: true, displayOrder: 40, webAvailable: true, mobileAvailable: false, pricingVersions: [{ id: 'dev-api-monthly', planId: 'dev-api', price: '1490000', currency: 'تومان', billingPeriod: 'MONTHLY', discount: null, effectiveAt: '2026-09-15T00:00:00.000Z', active: true }] },
];

async function readLocal(): Promise<StoredPlan[]> {
  try { return JSON.parse(await readFile(file, 'utf8')) as StoredPlan[]; } catch {
    await writeLocal(developmentPlanPresets);
    return developmentPlanPresets;
  }
}
async function writeLocal(plans: StoredPlan[]) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(plans, null, 2), 'utf8');
  await rename(temporary, file);
}
const hydrate = (plan: StoredPlan): ManagedPlan => ({ ...plan, pricingVersions: plan.pricingVersions.map(price => ({ ...price, effectiveAt: new Date(price.effectiveAt) })) });

export async function getManagedPlans() {
  if (useLocal()) return { storage: 'local' as const, plans: (await readLocal()).sort((a, b) => a.displayOrder - b.displayOrder).map(hydrate) };
  const rows = await db.plan.findMany({ orderBy: { displayOrder: 'asc' }, include: { pricingVersions: { orderBy: { effectiveAt: 'desc' } } } });
  return { storage: 'postgresql' as const, plans: rows.map(plan => ({ ...plan, features: Array.isArray(plan.features) ? plan.features.filter((item): item is string => typeof item === 'string') : [], apiLimits: plan.apiLimits as { daily?: number } | null, pricingVersions: plan.pricingVersions.map(price => ({ ...price, price: price.price.toString(), discount: price.discount?.toString() ?? null })) })) };
}

export async function getPublishedPlans() {
  const { plans } = await getManagedPlans();
  const now = Date.now();
  return plans.filter(plan => plan.active && (plan.webAvailable || plan.mobileAvailable)).map(plan => ({ ...plan, pricingVersions: plan.pricingVersions.filter(price => price.active && price.effectiveAt.getTime() <= now).sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime()) }));
}

export async function upsertManagedPlan(id: string, data: PlanWrite) {
  if (!useLocal()) return id ? db.plan.update({ where: { id }, data }) : db.plan.create({ data });
  const plans = await readLocal();
  const index = plans.findIndex(plan => plan.id === id);
  if (index >= 0) plans[index] = { ...plans[index], ...data, apiLimits: data.apiLimits ?? null };
  else plans.push({ ...data, apiLimits: data.apiLimits ?? null, id: randomUUID(), pricingVersions: [] });
  await writeLocal(plans);
}

export async function removeManagedPlan(id: string) {
  if (!useLocal()) return db.plan.delete({ where: { id } });
  await writeLocal((await readLocal()).filter(plan => plan.id !== id));
}

export async function upsertManagedPricing(id: string, data: Omit<ManagedPricing, 'id'>) {
  if (!useLocal()) {
    const dbData = { ...data, price: data.price, discount: data.discount ?? undefined };
    return id ? db.pricingVersion.update({ where: { id }, data: dbData }) : db.pricingVersion.create({ data: dbData });
  }
  const plans = await readLocal();
  const plan = plans.find(item => item.id === data.planId);
  if (!plan) throw new Error('Plan not found');
  const stored: StoredPricing = { ...data, id: id || randomUUID(), effectiveAt: data.effectiveAt.toISOString() };
  const index = plan.pricingVersions.findIndex(price => price.id === id);
  if (index >= 0) plan.pricingVersions[index] = stored; else plan.pricingVersions.push(stored);
  await writeLocal(plans);
}

export async function removeManagedPricing(id: string) {
  if (!useLocal()) return db.pricingVersion.delete({ where: { id } });
  const plans = await readLocal();
  for (const plan of plans) plan.pricingVersions = plan.pricingVersions.filter(price => price.id !== id);
  await writeLocal(plans);
}
