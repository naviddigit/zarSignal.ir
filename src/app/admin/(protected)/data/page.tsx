import { ExternalLink, Play, Save } from 'lucide-react';
import { PendingButton } from '@/components/pending-button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { getAdminOverview } from '@/server/admin-overview';
import { getFarazSettings } from '@/server/ingestion/faraz';
import { getHamrateSettings } from '@/server/ingestion/hamrate';
import { runApprovedSourcesNow, runFarazSourceNow, runHamrateSourceNow, saveFarazSource, saveHamrateSource, syncFarazHistoryNow } from './actions';

const time = (value: Date) => value.getTime() ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Tehran' }).format(value) : '—';

export default async function AdminData({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [data, faraz, hamrate, message] = await Promise.all([
    getAdminOverview(),
    getFarazSettings(),
    getHamrateSettings(),
    searchParams,
  ]);

  return (
    <>
      <header className="admin-title">
        <div>
          <span className="eyebrow">MARKET DATA</span>
          <h1>منبع و دریافت داده</h1>
          <p>هر منبع را جداگانه تأیید/فعال کنید. سیستم فقط از منابع فعال قیمت می‌گیرد و در دیتابیس برای چارت ذخیره می‌کند.</p>
        </div>
        <span className={`admin-badge ${data.database}`}>
          {data.database === 'connected' ? 'PostgreSQL متصل' : data.database === 'local' ? 'ذخیره محلی توسعه' : 'دیتابیس در دسترس نیست'}
        </span>
      </header>

      {(message.ok || message.error) && (
        <p className={message.error ? 'form-error admin-message' : 'admin-message is-ok'}>
          {message.error ?? message.ok}
        </p>
      )}

      <article className="admin-card wide source-control">
        <div className="admin-card-heading">
          <div>
            <span className="eyebrow">PRIMARY SOURCE</span>
            <h2>فراز — {faraz.config.watchlistLabel}</h2>
          </div>
          <a href={`${faraz.url}dashboard?widget=watch-list`} target="_blank" rel="noreferrer">
            مشاهده داشبورد <ExternalLink size={14} />
          </a>
        </div>
        <form action={saveFarazSource} className="source-form">
          <Field label="آدرس پایه">
            <input className="ds-input" name="url" type="url" dir="ltr" defaultValue={faraz.url} required />
          </Field>
          <Field label="فاصله دریافت (ثانیه)">
            <input className="ds-input" name="pollSeconds" type="number" min="60" max="86400" defaultValue={faraz.pollSeconds} required />
          </Field>
          <Checkbox name="enabled" label="این منبع تأیید و فعال باشد" defaultChecked={faraz.enabled} className="source-check" />
          <PendingButton pendingText="در حال ذخیره…"><Save size={15} /> ذخیره فراز</PendingButton>
        </form>
        <div className="source-facts">
          <span><b>روش:</b> API عمومی get-data + chart-history (بدون ذخیره رمز در گیت)</span>
          <span><b>نمادها:</b> {faraz.config.assets.map(asset => asset.symbol).join(' · ')}</span>
          <span><b>تاریخچه:</b> تا {faraz.config.historyDays} روز، رزولوشن {faraz.config.historyResolution}</span>
        </div>
        <form action={runFarazSourceNow}>
          <PendingButton className="button source-run" pendingText="در حال دریافت…" disabled={!faraz.enabled || data.database === 'unavailable'}>
            <Play size={15} /> دریافت قیمت‌های فراز
          </PendingButton>
        </form>
        <form action={syncFarazHistoryNow}>
          <PendingButton className="button source-run" pendingText="در حال همگام‌سازی تاریخچه…" disabled={!faraz.enabled || data.database === 'unavailable'}>
            همگام‌سازی تاریخچه نمودارها
          </PendingButton>
        </form>
      </article>

      <article className="admin-card wide source-control">
        <div className="admin-card-heading">
          <div>
            <span className="eyebrow">OPTIONAL FALLBACK</span>
            <h2>منبع قبلی (عمومی)</h2>
          </div>
          <a href={hamrate.url} target="_blank" rel="noreferrer">
            مشاهده منبع <ExternalLink size={14} />
          </a>
        </div>
        <form action={saveHamrateSource} className="source-form">
          <Field label="آدرس صفحه">
            <input className="ds-input" name="url" type="url" dir="ltr" defaultValue={hamrate.url} required />
          </Field>
          <Field label="فاصله دریافت (ثانیه)">
            <input className="ds-input" name="pollSeconds" type="number" min="60" max="86400" defaultValue={hamrate.pollSeconds} required />
          </Field>
          <Checkbox name="enabled" label="این منبع تأیید و فعال باشد" defaultChecked={hamrate.enabled} className="source-check" />
          <PendingButton pendingText="در حال ذخیره…"><Save size={15} /> ذخیره منبع قبلی</PendingButton>
        </form>
        <div className="source-facts">
          <span><b>روش:</b> خواندن HTML عمومی با selector</span>
          <span><b>پیشنهاد:</b> برای انتقال کامل به فراز، این منبع را خاموش نگه دارید</span>
        </div>
        <form action={runHamrateSourceNow}>
          <PendingButton className="button source-run" pendingText="در حال دریافت…" disabled={!hamrate.enabled || data.database === 'unavailable'}>
            <Play size={15} /> دریافت فقط منبع قبلی
          </PendingButton>
        </form>
      </article>

      <article className="admin-card wide">
        <h2>اجرای همه منابع تأیید‌شده</h2>
        <p className="admin-muted">فقط منبع‌هایی که تیک فعال دارند اجرا می‌شوند.</p>
        <form action={runApprovedSourcesNow}>
          <PendingButton className="button source-run" pendingText="در حال دریافت…" disabled={data.database === 'unavailable' || (!faraz.enabled && !hamrate.enabled)}>
            <Play size={15} /> دریافت از منابع فعال
          </PendingButton>
        </form>
      </article>

      <article className="admin-card wide">
        <h2>وضعیت آخرین اجرا</h2>
        <dl className="admin-details">
          <dt>حالت نمایش سایت</dt>
          <dd>{data.sourceMode === 'live' ? 'داده ثبت‌شده دیتابیس' : 'بدون قیمت؛ حالت توسعه'}</dd>
          <dt>دیتابیس</dt>
          <dd>{data.databaseMessage}</dd>
          <dt>آخرین اجرا</dt>
          <dd>{data.lastRun ? `${data.lastRun.status} · ${time(data.lastRun.startedAt)} · ${data.lastRun.count} رکورد` : 'هنوز اجرا نشده'}</dd>
          <dt>خطای آخر</dt>
          <dd className={data.lastRun?.error ? 'danger-text' : ''}>{data.lastRun?.error ?? '—'}</dd>
        </dl>
      </article>

      <article className="admin-card wide">
        <h2>آخرین قیمت ثبت‌شده هر نماد</h2>
        <div className="admin-table">
          <div className="admin-row header">
            <span>نماد</span>
            <span>منبع</span>
            <span>زمان مشاهده منبع</span>
            <span>زمان دریافت</span>
          </div>
          {data.latestQuotes.map(row => (
            <div className="admin-row" key={row.symbol}>
              <strong dir="ltr">{row.symbol}</strong>
              <span>{row.source}</span>
              <span>{time(row.observedAt)}</span>
              <span>{time(row.fetchedAt)}</span>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}
