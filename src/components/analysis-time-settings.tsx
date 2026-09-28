 'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field } from '@/components/ui/field';
import type { WarningPolicy } from '@/lib/time-reliability';
export function AnalysisTimeSettings({ policy }: { policy: WarningPolicy & { fallback: boolean } }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  return <form className="admin-form-grid" onSubmit={async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget); setPending(true); setMessage('');
    try {
      const response = await fetch('/api/admin/analysis-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ warningStart: form.get('warningStart'), warningEnd: form.get('warningEnd') }) });
      if (!response.ok) throw new Error(response.status === 400 ? 'ساعت‌ها معتبر نیستند یا شروع و پایان برابر است.' : 'ذخیره نشد؛ دسترسی و اتصال پایگاه داده را بررسی کنید.');
      setMessage('ذخیره شد؛ نسخه جدید سیاست و سابقه تغییر ثبت شدند.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ذخیره ممکن نشد.'); }
    finally { setPending(false); }
  }}>
    <Field label="شروع بازه هشدار"><input className="ds-input" name="warningStart" type="time" step="60" defaultValue={policy.warningStart} required dir="ltr" /></Field>
    <Field label="پایان بازه هشدار"><input className="ds-input" name="warningEnd" type="time" step="60" defaultValue={policy.warningEnd} required dir="ltr" /></Field>
    <button className="button" type="submit" disabled={pending} aria-busy={pending}>{pending ? 'در حال ذخیره…' : 'ذخیره بازه اعتبار'}</button>
    <p role="status" className="wide">{message}</p>
  </form>;
}
