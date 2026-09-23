'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

type CheckboxProps = {
  name?: string;
  value?: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Design-system checkbox.
 * The control is a fixed 22×22 box with an absolutely centered mark so global
 * `button { font: inherit }` / body line-height cannot shove the tick off-center
 * on public (RTL) pages the way flex+inherited line-height does.
 */
export function Checkbox({
  name,
  value = 'on',
  label,
  description,
  defaultChecked,
  checked,
  onCheckedChange,
  disabled,
  className = '',
}: CheckboxProps) {
  return (
    <label className={`ds-checkbox ${className}`.trim()}>
      <CheckboxPrimitive.Root
        className="ds-checkbox__control"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onCheckedChange={onCheckedChange ? next => onCheckedChange(next === true) : undefined}
        disabled={disabled}
      >
        <CheckboxPrimitive.Indicator className="ds-checkbox__indicator" asChild>
          <span aria-hidden="true">
            <svg viewBox="0 0 12 12" width="12" height="12" focusable="false">
              <path
                d="M2 6.2 4.8 9 10 3.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span className="ds-checkbox__copy">
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </label>
  );
}
