import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowUpLeft, Minus } from 'lucide-react';
import { getPublishedPlans, type BillingPeriod, type ManagedPlan } from '@/server/plans';
import { trialPolicy } from '@/server/analysis-trial';
import { planHistoryDays } from '@/lib/history-access';

export const metadata: Metadata = {
  title: 'پلن‌ها و اشتراک',
  description: 'پلن رایگان، تاریخچه بازار و API زرسیگنال — مقایسه شفاف امکانات.',
  alternates: { canonical: '/pricing' },
};
export const dynamic = 'force-dynamic';

const periods: Record<BillingPeriod, string> = {
  MONTHLY: 'ماهانه',
  QUARTERLY: 'سه‌ماهه',
  YEARLY: 'سالانه',
  ONE_TIME: 'یک‌باره',
};

type TierKind = 'free' | 'home' | 'pro' | 'api';

type TierView = {
  kind: TierKind;
  title: string;
  pitch: string;
  popular?: boolean;
  plan?: ManagedPlan;
  fallbackFeatures: string[];
  cta: { href: string; label: string; secondary?: boolean };
  priceLabel: string;
  priceHint: string;
  metric: string;
};

function isApiPlan(plan: ManagedPlan) {
  return /api/i.test(plan.slug) || /api/i.test(plan.title);
}

function money(plan?: ManagedPlan) {
  const price = plan?.pricingVersions[0];
  if (!price) return null;
  return price;
}

function buildTiers(plans: ManagedPlan[]): TierView[] {
  const free = plans.find(p => !isApiPlan(p) && Number(p.pricingVersions[0]?.price ?? 1) === 0);
  const history = plans.filter(p => !isApiPlan(p) && Number(p.pricingVersions[0]?.price ?? 0) > 0)
    .sort((a, b) => planHistoryDays(a.features) - planHistoryDays(b.features));
  const api = plans.find(isApiPlan);
  const home = history.find(p => planHistoryDays(p.features) <= 30) ?? history[0];
  const pro = history.find(p => p.id !== home?.id && planHistoryDays(p.features) >= 60)
    ?? history.find(p => p.id !== home?.id)
    ?? home;

  const freePrice = money(free);
  const homePrice = money(home);
  const proPrice = money(pro);
  const apiPrice = money(api);

  return [
    {
      kind: 'free',
      title: free?.title?.replace(/آزمایشی/g, '').trim() || 'رایگان',
      pitch: 'برای دنبال‌کردن قیمت و محاسبهٔ روزمره.',
      plan: free,
      priceLabel: '۰',
      priceHint: 'تومان / همیشه',
      metric: 'تاریخچه ۲۴ ساعت',
      fallbackFeatures: [
        'تابلوی قیمت با زمان دریافت',
        'حباب طلا و فاصله دلار',
        'ماشین‌حساب وزن، مظنه و عیار',
        'نمودار ۲۴ ساعت',
      ],
      cta: { href: '/markets', label: 'شروع با بازار', secondary: true },
    },
    {
      kind: 'home',
      title: home?.title?.replace(/آزمایشی/g, '').trim() || 'خانگی',
      pitch: 'برای پیگیری روند هفتگی و ماهانه.',
      popular: true,
      plan: home,
      priceLabel: homePrice ? new Intl.NumberFormat('fa-IR').format(Number(homePrice.price)) : '۱۴۹٬۰۰۰',
      priceHint: homePrice ? `${homePrice.currency} / ${periods[homePrice.billingPeriod]}` : 'تومان / ماهانه',
      metric: `تاریخچه تا ${new Intl.NumberFormat('fa-IR').format(planHistoryDays(home?.features ?? ['history:30d']) || 30)} روز`,
      fallbackFeatures: [
        'همه امکانات رایگان',
        'تاریخچه قیمت و حباب',
        'نمودار ۷ و ۳۰ روز',
        'جزئیات کندل روزانه',
      ],
      cta: { href: home ? `/subscribe/${home.slug}` : '/subscribe/home', label: 'انتخاب پلن خانگی' },
    },
    {
      kind: 'pro',
      title: pro?.title?.replace(/آزمایشی/g, '').trim() || 'حرفه‌ای',
      pitch: 'برای بررسی بازه‌های بلند و مقایسه عمیق‌تر.',
      plan: pro,
      priceLabel: proPrice ? new Intl.NumberFormat('fa-IR').format(Number(proPrice.price)) : '۲۹۹٬۰۰۰',
      priceHint: proPrice ? `${proPrice.currency} / ${periods[proPrice.billingPeriod]}` : 'تومان / ماهانه',
      metric: `تاریخچه تا ${new Intl.NumberFormat('fa-IR').format(planHistoryDays(pro?.features ?? ['history:90d']) || 90)} روز`,
      fallbackFeatures: [
        'همه امکانات خانگی',
        'بازه ۹۰ روز',
        'مقایسه روند بلندمدت',
        'اولویت در به‌روزرسانی ابزارها',
      ],
      cta: { href: pro ? `/subscribe/${pro.slug}` : '/subscribe/professional', label: 'انتخاب پلن حرفه‌ای' },
    },
    {
      kind: 'api',
      title: api?.title?.replace(/آزمایشی/g, '').trim() || 'API',
      pitch: 'برای اتصال داده به محصول، ربات یا داشبورد.',
      plan: api,
      priceLabel: apiPrice ? (Number(apiPrice.price) === 0 ? 'سفارشی' : new Intl.NumberFormat('fa-IR').format(Number(apiPrice.price))) : '۱٬۴۹۰٬۰۰۰',
      priceHint: apiPrice && Number(apiPrice.price) > 0 ? `${apiPrice.currency} / ${periods[apiPrice.billingPeriod]}` : 'تومان / ماهانه یا قرارداد',
      metric: api?.apiLimits?.daily
        ? `${new Intl.NumberFormat('fa-IR').format(api.apiLimits.daily)} درخواست / روز`
        : '۱۰٬۰۰۰ درخواست / روز',
      fallbackFeatures: [
        'کلید Bearer نسخه‌بندی‌شده',
        'GET /api/v1/quotes',
        'سهمیه روزانه قابل کنترل',
        'منبع و زمان UTC در پاسخ',
      ],
      cta: { href: api ? `/subscribe/${api.slug}` : '/developers', label: api ? 'دریافت دسترسی API' : 'مشاهده مستندات' },
    },
  ];
}

