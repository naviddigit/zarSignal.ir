'use client';
import { useState, type ReactNode, type FormEvent } from 'react';
import { submitProfileAction } from '@/app/account/complete/actions';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export function ProfileCompletionForm({ children, initialError = '' }: { children: ReactNode; initialError?: string }) {
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true); setError('');
    try { const result = await submitProfileAction(form); setError(result.error); }
    catch (error) { if (isRedirectError(error)) throw error; setError('ارتباط برقرار نشد؛ دوباره تلاش کنید.'); }
    finally { setPending(false); }
  }
  return <form className="profile-complete-form" onSubmit={submit}>
    {children}
    {error ? <p className="calc-error" role="alert">{error}</p> : null}
    <button className="button" type="submit" disabled={pending} aria-busy={pending}>{pending ? 'در حال ذخیره…' : 'ادامه'}</button>
  </form>;
}
