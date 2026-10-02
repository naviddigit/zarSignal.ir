'use client';

import { useActionState, useMemo, useState } from 'react';
import { TehranDateTimePicker } from '@/components/tehran-datetime-picker';
import { formatTehranDateTime } from '@/lib/tehran-datetime';
import {
  applyCustomerAction,
  previewCustomerAction,
  type CustomerActionState,
} from './actions';

type Plan = { slug: string; title: string };

type Props = {
  userId: string;
  currentExpiresAt: string | null;
  plans: Plan[];
};

export function CustomerAccessForm({ userId, currentExpiresAt, plans }: Props) {
  const [previewState, previewAction, previewPending] = useActionState<CustomerActionState | null, FormData>(
    previewCustomerAction,
    null,
  );
  const [applyState, applyAction, applyPending] = useActionState<CustomerActionState | null, FormData>(
    applyCustomerAction,
    null,
  );
  const [action, setAction] = useState<string>('gift_hours');
  const [expiresIso, setExpiresIso] = useState(currentExpiresAt ?? new Date().toISOString());
  const [pickerOpen, setPickerOpen] = useState(false);

  const expiresDate = useMemo(() => new Date(expiresIso), [expiresIso]);
  const preview = applyState?.preview ?? previewState?.preview ?? null;
  const error = applyState?.error ?? previewState?.error;
  const message = applyState?.ok ? applyState.message : previewState?.ok && !applyState?.ok ? previewState.message : applyState?.message;

  return (
    <div className="customer-access">
      <form className="admin-card customer-access__form" action={previewAction}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="expiresAtIso" value={expiresIso} />

        <label>
          <span>نوع تغییر</span>
          <select
            className="ds-input"
            name="action"
            value={action}
            onChange={e => setAction(e.target.value)}
          >
            <option value="set_plan">تغییر پلن</option>
            <option value="gift_hours">هدیهٔ دسترسی (ساعت)</option>
            <option value="adjust_hours">افزودن/کاهش زمان (ساعت)</option>
            <option value="set_expires_at">تنظیم مستقیم تاریخ انقضا</option>
            <option value="suspend">تعلیق اشتراک</option>
            <option value="cancel">لغو اشتراک</option>
          </select>
        </label>

        {action === 'set_plan' ? (
          <label>
            <span>پلن جدید</span>
            <select className="ds-input" name="planSlug" defaultValue={plans[0]?.slug}>
              {plans.map(p => (
                <option key={p.slug} value={p.slug}>{p.title}</option>
              ))}
            </select>
          </label>
        ) : null}

        {action === 'gift_hours' || action === 'adjust_hours' ? (
          <label>
            <span>{action === 'gift_hours' ? 'ساعت هدیه (مثبت)' : 'ساعت تعدیل (+/−)'}</span>
            <input className="ds-input" name="hours" type="number" step={1} defaultValue={action === 'gift_hours' ? 24 : 24} dir="ltr" />
          </label>
        ) : null}

        {action === 'set_expires_at' ? (
          <div className="customer-access__expires">
            <span>تاریخ و ساعت انقضا (تهران)</span>
            <p className="customer-access__expires-label">{formatTehranDateTime(expiresDate)}</p>
            <button type="button" className="button small-button" onClick={() => setPickerOpen(true)}>
              انتخاب تاریخ و ساعت
            </button>
          </div>
        ) : null}

        <label>
          <span>دلیل تغییر (حداقل ۳ نویسه)</span>
          <textarea className="ds-input" name="reason" rows={2} required minLength={3} placeholder="مثلاً هدیهٔ پشتیبانی / اصلاح انقضا" />
        </label>

        <div className="customer-access__actions">
          <button type="submit" className="button small-button" disabled={previewPending || applyPending}>
            {previewPending ? 'در حال محاسبه…' : 'پیش‌نمایش'}
          </button>
          <button
            type="submit"
            className="button"
            formAction={applyAction}
            disabled={previewPending || applyPending}
          >
            {applyPending ? 'در حال ذخیره…' : 'ذخیرهٔ تغییر'}
          </button>
        </div>
      </form>

      {preview ? (
        <aside className="admin-card customer-access__preview" aria-live="polite">
          <h3>پیش‌نمایش نتیجه</h3>
          <p>
            قبل: {preview.previous.planLabel} · {preview.previous.statusLabel}
            {preview.previous.expiresAt
              ? ` · ${formatTehranDateTime(new Date(preview.previous.expiresAt))}`
              : ''}
          </p>
          <p>
            بعد: {preview.next.planLabel} · {preview.next.statusLabel}
            {preview.next.expiresAt
              ? ` · ${formatTehranDateTime(new Date(preview.next.expiresAt))}`
              : ''}
          </p>
          <p>{preview.next.accessCreditLabel}</p>
          {preview.next.immediateExpire ? (
            <p className="form-error" role="status">این تغییر باعث انقضای فوری دسترسی می‌شود.</p>
          ) : null}
        </aside>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message && !error ? <p className="admin-message is-ok" role="status">{message}</p> : null}

      <TehranDateTimePicker
        open={pickerOpen}
        value={expiresDate}
        onClose={() => setPickerOpen(false)}
        onSave={utc => {
          setExpiresIso(utc.toISOString());
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
