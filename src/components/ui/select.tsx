'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = {
  name?: string;
  label?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  dir?: 'rtl' | 'ltr';
  className?: string;
  onChange?: (value: string) => void;
  'aria-label'?: string;
};

/** Mobile-first design-system select: bottom sheet on small screens, anchored menu on desktop. */
export function Select({
  name,
  label,
  options,
  value,
  defaultValue,
  placeholder = 'انتخاب کنید',
  required,
  disabled,
  dir,
  className = '',
  onChange,
  'aria-label': ariaLabel,
}: SelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? options.find(option => !option.disabled)?.value ?? '');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const selected = isControlled ? value : internal;
  const selectedLabel = useMemo(
    () => options.find(option => option.value === selected)?.label ?? placeholder,
    [options, selected, placeholder],
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  function choose(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
    setOpen(false);
  }

  const menu = open && mounted
    ? createPortal(
        <>
          <button type="button" className="ds-select__backdrop" aria-label="بستن فهرست" onClick={() => setOpen(false)} />
          <div
            className="ds-select__panel"
            role="listbox"
            id={listId}
            aria-label={ariaLabel ?? label ?? placeholder}
            style={anchorStyle(rootRef.current)}
          >
            <div className="ds-select__sheet-handle" aria-hidden="true" />
            <ul className="ds-select__list">
              {options.map(option => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === selected}
                    disabled={option.disabled}
                    className={option.value === selected ? 'is-active' : undefined}
                    onClick={() => choose(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>,
        document.body,
      )
    : null;

  return (
    <div className={`ds-field ds-select ${className}`.trim()} ref={rootRef}>
      {label ? <span className="ds-field__label">{label}</span> : null}
      {name ? <input type="hidden" name={name} value={selected} required={required} /> : null}
      <button
        type="button"
        className="ds-select__trigger"
        dir={dir}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel ?? label ?? placeholder}
        onClick={() => setOpen(current => !current)}
      >
        <span data-empty={selected ? undefined : 'true'}>{selectedLabel}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {menu}
    </div>
  );
}

function anchorStyle(root: HTMLDivElement | null): CSSProperties | undefined {
  if (typeof window === 'undefined' || !root) return undefined;
  if (window.matchMedia('(max-width: 700px)').matches) return undefined;
  const trigger = root.querySelector('.ds-select__trigger') as HTMLElement | null;
  const box = (trigger ?? root).getBoundingClientRect();
  const spaceBelow = window.innerHeight - box.bottom;
  const openUp = spaceBelow < 240 && box.top > spaceBelow;
  return {
    position: 'fixed',
    left: box.left,
    width: Math.max(box.width, 180),
    top: openUp ? undefined : box.bottom + 6,
    bottom: openUp ? window.innerHeight - box.top + 6 : undefined,
    maxHeight: Math.min(320, openUp ? box.top - 16 : spaceBelow - 16),
  };
}
