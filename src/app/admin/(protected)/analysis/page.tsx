import { CheckCircle2, ChevronDown, FlaskConical, History, ShieldAlert } from 'lucide-react';
import { PendingButton } from '@/components/pending-button';
import { formulaCatalog, getManagedFormulas, type FormulaKey, type ManagedFormula } from '@/server/formulas';
import { saveFormula } from './actions';

const statusLabel = { DRAFT: 'پیش‌نویس', REVIEW: 'در حال بررسی', APPROVED: 'تأییدشده', ARCHIVED: 'بایگانی' } as const;
const date = (value: Date | null) => value ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(value) : 'بدون تاریخ اجرا';

export default async function AdminAnalysis({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ formulas, storage }, message] = await Promise.all([getManagedFormulas(), searchParams]);
  return <>
    <header className="admin-title"><div><span className="eyebrow">FORMULA GOVERNANCE</span><h1>فرمول‌های طلا، نقره و دلار</h1><p>نسخه، ورودی‌ها، واحدها و نمونهٔ مرجع را ثبت کنید. هیچ فرمولی مستقیم و بدون بررسی اجرا نمی‌شود.</p></div><span className={`admin-badge ${storage === 'local' ? 'local' : 'connected'}`}>{storage === 'local' ? 'ذخیره محلی توسعه' : 'PostgreSQL متصل'}</span></header>
    {message.ok && <p className="admin-message is-ok">نسخهٔ جدید فرمول ذخیره شد.</p>}
    {message.error && <p className="form-error admin-message" role="alert">{message.error === 'duplicate' ? 'این شماره نسخه قبلاً ثبت شده است؛ نسخهٔ بعدی را وارد کنید.' : 'اطلاعات فرمول کامل یا معتبر نیست. فرمول تأییدشده باید تاریخ اجرا و نمونهٔ مرجع داشته باشد.'}</p>}
    <aside className="formula-safety panel"><ShieldAlert size={21}/><div><strong>این بخش محل مدیریت سه کارت صفحهٔ اصلی است.</strong><p>عبارت فرمول به‌عنوان specification نسخه‌بندی‌شده ذخیره می‌شود. فعال‌شدن عدد حباب به تست خودکار و اتصال موتور محاسبه نیاز دارد.</p></div></aside>
    <div className="formula-admin-grid">{(Object.keys(formulaCatalog) as FormulaKey[]).map(key => <FormulaCard key={key} formulaKey={key} formulas={formulas.filter(item => item.key === key)}/>)}</div>
  </>;
}

function FormulaCard({ formulaKey, formulas }: { formulaKey: FormulaKey; formulas: ManagedFormula[] }) {
  const current = formulas[0];
  const catalog = formulaCatalog[formulaKey];
  return <details className="admin-card formula-card" open={formulaKey === 'GOLD_BUBBLE'}>
    <summary className="formula-card__head"><div><span className="formula-market" dir="ltr">{catalog.marketSymbol}</span><h2>{catalog.title}</h2></div><span className="formula-head-actions">{current ? <span className={`formula-status is-${current.status.toLowerCase()}`}>{statusLabel[current.status]} · v{current.version}</span> : <span className="formula-status">ثبت نشده</span>}<ChevronDown size={18}/></span></summary>
    <div className="formula-card__body">
    <form action={saveFormula} className="formula-form">
      <input type="hidden" name="key" value={formulaKey}/>
      <div className="formula-form__row"><label>عنوان<input name="title" defaultValue={catalog.title} required/></label><label>نسخه<input name="version" type="number" min="1" defaultValue={(current?.version ?? 0) + 1} required dir="ltr"/></label></div>
      <label>شرح قابل فهم<textarea name="description" rows={2} placeholder="این فرمول چه چیزی را محاسبه می‌کند و محدودیتش چیست؟" required/></label>
      <label>عبارت دقیق فرمول<textarea name="expression" rows={3} dir="ltr" placeholder="Example: (market_price - theoretical_price) / theoretical_price * 100" required/></label>
      <div className="formula-form__columns"><label>ورودی‌ها؛ هر خط یک مورد<textarea name="inputs" rows={4} dir="ltr" required/></label><label>واحد هر ورودی؛ هر خط یک مورد<textarea name="units" rows={4} dir="ltr" required/></label></div>
      <label>ثابت‌ها؛ هر خط یک مورد<textarea name="constants" rows={2} dir="ltr" placeholder="نام = مقدار = منبع"/></label>
      <label>قاعدهٔ گردکردن<input name="rounding" placeholder="تعداد رقم اعشار و روش گردکردن" required/></label>
      <div className="formula-form__columns"><label>حالت‌های مرزی؛ هر خط یک مورد<textarea name="edgeCases" rows={3} required/></label><label>نمونهٔ مرجع؛ هر خط ورودی و خروجی مورد انتظار<textarea name="fixtures" rows={3} dir="ltr"/></label></div>
      <div className="formula-form__row"><label>وضعیت<select name="status" defaultValue="DRAFT"><option value="DRAFT">پیش‌نویس</option><option value="REVIEW">در حال بررسی</option><option value="APPROVED">تأییدشده</option><option value="ARCHIVED">بایگانی</option></select></label><label>تاریخ اجرا<input name="effectiveAt" type="datetime-local" dir="ltr"/></label></div>
      <PendingButton pendingText="در حال ثبت نسخه…"><FlaskConical size={16}/> ثبت نسخهٔ جدید</PendingButton>
    </form>
      <div className="formula-history"><h3><History size={16}/> تاریخچه</h3>{formulas.length ? formulas.slice(0, 5).map(item => <div key={item.id}><span><CheckCircle2 size={14}/> نسخه {item.version} · {statusLabel[item.status]}</span><time>{date(item.effectiveAt)}</time></div>) : <p>هنوز نسخه‌ای ثبت نشده است.</p>}</div>
    </div>
  </details>;
}
