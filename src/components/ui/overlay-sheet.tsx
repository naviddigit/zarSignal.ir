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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockPageScroll();
    };
  }, [rendered]);

  if (!mounted || !rendered) return null;

  return createPortal(
    <div className={`ds-overlay-layer${closing ? ' is-closing' : ''}`} role="presentation">
      <button type="button" className="ds-overlay__backdrop" aria-label="بستن" onClick={() => onCloseRef.current()} />
      <div className="ds-overlay__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
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
