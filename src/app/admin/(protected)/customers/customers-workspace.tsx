'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { Input } from '@/components/ui/field';
import { OverlaySheet } from '@/components/ui/overlay-sheet';
import { formatTehranDateTime } from '@/lib/tehran-datetime';
import type { CustomerListItem } from '@/server/admin-customers';
import { loadCustomer } from './actions';
import { CustomerAccessForm } from './customer-access-form';
import { CustomerProfileForm } from './customer-profile-form';

type Detail = NonNullable<Awaited<ReturnType<typeof loadCustomer>>>;

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
  const [editorOpen, setEditorOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const countLabel = useMemo(
    () => new Intl.NumberFormat('fa-IR').format(rows.length),
    [rows.length],
  );

  function openEditor(userId: string) {
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
      <form className="admin-card" method="get" action="/admin/customers">
        <div className="admin-form-grid">
          <Input
            label="جست‌وجو (ایمیل، نام، تلفن یا شناسه)"
            name="q"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="user@example.com"
            dir="ltr"
            fieldClassName="wide"
          />
          <div className="ds-actions">
            <button type="submit" className="button">جست‌وجو</button>
            {query ? (
              <Link className="button small-button" href="/admin/customers">پاک کردن</Link>
            ) : null}
          </div>
        </div>
      </form>

      <section className="admin-card customers-panel">
        <div className="customers-panel__head">
          <div>
            <h2>فهرست مشتری‌ها</h2>
            <p>{dbError ? 'پایگاه داده در دسترس نیست.' : `${countLabel} نتیجه`}</p>
          </div>
        </div>

        {dbError ? (
          <p className="form-error" role="alert">
            اتصال PostgreSQL برقرار نیست؛ فهرست خوانده نشد. این به‌معنای خالی‌بودن مشتری‌ها نیست.
          </p>
        ) : rows.length === 0 ? (
          <p className="customers-panel__empty">مشتری‌ای با این جست‌وجو یافت نشد.</p>
        ) : (
          <div className="customers-grid" role="list">
            {rows.map(row => (
              <article className="customers-grid__card" role="listitem" key={row.id}>
                <header className="customers-grid__card-head">
                  <div>
                    <strong>{row.name || 'بدون نام'}</strong>
                    <p dir="ltr">{row.email || row.id}</p>
                  </div>
                  <span className={`status-pill ${statusTone(row.statusLabel)}`}>{row.statusLabel}</span>
                </header>
                <dl className="customers-grid__facts">
                  <div>
                    <dt>پلن</dt>
                    <dd>{row.planLabel}</dd>
                  </div>
                  <div>
                    <dt>انقضا (تهران)</dt>
                    <dd>{faShort(row.expiresAt)}</dd>
                  </div>
                  <div>
                    <dt>اعتبار دسترسی</dt>
                    <dd>{row.accessCreditLabel}</dd>
                  </div>
                  {row.phone ? (
                    <div>
                      <dt>تلفن</dt>
                      <dd dir="ltr">{row.phone}</dd>
                    </div>
                  ) : null}
                </dl>
                <footer className="customers-grid__actions">
                  <button type="button" className="button" onClick={() => openEditor(row.id)}>
                    ویرایش
                  </button>
                  <Link className="button small-button" href={`/admin/customers/${row.id}`}>
                    جزئیات
                  </Link>
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
              <section>
                <h3>پروفایل</h3>
                <CustomerProfileForm
                  userId={detail.user.id}
                  name={detail.user.name}
                  phone={detail.user.phone}
                  email={detail.user.email}
                  onSaved={next => {
                    setDetail(current => current
                      ? { ...current, user: { ...current.user, name: next.name, phone: next.phone } }
                      : current);
                    setRows(current => current.map(row => (
                      row.id === detail.user.id
                        ? { ...row, name: next.name, phone: next.phone }
                        : row
                    )));
                  }}
                />
              </section>
              <section>
                <h3>دسترسی و پلن</h3>
                <p className="customers-editor__hint">
                  پلن فعلی: {detail.entitlement.planLabel} · وضعیت: {detail.entitlement.statusLabel}
                  {detail.entitlement.expiresAt
                    ? ` · انقضا: ${formatTehranDateTime(detail.entitlement.expiresAt)}`
                    : ''}
                </p>
                <CustomerAccessForm
                  userId={detail.user.id}
                  currentExpiresAt={detail.entitlement.expiresAt?.toISOString() ?? null}
                  plans={detail.plans}
                />
              </section>
              <p className="customers-editor__more">
                <Link href={`/admin/customers/${detail.user.id}`}>مشاهده سوابق و اشتراک‌ها</Link>
              </p>
            </>
          ) : null}
        </div>
      </OverlaySheet>
    </>
  );
}
