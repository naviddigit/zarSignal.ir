'use client';

import { useActionState } from 'react';
import { PendingButton } from '@/components/pending-button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { updateCustomerProfileAction, type CustomerProfileState } from './actions';

type Props = {
  userId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  compact?: boolean;
  onSaved?: (next: { name: string | null; phone: string | null }) => void;
};

export function CustomerProfileForm({ userId, name, phone, email, compact = false, onSaved }: Props) {
  const [state, action] = useActionState<CustomerProfileState | null, FormData>(
    async (prev, form) => {
      const next = await updateCustomerProfileAction(prev, form);
      if (next.ok) onSaved?.({ name: next.name ?? null, phone: next.phone ?? null });
      return next;
    },
    null,
  );

  return (
    <form className={compact ? 'customers-editor__form' : 'admin-card'} action={action}>
      <input type="hidden" name="userId" value={userId} />
      <div className="admin-form-grid">
        <Input
          label="نام نمایشی"
          name="name"
          defaultValue={name ?? ''}
          placeholder="نام مشتری"
          fieldClassName={compact ? undefined : 'wide'}
        />
        <Field label="ایمیل" className={compact ? undefined : 'wide'}>
          <input className="ds-input" value={email ?? '—'} dir="ltr" readOnly disabled />
        </Field>
        <Input
          label="شماره تماس"
          name="phone"
          defaultValue={phone ?? ''}
          placeholder="+98…"
          dir="ltr"
          fieldClassName={compact ? undefined : 'wide'}
        />
        <Textarea
          label="دلیل ویرایش"
          name="reason"
          rows={compact ? 2 : 2}
          required
          minLength={3}
          placeholder="مثلاً اصلاح نام از پشتیبانی"
          fieldClassName="wide"
        />
        <div className="ds-actions">
          <PendingButton className="button small-button" pendingText="در حال ذخیره…">ذخیره پروفایل</PendingButton>
        </div>
      </div>
      {state?.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state?.ok && state.message ? <p className="admin-message is-ok" role="status">{state.message}</p> : null}
    </form>
  );
}
