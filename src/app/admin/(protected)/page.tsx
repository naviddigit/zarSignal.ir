import { Activity, Database, KeyRound, UsersRound } from 'lucide-react';
import { getAdminOverview } from '@/server/admin-overview';

const display = (value: number) => new Intl.NumberFormat('fa-IR').format(value);

export default async function AdminHome() {
  const data = await getAdminOverview();
  const stats = [
    { label: 'رکوردهای قیمت', value: data.quoteCount, icon: Database },
    { label: 'کاربران', value: data.userCount, icon: UsersRound },
    { label: 'اشتراک فعال', value: data.activeSubscriptions, icon: Activity },
    { label: 'کلید API فعال', value: data.activeApiKeys, icon: KeyRound },
  ];
  return <>
    <header className="admin-title">
      <div><span className="eyebrow">SYSTEM OVERVIEW</span><h1>صبح بخیر، مدیر.</h1><p>وضعیت فعلی سرویس و داده را از یک جا بررسی کنید.</p></div>
      <span className={`admin-badge ${data.database}`}>{data.database === 'connected' ? 'دیتابیس متصل است' : 'دیتابیس در دسترس نیست'}</span>
    </header>
    {data.database === 'unavailable' && <div className="admin-alert" role="alert">
      <strong>اتصال دیتابیس برقرار نیست</strong>
      <p>{data.databaseMessage}</p>
      <div><code dir="ltr">docker compose up -d postgres</code><code dir="ltr">npx prisma migrate deploy</code></div>
    </div>}
    <div className="admin-stats">{stats.map(({ label, value, icon: Icon }) => <article className="admin-stat" key={label}><Icon size={19}/><span>{label}</span><strong>{display(value)}</strong></article>)}</div>
    <div className="admin-grid">
      <article className="admin-card"><span className="eyebrow">MARKET PIPELINE</span><h2>آخرین دریافت داده</h2>{data.lastRun ? <><strong className={`run-status ${data.lastRun.status.toLowerCase()}`}>{data.lastRun.status}</strong><p>{display(data.lastRun.count)} رکورد ثبت شده</p>{data.lastRun.error && <p className="form-error">{data.lastRun.error}</p>}</> : <p>هنوز دریافت واقعی ثبت نشده است. حالت فعلی: {data.sourceMode === 'demo' ? 'دادهٔ نمایشی' : 'دادهٔ زنده بدون رکورد'}.</p>}<a href="/admin/data">مدیریت داده ←</a></article>
      <article className="admin-card"><span className="eyebrow">RELEASE CHECK</span><h2>پیش از انتشار</h2><ul><li>{data.sourceMode === 'live' ? 'حالت دادهٔ زنده فعال است.' : 'دادهٔ زنده هنوز فعال نیست.'}</li><li>فرمول حباب در وضعیت انتظار است.</li><li>درگاه و ورود کاربر باید پیش از فروش فعال شوند.</li></ul><a href="/admin/seo">آماده‌سازی جستجو ←</a></article>
    </div>
  </>;
}
