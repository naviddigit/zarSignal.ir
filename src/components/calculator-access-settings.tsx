'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AccessLevel } from '@/lib/capabilities';
import { accessLevelLabel } from '@/lib/capabilities';
import {
  CALCULATOR_MODULE_LABELS,
  type CalculatorAccessPolicy,
  type CalculatorModuleMode,
} from '@/lib/calculator-access';
import { calculatorCatalog, type CalculatorOperation } from '@/lib/calculator-catalog';

const LEVELS: AccessLevel[] = ['FREE', 'HOME', 'PROFESSIONAL', 'ADVANCED_PROFESSIONAL'];
const OPS = Object.keys(calculatorCatalog) as CalculatorOperation[];

export function CalculatorAccessSettingsForm({
  policy,
  available,
}: {
  policy: CalculatorAccessPolicy;
  available: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(policy);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  function setMode(op: CalculatorOperation, mode: CalculatorModuleMode) {
    setDraft(current => ({
      ...current,
      [op]: {
        ...current[op],
        mode,
        allowedLevels: mode === 'free' ? [...LEVELS] : current[op].allowedLevels.length
          ? current[op].allowedLevels
          : ['PROFESSIONAL', 'ADVANCED_PROFESSIONAL'],
      },
    }));
  }

  function toggleLevel(op: CalculatorOperation, level: AccessLevel) {
    setDraft(current => {
      const row = current[op];
      const has = row.allowedLevels.includes(level);
      const allowedLevels = has
        ? row.allowedLevels.filter(l => l !== level)
        : [...row.allowedLevels, level];
      return { ...current, [op]: { ...row, mode: 'plans', allowedLevels } };
    });
  }

  return (
    <form
      className="admin-form-grid"
      onSubmit={async event => {
        event.preventDefault();
        setPending(true);
        setMessage('');
        try {
          const response = await fetch('/api/admin/analysis-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calculatorAccess: draft }),
          });
          if (!response.ok) throw new Error('ذخیره نشد؛ دسترسی و اتصال پایگاه داده را بررسی کنید.');
          setMessage('دسترسی ماژول‌های ماشین‌حساب ذخیره شد.');
          router.refresh();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'ذخیره ممکن نشد.');
        } finally {
          setPending(false);
        }
      }}
    >
      {!available ? <p role="alert" className="wide">اتصال پایگاه داده برای ذخیره این تنظیم در دسترس نیست.</p> : null}
      {OPS.map(op => {
        const row = draft[op];
        return (
          <fieldset key={op} className="wide" style={{ border: '1px solid var(--border, #ddd)', padding: '0.75rem', marginBottom: '0.5rem' }}>
            <legend><strong>{CALCULATOR_MODULE_LABELS[op]}</strong> <small dir="ltr">({op})</small></legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBlock: '0.5rem' }}>
              {(['free', 'plans', 'disabled'] as CalculatorModuleMode[]).map(mode => (
                <label key={mode} style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                  <input
                    type="radio"
                    name={`mode-${op}`}
                    checked={row.mode === mode}
                    onChange={() => setMode(op, mode)}
                  />
                  {mode === 'free' ? 'رایگان' : mode === 'plans' ? 'پلن‌های مجاز' : 'غیرفعال'}
                </label>
              ))}
            </div>
            {row.mode === 'plans' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {LEVELS.map(level => (
                  <label key={level} style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={row.allowedLevels.includes(level)}
                      onChange={() => toggleLevel(op, level)}
                    />
                    {accessLevelLabel(level)}
                  </label>
                ))}
              </div>
            ) : null}
          </fieldset>
        );
      })}
      <button className="button" type="submit" disabled={pending || !available} aria-busy={pending}>
        {pending ? 'در حال ذخیره…' : 'ذخیره دسترسی ماشین‌حساب'}
      </button>
      <p role="status" className="wide">{message}</p>
    </form>
  );
}
