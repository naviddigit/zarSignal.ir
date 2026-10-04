'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { AdminPerson } from '@/components/ui/admin-person';
import { Input } from '@/components/ui/field';
import { OverlaySheet } from '@/components/ui/overlay-sheet';
import { formatTehranDateTime } from '@/lib/tehran-datetime';
import type { CustomerListItem } from '@/server/admin-customers';
import { loadCustomer } from './actions';
import { CustomerAccessForm } from './customer-access-form';
import { CustomerProfileForm } from './customer-profile-form';

type Detail = NonNullable<Awaited<ReturnType<typeof loadCustomer>>>;
type ViewMode = 'list' | 'grid';
type EditorTab = 'profile' | 'access';

type Props = {
  initialQuery: string;
  initialRows: CustomerListItem[];
  dbError: boolean;
};

function statusTone(label: string) {
  if (/فعال|آزمایش/i.test(label)) return 'is-up';
  if (/منقضی|لغو|تعلیق/i.test(label)) return 'is-down';
  return 'is-blocked';
}

function faShort(iso: string | null) {
  if (!iso) return '—';
  return formatTehranDateTime(new Date(iso));
}

export function CustomersWorkspace({ initialQuery, initialRows, dbError }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [rows, setRows] = useState(initialRows);
  const [view, setView] = useState<ViewMode>('list');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>('access');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const countLabel = useMemo(
    () => new Intl.NumberFormat('fa-IR').format(rows.length),
    [rows.length],
  );

  function openEditor(userId: string, tab: EditorTab = 'access') {
    setEditorTab(tab);
    setEditorOpen(true);
    setDetail(null);
    setLoadError(null);
    startTransition(async () => {
      try {
        const next = await loadCustomer(userId);
        if (!next) {
          setLoadError('مشتری یافت نشد.');
          return;
        }
        setDetail(next);
      } catch {
        setLoadError('خواندن جزئیات مشتری ممکن نشد. اتصال پایگاه داده را بررسی کنید.');
      }
    });
  }

  function closeEditor() {
    setEditorOpen(false);
    setDetail(null);
    setLoadError(null);
  }

  return (
    <>
      <section className="ds-data-panel">
        <form className="ds-filter-bar" method="get" action="/admin/customers">
          <Input
            label="جست‌وجو"
            name="q"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="ایمیل، نام، تلفن یا شناسه"
            dir="ltr"
            fieldClassName="ds-filter-bar__grow"
          />
          <div className="ds-filter-bar__actions">
            <button type="submit" className="button small-button">جست‌وجو</button>
            {query ? <Link className="ds-ghost-btn" href="/admin/customers">پاک کردن</Link> : null}
          </div>
        </form>

        <div className="ds-data-toolbar">
          <div>
            <h2>فهرست مشتری‌ها</h2>
            <p>{dbError ? 'پایگاه داده در دسترس نیست.' : `${countLabel} نتیجه`}</p>
          </div>
          <div className="customers-view-toggle" role="group" aria-label="حالت نمایش">
            <button type="button" className={view === 'list' ? 'is-active' : undefined} onClick={() => setView('list')}>لیستی</button>
            <button type="button" className={view === 'grid' ? 'is-active' : undefined} onClick={() => setView('grid')}>کارتی</button>
          </div>
        </div>

        {dbError ? (
          <p className="form-error" role="alert">
            اتصال PostgreSQL برقرار نیست؛ فهرست خوانده نشد.
          </p>
        ) : rows.length === 0 ? (
          <p className="ds-data-table__empty">مشتری‌ای با این جست‌وجو یافت نشد.</p>
        ) : view === 'list' ? (
          <div className="ds-data-table-wrap">
            <table className="ds-data-table">
              <thead>
                <tr>
                  <th className="is-person">مشتری</th>
                  <th className="is-plan">پلن</th>
                  <th className="is-status">وضعیت</th>
                  <th className="is-time">انقضا</th>
                  <th>اعتبار</th>
                  <th className="is-actions">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td className="is-person">
                      <AdminPerson name={row.name} meta={row.email || row.phone || row.id} />
                    </td>
                    <td className="is-plan">{row.planLabel}</td>
                    <td className="is-status">
                      <span className={`status-pill ${statusTone(row.statusLabel)}`}>{row.statusLabel}</span>
                    </td>
                    <td className="is-time">{faShort(row.expiresAt)}</td>
                    <td>
                      <span className="ds-clamp">{row.accessCreditLabel}</span>
                    </td>
                    <td className="is-actions">
                      <div className="ds-row-actions">
                        <button type="button" className="ds-ghost-btn" onClick={() => openEditor(row.id, 'access')}>
                          ویرایش
                        </button>
                        <Link className="ds-ghost-btn is-muted" href={`/admin/customers/${row.id}`}>
                          جزئیات
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="customers-grid" role="list">
            {rows.map(row => (
              <article className="customers-grid__card" role="listitem" key={row.id}>
                <header className="customers-grid__card-head">
                  <AdminPerson name={row.name} meta={row.email || row.id} />
                  <span className={`status-pill ${statusTone(row.statusLabel)}`}>{row.statusLabel}</span>
                </header>
                <dl className="customers-grid__facts">
                  <div><dt>پلن</dt><dd>{row.planLabel}</dd></div>
                  <div><dt>انقضا</dt><dd>{faShort(row.expiresAt)}</dd></div>
                  <div><dt>اعتبار</dt><dd>{row.accessCreditLabel}</dd></div>
                </dl>
                <footer className="ds-row-actions">
                  <button type="button" className="ds-ghost-btn" onClick={() => openEditor(row.id, 'access')}>ویرایش</button>
                  <Link className="ds-ghost-btn is-muted" href={`/admin/customers/${row.id}`}>جزئیات</Link>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <OverlaySheet
        open={editorOpen}
        onClose={closeEditor}
        title={detail?.user.name || detail?.user.email || 'ویرایش مشتری'}
        size="wide"
      >
        <div className="customers-editor">
          {pending && !detail ? <p className="customers-editor__loading">در حال بارگذاری…</p> : null}
          {loadError ? <p className="form-error" role="alert">{loadError}</p> : null}
          {detail ? (
            <>
              <div className="customers-editor__tabs" role="tablist" aria-label="بخش ویرایش">
                <button type="button" role="tab" aria-selected={editorTab === 'access'} className={editorTab === 'access' ? 'is-active' : undefined} onClick={() => setEditorTab('access')}>دسترسی</button>
                <button type="button" role="tab" aria-selected={editorTab === 'profile'} className={editorTab === 'profile' ? 'is-active' : undefined} onClick={() => setEditorTab('profile')}>پروفایل</button>
              </div>

              {editorTab === 'profile' ? (
                <CustomerProfileForm
                  userId={detail.user.id}
                  name={detail.user.name}
                  phone={detail.user.phone}
                  email={detail.user.email}
                  compact
                  onSaved={next => {
                    setDetail(current => current
                      ? { ...current, user: { ...current.user, name: next.name, phone: next.phone } }
                      : current);
                    setRows(current => current.map(row => (
                      row.id === detail.user.id ? { ...row, name: next.name, phone: next.phone } : row
                    )));
                  }}
                />
              ) : (
                <>
                  <p className="customers-editor__hint">
                    {detail.entitlement.planLabel} · {detail.entitlement.statusLabel}
                    {detail.entitlement.expiresAt ? ` · ${formatTehranDateTime(detail.entitlement.expiresAt)}` : ''}
                  </p>
                  <CustomerAccessForm
                    userId={detail.user.id}
                    currentExpiresAt={detail.entitlement.expiresAt?.toISOString() ?? null}
                    plans={detail.plans}
                    compact
                  />
                </>
              )}

              <p className="customers-editor__more">
                <Link href={`/admin/customers/${detail.user.id}`}>سوابق و اشتراک‌ها</Link>
              </p>
            </>
          ) : null}
        </div>
      </OverlaySheet>
    </>
  );
}
