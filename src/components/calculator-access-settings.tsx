'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AccessLevel } from '@/lib/capabilities';
import { accessLevelLabel } from '@/lib/capabilities';
import {
  CALCULATOR_MODULE_LABELS,
  type CalculatorAccessPolicy,
  type CalculatorModuleMode,
  type CalculatorModule,
} from '@/lib/calculator-access';
import { Checkbox } from '@/components/ui/checkbox';

const LEVELS: AccessLevel[] = ['FREE', 'HOME', 'PROFESSIONAL', 'ADVANCED_PROFESSIONAL'];
const OPS = Object.keys(CALCULATOR_MODULE_LABELS) as CalculatorModule[];
const MODE_LABELS: Record<CalculatorModuleMode, string> = {
  free: 'رایگان',
  plans: 'پلن‌های مجاز',
  disabled: 'غیرفعال',
};

export function CalculatorAccessSettingsForm({
  policy,
  available,
  writable = available,
}: {
  policy: CalculatorAccessPolicy;
  available: boolean;
  /** When false, form is visible (defaults) but save is blocked — DB down. */
  writable?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(policy);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  function setMode(op: CalculatorModule, mode: CalculatorModuleMode) {
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

  function toggleLevel(op: CalculatorModule, level: AccessLevel) {
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
      className="admin-form-grid calc-access-form"
      onSubmit={async event => {
        event.preventDefault();
        if (!writable) {
          setMessage('اتصال پایگاه داده برای ذخیره این تنظیم در دسترس نیست.');
          return;
        }
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
      {!writable ? (
        <p role="alert" className="wide form-error admin-message">
          اتصال پایگاه داده برای ذخیره این تنظیم در دسترس نیست. پیش‌فرض رایگان برای مشتری اعمال می‌شود تا DB برقرار شود.
        </p>
      ) : null}

      <p className="wide">
        هر ماژول را روی «رایگان»، «پلن‌های مجاز» یا «غیرفعال» بگذارید. برای پولی‌کردن: «پلن‌های مجاز» را انتخاب کنید و فقط پلن‌های موردنظر را تیک بزنید (تیک حساب رایگان را بردارید).
        دورهٔ آزمایشی را در <Link href="/admin/plans">تنظیمات پلن‌ها</Link> تعیین کنید.
      </p>

      {OPS.map(op => {
        const row = draft[op];
        return (
          <article key={op} className="wide calc-access-module">
            <header className="calc-access-module__head">
              <strong>{CALCULATOR_MODULE_LABELS[op]}</strong>
              <small dir="ltr">{op}</small>
            </header>

            <div className="ds-choice-row" role="radiogroup" aria-label={`حالت دسترسی ${CALCULATOR_MODULE_LABELS[op]}`}>
              {(['free', 'plans', 'disabled'] as CalculatorModuleMode[]).map(mode => (
                <label key={mode} className={`ds-choice${row.mode === mode ? ' is-on' : ''}`}>
                  <input
                    type="radio"
                    name={`mode-${op}`}
                    checked={row.mode === mode}
                    onChange={() => setMode(op, mode)}
                  />
                  <span>{MODE_LABELS[mode]}</span>
                </label>
              ))}
            </div>

            {row.mode === 'plans' ? (
              <div className="ds-checks">
                {LEVELS.map(level => (
                  <Checkbox
                    key={level}
                    label={accessLevelLabel(level)}
                    checked={row.allowedLevels.includes(level)}
                    onCheckedChange={() => toggleLevel(op, level)}
                  />
                ))}
              </div>
            ) : null}
          </article>
        );
      })}

      <div className="ds-actions">
        <button className="button" type="submit" disabled={!writable || pending} aria-busy={pending}>
          {pending ? 'در حال ذخیره…' : 'ذخیره دسترسی ماشین‌حساب'}
        </button>
      </div>
      {message ? <p role="status" className="wide">{message}</p> : null}
    </form>
  );
}
