'use client';

import { useActionState, useMemo, useState } from 'react';
import { PendingButton } from '@/components/pending-button';
import { Field, Textarea } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
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
  compact?: boolean;
};

const ACTION_OPTIONS = [
  { value: 'set_plan', label: 'تغییر پلن' },
  { value: 'gift_hours', label: 'هدیهٔ دسترسی (ساعت)' },
  { value: 'adjust_hours', label: 'افزودن/کاهش زمان (ساعت)' },
  { value: 'set_expires_at', label: 'تنظیم مستقیم تاریخ انقضا' },
  { value: 'suspend', label: 'تعلیق اشتراک' },
  { value: 'cancel', label: 'لغو اشتراک' },
];

export function CustomerAccessForm({ userId, currentExpiresAt, plans, compact = false }: Props) {
  const [previewState, previewAction, previewPending] = useActionState<CustomerActionState | null, FormData>(
    previewCustomerAction,
    null,
  );
  const [applyState, applyAction, applyPending] = useActionState<CustomerActionState | null, FormData>(
    applyCustomerAction,
    null,
  );
  const [action, setAction] = useState('gift_hours');
  const [expiresIso, setExpiresIso] = useState(currentExpiresAt ?? new Date().toISOString());
  const [pickerOpen, setPickerOpen] = useState(false);

  const expiresDate = useMemo(() => new Date(expiresIso), [expiresIso]);
  const preview = applyState?.preview ?? previewState?.preview ?? null;
  const error = applyState?.error ?? previewState?.error;
  const message = applyState?.ok
    ? applyState.message
    : previewState?.ok && !applyState?.ok
      ? previewState.message
      : applyState?.message;
  const busy = previewPending || applyPending;
  const planOptions = plans.map(plan => ({ value: plan.slug, label: plan.title }));

  return (
    <div className={`customer-access${compact ? ' is-compact' : ''}`}>
      <form className={`${compact ? 'customers-editor__form' : 'admin-card'} customer-access__form`} action={previewAction}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="expiresAtIso" value={expiresIso} />
        <input type="hidden" name="action" value={action} />

        <div className="admin-form-grid">
          <Select
            label="نوع تغییر"
            options={ACTION_OPTIONS}
            value={action}
            onChange={setAction}
            className={compact ? undefined : 'wide'}
          />

          {action === 'set_plan' ? (
            <Select
              name="planSlug"
              label="پلن جدید"
              options={planOptions}
              defaultValue={plans[0]?.slug}
              className={compact ? undefined : 'wide'}
            />
          ) : null}

          {action === 'gift_hours' || action === 'adjust_hours' ? (
            <Field label={action === 'gift_hours' ? 'ساعت هدیه' : 'ساعت تعدیل (+/−)'} className={compact ? undefined : 'wide'}>
              <input
                className="ds-input"
                name="hours"
                type="number"
                step={1}
                defaultValue={24}
                dir="ltr"
                required
              />
            </Field>
          ) : null}

          {action === 'set_expires_at' ? (
            <div className={`customer-access__expires${compact ? '' : ' wide'}`}>
              <span className="ds-field__label">انقضا (تهران)</span>
              <p className="customer-access__expires-label">{formatTehranDateTime(expiresDate)}</p>
              <button type="button" className="button small-button" onClick={() => setPickerOpen(true)}>
                انتخاب تاریخ
              </button>
            </div>
          ) : null}

          <Textarea
            label="دلیل تغییر"
            name="reason"
            rows={2}
            required
            minLength={3}
            placeholder="مثلاً هدیهٔ پشتیبانی"
            fieldClassName="wide"
          />

          <div className="ds-actions customer-access__actions">
            <PendingButton className="button small-button" pendingText="…" disabled={busy}>
              پیش‌نمایش
            </PendingButton>
            <button
              type="submit"
              className="button small-button"
              formAction={applyAction}
              disabled={busy}
            >
              {applyPending ? '…' : 'ذخیره'}
            </button>
          </div>
        </div>
      </form>

      {preview ? (
        <aside className={`${compact ? 'customers-editor__preview' : 'admin-card'} customer-access__preview`} aria-live="polite">
          <h3>پیش‌نمایش</h3>
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
