import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowUpLeft, Clock3 } from 'lucide-react';
import { getPublishedPlans, type BillingPeriod } from '@/server/plans';
import { trialPolicy } from '@/server/analysis-trial';
import { planHistoryDays } from '@/lib/history-access';
export const metadata: Metadata = { title: 'پلن‌ها و اشتراک', alternates: { canonical: '/pricing' } };
export const dynamic = 'force-dynamic';
const periods: Record<BillingPeriod,string> = {MONTHLY:'ماهانه',QUARTERLY:'سه‌ماهه',YEARLY:'سالانه',ONE_TIME:'یک‌باره'};
export default async function Pricing() {
  const plans = await getPublishedPlans();
  const trial = await trialPolicy();
  return <main id="main" className="shell content-page membership-page"><header className="membership-intro"><span className="eyebrow">پلن‌های زرسیگنال</span><h1>از دیدن قیمت تا بررسی روند</h1><p>قیمت‌ها و ابزارهای پایه رایگان‌اند. برای بررسی گذشته بازار، بازه تاریخچه مناسب خود را انتخاب کنید.</p></header>
  {trial.enabled && trial.available && <aside className="membership-trial"><Clock3 size={20}/><div><strong>{new Intl.NumberFormat('fa-IR').format(trial.hours % 24 === 0 ? trial.hours/24 : trial.hours)} {trial.hours % 24 === 0 ? 'روز' : 'ساعت'} فرصت بررسی رایگان</strong><p>یک بار برای هر حساب؛ شروع دوره با انتخاب خودتان.</p></div><Link href="/analysis/gold_melted">بررسی دسترسی آزمایشی ←</Link></aside>}
  <div className="membership-grid">{plans.map(plan=>{
    const price=plan.pricingVersions[0]; const free=price && Number(price.price)===0; const days=planHistoryDays(plan.features);
    return <article className={`membership-card ${plan.slug==='home'?'is-highlighted':''}`} key={plan.id}>
    <header><span className="membership-audience">{free?'برای شروع':days>=90?'برای بررسی بلندمدت':'برای پیگیری روزانه'}</span><h2>{plan.title}</h2></header>
    <div className="membership-price">{price?<><strong>{free?'رایگان':new Intl.NumberFormat('fa-IR').format(Number(price.price))}</strong>{!free && <span>{price.currency} / {periods[price.billingPeriod]}</span>}</>:<span>قیمت در انتظار انتشار</span>}</div>
    <p className="membership-history">تاریخچه قابل دسترسی <b>{days?new Intl.NumberFormat('fa-IR').format(days)+' روز':'۲۴ ساعت'}</b></p>
    <ul>{plan.features.filter(feature=>!feature.startsWith('history:')).map(feature=><li key={feature}><Check size={16}/><span>{feature}</span></li>)}</ul>
    <Link className={free?'button membership-secondary':'button'} href={free?'/markets':`/subscribe/${plan.slug}`}>{free?'شروع رایگان':`بررسی پلن ${plan.title}`}<ArrowUpLeft size={16}/></Link>
    </article>;
  })}</div>
  {!plans.length && <p className="panel">پلن‌ها هنوز منتشر نشده‌اند. قیمت‌ها و ماشین‌حساب در دسترس شما هستند.</p>}
  <section className="membership-clarity"><h2>پیش از انتخاب بدانید</h2><p>بازه تاریخچه، سقف دسترسی است؛ فقط روزهایی نمایش داده می‌شوند که داده معتبر ثبت شده باشد. اشتراک تضمین سود یا سیگنال خرید و فروش نیست.</p><p>پرداخت آنلاین هنوز فعال نشده است. انتخاب پلن، هیچ مبلغی از حساب شما کم نمی‌کند.</p><Link href="/markets">مشاهده امکانات رایگان ←</Link></section></main>;
}
