import { ExternalLink, Play, Save } from 'lucide-react';
import { PendingButton } from '@/components/pending-button';
import { getAdminOverview } from '@/server/admin-overview';
import { getHamrateSettings } from '@/server/ingestion/hamrate';
import { runMarketSourceNow, saveMarketSource } from './actions';

const time = (value: Date) => value.getTime() ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Tehran' }).format(value) : '—';
export default async function AdminData({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [data, source, message] = await Promise.all([getAdminOverview(), getHamrateSettings(), searchParams]);
  return <><header className="admin-title"><div><span className="eyebrow">MARKET DATA</span><h1>منبع و دریافت داده</h1><p>آدرس منبع، فاصله دریافت، نتیجه آخرین اجرا و زمان هر قیمت را از همین‌جا کنترل کنید.</p></div><span className={`admin-badge ${data.database}`}>{data.database === 'connected' ? 'PostgreSQL متصل' : data.database === 'local' ? 'ذخیره محلی توسعه' : 'دیتابیس در دسترس نیست'}</span></header>
  {(message.ok || message.error) && <p className={message.error ? 'form-error admin-message' : 'admin-message is-ok'}>{message.error ?? message.ok}</p>}
  <article className="admin-card wide source-control"><div className="admin-card-heading"><div><span className="eyebrow">CRAWLER SOURCE</span><h2>HamRate</h2></div><a href={source.url} target="_blank" rel="noreferrer">مشاهده منبع <ExternalLink size={14}/></a></div>
   <form action={saveMarketSource} className="source-form"><label>آدرس صفحه<input name="url" type="url" dir="ltr" defaultValue={source.url} required/></label><label>فاصله دریافت (ثانیه)<input name="pollSeconds" type="number" min="180" max="86400" defaultValue={source.pollSeconds} required/></label><label className="source-check"><input name="enabled" type="checkbox" defaultChecked={source.enabled}/><span>خزنده فعال باشد</span></label><PendingButton pendingText="در حال ذخیره…"><Save size={15}/> ذخیره تنظیمات</PendingButton></form>
   <div className="source-facts"><span><b>روش:</b> خواندن HTML عمومی با selectorهای اعتبارسنجی‌شده</span><span><b>حداقل فاصله:</b> ۱۸۰ ثانیه</span><span><b>نمادها:</b> ۷ بازار، شامل طلای دبی</span></div>
   <form action={runMarketSourceNow}><PendingButton className="button source-run" pendingText="در حال دریافت…" disabled={!source.enabled || data.database === 'unavailable'}><Play size={15}/> دریافت و ثبت همین حالا</PendingButton></form>
  </article>
  <article className="admin-card wide"><h2>وضعیت آخرین اجرا</h2><dl className="admin-details"><dt>حالت نمایش سایت</dt><dd>{data.sourceMode === 'live' ? 'داده ثبت‌شده دیتابیس' : 'بدون قیمت؛ حالت توسعه'}</dd><dt>دیتابیس</dt><dd>{data.databaseMessage}</dd><dt>آخرین اجرا</dt><dd>{data.lastRun ? `${data.lastRun.status} · ${time(data.lastRun.startedAt)} · ${data.lastRun.count} رکورد` : 'هنوز اجرا نشده'}</dd><dt>خطای آخر</dt><dd className={data.lastRun?.error ? 'danger-text' : ''}>{data.lastRun?.error ?? '—'}</dd></dl></article>
  <article className="admin-card wide"><h2>آخرین قیمت ثبت‌شده هر نماد</h2><div className="admin-table"><div className="admin-row header"><span>نماد</span><span>منبع</span><span>زمان مشاهده منبع</span><span>زمان دریافت</span></div>{data.latestQuotes.map(row => <div className="admin-row" key={row.symbol}><strong dir="ltr">{row.symbol}</strong><span>{row.source}</span><span>{time(row.observedAt)}</span><span>{time(row.fetchedAt)}</span></div>)}</div></article></>;
}
