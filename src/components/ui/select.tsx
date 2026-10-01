'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { OverlaySheet } from '@/components/ui/overlay-sheet';

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

/** Design-system select — opens the shared overlay sheet (modal / bottom drawer). */
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
  const selected = isControlled ? value : internal;
  const selectedLabel = useMemo(
    () => options.find(option => option.value === selected)?.label ?? placeholder,
    [options, selected, placeholder],
  );
  const title = ariaLabel ?? label ?? placeholder;

  function choose(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
    setOpen(false);
  }

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
        onClick={() => setOpen(current => !current)}
      >
        <span data-empty={selected ? undefined : 'true'}>{selectedLabel}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <OverlaySheet open={open} title={title} onClose={() => setOpen(false)}>
        <ul className="ds-overlay__list" role="listbox" id={listId} aria-label={title}>
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
      </OverlaySheet>
    </div>
  );
}
