'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field } from '@/components/ui/field';
import {
  ANALYSIS_READING_BOUNDS,
  effectiveTypingCps,
  normalizeAnalysisReadingSettings,
  type AnalysisReadingSettings,
} from '@/lib/analysis-reading-settings';

const SAMPLE = 'قیمت طلا پایین‌تر از مرجع محاسباتی است؛ این اختلاف توصیهٔ خرید یا فروش نیست.';

export function AnalysisReadingSettingsForm({
  settings,
}: {
  settings: AnalysisReadingSettings & { fallback: boolean };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState(settings);
  const [previewShown, setPreviewShown] = useState(0);
  const [previewSpeed, setPreviewSpeed] = useState<1 | 2>(1);

  const normalized = useMemo(() => normalizeAnalysisReadingSettings(draft), [draft]);
  const cps = effectiveTypingCps(normalized, previewSpeed);

  useEffect(() => {
    setPreviewShown(0);
    let shown = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.max(0, (now - last) / 1000);
      last = now;
      shown = Math.min(SAMPLE.length, shown + dt * effectiveTypingCps(normalized, previewSpeed));
      setPreviewShown(Math.floor(shown));
      if (shown < SAMPLE.length) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [normalized, previewSpeed]);

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
            body: JSON.stringify({ reading: normalized }),
          });
          if (!response.ok) {
            throw new Error(
              response.status === 400
                ? 'مقادیر خارج از محدودهٔ مجاز هستند.'
                : 'ذخیره نشد؛ دسترسی و اتصال پایگاه داده را بررسی کنید.',
            );
          }
          setMessage('سرعت خواندن ذخیره شد.');
          router.refresh();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'ذخیره ممکن نشد.');
        } finally {
          setPending(false);
        }
      }}
    >
      <Field label={`سرعت پایه (نویسه در ثانیه · ${ANALYSIS_READING_BOUNDS.baseCps.min}–${ANALYSIS_READING_BOUNDS.baseCps.max})`}>
        <input
          className="ds-input"
          type="number"
          min={ANALYSIS_READING_BOUNDS.baseCps.min}
          max={ANALYSIS_READING_BOUNDS.baseCps.max}
          step={1}
          value={draft.baseCps}
          onChange={e => setDraft(d => ({ ...d, baseCps: Number(e.target.value) }))}
          dir="ltr"
          required
        />
      </Field>
      <Field label={`ضریب حالت سریع (۱–۲)`}>
        <input
          className="ds-input"
          type="number"
          min={ANALYSIS_READING_BOUNDS.fastMultiplier.min}
          max={ANALYSIS_READING_BOUNDS.fastMultiplier.max}
          step={0.1}
          value={draft.fastMultiplier}
          onChange={e => setDraft(d => ({ ...d, fastMultiplier: Number(e.target.value) }))}
          dir="ltr"
          required
        />
      </Field>
      <Field label={`فاصلهٔ ظهور بخش‌ها (میلی‌ثانیه · ${ANALYSIS_READING_BOUNDS.sectionAppearMs.min}–${ANALYSIS_READING_BOUNDS.sectionAppearMs.max})`}>
        <input
          className="ds-input"
          type="number"
          min={ANALYSIS_READING_BOUNDS.sectionAppearMs.min}
          max={ANALYSIS_READING_BOUNDS.sectionAppearMs.max}
          step={10}
          value={draft.sectionAppearMs}
          onChange={e => setDraft(d => ({ ...d, sectionAppearMs: Number(e.target.value) }))}
          dir="ltr"
          required
        />
      </Field>
      <div className="wide">
        <p role="status">
          سرعت واقعی ۱×: <bdi dir="ltr">{Math.round(effectiveTypingCps(normalized, 1))}</bdi> نویسه/ثانیه ·
          سریع: <bdi dir="ltr">{Math.round(effectiveTypingCps(normalized, 2))}</bdi> نویسه/ثانیه
          {settings.fallback ? ' · هنوز تنظیم ذخیره‌شده‌ای نیست؛ پیش‌فرض فعال است.' : null}
        </p>
        <div className="market-view__speed" role="group" aria-label="پیش‌نمایش سرعت" style={{ marginBlock: '0.75rem' }}>
          <span>پیش‌نمایش:</span>
          <button type="button" className={previewSpeed === 1 ? 'is-active' : undefined} onClick={() => setPreviewSpeed(1)}>۱×</button>
          <button type="button" className={previewSpeed === 2 ? 'is-active' : undefined} onClick={() => setPreviewSpeed(2)}>۲×</button>
          <small dir="ltr">{Math.round(cps)} cps</small>
        </div>
        <p aria-live="polite" style={{ minHeight: '3rem', fontFamily: 'inherit' }}>
          {SAMPLE.slice(0, previewShown)}
          {previewShown < SAMPLE.length ? <span aria-hidden>·</span> : null}
        </p>
      </div>
      <button className="button" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? 'در حال ذخیره…' : 'ذخیره سرعت خواندن'}
      </button>
      <p role="status" className="wide">{message}</p>
    </form>
  );
}
