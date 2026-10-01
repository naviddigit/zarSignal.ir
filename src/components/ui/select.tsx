'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';

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

/**
 * Design-system select used site-wide:
 * - mobile: bottom sheet (slide up / slide down)
 * - desktop: centered modal
 */
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
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? options.find(option => !option.disabled)?.value ?? '');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const selected = isControlled ? value : internal;
  const selectedLabel = useMemo(
    () => options.find(option => option.value === selected)?.label ?? placeholder,
    [options, selected, placeholder],
  );
  const title = ariaLabel ?? label ?? placeholder;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') beginClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  function beginClose() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 220);
  }

  function choose(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
    beginClose();
  }

  const menu = open && mounted
    ? createPortal(
        <div className={`ds-select-layer${closing ? ' is-closing' : ''}`} role="presentation">
          <button type="button" className="ds-select__backdrop" aria-label="بستن فهرست" onClick={beginClose} />
          <div
            className="ds-select__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="ds-select__sheet-handle" aria-hidden="true" />
            <header className="ds-select__header">
              <strong id={titleId}>{title}</strong>
              <button type="button" className="ds-select__close" aria-label="بستن" onClick={beginClose}>
                <X size={18} />
              </button>
            </header>
            <ul className="ds-select__list" role="listbox" id={listId} aria-label={title}>
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
        </div>,
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
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={title}
        onClick={() => {
          if (open) beginClose();
          else setOpen(true);
        }}
      >
        <span data-empty={selected ? undefined : 'true'}>{selectedLabel}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {menu}
    </div>
  );
}
