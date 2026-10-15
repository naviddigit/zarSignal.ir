'use client';
import { useId, useState, type InputHTMLAttributes } from 'react';
import { normalizePhone } from '@/lib/account-policy';

export function PhoneInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [error, setError] = useState('');
  return <span className="phone-input-control"><input {...props} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" aria-describedby={error ? id : undefined} aria-invalid={error ? true : undefined}
    onChange={event => {
      const raw = event.currentTarget.value.trim();
      const message = raw && !normalizePhone(raw) ? 'شماره موبایل را با فرمت ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.' : '';
      event.currentTarget.setCustomValidity(message);
      setError(message);
    }}
    onInvalid={event => { setError(event.currentTarget.validationMessage); }}
  />{error ? <small id={id} className="calc-error" role="alert">{error}</small> : null}</span>;
}