const compareRows: { label: string; values: Record<TierKind, string | boolean> }[] = [
  { label: 'قیمت زنده بازار', values: { free: true, home: true, pro: true, api: true } },
  { label: 'حباب طلا و فاصله دلار', values: { free: true, home: true, pro: true, api: true } },
  { label: 'ماشین‌حساب فعال', values: { free: true, home: true, pro: true, api: false } },
  { label: 'نمودار ۲۴ ساعت', values: { free: true, home: true, pro: true, api: false } },
  { label: 'تاریخچه ۷–۳۰ روز', values: { free: false, home: true, pro: true, api: false } },
  { label: 'تاریخچه ۹۰ روز', values: { free: false, home: false, pro: true, api: false } },
  { label: 'کلید و سهمیه API', values: { free: false, home: false, pro: false, api: true } },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'string') return <span className="pricing-cell-text">{value}</span>;
  return value
    ? <Check size={16} className="pricing-cell-yes" aria-label="دارد" />
    : <Minus size={16} className="pricing-cell-no" aria-label="ندارد" />;
}

export default async function Pricing() {
  const [plans, trial] = await Promise.all([getPublishedPlans(), trialPolicy()]);
  const tiers = buildTiers(plans);
  const trialDays = trial.enabled && trial.available
    ? (trial.hours % 24 === 0 ? trial.hours / 24 : trial.hours)
    : null;
  const trialUnit = trial.hours % 24 === 0 ? 'روز' : 'ساعت';

  return (
    <main id="main" className="shell content-page membership-page pricing-page">
      <header className="pricing-hero">
        <span className="eyebrow">پلن‌ها</span>
        <h1>دسترسی مناسب کارتان را انتخاب کنید</h1>
        <p>
          زرسیگنال قیمت و محاسبه را شفاف نگه می‌دارد.
          پلن‌ها فقط عمق تاریخچه یا اتصال API را گسترش می‌دهند — نه سیگنال خرید و فروش.
        </p>
      </header>

      <section className="pricing-grid" aria-label="مقایسه پلن‌ها">
        {tiers.map(tier => {
          const features = (tier.plan?.features.filter(f => !f.startsWith('history:'))?.length
            ? tier.plan!.features.filter(f => !f.startsWith('history:'))
            : tier.fallbackFeatures);
          return (
            <article key={tier.kind} className={`pricing-card${tier.popular ? ' is-popular' : ''}${tier.kind === 'api' ? ' is-api' : ''}`}>
              {tier.popular ? <span className="pricing-badge">پرکاربرد</span> : null}
              <header className="pricing-card__head">
                <h2>{tier.title}</h2>
                <p>{tier.pitch}</p>
              </header>
              <div className="pricing-card__price">
                <strong>{tier.priceLabel}</strong>
                <span>{tier.priceHint}</span>
              </div>
              <p className="pricing-card__metric">{tier.metric}</p>
              <Link className={`button${tier.cta.secondary ? ' membership-secondary' : ''}`} href={tier.cta.href}>
                {tier.cta.label}
                <ArrowUpLeft size={16} />
              </Link>
              <div className="pricing-card__includes">
                <span>شامل</span>
                <ul>
                  {features.map(feature => (
                    <li key={feature}><Check size={14} aria-hidden="true" /><span>{feature}</span></li>
                  ))}
                </ul>
              </div>
              {tier.kind === 'api' ? (
                <Link className="pricing-card__more" href="/developers">مستندات فنی API ←</Link>
              ) : null}
            </article>
          );
        })}
      </section>
      <p className="pricing-swipe-hint" aria-hidden="true">پلن‌ها را به چپ و راست بکشید</p>

      {trialDays != null && (
        <aside className="pricing-trial">
          <div>
            <strong>{new Intl.NumberFormat('fa-IR').format(trialDays)} {trialUnit} بررسی تاریخچه</strong>
            <p>یک‌بار برای هر حساب؛ برای ارزیابی بازه‌های بلندتر قبل از انتخاب پلن.</p>
          </div>
          <Link href="/analysis/gold_melted">شروع دوره آزمایشی ←</Link>
        </aside>
      )}

      <section className="pricing-compare" aria-label="جدول مقایسه امکانات">
        <header>
          <h2>مقایسه امکانات</h2>
          <p>برای دیدن همه پلن‌ها جدول را به چپ و راست بکشید.</p>
        </header>
        <div className="pricing-compare__scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">امکانات</th>
                {tiers.map(tier => <th scope="col" key={tier.kind}>{tier.title}</th>)}
              </tr>
            </thead>
            <tbody>
              {compareRows.map(row => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {tiers.map(tier => (
                    <td key={tier.kind}><Cell value={row.values[tier.kind]} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pricing-footnotes">
        <p>اشتراک، تضمین سود یا توصیه معامله نیست. عدد حباب اختلاف قیمت است.</p>
        <p>پرداخت آنلاین هنوز فعال نشده؛ انتخاب پلن فعلاً مبلغی کم نمی‌کند.</p>
        <Link href="/markets">بازگشت به بازار ←</Link>
      </section>
    </main>
  );
}
