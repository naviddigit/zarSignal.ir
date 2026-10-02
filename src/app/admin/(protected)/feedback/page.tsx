import Link from 'next/link';
import { listAnalysisFeedback } from '@/server/admin-feedback';
import { getFeedbackCooldownHours } from '@/server/feedback-policy';
import { saveFeedbackCooldownAction, setFeedbackReviewedAction } from './actions';
import { formatTehranDateTime } from '@/lib/tehran-datetime';

export const dynamic = 'force-dynamic';

function escapeText(value: string | null) {
  if (!value) return '—';
  return value.replace(/[<>&]/g, ch => ({ '<': '‹', '>': '›', '&': '＆', '"': '″' }[ch] ?? ch));
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    rating?: string;
    symbol?: string;
    reviewed?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const rating = sp.rating ? Number(sp.rating) : undefined;
  const reviewed = (sp.reviewed === 'reviewed' || sp.reviewed === 'unreviewed' ? sp.reviewed : 'all') as 'all' | 'reviewed' | 'unreviewed';
  const [data, cooldownHours] = await Promise.all([
    listAnalysisFeedback({
      page,
      rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
      symbol: sp.symbol,
      reviewed,
      fromIso: sp.from || undefined,
      toIso: sp.to || undefined,
    }).catch(() => ({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 20,
      stats: { total: 0, reviewed: 0, unreviewed: 0, byRating: {} as Record<string, number> },
    })),
    getFeedbackCooldownHours(),
  ]);

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <header className="admin-title">
        <div>
          <span className="eyebrow">FEEDBACK</span>
          <h1>بازخورد تحلیل</h1>
          <p>فهرست واقعی امتیازها و متن‌ها. آمار فقط از رکوردهای ذخیره‌شده ساخته می‌شود.</p>
        </div>
      </header>

      <section className="admin-grid">
        <article className="admin-card">
          <h2>کل</h2>
          <strong>{new Intl.NumberFormat('fa-IR').format(data.stats.total)}</strong>
        </article>
        <article className="admin-card">
          <h2>بررسی‌شده</h2>
          <strong>{new Intl.NumberFormat('fa-IR').format(data.stats.reviewed)}</strong>
        </article>
        <article className="admin-card">
          <h2>بررسی‌نشده</h2>
          <strong>{new Intl.NumberFormat('fa-IR').format(data.stats.unreviewed)}</strong>
        </article>
      </section>

      <form className="admin-card" method="get" action="/admin/feedback">
        <div className="admin-filter-row">
          <label>
            <span>امتیاز</span>
            <select className="ds-input" name="rating" defaultValue={sp.rating ?? ''}>
              <option value="">همه</option>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>
            <span>وضعیت بررسی</span>
            <select className="ds-input" name="reviewed" defaultValue={reviewed}>
              <option value="all">همه</option>
              <option value="unreviewed">بررسی‌نشده</option>
              <option value="reviewed">بررسی‌شده</option>
            </select>
          </label>
          <label>
            <span>نماد</span>
            <input className="ds-input" name="symbol" defaultValue={sp.symbol ?? ''} dir="ltr" placeholder="GOLD_MELTED" />
          </label>
          <label>
            <span>از تاریخ (ISO)</span>
            <input className="ds-input" name="from" type="date" defaultValue={sp.from ?? ''} dir="ltr" />
          </label>
          <label>
            <span>تا تاریخ</span>
            <input className="ds-input" name="to" type="date" defaultValue={sp.to ?? ''} dir="ltr" />
          </label>
          <button type="submit" className="button small-button">اعمال فیلتر</button>
        </div>
      </form>

      <form className="admin-card" action={saveFeedbackCooldownAction}>
        <h2>فاصلهٔ بازخورد جدید</h2>
        <p>ویرایش همان گزارش محدود نیست؛ فقط ثبت بازخورد برای گزارش جدید محدود می‌شود. پیش‌فرض ۶ ساعت.</p>
        <label>
          <span>ساعت</span>
          <input className="ds-input" name="hours" type="number" min={0} max={168} defaultValue={cooldownHours} dir="ltr" />
        </label>
        <button type="submit" className="button small-button">ذخیره</button>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>مشتری</th>
              <th>امتیاز</th>
              <th>متن</th>
              <th>نماد/گزارش</th>
              <th>زمان (تهران)</th>
              <th>بررسی</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr><td colSpan={6}>بازخوردی نیست.</td></tr>
            ) : data.rows.map(row => (
              <tr key={row.id}>
                <td>
                  <strong>{row.user.name || '—'}</strong>
                  <div dir="ltr">{row.user.email || row.user.id}</div>
                </td>
                <td>{new Intl.NumberFormat('fa-IR').format(row.rating)}</td>
                <td>{escapeText(row.comment)}</td>
                <td>
                  <div>{row.symbol || '—'}</div>
                  <small dir="ltr">{row.reportId}</small>
                </td>
                <td>{formatTehranDateTime(new Date(row.updatedAt))}</td>
                <td>
                  <form action={setFeedbackReviewedAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="reviewed" value={row.reviewedAt ? '0' : '1'} />
                    <button type="submit" className="button small-button">
                      {row.reviewedAt ? 'لغو بررسی' : 'علامت بررسی‌شده'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="admin-pager" aria-label="صفحه‌بندی">
        {page > 1 ? (
          <Link className="button small-button" href={`/admin/feedback?page=${page - 1}&rating=${sp.rating ?? ''}&symbol=${sp.symbol ?? ''}&reviewed=${reviewed}`}>قبلی</Link>
        ) : null}
        <span>صفحه {new Intl.NumberFormat('fa-IR').format(page)} از {new Intl.NumberFormat('fa-IR').format(pages)}</span>
        {page < pages ? (
          <Link className="button small-button" href={`/admin/feedback?page=${page + 1}&rating=${sp.rating ?? ''}&symbol=${sp.symbol ?? ''}&reviewed=${reviewed}`}>بعدی</Link>
        ) : null}
      </nav>
    </>
  );
}
