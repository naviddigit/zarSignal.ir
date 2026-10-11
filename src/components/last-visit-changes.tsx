'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { OverlaySheet } from '@/components/ui/overlay-sheet';

export type LastVisitChangeView = {
  id: string;
  label: string;
  summary: string;
  deltaPercent: number | null;
};

export function LastVisitChanges({
  changes,
  baselineAt,
}: {
  changes: LastVisitChangeView[];
  baselineAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  if (!changes.length) return null;
  const when = baselineAt
    ? new Intl.DateTimeFormat('fa-IR', {
        timeZone: 'Asia/Tehran',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(baselineAt))
    : null;

  return (
    <>
      <button type="button" className="analysis-icon-action" title="از آخرین بازدید شما" aria-label="از آخرین بازدید شما" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <History size={18} aria-hidden />
      </button>
      <OverlaySheet open={open} title="از آخرین بازدید شما" onClose={() => setOpen(false)}>
      <aside className="market-view__last-visit" aria-label="تغییرات از آخرین بازدید">
      {when ? <p className="market-view__meta">نسبت به {when}</p> : null}
      <ul className="market-view__last-visit-list">
        {changes.map(change => (
          <li key={change.id}>
            <strong>{change.label}</strong>
            <span>{change.summary}</span>
          </li>
        ))}
      </ul>
      </aside>
      </OverlaySheet>
    </>
  );
}
