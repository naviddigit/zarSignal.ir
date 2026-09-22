import { planHistoryDays } from '@/lib/history-access';
import { PendingButton } from '@/components/pending-button';
import { Checkbox } from '@/components/ui/checkbox';
import { getManagedPlans, type ManagedPlan, type ManagedPricing } from '@/server/plans';
import { deletePlan, deletePricing, savePlan, savePricing } from './actions';

const periods = { MONTHLY: 'ماهانه', QUARTERLY: 'سه‌ماهه', YEARLY: 'سالانه', ONE_TIME: 'یک‌باره' } as const;

export default async function PlansAdmin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { plans, storage } = await getManagedPlans();
  return <>
    <header className="admin-title"><div><span className="eyebrow">PLANS & PRICING</span><h1>تعرفه‌ها و نسخه‌های قیمت</h1><p>هر قیمت فقط با تصمیم مدیر ثبت و منتشر می‌شود.</p></div><span className={`admin-badge ${storage === 'local' ? 'local' : 'connected'}`}>{storage === 'local' ? 'ذخیره محلی توسعه' : 'PostgreSQL متصل'}</span></header>
    {storage === 'local' && <p className="admin-message is-ok">چهار تعرفهٔ آزمایشی برای تست ساخته شده‌اند. قیمت‌های آن‌ها تصمیم تجاری نهایی نیست و هنگام استقرار باید در PostgreSQL بازبینی شوند.</p>}
    {error && <p className="form-error" role="alert">اطلاعات فرم معتبر نبود؛ ورودی‌ها را بررسی کنید.</p>}
    <section className="admin-card"><h2>پلن جدید</h2><p>ابتدا عنوان، slug انگلیسی و حداقل یک ویژگی را وارد کنید. سپس قیمت و تاریخ اجرای آن را در کارت همان پلن اضافه کنید.</p><PlanForm/></section>
    <div className="plan-admin-list">{plans.map(plan => <article className="admin-card" key={plan.id}><h2>{plan.title}</h2><PlanForm plan={plan}/><h3>نسخه‌های قیمت</h3>{plan.pricingVersions.map(price => <PricingForm key={price.id} price={price} planId={plan.id}/>)}<PricingForm planId={plan.id}/><form action={deletePlan}><input type="hidden" name="id" value={plan.id}/><PendingButton className="danger-button" pendingText="در حال حذف…">حذف پلن</PendingButton></form></article>)}</div>
  </>;
}

function PlanForm({ plan }: { plan?: ManagedPlan }) {
  return <form action={savePlan} className="admin-form-grid">
    {plan && <input type="hidden" name="id" value={plan.id}/>}<label>عنوان<input name="title" defaultValue={plan?.title} required/></label><label>slug<input name="slug" dir="ltr" defaultValue={plan?.slug} pattern="[a-z0-9-]+" required/></label><label>ترتیب نمایش<input name="displayOrder" type="number" min="0" defaultValue={plan?.displayOrder ?? 0} required/></label><label>سقف روزانه API<input name="apiDailyLimit" type="number" min="0" defaultValue={plan?.apiLimits?.daily}/></label><label>تاریخچه اشتراک<select name="historyDays" defaultValue={planHistoryDays(plan?.features)}><option value="0">فقط ۲۴ ساعت رایگان</option><option value="7">۷ روز</option><option value="30">۳۰ روز</option><option value="90">۹۰ روز</option></select></label><label className="wide">ویژگی‌ها، هر خط یک مورد<textarea name="features" rows={4} defaultValue={plan?.features.filter(f => !f.startsWith('history:')).join('\n') ?? ''} required/></label><Checkbox name="active" label="فعال" defaultChecked={plan?.active}/><Checkbox name="webAvailable" label="وب" defaultChecked={plan?.webAvailable ?? true}/><Checkbox name="mobileAvailable" label="موبایل" defaultChecked={plan?.mobileAvailable}/><PendingButton pendingText="در حال ذخیره…">{plan ? 'ذخیره تغییرات' : 'ساخت پلن'}</PendingButton>
  </form>;
}

function PricingForm({ planId, price }: { planId: string; price?: ManagedPricing }) {
  const date = price?.effectiveAt ? price.effectiveAt.toISOString().slice(0, 16) : '';
  return <form action={savePricing} className="pricing-admin-form"><input type="hidden" name="planId" value={planId}/>{price && <input type="hidden" name="id" value={price.id}/>}<input aria-label="قیمت" name="price" type="number" min="0" placeholder="قیمت" defaultValue={price?.price} required/><input aria-label="ارز" name="currency" dir="ltr" placeholder="IRT" defaultValue={price?.currency ?? 'IRT'} required/><select aria-label="دوره پرداخت" name="billingPeriod" defaultValue={price?.billingPeriod ?? 'MONTHLY'}>{Object.entries(periods).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input aria-label="تخفیف" name="discount" type="number" min="0" max="100" step="0.01" placeholder="تخفیف %" defaultValue={price?.discount ?? undefined}/><input aria-label="تاریخ اجرا" name="effectiveAt" type="datetime-local" defaultValue={date} required/><Checkbox name="active" label="فعال" defaultChecked={price?.active}/><PendingButton className="small-action" pendingText="…">{price ? 'ذخیره' : 'افزودن قیمت'}</PendingButton>{price && <button className="danger-button" formAction={deletePricing} type="submit">حذف</button>}</form>;
}
