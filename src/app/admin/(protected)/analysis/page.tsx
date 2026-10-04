import { CheckCircle2, ChevronDown, FlaskConical, History, ShieldAlert } from 'lucide-react';
import { PendingButton } from '@/components/pending-button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { formatPrice, instruments, type Quote, type Snapshot } from '@/lib/market';
import { getSnapshot } from '@/server/quotes';
import { formulaCatalog, getManagedFormulas, type FormulaKey, type ManagedFormula } from '@/server/formulas';
import {
  buildMasterCapabilityMatrix,
  canMarketOpportunityEngine,
} from '@/lib/master-capability-matrix';
import { assessMlReadiness } from '@/lib/ml-readiness';
import { saveFormula } from './actions';

const statusLabel = { DRAFT: 'پیش‌نویس', REVIEW: 'در حال بررسی', APPROVED: 'تأییدشده', ARCHIVED: 'بایگانی' } as const;
const presenceLabel = {
  present: 'موجود',
  partial: 'ناقص / جزئی',
  absent: 'غایب',
  source_required: 'SOURCE_REQUIRED',
} as const;
const date = (value: Date | null) => value
  ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(value)
  : 'بدون تاریخ اجرا';

const EMPTY_SNAPSHOT: Snapshot = { mode: 'demo', status: 'unavailable', quotes: [] };

