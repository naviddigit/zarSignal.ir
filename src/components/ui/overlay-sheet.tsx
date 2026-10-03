'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type OverlaySheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

let lockCount = 0;
let wheelBlock: ((event: Event) => void) | null = null;
let touchBlock: ((event: Event) => void) | null = null;

function isInsideOverlayScroll(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('.ds-overlay__panel, .ds-select__panel'));
}

function lockPageScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    document.documentElement.classList.add('ds-scroll-locked');
    wheelBlock = (event: Event) => {
      if (isInsideOverlayScroll(event.target)) return;
      event.preventDefault();
    };
    touchBlock = (event: Event) => {
      if (isInsideOverlayScroll(event.target)) return;
      event.preventDefault();
    };
    window.addEventListener('wheel', wheelBlock, { passive: false });
    window.addEventListener('touchmove', touchBlock, { passive: false });
  }
  lockCount += 1;
}

function unlockPageScroll() {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.documentElement.classList.remove('ds-scroll-locked');
    if (wheelBlock) window.removeEventListener('wheel', wheelBlock);
    if (touchBlock) window.removeEventListener('touchmove', touchBlock);
    wheelBlock = null;
    touchBlock = null;
  }
}

/**
 * Shared design-system overlay:
 * desktop = centered modal, mobile = bottom drawer (slide up / down).
 */
export function OverlaySheet({ open, title, onClose, children }: OverlaySheetProps) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const [mounted, setMounted] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [closing, setClosing] = useState(false);
  const wasOpen = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      setRendered(true);
      setClosing(false);
      return;
    }
    if (!wasOpen.current) return;
    setClosing(true);
    const timer = window.setTimeout(() => {
      wasOpen.current = false;
      setRendered(false);
      setClosing(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!rendered) return;
    lockPageScroll();
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      const panels = document.querySelectorAll('.ds-overlay__panel');
      if (panels[panels.length - 1] !== panelRef.current) return;
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); }
      if (event.key === 'Tab') {
        const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []).filter(item => item.getClientRects().length);
        const first = items[0]; const last = items[items.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockPageScroll();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [rendered]);

  if (!mounted || !rendered) return null;

  return createPortal(
    <div className={`ds-overlay-layer${closing ? ' is-closing' : ''}`} role="presentation">
      <button type="button" className="ds-overlay__backdrop" aria-label="بستن" onClick={() => onCloseRef.current()} />
      <div ref={panelRef} tabIndex={-1} className="ds-overlay__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="ds-overlay__handle" aria-hidden="true" />
        <header className="ds-overlay__header">
          <strong id={titleId}>{title}</strong>
          <button type="button" className="ds-overlay__close" aria-label="بستن" onClick={() => onCloseRef.current()}>
            <X size={18} />
          </button>
        </header>
        <div className="ds-overlay__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
