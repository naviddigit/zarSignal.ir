import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

/** Navid delegated launch pricing on 2026-09-22. Idempotent; never overwrites admin edits. */
export async function initializeChartPlans(client: Prisma.TransactionClient = db) {
  const plans = [
    { slug: 'free', title: 'رایگان', price: '0', days: 0, daily: 0, web: true, mobile: true, features: ['قیمت هر ۹ بازار', 'حباب لحظه‌ای طلا و فاصله دلار', 'نمودار ۲۴ ساعت و ماشین‌حساب پایه'] },
    { slug: 'home', title: 'خانگی', price: '149000', days: 30, daily: 0, web: true, mobile: true, features: ['تا ۳۰ روز تاریخچه قیمت و حباب', 'قیمت و درصد حباب روی یک نمودار', 'جزئیات هر کندل و محاسبه همان روز'] },
    { slug: 'professional', title: 'حرفه‌ای', price: '299000', days: 90, daily: 0, web: true, mobile: true, features: ['تا ۹۰ روز تاریخچه قیمت و حباب', 'بررسی بازه‌های ۷، ۳۰ و ۹۰ روز', 'بررسی حباب با روش تاریخی شفاف'] },
    { slug: 'api', title: 'API کسب‌وکار', price: '1490000', days: 0, daily: 10000, web: true, mobile: false, features: ['کلید Bearer نسخه‌بندی‌شده', 'سهمیه روزانه قابل کنترل', 'قیمت با منبع و زمان UTC', 'دسترسی /api/v1/quotes و /api/v1/analysis'] },
  ];
  for (const [index, preset] of plans.entries()) {
      const plan = await client.plan.upsert({ where: { slug: preset.slug }, update: {
        webAvailable: preset.web,
        mobileAvailable: preset.mobile,
        apiLimits: { daily: preset.daily },
      }, create: {
        title: preset.title, slug: preset.slug, features: [...preset.features, ...(preset.days ? [`history:${preset.days}d`] : [])],
        active: true, displayOrder: index * 10, webAvailable: preset.web, mobileAvailable: preset.mobile, apiLimits: { daily: preset.daily },
      } });
      // Existing admin pricing always takes precedence over launch defaults.
      if (await client.pricingVersion.count({where:{planId:plan.id}})) continue;
      await client.pricingVersion.upsert({ where: { id: `launch-20260922-${preset.slug}-monthly` }, update: {}, create: {
        id: `launch-20260922-${preset.slug}-monthly`, planId: plan.id, price: preset.price, currency: 'تومان', billingPeriod: 'MONTHLY', effectiveAt: new Date('2026-09-22T00:00:00Z'), active: true,
      } });
  }
  return { plans: plans.map(p => ({ slug: p.slug, price: p.price, historyDays: p.days, apiDaily: p.daily })) };
}
