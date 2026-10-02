'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { OverlaySheet } from '@/components/ui/overlay-sheet';
import { formatTehranDateTime, tehranLocalToUtc, tehranParts } from '@/lib/tehran-datetime';

type Props = {
  open: boolean;
  value: Date;
  title?: string;
  onClose: () => void;
  onSave: (utc: Date) => void;
};

export function TehranDateTimePicker({
  open,
  value,
  title = 'انتخاب تاریخ و ساعت (تهران)',
  onClose,
  onSave,
}: Props) {
  const initial = useMemo(() => tehranParts(value), [value]);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const firstRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const p = tehranParts(value);
    setYear(p.year);
    setMonth(p.month);
    setDay(p.day);
    setHour(p.hour);
    setMinute(p.minute);
    const t = window.setTimeout(() => firstRef.current?.focus(), 50);
    return () => {
      window.clearTimeout(t);
      returnFocusRef.current?.focus();
    };
  }, [open, value]);

  const draftUtc = tehranLocalToUtc(year, month, day, hour, minute);
  const immediateExpire = draftUtc.getTime() <= Date.now();

  function shiftDays(days: number) {
    const next = new Date(draftUtc.getTime() + days * 86_400_000);
    const p = tehranParts(next);
    setYear(p.year); setMonth(p.month); setDay(p.day); setHour(p.hour); setMinute(p.minute);
  }

  function shiftHours(h: number) {
    const next = new Date(draftUtc.getTime() + h * 3_600_000);
    const p = tehranParts(next);
    setYear(p.year); setMonth(p.month); setDay(p.day); setHour(p.hour); setMinute(p.minute);
  }

  return (
    <OverlaySheet open={open} title={title} onClose={onClose}>
      <div className="dt-picker" role="group" aria-labelledby={titleId}>
        <p id={titleId} className="dt-picker__hint">زمان به وقت تهران · ذخیره به‌صورت UTC</p>
        <p className="dt-picker__preview" dir="rtl">{formatTehranDateTime(draftUtc)}</p>
        {immediateExpire ? (
          <p className="form-error" role="status">این انتخاب باعث انقضای فوری دسترسی می‌شود.</p>
        ) : null}
        <div className="dt-picker__grid">
          <label>
            <span>سال</span>
            <input ref={firstRef} className="ds-input" type="number" dir="ltr" value={year} onChange={e => setYear(Number(e.target.value))} />
          </label>
          <label>
            <span>ماه</span>
            <input className="ds-input" type="number" min={1} max={12} dir="ltr" value={month} onChange={e => setMonth(Number(e.target.value))} />
          </label>
          <label>
            <span>روز</span>
            <input className="ds-input" type="number" min={1} max={31} dir="ltr" value={day} onChange={e => setDay(Number(e.target.value))} />
          </label>
          <label>
            <span>ساعت</span>
            <input className="ds-input" type="number" min={0} max={23} dir="ltr" value={hour} onChange={e => setHour(Number(e.target.value))} />
          </label>
          <label>
            <span>دقیقه</span>
            <input className="ds-input" type="number" min={0} max={59} dir="ltr" value={minute} onChange={e => setMinute(Number(e.target.value))} />
          </label>
        </div>
        <div className="dt-picker__shortcuts" role="group" aria-label="میانبرها">
          <button type="button" className="button small-button" onClick={() => shiftDays(1)}>+۱ روز</button>
          <button type="button" className="button small-button" onClick={() => shiftDays(7)}>+۷ روز</button>
          <button type="button" className="button small-button" onClick={() => shiftDays(30)}>+۳۰ روز</button>
          <button type="button" className="button small-button" onClick={() => shiftHours(1)}>+۱ ساعت</button>
          <button type="button" className="button small-button" onClick={() => shiftHours(-1)}>−۱ ساعت</button>
        </div>
        <div className="dt-picker__actions">
          <button type="button" className="button small-button" onClick={onClose}>انصراف</button>
          <button type="button" className="button" onClick={() => onSave(draftUtc)}>ذخیره</button>
        </div>
      </div>
    </OverlaySheet>
  );
}