export default async function AdminAnalysis({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const message = await searchParams;

  let formulas: ManagedFormula[] = [];
  let storage: 'local' | 'postgresql' | 'unavailable' = 'unavailable';
  try {
    const managed = await getManagedFormulas();
    formulas = managed.formulas;
    storage = managed.storage;
  } catch {
    storage = 'unavailable';
  }

  let snapshot: Snapshot = EMPTY_SNAPSHOT;
  try {
    snapshot = await getSnapshot();
  } catch {
    snapshot = EMPTY_SNAPSHOT;
  }

  const masterMatrix = buildMasterCapabilityMatrix();
  const ml = assessMlReadiness();

  return (
    <>
      <header className="admin-title">
        <div>
          <span className="eyebrow">FORMULA GOVERNANCE</span>
          <h1>فرمول‌های طلا، نقره و دلار</h1>
          <p>نسخه، ورودی‌ها، واحدها و نمونهٔ مرجع را ثبت کنید. هیچ فرمولی مستقیم و بدون بررسی اجرا نمی‌شود.</p>
        </div>
        <span className={`admin-badge ${storage === 'unavailable' ? 'local' : storage === 'local' ? 'local' : 'connected'}`}>
          {storage === 'unavailable' ? 'پایگاه داده در دسترس نیست' : storage === 'local' ? 'ذخیره محلی توسعه' : 'PostgreSQL متصل'}
        </span>
      </header>

      {storage === 'unavailable' ? (
        <p className="form-error admin-message" role="alert">
          اتصال پایگاه داده برقرار نیست؛ تاریخچهٔ فرمول‌ها خوانده نشد. صفحه باز مانده تا پس از اتصال DB بتوانید نسخه ثبت کنید.
        </p>
      ) : null}
      {message.ok && <p className="admin-message is-ok">نسخهٔ جدید فرمول ذخیره شد.</p>}
      {message.error && (
        <p className="form-error admin-message" role="alert">
          {message.error === 'duplicate'
            ? 'این شماره نسخه قبلاً ثبت شده است؛ نسخهٔ بعدی را وارد کنید.'
            : 'اطلاعات فرمول کامل یا معتبر نیست. فرمول تأییدشده باید تاریخ اجرا و نمونهٔ مرجع داشته باشد.'}
        </p>
      )}

      <section className="admin-card">
        <h2>ماتریس تطبیق با Master (صادقانه)</h2>
        <p>
          فایل Master V5.7 در مخزن نیست؛ قواعد مفقود از نمونهٔ چت حدس زده نمی‌شود. فرصت‌یابی مشتری:{' '}
          {canMarketOpportunityEngine() ? 'فعال' : 'وعده داده نمی‌شود (موتور غیرفعال).'}
        </p>
        <div className="formula-live__grid">
          {masterMatrix.map(row => (
            <article key={row.area}>
              <strong>{row.area}</strong>
              <span>{presenceLabel[row.status]}</span>
              <em>{row.note}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>وضعیت ماشین‌لرنینگ</h2>
        <p><strong>توصیه:</strong> {ml.recommendation === 'do_not_ship' ? 'مدل به مشتری ارسال نشود' : 'فقط آزمایش آفلاین'}</p>
        <ul>
          <li>تاریخچه: {ml.historyAvailable}</li>
          <li>{ml.dataQuality}</li>
          <li>هدف پیش‌بینی: {ml.predictionTarget ?? 'تعریف نشده'}</li>
          <li>برچسب نتیجه: {ml.outcomeLabels ?? 'تعریف نشده'}</li>
          <li>{ml.temporalEval}</li>
          <li>{ml.vsBaseline}</li>
          {ml.notes.map(note => <li key={note}>{note}</li>)}
        </ul>
      </section>

      <aside className="formula-safety panel">
        <ShieldAlert size={21} />
        <div>
          <strong>قیمت‌ها را اینجا دستی وارد نکنید.</strong>
          <p>منابع موردنیاز را انتخاب کنید؛ مقدار خرید و فروش هر نماد هنگام محاسبه از آخرین snapshot بازار خوانده می‌شود. فقط خود فرمول، قواعد و نمونهٔ مرجع را مدیر ثبت می‌کند.</p>
        </div>
      </aside>

      <LiveInputs quotes={snapshot.quotes} />
      <div className="formula-admin-grid">
        {(Object.keys(formulaCatalog) as FormulaKey[]).map(key => (
          <FormulaCard
            key={key}
            formulaKey={key}
            formulas={formulas.filter(item => item.key === key)}
            quotes={snapshot.quotes}
            canSave={storage !== 'unavailable'}
          />
        ))}
      </div>
    </>
  );
}

function LiveInputs({ quotes }: { quotes: Quote[] }) {
  return (
    <section className="admin-card formula-live">
      <div>
        <span className="eyebrow">LIVE INPUTS</span>
        <h2>ورودی‌های قابل انتخاب</h2>
      </div>
      <div className="formula-live__grid">
        {instruments.map(instrument => {
          const quote = quotes.find(item => item.symbol === instrument.symbol);
          return (
            <article key={instrument.symbol}>
              <strong>{instrument.name}</strong>
              <small dir="ltr">{instrument.symbol}</small>
              {quote ? (
                <>
                  <span>فروش: {formatPrice(quote.sell, quote.currency)}</span>
                  <span>خرید: {formatPrice(quote.buy, quote.currency)}</span>
                  <em>{quote.source}</em>
                </>
              ) : (
                <span className="form-error">داده دریافت نشده</span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FormulaCard({
  formulaKey,
  formulas,
  quotes,
  canSave,
}: {
  formulaKey: FormulaKey;
  formulas: ManagedFormula[];
  quotes: Quote[];
  canSave: boolean;
}) {
  const current = formulas[0];
  const catalog = formulaCatalog[formulaKey];
  return (
    <details className="admin-card formula-card" open={formulaKey === 'GOLD_BUBBLE'}>
      <summary className="formula-card__head">
        <div>
          <span className="formula-market" dir="ltr">{catalog.marketSymbol}</span>
          <h2>{catalog.title}</h2>
        </div>
        <span className="formula-head-actions">
          {current ? (
            <span className={`formula-status is-${current.status.toLowerCase()}`}>
              {statusLabel[current.status]} · v{current.version}
            </span>
          ) : (
            <span className="formula-status">ثبت نشده</span>
          )}
          <ChevronDown size={18} />
        </span>
      </summary>
      <div className="formula-card__body">
        {!canSave ? (
          <p className="form-error" role="status">ثبت نسخه تا اتصال پایگاه داده ممکن نیست.</p>
        ) : null}
        <form action={saveFormula} className="formula-form">
          <input type="hidden" name="key" value={formulaKey} />
          <div className="formula-form__row">
            <label>عنوان<input name="title" defaultValue={catalog.title} required disabled={!canSave} /></label>
            <label>نسخه<input name="version" type="number" min="1" defaultValue={(current?.version ?? 0) + 1} required dir="ltr" disabled={!canSave} /></label>
          </div>
          <label>شرح قابل فهم<textarea name="description" rows={2} placeholder="این فرمول چه چیزی را محاسبه می‌کند و محدودیتش چیست؟" required disabled={!canSave} /></label>
          <label>عبارت دقیق فرمول<textarea name="expression" rows={3} dir="ltr" placeholder="Example: (market_price - theoretical_price) / theoretical_price * 100" required disabled={!canSave} /></label>
          <fieldset className="formula-source-picker">
            <legend>منابع زندهٔ موردنیاز فرمول</legend>
            <p>هر سمت قیمتی که در عبارت استفاده شده را انتخاب کنید. واحدها از کاتالوگ بازار ثبت می‌شوند.</p>
            <div>
              {instruments.map(instrument => {
                const quote = quotes.find(item => item.symbol === instrument.symbol);
                return (
                  <section key={instrument.symbol}>
                    <strong>{instrument.name} <small dir="ltr">{instrument.symbol}</small></strong>
                    <Checkbox name="inputs" value={`${instrument.symbol}.sell`} label="فروش" description={quote ? formatPrice(quote.sell, quote.currency) : 'داده ندارد'} defaultChecked={current?.inputs.includes(`${instrument.symbol}.sell`)} disabled={!canSave} />
                    <Checkbox name="inputs" value={`${instrument.symbol}.buy`} label="خرید" description={quote ? formatPrice(quote.buy, quote.currency) : 'داده ندارد'} defaultChecked={current?.inputs.includes(`${instrument.symbol}.buy`)} disabled={!canSave} />
                  </section>
                );
              })}
            </div>
          </fieldset>
          <label>ثابت‌ها؛ هر خط یک مورد<textarea name="constants" rows={2} dir="ltr" placeholder="نام = مقدار = منبع" disabled={!canSave} /></label>
          <label>قاعدهٔ گردکردن<input name="rounding" placeholder="تعداد رقم اعشار و روش گردکردن" required disabled={!canSave} /></label>
          <div className="formula-form__columns">
            <label>حالت‌های مرزی؛ هر خط یک مورد<textarea name="edgeCases" rows={3} required disabled={!canSave} /></label>
            <label>نمونهٔ مرجع؛ هر خط ورودی و خروجی مورد انتظار<textarea name="fixtures" rows={3} dir="ltr" disabled={!canSave} /></label>
          </div>
          <div className="formula-form__row">
            <Select name="status" label="وضعیت" defaultValue="DRAFT" disabled={!canSave} options={[{ value: 'DRAFT', label: 'پیش‌نویس' }, { value: 'REVIEW', label: 'در حال بررسی' }, { value: 'APPROVED', label: 'تأییدشده' }, { value: 'ARCHIVED', label: 'بایگانی' }]} />
            <label>تاریخ اجرا<input name="effectiveAt" type="datetime-local" dir="ltr" disabled={!canSave} /></label>
          </div>
          <PendingButton pendingText="در حال ثبت نسخه…" disabled={!canSave}>
            <FlaskConical size={16} /> ثبت نسخهٔ جدید
          </PendingButton>
        </form>
        <div className="formula-history">
          <h3><History size={16} /> تاریخچه</h3>
          {formulas.length
            ? formulas.slice(0, 5).map(item => (
              <div key={item.id}>
                <span><CheckCircle2 size={14} /> نسخه {item.version} · {statusLabel[item.status]}</span>
                <time>{date(item.effectiveAt)}</time>
              </div>
            ))
            : <p>هنوز نسخه‌ای ثبت نشده است.</p>}
        </div>
      </div>
    </details>
  );
}
