'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type HScrollRailProps = {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
  label?: string;
  step?: number;
  /** Replaces the end chevron — stays fixed outside the scroll track. */
  endSlot?: ReactNode;
};

/**
 * Single-row horizontal scroller with edge arrows.
 * Uses child bounding boxes so RTL/LTR engines behave the same.
 */
export function HScrollRail({
  children,
  className = '',
  trackClassName = '',
  label,
  step = 168,
  endSlot,
}: HScrollRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canStart, setCanStart] = useState(false);
  const [canEnd, setCanEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) {
      setCanStart(false);
      setCanEnd(false);
      return;
    }
    const first = el.firstElementChild as HTMLElement | null;
    const last = el.lastElementChild as HTMLElement | null;
    if (!first || !last) {
      setCanStart(false);
      setCanEnd(false);
      return;
    }
    const track = el.getBoundingClientRect();
    const startEdge = first.getBoundingClientRect();
    const endEdge = last.getBoundingClientRect();
    // RTL: start is on the right; LTR: start is on the left
    const rtl = getComputedStyle(el).direction === 'rtl';
    if (rtl) {
      setCanStart(startEdge.right > track.right + 3);
      setCanEnd(endEdge.left < track.left - 3);
    } else {
      setCanStart(startEdge.left < track.left - 3);
      setCanEnd(endEdge.right > track.right + 3);
    }
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const run = () => sync();
    run();
    el.addEventListener('scroll', run, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(run) : null;
    ro?.observe(el);
    window.addEventListener('resize', run);
    return () => {
      el.removeEventListener('scroll', run);
      ro?.disconnect();
      window.removeEventListener('resize', run);
    };
  }, [sync, children]);

  function nudge(toward: 'start' | 'end') {
    const el = trackRef.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    // Move content toward start (show earlier items) or end (show later items)
    const sign = toward === 'end' ? 1 : -1;
    const delta = rtl ? -sign * step : sign * step;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }

  return (
    <div className={`h-scroll-rail ${className}`.trim()} aria-label={label}>
      <button
        type="button"
        className="h-scroll-rail__arrow is-start"
        aria-label="موارد قبلی"
        disabled={!canStart}
        onClick={() => nudge('start')}
      >
        <ChevronRight size={16} strokeWidth={2.2} />
      </button>
      <div className={`h-scroll-rail__track ${trackClassName}`.trim()} ref={trackRef}>
        {children}
      </div>
      {endSlot ?? (
        <button
          type="button"
          className="h-scroll-rail__arrow is-end"
          aria-label="موارد بعدی"
          disabled={!canEnd}
          onClick={() => nudge('end')}
        >
          <ChevronLeft size={16} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}
