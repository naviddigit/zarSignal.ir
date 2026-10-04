import Link from 'next/link';
import { Field } from '@/components/ui/field';
import { AdminPerson } from '@/components/ui/admin-person';
import { listAnalysisFeedback } from '@/server/admin-feedback';
import { getFeedbackCooldownHours } from '@/server/feedback-policy';
import { saveFeedbackCooldownAction, setFeedbackReviewedAction } from './actions';
import { formatTehranDateTime } from '@/lib/tehran-datetime';

export const dynamic = 'force-dynamic';

function escapeText(value: string | null) {
  if (!value) return '—';
  return value.replace(/[<>&"]/g, ch => ({ '<': '‹', '>': '›', '&': '＆', '"': '″' }[ch] ?? ch));
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
  const query = new URLSearchParams({
    rating: sp.rating ?? '',
    symbol: sp.symbol ?? '',
    reviewed,
    from: sp.from ?? '',
    to: sp.to ?? '',
  });

  return (
    <>
      <header className="admin-title">
        <div>
          <span className="eyebrow">FEEDBACK</span>
          <h1>بازخورد تحلیل</h1>
          <p>آمار و فهرست از رکوردهای واقعی ذخیره‌شده ساخته می‌شود.</p>
        </div>
        <span className="ds-meta-chip">
          صفحه {new Intl.NumberFormat('fa-IR').format(page)} از {new Intl.NumberFormat('fa-IR').format(pages)}
        </span>
      </header>

      <section className="ds-stat-row" aria-label="آمار بازخورد">
        <article className="ds-stat">
          <span>کل</span>
          <strong>{new Intl.NumberFormat('fa-IR').format(data.stats.total)}</strong>
        </article>
        <article className="ds-stat">
          <span>بررسی‌شده</span>
          <strong>{new Intl.NumberFormat('fa-IR').format(data.stats.reviewed)}</strong>
        </article>
        <article className="ds-stat">
          <span>بررسی‌نشده</span>
          <strong>{new Intl.NumberFormat('fa-IR').format(data.stats.unreviewed)}</strong>
        </article>
      </section>

      <section className="ds-data-panel">
        <form className="ds-filter-bar" method="get" action="/admin/feedback">
          <Field label="امتیاز">
            <select className="ds-input" name="rating" defaultValue={sp.rating ?? ''}>
              <option value="">همه</option>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="وضعیت بررسی">
            <select className="ds-input" name="reviewed" defaultValue={reviewed}>
              <option value="all">همه</option>
              <option value="unreviewed">بررسی‌نشده</option>
              <option value="reviewed">بررسی‌شده</option>
            </select>
          </Field>
          <Field label="نماد">
            <input className="ds-input" name="symbol" defaultValue={sp.symbol ?? ''} dir="ltr" placeholder="GOLD_MELTED" />
          </Field>
          <Field label="از تاریخ">
            <input className="ds-input" name="from" type="date" defaultValue={sp.from ?? ''} dir="ltr" />
          </Field>
          <Field label="تا تاریخ">
            <input className="ds-input" name="to" type="date" defaultValue={sp.to ?? ''} dir="ltr" />
          </Field>
          <div className="ds-filter-bar__actions">
            <button type="submit" className="button small-button">اعمال فیلتر</button>
          </div>
        </form>

        <div className="ds-data-table-wrap">
          <table className="ds-data-table">
            <thead>
              <tr>
                <th className="is-person">مشتری</th>
                <th className="is-score">امتیاز</th>
                <th>متن</th>
                <th className="is-symbol">نماد / گزارش</th>
                <th className="is-time">زمان</th>
                <th className="is-actions">بررسی</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ds-data-table__empty">بازخوردی نیست.</td>
                </tr>
              ) : data.rows.map(row => (
                <tr key={row.id}>
                  <td className="is-person">
                    <AdminPerson name={row.user.name} meta={row.user.email || row.user.id} />
                  </td>
                  <td className="is-score">
                    <span className="ds-score">{new Intl.NumberFormat('fa-IR').format(row.rating)}</span>
                  </td>
                  <td>
                    <span className="ds-clamp">{escapeText(row.comment)}</span>
                  </td>
                  <td className="is-symbol">
                    <div className="ds-stack-cell">
                      <strong dir="ltr">{row.symbol || '—'}</strong>
                      <small dir="ltr">{row.reportId}</small>
                    </div>
                  </td>
                  <td className="is-time">{formatTehranDateTime(new Date(row.updatedAt))}</td>
                  <td className="is-actions">
                    <form action={setFeedbackReviewedAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="reviewed" value={row.reviewedAt ? '0' : '1'} />
                      <button
                        type="submit"
                        className={`ds-ghost-btn${row.reviewedAt ? ' is-muted' : ''}`}
                      >
                        {row.reviewedAt ? 'لغو بررسی' : 'بررسی شد'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <nav className="ds-pager" aria-label="صفحه‌بندی">
          {page > 1 ? (
            <Link className="button small-button" href={`/admin/feedback?page=${page - 1}&${query}`}>قبلی</Link>
          ) : <span />}
          <span>
            {new Intl.NumberFormat('fa-IR').format(data.rows.length)} نمایش در این صفحه
          </span>
          {page < pages ? (
            <Link className="button small-button" href={`/admin/feedback?page=${page + 1}&${query}`}>بعدی</Link>
          ) : <span />}
        </nav>
      </section>

      <form className="admin-card ds-settings-card" action={saveFeedbackCooldownAction}>
        <div className="ds-settings-card__head">
          <div>
            <h2>فاصلهٔ بازخورد جدید</h2>
            <p>فقط ثبت بازخورد برای گزارش جدید محدود می‌شود؛ ویرایش همان گزارش آزاد است.</p>
          </div>
          <button type="submit" className="button small-button">ذخیره</button>
        </div>
        <div className="admin-form-grid">
          <Field label="ساعت">
            <input className="ds-input" name="hours" type="number" min={0} max={168} defaultValue={cooldownHours} dir="ltr" />
          </Field>
        </div>
      </form>
    </>
  );
}
