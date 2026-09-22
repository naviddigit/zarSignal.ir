import { db } from '@/lib/db';

/** Navid delegated launch pricing on 2026-09-22. Idempotent; never overwrites admin edits. */
export async function initializeChartPlans() {
  const plans = [
    { slug: 'free', title: 'رایگان', price: '0', days: 0, features: ['قیمت هر ۹ بازار', 'حباب لحظه‌ای طلا و فاصله دلار', 'نمودار ۲۴ ساعت و ماشین‌حساب پایه'] },
    { slug: 'home', title: 'خانگی', price: '149000', days: 30, features: ['تا ۳۰ روز تاریخچه قیمت و حباب', 'قیمت و درصد حباب روی یک نمودار', 'جزئیات هر کندل و محاسبه همان روز'] },
    { slug: 'professional', title: 'حرفه‌ای', price: '299000', days: 90, features: ['تا ۹۰ روز تاریخچه قیمت و حباب', 'بررسی بازه‌های ۷، ۳۰ و ۹۰ روز', 'بررسی حباب با روش تاریخی شفاف'] },
  ];
  for (const [index, preset] of plans.entries()) {
    await db.$transaction(async tx => {
      const plan = await tx.plan.upsert({ where: { slug: preset.slug }, update: {}, create: {
        title: preset.title, slug: preset.slug, features: [...preset.features, ...(preset.days ? [`history:${preset.days}d`] : [])],
        active: true, displayOrder: index * 10, webAvailable: true, mobileAvailable: false, apiLimits: { daily: 0 },
      } });
      await tx.pricingVersion.upsert({ where: { id: `launch-20260922-${preset.slug}-monthly` }, update: {}, create: {
        id: `launch-20260922-${preset.slug}-monthly`, planId: plan.id, price: preset.price, currency: 'تومان', billingPeriod: 'MONTHLY', effectiveAt: new Date('2026-09-22T00:00:00Z'), active: true,
      } });
    });
  }
  return { plans: plans.map(p => ({ slug: p.slug, price: p.price, historyDays: p.days })) };
}
